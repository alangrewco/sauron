# backend/queue_scraper.py
import time
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

from app.services.apple_locator import AppleLocationService
from app.services.wifi_scanner import scan_for_networks
# Import the new queue functions
from db_utils import (
    DatabaseManager,
    setup_database,
    process_scraped_data,
    get_total_device_count,
    add_bssids_to_queue,                  # <-- NEW
    get_and_remove_next_seed_from_queue   # <-- NEW
)

# --- Configuration ---
WAIT_TIME_SECONDS = 5
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def bootstrap_with_local_scan(db_manager: DatabaseManager, locator: AppleLocationService):
    # This bootstrap logic is mostly the same...
    logging.info("Database is empty. Bootstrapping with dynamic local Wi-Fi scan...")
    try:
        local_networks = scan_for_networks()
        bssids_to_try = [net['bssid'] for net in local_networks]
        logging.info(f"Found {len(bssids_to_try)} local networks to test as seeds.")
        for bssid in bssids_to_try:
            logging.info(f"  -> Testing seed: {bssid}...")
            scrape_time = datetime.now(timezone.utc)
            locations = locator.find_nearby_from_base(bssid)
            if locations:
                logging.info(f"Success! Found a valid seed: {bssid}. It returned {len(locations)} nearby devices.")
                # First, add the devices and their locations to the main tables
                pings_added = process_scraped_data(db_manager, locations, scrape_time)
                # Now, add all these new devices to our work queue
                add_bssids_to_queue(db_manager, list(locations.keys()))
                logging.info(f"Successfully seeded database with {pings_added} pings and added them to the queue.")
                return True
        logging.error("Bootstrap failed: None of the locally found BSSIDs are in Apple's database.")
        return False
    except Exception as e:
        logging.error(f"Failed to bootstrap from local scan: {e}")
        return False

def main_scraper_loop():
    load_dotenv()
    db_manager = DatabaseManager()
    locator = AppleLocationService()
    setup_database(db_manager) # This will now create the queue table if it doesn't exist
    
    try:
        while True:
            seed_bssid = None
            try:
                # Get the next item from our persistent, transactional queue
                seed_bssid = get_and_remove_next_seed_from_queue(db_manager)
                
                if seed_bssid is None:
                    # If the queue is empty, we must bootstrap (if DB is empty) or we are done.
                    if get_total_device_count(db_manager) == 0:
                        if not bootstrap_with_local_scan(db_manager, locator):
                            logging.warning("Bootstrap failed. Waiting 10 minutes before retrying.")
                            time.sleep(600)
                            continue
                    else:
                        logging.info("Exploration queue is empty. Scraper has finished its work.")
                        break # Exit the loop
                
                logging.info(f"Processing next QUEUED seed BSSID: {seed_bssid}")
                
                scrape_time = datetime.now(timezone.utc)
                nearby_locations = locator.find_nearby_from_base(seed_bssid)
                
                if nearby_locations:
                    # First, save the location data and add any new devices to the master list
                    pings_added = process_scraped_data(db_manager, nearby_locations, scrape_time)
                    
                    # Second, add the newly discovered BSSIDs to the back of our work queue
                    new_bssids = list(nearby_locations.keys())
                    add_bssids_to_queue(db_manager, new_bssids)
                    
                    logging.info(f"API call added {pings_added} pings. Added {len(new_bssids)} devices to check to the queue.")
                else:
                    logging.warning("API call returned no valid locations for this seed.")

            except Exception as e:
                logging.error(f"An error occurred in the main loop while processing {seed_bssid}: {e}")
            
            finally:
                total_count = get_total_device_count(db_manager)
                if total_count != -1:
                    logging.info(f"Total unique devices in database: {total_count}")
                else:
                    logging.warning("Could not retrieve total device count due to DB connection issue.")
                
                logging.info(f"Waiting for {WAIT_TIME_SECONDS} seconds...")
                time.sleep(WAIT_TIME_SECONDS)
    
    except KeyboardInterrupt:
        logging.info("Queue scraper stopped by user.")
    finally:
        db_manager.close()

if __name__ == "__main__":
    main_scraper_loop()