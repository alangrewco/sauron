# backend/app/db/queries.py
import logging
import random
from typing import Dict, Optional, Tuple, List
from psycopg2.extras import RealDictCursor
from .manager import DatabaseManager, handle_db_reconnection

@handle_db_reconnection
def setup_tracking_table(db_manager: DatabaseManager):
    """
    Ensures the table for movement tracking exists and clears any old data
    from tracking runs.
    """
    conn = db_manager.get_connection()
    if not conn: return
    with conn.cursor() as cur:
        # Step 1: Create the table if it doesn't already exist.
        cur.execute("""
            CREATE TABLE IF NOT EXISTS movement_tracking_pings (
                id SERIAL PRIMARY KEY,
                bssid VARCHAR(17) NOT NULL REFERENCES devices(bssid) ON DELETE CASCADE,
                timestamp TIMESTAMPTZ NOT NULL,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                location GEOGRAPHY(Point, 4326)
            );
        """)
        
        # Step 2: Clear all existing rows from the table for a fresh start.
        # TRUNCATE is much faster than DELETE for clearing an entire table.
        # RESTART IDENTITY resets the 'id' counter back to 1.
        cur.execute("TRUNCATE TABLE movement_tracking_pings RESTART IDENTITY;") # <-- THIS IS THE NEW LINE
        
        # Step 3: Ensure the index exists.
        cur.execute("CREATE INDEX IF NOT EXISTS idx_movement_tracking_pings_bssid_timestamp ON movement_tracking_pings (bssid, timestamp);")
    
    conn.commit()
    logging.info("[DB] Movement tracking table is set up and cleared.")

@handle_db_reconnection
def get_all_devices(db_manager: DatabaseManager, limit: int = 100, offset: int = 0) -> Dict:
    """
    Retrieves a paginated list of all devices from the database, along with the total count.
    """
    conn = db_manager.get_connection()
    if not conn:
        return {'total': 0, 'devices': []}
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # First, get the total count of devices for pagination metadata
        cur.execute("SELECT COUNT(*) AS total_count FROM devices;")
        total_count = cur.fetchone()['total_count']
        
        # Then, fetch the paginated list of devices, ordered by the most recently seen
        cur.execute("""
            SELECT bssid, first_seen_at, last_seen_at
            FROM devices
            ORDER BY last_seen_at DESC
            LIMIT %s OFFSET %s;
        """, (limit, offset))
        devices = cur.fetchall()
        
    return {'total': total_count, 'devices': devices}

@handle_db_reconnection
def get_path_for_bssid(db_manager: DatabaseManager, bssid: str) -> list:
    """
    Fetches all historical pings for a single BSSID, ordered by time.
    Returns a list of dictionaries, where each dict is a point in the path.
    """
    conn = db_manager.get_connection()
    if not conn:
        return []
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT latitude AS lat, longitude AS lon, timestamp
            FROM location_pings
            WHERE bssid = %s
            ORDER BY timestamp ASC;
        """, (bssid,))
        results = cur.fetchall()
        # The results from RealDictCursor are already in the desired list of dicts format
        return results

@handle_db_reconnection
def setup_database(db_manager: DatabaseManager):
    """Ensures the necessary tables and extensions exist in the database."""
    conn = db_manager.get_connection()
    if not conn: return
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                bssid VARCHAR(17) PRIMARY KEY,
                first_seen_at TIMESTAMPTZ DEFAULT NOW(),
                last_seen_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS location_pings (
                id SERIAL PRIMARY KEY,
                bssid VARCHAR(17) NOT NULL REFERENCES devices(bssid) ON DELETE CASCADE,
                timestamp TIMESTAMPTZ NOT NULL,
                latitude DOUBLE PRECISION NOT NULL,
                longitude DOUBLE PRECISION NOT NULL,
                location GEOGRAPHY(Point, 4326)
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS exploration_queue (
                bssid VARCHAR(17) PRIMARY KEY
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_location_pings_bssid_timestamp ON location_pings (bssid, timestamp);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_location_pings_location ON location_pings USING GIST (location);")
    conn.commit()
    logging.info("[DB] Database setup check complete.")

@handle_db_reconnection
def process_scraped_data(db_manager: DatabaseManager, bssids_with_locs: Dict[str, Tuple[float, float]], scrape_timestamp):
    """Atomically updates the database with new devices and location pings."""
    if not bssids_with_locs: return 0
    conn = db_manager.get_connection()
    if not conn: return 0
    with conn.cursor() as cur:
        device_upsert_data = [(bssid, scrape_timestamp) for bssid in bssids_with_locs.keys()]
        upsert_query = """
            INSERT INTO devices (bssid, last_seen_at) VALUES (%s, %s)
            ON CONFLICT (bssid) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
        """
        cur.executemany(upsert_query, device_upsert_data)
        
        ping_insert_data = []
        for bssid, (lat, lon) in bssids_with_locs.items():
            point_wkt = f"POINT({lon} {lat})"
            ping_insert_data.append((bssid, scrape_timestamp, lat, lon, point_wkt))
        
        insert_query = """
            INSERT INTO location_pings (bssid, timestamp, latitude, longitude, location)
            VALUES (%s, %s, %s, %s, ST_GeogFromText(%s));
        """
        cur.executemany(insert_query, ping_insert_data)
    conn.commit()
    return len(bssids_with_locs)

@handle_db_reconnection
def get_path_for_bssid(db_manager: DatabaseManager, bssid: str) -> list:
    """Fetches all historical pings for a single BSSID, ordered by time."""
    conn = db_manager.get_connection()
    if not conn: return []
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT latitude AS lat, longitude AS lon, timestamp
            FROM location_pings
            WHERE bssid = %s
            ORDER BY timestamp ASC;
        """, (bssid,))
        return cur.fetchall()

@handle_db_reconnection
def get_trajectories_in_area(db_manager: DatabaseManager, lat: float, lon: float, radius: int, start_time, end_time) -> List[Dict]:
    """
    Finds BSSIDs that were within a radius of a point in a time window,
    and returns the full trajectory for each of those BSSIDs.
    """
    conn = db_manager.get_connection()
    if not conn: return []
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        query = """
            WITH bssids_in_area AS (
                SELECT DISTINCT bssid
                FROM location_pings
                WHERE ST_DWithin(location, ST_MakePoint(%s, %s)::geography, %s)
                  AND timestamp BETWEEN %s AND %s
            )
            SELECT
                lp.bssid,
                lp.latitude AS lat,
                lp.longitude AS lon,
                lp.timestamp
            FROM location_pings lp
            JOIN bssids_in_area bia ON lp.bssid = bia.bssid
            ORDER BY lp.bssid, lp.timestamp ASC;
        """
        cur.execute(query, (lon, lat, radius, start_time, end_time))
        results = cur.fetchall()

    trajectories = {}
    for row in results:
        bssid = row['bssid']
        if bssid not in trajectories:
            trajectories[bssid] = {'bssid': bssid, 'trajectory': []}
        trajectories[bssid]['trajectory'].append({
            'lat': row['lat'],
            'lon': row['lon'],
            'timestamp': row['timestamp'].isoformat()
        })
    
    return list(trajectories.values())

@handle_db_reconnection
def get_bssid_for_seeding(db_manager: DatabaseManager) -> Optional[str]:
    conn = db_manager.get_connection()
    if not conn: return None
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM devices;")
        count_result = cur.fetchone()
        if not count_result or count_result[0] == 0: return None
        count = count_result[0]
        offset = random.randint(0, count - 1)
        cur.execute("SELECT bssid FROM devices LIMIT 1 OFFSET %s;", (offset,))
        result = cur.fetchone()
        return result[0] if result else None

@handle_db_reconnection
def get_total_device_count(db_manager: DatabaseManager) -> int:
    conn = db_manager.get_connection()
    if not conn: return -1
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM devices;")
        return cur.fetchone()[0]

@handle_db_reconnection
def add_bssids_to_queue(db_manager: DatabaseManager, bssids: list):
    if not bssids: return
    conn = db_manager.get_connection()
    if not conn: return
    insert_data = [(bssid,) for bssid in bssids]
    with conn.cursor() as cur:
        cur.executemany("INSERT INTO exploration_queue (bssid) VALUES (%s) ON CONFLICT (bssid) DO NOTHING;", insert_data)
    conn.commit()

@handle_db_reconnection
def get_and_remove_next_seed_from_queue(db_manager: DatabaseManager) -> Optional[str]:
    conn = db_manager.get_connection()
    if not conn: return None
    with conn.cursor() as cur:
        cur.execute("DELETE FROM exploration_queue WHERE bssid = (SELECT bssid FROM exploration_queue LIMIT 1) RETURNING bssid;")
        result = cur.fetchone()
        return result[0] if result else None

# --- Functions for generate_story.py script ---
@handle_db_reconnection
def ensure_device_exists(db_manager: DatabaseManager, bssid: str):
    conn = db_manager.get_connection()
    if not conn: return
    with conn.cursor() as cur:
        cur.execute("INSERT INTO devices (bssid) VALUES (%s) ON CONFLICT DO NOTHING;", (bssid,))
    conn.commit()

@handle_db_reconnection
def clear_suspect_history(db_manager: DatabaseManager, bssid: str) -> int:
    conn = db_manager.get_connection()
    if not conn: return 0
    with conn.cursor() as cur:
        cur.execute("DELETE FROM location_pings WHERE bssid = %s;", (bssid,))
        deleted_count = cur.rowcount
    conn.commit()
    return deleted_count

@handle_db_reconnection
def insert_pings(db_manager: DatabaseManager, pings: list):
    conn = db_manager.get_connection()
    if not conn: return
    with conn.cursor() as cur:
        insert_query = """
            INSERT INTO location_pings (bssid, timestamp, latitude, longitude, location)
            VALUES (%s, %s, %s, %s, ST_GeogFromText(%s));
        """
        cur.executemany(insert_query, pings)
    conn.commit()

@handle_db_reconnection
def get_all_bssids(db_manager: DatabaseManager) -> List[str]:
    """Retrieves a list of every BSSID in the devices table."""
    conn = db_manager.get_connection()
    if not conn: return []
    with conn.cursor() as cur:
        cur.execute("SELECT bssid FROM devices;")
        # Flatten the list of tuples returned by fetchall() into a simple list of strings.
        results = [row[0] for row in cur.fetchall()]
        return results
    
@handle_db_reconnection
def get_latest_pings_for_bssids(db_manager: DatabaseManager, bssids: List[str]) -> Dict[str, Dict]:
    """
    Fetches the single most recent location_ping for each BSSID in a given list.
    """
    if not bssids:
        return {}
    conn = db_manager.get_connection()
    if not conn:
        return {}
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        query = """
            SELECT DISTINCT ON (bssid)
                bssid, latitude AS lat, longitude AS lon
            FROM location_pings
            WHERE bssid = ANY(%s)
            ORDER BY bssid, timestamp DESC;
        """
        cur.execute(query, (bssids,))
        results = cur.fetchall()
    return {row['bssid']: {'lat': row['lat'], 'lon': row['lon']} for row in results}

@handle_db_reconnection
def insert_tracking_pings(db_manager: DatabaseManager, pings: List[Dict]):
    """
    Atomically inserts a batch of location pings into the movement_tracking_pings table.
    """
    if not pings: return 0
    conn = db_manager.get_connection()
    if not conn: return 0
    
    with conn.cursor() as cur:
        insert_data = []
        for ping in pings:
            lat = ping.get('lat')
            lon = ping.get('lon')
            point_wkt = f"POINT({lon} {lat})" if lat is not None and lon is not None else None
            insert_data.append((ping['bssid'], ping['timestamp'], lat, lon, point_wkt))
        
        insert_query = """
            INSERT INTO movement_tracking_pings (bssid, timestamp, latitude, longitude, location)
            VALUES (%s, %s, %s, %s, ST_GeogFromText(%s));
        """
        cur.executemany(insert_query, insert_data)
    conn.commit()
    return len(pings)

@handle_db_reconnection
def get_all_movement_pings(db_manager: DatabaseManager) -> List[Dict]:
    """
    Fetches all records from the movement_tracking_pings table, ordered by time.
    """
    conn = db_manager.get_connection()
    if not conn: return []
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT bssid, latitude AS lat, longitude AS lon, timestamp
            FROM movement_tracking_pings
            ORDER BY timestamp ASC;
        """)
        return cur.fetchall()