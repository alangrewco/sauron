# backend/app/api/routes.py
import logging
import math
import json
from flask import request, jsonify, url_for, Response
from datetime import datetime
from collections import defaultdict

from . import api_blueprint
from app.extensions import db_manager
from app import chatbot_service
from app.db.queries import (
    get_trajectories_in_area,
    get_all_devices,
    get_path_for_bssid,
    get_all_movement_pings,
    get_movement_simulation_time_range
)

logging.basicConfig(level=logging.INFO)

@api_blueprint.route('/movement/trajectories', methods=['GET'])
def get_movement_trajectories():
    """
    GET endpoint to retrieve trajectories from the movement simulation.
    Accepts optional 'lat', 'lon', and 'radius' query parameters to filter
    the devices by a geographic area.
    """
    try:
        # Check for optional filter parameters
        lat = request.args.get('lat', type=float)
        lon = request.args.get('lon', type=float)
        radius = request.args.get('radius', type=int)

        # The db query function is designed to handle None for these, so no complex checks needed
        all_pings = get_all_movement_pings(db_manager, lat=lat, lon=lon, radius=radius)

        if not all_pings:
            return jsonify({'data': []})

        # Group pings by BSSID
        trajectories_grouped = defaultdict(list)
        for ping in all_pings:
            if ping['lat'] is not None and ping['lon'] is not None:
                trajectories_grouped[ping['bssid']].append({
                    'lat': ping['lat'],
                    'lon': ping['lon'],
                    'timestamp': ping['timestamp'].isoformat()
                })
        
        # Format into the final API response
        response_data = [
            {'bssid': bssid, 'trajectory': points}
            for bssid, points in trajectories_grouped.items()
        ]

        return jsonify({'data': response_data})

    except Exception as e:
        logging.error(f'Error fetching simulation trajectories: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@api_blueprint.route('/movement/time-range', methods=['GET'])
def get_time_range():
    """
    GET endpoint to retrieve the min and max timestamps from the simulation data.
    """
    try:
        min_time, max_time = get_movement_simulation_time_range(db_manager)
        if min_time and max_time:
            return jsonify({
                'start_time': min_time.isoformat(),
                'end_time': max_time.isoformat()
            })
        return jsonify({'start_time': None, 'end_time': None})
    except Exception as e:
        logging.error(f'Error fetching simulation time range: {e}')
        return jsonify({'error': 'Internal server error'}), 500

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

        response = {
            'bssid': bssid,
            'trajectory': trajectory_data
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

        if not all([lat is not None, lon is not None, radius is not None, start_time_str, end_time_str]):
            return jsonify({'error': 'Missing required parameters'}), 400

        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))

    except (ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid parameter type or format: {e}'}), 400

    try:
        trajectories = get_trajectories_in_area(db_manager, lat, lon, radius, start_time, end_time)
        return jsonify({'data': trajectories})
    except Exception as e:
        logging.error(f'Error fetching trajectories from database: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@api_blueprint.route('/chat', methods=['POST'])
def chat_with_llm():
    """
    POST endpoint for the LLM chatbot that streams the response.
    """
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Request body must include a "message" key.'}), 400

    user_message = data['message']
    conversation_id = data.get('conversation_id', f'sauron-user-{request.remote_addr}')

    try:
        # This function will be the generator for our streaming response
        def generate_stream():
            # Get the generator from the chatbot service
            stream = chatbot_service.handle_chat_request(
                message=user_message,
                conversation_id=conversation_id
            )
            # Yield each chunk from the service, formatted as a Server-Sent Event (SSE)
            for chunk in stream:
                sse_formatted_chunk = f"data: {json.dumps({'response': chunk})}\n\n"
                yield sse_formatted_chunk
        
        # Return the streaming response to the client
        return Response(generate_stream(), mimetype='text/event-stream')

    except Exception as e:
        logging.error(f'Error initializing chat stream: {e}')
        # If an error occurs, we can send a final SSE event with an error message
        error_message = json.dumps({'error': 'Failed to get response from the chatbot service.'})
        return Response(f"data: {error_message}\n\n", mimetype='text/event-stream', status=503)