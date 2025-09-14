import cohere
import logging
from datetime import datetime, timezone
from typing import List, Dict, Generator, Optional, Tuple
import requests

# MODIFIED: Import the new database query functions
from app.db.queries import get_bssids_in_area_at_time, get_latest_movement_pings_for_bssids

class ChatbotService:
    """A service for Cohere that receives its dependencies upon creation."""
    
    def __init__(self, db_manager):
        self.co = None
        self.db_manager = db_manager

    def init_app(self, app):
        """Initializes the Cohere client using the Flask app's config."""
        api_key = app.config.get('COHERE_API_KEY')
        if not api_key:
            raise ValueError('COHERE_API_KEY not set in Flask config.')
        self.co = cohere.Client(api_key)

    # --- NEW HELPER FOR GEOCODING ---
    def _geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """Converts a street address into latitude and longitude using Nominatim."""
        url = "https://nominatim.openstreetmap.org/search"
        params = {'q': address, 'format': 'json', 'limit': 1}
        # Nominatim's usage policy requires a descriptive User-Agent
        headers = {'User-Agent': 'SauronProject/1.0'}
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            results = response.json()
            if results:
                lat = float(results[0]['lat'])
                lon = float(results[0]['lon'])
                logging.info(f"Geocoded '{address}' to (lat={lat}, lon={lon})")
                return lat, lon
            else:
                logging.warning(f"Could not geocode address: '{address}'. No results found.")
                return None
        except requests.exceptions.RequestException as e:
            logging.error(f"Geocoding request failed for address '{address}': {e}")
            return None
        except (KeyError, IndexError, ValueError) as e:
            logging.error(f"Failed to parse geocoding response for '{address}': {e}")
            return None

    # --- MODIFIED TOOL IMPLEMENTATION ---
    def _investigate_incident_tool(self, address: str, radius: int, start_time: str, end_time: str) -> List[Dict]:
        """Tool to find devices near an incident and where they went, using a string address."""
        logging.info(f'Tool called: _investigate_incident_tool with params: address={address}, radius={radius}, start={start_time}, end={end_time}')
        
        # Step 1: Geocode the address to get lat/lon
        location = self._geocode_address(address)
        if not location:
            return [{'error': f'Could not find coordinates for the address: "{address}". Please try a different or more specific address.'}]
        
        lat, lon = location
        
        try:
            # Step 2: Find BSSIDs that were in the area at the time
            nearby_bssids = get_bssids_in_area_at_time(self.db_manager, lat=lat, lon=lon, radius=int(radius), start_time=start_time, end_time=end_time)
            
            if not nearby_bssids:
                return [{'summary': f'No devices were found near "{address}" at that time.'}]

            # Step 3: Find the last known location for each of those BSSIDs
            final_locations = get_latest_movement_pings_for_bssids(self.db_manager, nearby_bssids)
            
            # Step 4: Format the output for the LLM
            results = []
            for bssid in nearby_bssids:
                location_info = final_locations.get(bssid)
                if location_info:
                    results.append({
                        'bssid': bssid,
                        'final_latitude': location_info['lat'],
                        'final_longitude': location_info['lon'],
                        'final_timestamp': location_info['timestamp']
                    })
            
            if not results:
                 return [{'summary': 'Found devices in the area, but could not determine their final locations.'}]
            
            return results

        except Exception as e:
            logging.error(f'Error executing tool _investigate_incident_tool: {e}')
            return [{'error': f'An error occurred: {str(e)}'}]

    # --- MODIFIED: The main chat handler now supports the address-based tool ---
    def handle_chat_request(self, message: str, conversation_id: str) -> Generator[str, None, None]:
        if not self.co:
            raise RuntimeError("ChatbotService has not been initialized. Call init_app first.")
        
        preamble = (
            'You are Sauron, an expert AI assistant for analyzing device movement trajectories. '
            'Your primary function is to help users investigate incidents by identifying nearby devices and tracking their subsequent movements. '
            'You must use the `investigate_incident_tool` whenever a user asks a question about who was near a specific location (provided as a street address) at a certain time or where those devices went afterwards. '
            'When you present the final locations, always include the BSSID for each device, as the user needs it for their map. '
            'The current time is ' + datetime.now(timezone.utc).isoformat() + '.'
        )

        tools = [{
            'name': 'investigate_incident_tool',
            'description': 'Finds devices in a given area (identified by an address) and time (from simulation data) and determines their last known location.',
            'parameter_definitions': {
                'address': {'type': 'string', 'description': 'The street address of the incident location (e.g., "1600 Amphitheatre Parkway, Mountain View, CA" or "University of Waterloo").', 'required': True},
                'radius': {'type': 'integer', 'description': 'Radius of the search area in meters.', 'required': True},
                'start_time': {'type': 'string', 'description': 'The start of the time window in ISO 8601 format (e.g., "2025-09-13T14:00:00Z").', 'required': True},
                'end_time': {'type': 'string', 'description': 'The end of the time window in ISO 8601 format (e.g., "2025-09-13T15:00:00Z").', 'required': True}
            }
        }]
        
        # First, make a blocking call to the API to see if it wants to use a tool.
        response = self.co.chat(message=message, preamble=preamble, tools=tools, conversation_id=conversation_id)

        tool_results = []
        # If the model chose a tool, execute it. This part is blocking.
        if response.tool_calls:
            for call in response.tool_calls:
                if call.name == 'investigate_incident_tool':
                    outputs = self._investigate_incident_tool(**call.parameters)
                    tool_results.append({'call': call, 'outputs': outputs})
            
            # Now, make the final call to get the text response, but this time as a stream.
            stream = self.co.chat_stream(
                message="", # No new user message, we are just providing tool results
                tools=tools,
                tool_results=tool_results,
                conversation_id=conversation_id
            )
        else:
            # If no tool was needed, we can stream the response to the original message.
            stream = self.co.chat_stream(
                message=message,
                preamble=preamble,
                tools=tools,
                conversation_id=conversation_id
            )

        # Yield each piece of the response as it comes in.
        for event in stream:
            if event.event_type == 'text-generation':
                yield event.text