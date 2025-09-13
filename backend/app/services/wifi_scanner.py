# backend/app/services/wifi_scanner.py
import subprocess
import re
from typing import List, Dict

def scan_for_networks() -> List[Dict[str, str]]:
    """
    Scans for nearby Wi-Fi networks using macOS's 'airport' utility.

    This function is designed to be run on a macOS machine. It executes the
    command-line tool and parses its output into a structured format.

    Raises:
        FileNotFoundError: If the 'airport' command is not found. This will
                           happen if the script is run on a non-macOS system.
        subprocess.CalledProcessError: If the 'airport' command fails to execute
                                       for any reason.
        RuntimeError: If the command runs but no Wi-Fi networks are found
                      (e.g., if Wi-Fi is turned off).

    Returns:
        A list of dictionaries, where each dictionary represents a network
        and contains the 'ssid' and 'bssid'.
        Example: [{"ssid": "MyWiFi", "bssid": "aa:bb:cc:11:22:33"}, ...]
    """
    # The full, non-standard path to the airport utility
    airport_path = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
    
    try:
        # Execute the command, ensuring it raises an error on failure
        scan_output = subprocess.check_output(
            [airport_path, "-s"], text=True, stderr=subprocess.PIPE
        )
    except FileNotFoundError:
        raise FileNotFoundError(
            "The 'airport' command was not found. This service only runs on macOS."
        )
    except subprocess.CalledProcessError as e:
        raise subprocess.CalledProcessError(
            f"Error executing airport command: {e.stderr}"
        )

    # A robust regex to find a BSSID (MAC address) in a line of text.
    # This is more reliable than splitting by spaces, as SSIDs can contain spaces.
    bssid_pattern = re.compile(r'([0-9a-fA-F]{1,2}:){5}[0-9a-fA-F]{1,2}')
    
    # Split the output into individual lines and skip the header line
    lines = scan_output.strip().split('\n')[1:]
    
    networks = []
    for line in lines:
        match = bssid_pattern.search(line)
        if match:
            bssid = match.group(0)
            # The SSID is everything in the line before the BSSID match
            ssid = line[:match.start()].strip()
            networks.append({"ssid": ssid, "bssid": bssid})
            
    if not networks:
        raise RuntimeError("No Wi-Fi networks found. Is your Wi-Fi turned on?")
        
    return networks