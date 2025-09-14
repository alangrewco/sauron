import cohere
import logging
from datetime import datetime, timezone
from typing import List, Dict, Generator

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

    # --- NEW TOOL IMPLEMENTATION ---
    def _investigate_incident_tool(self, lat: float, lon: float, radius: int, start_time: str, end_time: str) -> List[Dict]:
        """Tool to find devices near an incident and where they went."""
        logging.info(f'Tool called: _investigate_incident_tool with params: lat={lat}, lon={lon}, radius={radius}, start={start_time}, end={end_time}')
        try:
            # Step 1: Find BSSIDs that were in the area at the time
            nearby_bssids = get_bssids_in_area_at_time(self.db_manager, lat=float(lat), lon=float(lon), radius=int(radius), start_time=start_time, end_time=end_time)
            
            if not nearby_bssids:
                return [{'summary': 'No devices were found at that location and time.'}]

            # Step 2: Find the last known location for each of those BSSIDs
            final_locations = get_latest_movement_pings_for_bssids(self.db_manager, nearby_bssids)
            
            # Step 3: Format the output for the LLM
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

    # --- MODIFIED: The main chat handler now supports tool calls and streaming ---
    def handle_chat_request(self, message: str, conversation_id: str) -> Generator[str, None, None]:
        if not self.co:
            raise RuntimeError("ChatbotService has not been initialized. Call init_app first.")
        
        preamble = (
            'You are Sauron, an expert AI assistant for analyzing device movement trajectories. '
            'Your primary function is to help users investigate incidents by identifying nearby devices and tracking their subsequent movements. '
            'You must use the `investigate_incident_tool` whenever a user asks a question about who was near a specific location at a certain time or where those devices went afterwards. '
            'When you present the final locations, always include the BSSID for each device, as the user needs it for their map. '
            'The current time is ' + datetime.now(timezone.utc).isoformat() + '.'
        )

        tools = [{
            'name': 'investigate_incident_tool',
            'description': 'Finds devices in a given area and time (from the simulation data) and determines their last known location.',
            'parameter_definitions': {
                'lat': {'type': 'number', 'description': 'Latitude of the incident location.', 'required': True},
                'lon': {'type': 'number', 'description': 'Longitude of the incident location.', 'required': True},
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