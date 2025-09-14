# backend/generate_map.py
import folium
import logging
import random
from folium.plugins import TimestampedGeoJson
from collections import defaultdict

from app.extensions import db_manager
from app.db.queries import get_all_movement_pings
from app import create_app
from config import Config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def create_movement_map():
    """
    Fetches simulated movement data from the database and generates an
    interactive Folium map with a time slider.
    """
    logging.info("Starting map generation process...")
    
    app = create_app(Config)
    with app.app_context():
        # 1. Fetch all the simulated data points
        pings = get_all_movement_pings(db_manager)
        db_manager.close()

    if not pings:
        logging.error("No movement data found. Run simulate_movement.py first.")
        return

    logging.info(f"Fetched {len(pings)} data points from the database.")

    # Group pings by BSSID to form trajectories
    trajectories = defaultdict(list)
    for ping in pings:
        # Ensure lat/lon are not None before adding
        if ping['lat'] is not None and ping['lon'] is not None:
            trajectories[ping['bssid']].append(ping)

    # Calculate map center from the first point of the first trajectory
    if not trajectories:
        logging.error("Data is present but contains no valid coordinates.")
        return
    first_bssid = list(trajectories.keys())[0]
    map_center = [trajectories[first_bssid][0]['lat'], trajectories[first_bssid][0]['lon']]

    # 3. Create the Folium map
    m = folium.Map(location=map_center, zoom_start=14)
    
    # --- KEY CHANGE IS HERE ---
    # We will now format the data as one GeoJSON Feature per device,
    # where the geometry is a 'LineString' representing the entire path.
    
    features = []
    for bssid, pings_for_bssid in trajectories.items():
        # Sort by time to ensure the line is drawn correctly
        pings_for_bssid.sort(key=lambda x: x['timestamp'])
        
        # The coordinates for the LineString geometry
        line_coordinates = [[ping['lon'], ping['lat']] for ping in pings_for_bssid]
        
        # The timestamps corresponding to each coordinate
        timestamps = [ping['timestamp'].isoformat() for ping in pings_for_bssid]
        
        # Assign a random color to this device's path and marker
        device_color = f'#{random.randint(0, 0xFFFFFF):06x}'

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': line_coordinates,
            },
            'properties': {
                'times': timestamps,
                'style': {
                    'color': device_color,
                    'weight': 3,
                    'opacity': 0.7
                },
                'icon': 'circle',
                'iconstyle': {
                    'fillColor': device_color,
                    'fillOpacity': 1,
                    'stroke': 'true',
                    'color': 'white',
                    'weight': 1,
                    'radius': 6
                },
                'popup': f"<b>Device:</b><br>{bssid}"
            }
        })

    TimestampedGeoJson(
        {'type': 'FeatureCollection', 'features': features},
        period='PT1M',  # One step on the slider is 1 minute
        add_last_point=True,
        auto_play=False,
        loop=False,
        max_speed=10,
        loop_button=True,
        date_options='YYYY-MM-DD HH:mm:ss',
        time_slider_drag_update=True
    ).add_to(m)

    output_file = 'movement_map.html'
    m.save(output_file)
    logging.info(f"Map successfully generated! Open '{output_file}' in your web browser.")

if __name__ == '__main__':
    create_movement_map()