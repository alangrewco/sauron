# backend/app/services/apple_locator.py
import requests
import time
import random
import logging
from typing import Dict, Tuple, List

from app.models.protobuf import AppleWLoc_pb2
from app.utils.constants import API_URL, HEADERS, HEADER_PREFIX

# Define a safe batch size to stay under the 256-byte payload limit.
BSSID_BATCH_SIZE = 15

# --- NEW: Configuration for Exponential Backoff ---
MAX_RETRIES = 7  # The maximum number of times to retry a request
INITIAL_BACKOFF_SECONDS = 2  # The initial wait time for the first retry
MAX_BACKOFF_SECONDS = 600  # The 10-minute maximum wait time you requested

class AppleLocationService:
    """
    A service to query Apple's location API for BSSID geolocations,
    with built-in resilience using exponential backoff.
    """
    def __init__(self, timeout: int = 15):
        self.timeout = timeout

    # --- NEW: Private helper method for making requests with backoff ---
    def _make_request_with_backoff(self, request_data: bytes) -> requests.Response:
        """
        Makes an HTTP POST request and retries with exponential backoff on failure.
        """
        retries = 0
        backoff_delay = INITIAL_BACKOFF_SECONDS

        while retries < MAX_RETRIES:
            try:
                resp = requests.post(API_URL, headers=HEADERS, data=request_data, timeout=self.timeout)
                # Raise an exception for bad status codes (4xx or 5xx)
                resp.raise_for_status()
                # If the request was successful, return the response
                return resp

            except requests.exceptions.RequestException as e:
                # This catches network-level errors like timeouts, connection errors, etc.
                logging.warning(f"Request failed due to network error: {e}. Retrying...")
            
            except requests.exceptions.HTTPError as e:
                # This catches responses with bad status codes (e.g., 500, 503)
                # We only want to retry on server errors (5xx), not client errors (4xx)
                if 500 <= e.response.status_code < 600:
                    logging.warning(f"Request failed with server error {e.response.status_code}. Retrying...")
                else:
                    # For 4xx errors, retrying won't help. Re-raise the exception.
                    logging.error(f"Request failed with unrecoverable client error: {e}")
                    raise e
            
            # If we're here, a retry is warranted.
            time.sleep(backoff_delay)
            retries += 1
            
            # Calculate next backoff: double the delay and add random jitter
            jitter = random.uniform(0, backoff_delay * 0.1)
            backoff_delay = min(MAX_BACKOFF_SECONDS, backoff_delay * 2 + jitter)

        # If the loop completes, all retries have failed.
        raise requests.exceptions.RequestException(f"Request failed after {MAX_RETRIES} retries.")

    def _build_request_payload(self, bssids: List[str], single_result: bool) -> bytes:
        # This function remains unchanged
        msg = AppleWLoc_pb2.AppleWLoc()
        msg.unknown_value1 = 0
        msg.return_single_result = 1 if single_result else 0
        for bssid in bssids:
            dev = msg.wifi_devices.add()
            dev.bssid = bssid.lower()
        payload = msg.SerializeToString()
        return HEADER_PREFIX + bytes([len(payload)]) + payload

    def _parse_response(self, data: bytes) -> Dict[str, Tuple[float, float]]:
        # This function remains unchanged
        if len(data) <= 10: return {}
        blob = data[10:]
        msg = AppleWLoc_pb2.AppleWLoc()
        try:
            msg.ParseFromString(blob)
        except Exception: return {}
        results = {}
        for dev in msg.wifi_devices:
            if dev.HasField("location") and dev.location.latitude != -18000000000:
                lat = dev.location.latitude * 1e-8
                lon = dev.location.longitude * 1e-8
                results[dev.bssid] = (lat, lon)
        return results

    def get_locations(self, bssids: List[str]) -> Dict[str, Tuple[float, float]]:
        """
        Fetches geolocations for a list of BSSIDs, automatically handling batching.
        """
        if not bssids: return {}
        all_locations_found = {}
        
        for i in range(0, len(bssids), BSSID_BATCH_SIZE):
            batch = bssids[i:i + BSSID_BATCH_SIZE]
            try:
                request_data = self._build_request_payload(batch, single_result=True)
                # MODIFIED: Use the new backoff method instead of requests.post directly
                resp = self._make_request_with_backoff(request_data)
                batch_results = self._parse_response(resp.content)
                all_locations_found.update(batch_results)
            except requests.exceptions.RequestException as e:
                logging.error(f"A batch request ultimately failed after all retries: {e}")
                # We continue to the next batch instead of crashing the whole process
                continue
                
        return all_locations_found

    def find_nearby_from_base(self, base_bssid: str) -> Dict[str, Tuple[float, float]]:
        """
        Experimental: Queries for a single BSSID to see if the API returns
        other nearby BSSIDs.
        """
        request_data = self._build_request_payload([base_bssid], single_result=False)
        # MODIFIED: Use the new backoff method
        resp = self._make_request_with_backoff(request_data)
        return self._parse_response(resp.content)