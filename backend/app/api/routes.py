# backend/app/api/routes.py
import logging
import math
from flask import request, jsonify, url_for
from datetime import datetime

from . import api_blueprint
from app.extensions import db_manager
from app import chatbot_service
from app.db.queries import (
    get_trajectories_in_area,
    get_all_devices,
    get_path_for_bssid
)

# TODO: Consider moving to a utility module
from geopy.distance import geodesic

logging.basicConfig(level=logging.INFO)

@api_blueprint.route('/devices', methods=['GET'])
def list_all_devices():
    """
    GET endpoint to list all discovered devices with pagination.
    Includes hypermedia links for easy navigation.
    """
    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        if limit <= 0 or offset < 0:
            return jsonify({'error': 'Limit must be positive and offset must be non-negative.'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid limit or offset. Must be integers.'}), 400

    try:
        data = get_all_devices(db_manager, limit, offset)
        total_devices = data['total']
        
        # Convert datetime objects from the database into ISO strings for the JSON response
        devices = [
            {**d, 'first_seen_at': d['first_seen_at'].isoformat(), 'last_seen_at': d['last_seen_at'].isoformat()}
            for d in data['devices']
        ]

        links = {}
        links['self'] = url_for('api.list_all_devices', limit=limit, offset=offset, _external=True)
        
        if (offset + limit) < total_devices:
            links['next'] = url_for('api.list_all_devices', limit=limit, offset=offset + limit, _external=True)

        if offset > 0:
            prev_offset = max(0, offset - limit)
            links['prev'] = url_for('api.list_all_devices', limit=limit, offset=prev_offset, _external=True)

        response = {
            'data': devices,
            'pagination': {
                'total': total_devices,
                'limit': limit,
                'offset': offset,
                'page': (offset // limit) + 1,
                'pages': math.ceil(total_devices / limit) if limit > 0 else 0,
                'links': links
            }
        }
        return jsonify(response)
    except Exception as e:
        logging.error(f'Error fetching device list from database: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@api_blueprint.route('/trajectories/<string:bssid>', methods=['GET'])
def get_device_trajectory(bssid: str):
    """
    GET endpoint to retrieve the full trajectory for a specific device.
    e.g., /api/trajectories/a0:1c:8d:f5:27:81
    """
    if not bssid:
        return jsonify({'error': 'BSSID must be provided.'}), 400

    try:
        trajectory_rows = get_path_for_bssid(db_manager, bssid)
        
        if not trajectory_rows:
            return jsonify({'error': f'Device with BSSID {bssid} not found or has no location history.'}), 404
        
        # Convert datetime objects to ISO strings
        trajectory_data = [
            {**t, 'timestamp': t['timestamp'].isoformat()}
            for t in trajectory_rows
        ]
        
        isStaticDevice = check_if_static(trajectory_data)

        response = {
            'bssid': bssid,
            'trajectory': trajectory_data,
            'is_static_device': isStaticDevice
        }
        return jsonify(response)
    except Exception as e:
        logging.error(f'Error fetching trajectory for BSSID {bssid}: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@api_blueprint.route('/trajectories', methods=['GET'])
def get_filtered_trajectories():
    """
    GET endpoint to filter trajectories by area and time.
    e.g., /api/trajectories?lat=43.4715&lon=-80.5287&radius=500&start_time=2025-09-13T14:00:00Z&end_time=2025-09-13T15:00:00Z
    """
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        radius = int(request.args.get('radius'))
        start_time_str = request.args.get('start_time')
        end_time_str = request.args.get('end_time')
        isStatic = request.args.get('is_static', 'false').lower() == 'true'

        if not all([lat is not None, lon is not None, radius is not None, start_time_str, end_time_str]):
            return jsonify({'error': 'Missing required parameters'}), 400
        if isStatic is None:
            isStatic = True  # Default to True if not provided (always filter all trajectories)

        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))

    except (ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid parameter type or format: {e}'}), 400

    try:
        trajectories = get_trajectories_in_area(db_manager, lat, lon, radius, start_time, end_time)
        if isStatic:
            logging.info("FILTERING STATIC DEVICES")
            # TODO: Maybe optimize by filtering in SQL query instead of in Python
            trajectories = [t for t in trajectories if check_if_static(t['trajectory'])]
        else:
            logging.info("NOT FILTERING STATIC DEVICES")
        return jsonify({'data': trajectories})
    except Exception as e:
        logging.error(f'Error fetching trajectories from database: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@api_blueprint.route('/chat', methods=['POST'])
def chat_with_llm():
    """
    POST endpoint for the LLM chatbot.
    """
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Request body must include a "message" key.'}), 400

    user_message = data['message']
    conversation_id = data.get('conversation_id', f'sauron-user-{request.remote_addr}')

    try:
        response_text = chatbot_service.handle_chat_request(
            message=user_message,
            conversation_id=conversation_id
        )
        return jsonify({'response': response_text, 'conversation_id': conversation_id})
    except Exception as e:
        logging.error(f'Error communicating with Cohere API: {e}')
        return jsonify({'error': 'Failed to get response from the chatbot service.'}), 503
    

def check_if_static(trajectory_data):
    """
    Determine if a device is static based on its trajectory data.
    A device is considered static if it has not moved more than 10 meters over its recorded trajectory.
    """
    logging.info(trajectory_data)
    logging.info("CHECKING IF STATIC")
    DISTANCE_THRESHOLD_METERS = 10
    if len(trajectory_data) < 2:
        return True  # Not enough data to determine movement

    first_point = (trajectory_data[0]['latitude'], trajectory_data[0]['longitude'])
    for point in trajectory_data[1:]:
        current_point = (point['latitude'], point['longitude'])
        distance = geodesic(first_point, current_point).meters
        logging.info(f'Distance from first point: {distance} meters')
        if distance > DISTANCE_THRESHOLD_METERS:  # Threshold for movement
            return False
    return True 