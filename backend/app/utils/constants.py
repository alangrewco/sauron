API_URL = 'https://gs-loc.apple.com/clls/wloc'
HEADERS = {
    'User-Agent': 'locationd/1753.17 CFNetwork/889.9 Darwin/17.2.0',
    'Content-Type': 'application/octet-stream'
}
HEADER_PREFIX = (
    b"\x00\x01" b"\x00\x05" + b"en_US" + b"\x00\x13" + b"com.apple.locationd" +
    b"\x00\x0a" + b"8.1.12B411" + b"\x00\x00\x00\x01\x00\x00\x00"
)
WAIT_TIME_SECONDS = 5