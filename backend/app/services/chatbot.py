# backend/app/services/chatbot.py
import cohere
import logging
from datetime import datetime, timezone
from typing import List, Dict

# REMOVE the circular import: from app.extensions import db_manager
from app.db.queries import get_trajectories_in_area

class ChatbotService:
    """A service for Cohere that receives its dependencies upon creation."""
    
    # --- MODIFIED PART ---
    # The service now accepts the db_manager as an argument
    def __init__(self, db_manager):
        self.co = None
        self.db_manager = db_manager  # Store the db_manager instance

    def init_app(self, app):
        """Initializes the Cohere client using the Flask app's config."""
        api_key = app.config.get('COHERE_API_KEY')
        if not api_key:
            raise ValueError('COHERE_API_KEY not set in Flask config.')
        self.co = cohere.Client(api_key)

    def _get_trajectories_tool(self, lat: float, lon: float, radius: int, start_time: str, end_time: str) -> List[Dict]:
        logging.info(f'Tool called by LLM: get_trajectories_in_area with params: lat={lat}, lon={lon}, radius={radius}, start={start_time}, end={end_time}')
        try:
            # Use the stored db_manager instance
            data = get_trajectories_in_area(self.db_manager, lat=float(lat), lon=float(lon), radius=int(radius), start_time=start_time, end_time=end_time)
            if not data:
                return [{'summary': 'No device trajectories were found matching the specified criteria.'}]
            return data
        except Exception as e:
            logging.error(f'Error executing tool get_trajectories_in_area: {e}')
            return [{'error': f'An error occurred: {e}'}]

    # --- handle_chat_request method remains the same ---
    def handle_chat_request(self, message: str, conversation_id: str):
        if not self.co:
            raise RuntimeError("ChatbotService has not been initialized. Call init_app first.")
        
        preamble = (
            'You are Sauron, an expert AI assistant for analyzing device movement trajectories. '
            'Your goal is to answer questions by finding and interpreting location data. '
            'When a user asks about devices in a specific area and time, you must use the '
            '`get_trajectories_tool` to fetch the data. NEVER make up data. '
            'The current time is ' + datetime.now(timezone.utc).isoformat() + '.'
        )

        tools = [{
            'name': 'get_trajectories_tool',
            'description': 'Fetches trajectories of devices in a circular area within a time window.',
            'parameter_definitions': {
                'lat': {'type': 'number', 'description': 'Latitude of the center of the search area.', 'required': True},
                'lon': {'type': 'number', 'description': 'Longitude of the center of the search area.', 'required': True},
                'radius': {'type': 'integer', 'description': 'Radius of the search area in meters.', 'required': True},
                'start_time': {'type': 'string', 'description': 'The start of the time window in ISO 8601 format (e.g., "2025-09-13T14:00:00Z").', 'required': True},
                'end_time': {'type': 'string', 'description': 'The end of the time window in ISO 8601 format (e.g., "2025-09-13T15:00:00Z").', 'required': True}
            }
        }]
        
        response = self.co.chat(message=message, preamble=preamble, tools=tools, conversation_id=conversation_id)

        while response.tool_calls:
            tool_outputs = []
            for call in response.tool_calls:
                if call.name == 'get_trajectories_tool':
                    outputs = self._get_trajectories_tool(**call.parameters)
                    tool_outputs.append({'call': call, 'outputs': outputs})
            response = self.co.chat(message='', tools=tools, tool_results=tool_outputs, conversation_id=conversation_id)
        return response.text