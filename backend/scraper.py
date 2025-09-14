import time
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

from app.services.apple_locator import AppleLocationService
from app.services.wifi_scanner import scan_for_networks
# Import the new manager class
from db_utils import DatabaseManager, setup_database, process_scraped_data, get_bssid_for_seeding, get_total_device_count

# --- Configuration ---
WAIT_TIME_SECONDS = 5
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def bootstrap_with_local_scan(db_manager: DatabaseManager, locator: AppleLocationService):
    # ... (function content is identical, but it now accepts db_manager)
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
                pings_added = process_scraped_data(db_manager, locations, scrape_time)
                logging.info(f"Successfully seeded database with {pings_added} pings.")
                return True
        logging.error("Bootstrap failed: None of the locally found BSSIDs are in Apple's database.")
        return False
    except Exception as e:
        logging.error(f"Failed to bootstrap from local scan: {e}")
        return False

def main_scraper_loop():
    load_dotenv()
    
    # Instantiate the managers
    db_manager = DatabaseManager()
    locator = AppleLocationService()
    
    # Initial setup check
    setup_database(db_manager)
    
    try:
        while True:
            seed_bssid = None
            try:
                # Get a seed from the now-resilient connection
                seed_bssid = get_bssid_for_seeding(db_manager)
                
                if seed_bssid is None:
                    if not bootstrap_with_local_scan(db_manager, locator):
                        logging.warning("Bootstrap failed. Waiting 10 minutes before retrying.")
                        time.sleep(600)
                        continue
                
                seed_bssid = get_bssid_for_seeding(db_manager)
                if not seed_bssid:
                    logging.error("Could not get a seed BSSID even after bootstrap. Exiting.")
                    break

                logging.info(f"Processing next random seed BSSID: {seed_bssid}")
                scrape_time = datetime.now(timezone.utc)
                nearby_locations = locator.find_nearby_from_base(seed_bssid)
                
                if nearby_locations:
                    pings_added = process_scraped_data(db_manager, nearby_locations, scrape_time)
                    logging.info(f"API call returned {pings_added} pings to insert.")
                else:
                    logging.warning("API call returned no valid locations for this seed.")

            except Exception as e:
                # This is the main catch-all for API errors or other unexpected issues
                logging.error(f"An error occurred in the main loop while processing {seed_bssid}: {e}")
            
            finally:
                # This block will now safely reconnect if the connection was dropped
                total_count = get_total_device_count(db_manager)
                if total_count != -1:
                    logging.info(f"Total unique devices in database: {total_count}")
                else:
                    logging.warning("Could not retrieve total device count due to DB connection issue.")
                
                logging.info(f"Waiting for {WAIT_TIME_SECONDS} seconds...")
                time.sleep(WAIT_TIME_SECONDS)
    
    except KeyboardInterrupt:
        logging.info("Scraper stopped by user.")
    finally:
        # Ensure the connection is closed cleanly on exit
        db_manager.close()


if __name__ == "__main__":
    main_scraper_loop()