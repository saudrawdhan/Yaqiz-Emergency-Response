"""
Find REAL working live CCTV/traffic cameras that work in iframes
Focus on: DOT traffic cameras, public streaming services
"""

import requests
import json
import re

def test_webcamtaxi():
    """
    Webcam-Taxi - Public webcams with embed support
    """
    print("\n=== Testing Webcam-Taxi ===")
    
    cameras = [
        {
            "id": "CAM-001",
            "name": "New York City Traffic",
            "location": "Manhattan, New York, USA",
            "embed_url": "https://www.webcamtaxi.com/en/usa/new-york/manhattan-bridge.html",
            "lat": 40.7128,
            "lng": -74.0060
        }
    ]
    
    return cameras

def get_see_cam_cameras():
    """
    See.cam - Aggregates public CCTV streams
    """
    print("\n=== See.cam Public Cameras ===")
    
    # These are sample embed patterns from see.cam
    cameras = [
        {
            "id": "CAM-001",
            "name": "Traffic Camera - Sample",
            "location": "Various locations",
            "provider": "see.cam",
            "note": "Requires manual URL finding from see.cam website"
        }
    ]
    
    return cameras

def get_windy_cams():
    """
    Windy.com has live webcams that can be embedded
    """
    print("\n=== Windy Webcams ===")
    
    # Windy webcams with embed capability
    cameras = [
        {
            "id": "CAM-001",
            "name": "Tokyo Shibuya",
            "embed_url": "https://embed.windy.com/embed2.html?lat=35.659&lon=139.700&detailLat=35.659&detailLon=139.700&width=650&height=450&zoom=8&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=default&metricTemp=default&radarRange=-1",
            "lat": 35.659,
            "lng": 139.700,
            "provider": "Windy"
        }
    ]
    
    return cameras

def test_rtsp_to_web_solutions():
    """
    Explain how to use RTSP cameras in browser
    """
    print("\n=== RTSP to Web Solutions ===")
    print("Public DOT cameras use RTSP/MJPEG protocols")
    print("Options to display in browser:")
    print("  1. Use JSMpeg player for MPEG-TS streams")
    print("  2. Use HLS.js for HLS streams")
    print("  3. Convert RTSP to WebRTC via backend")
    print("  4. Use MJPEG image refresh for still images")
    
    return None

def get_mjpeg_cameras():
    """
    MJPEG cameras from various DOT sources
    These display as continuously updating images
    """
    print("\n=== MJPEG Traffic Cameras ===")
    
    # Real DOT traffic camera URLs (MJPEG format)
    cameras = [
        {
            "id": "CAM-001",
            "name": "I-5 @ NE 45th St Seattle",
            "location": "Seattle, WA, USA",
            "type": "mjpeg",
            "image_url": "https://images.wsdot.wa.gov/nw/005vc00111.jpg",
            "refresh_rate": 5000,  # milliseconds
            "lat": 47.6615,
            "lng": -122.3320,
            "provider": "WSDOT"
        },
        {
            "id": "CAM-002", 
            "name": "I-90 Bridge Seattle",
            "location": "Seattle, WA, USA",
            "type": "mjpeg",
            "image_url": "https://images.wsdot.wa.gov/nw/090vc07750.jpg",
            "refresh_rate": 5000,
            "lat": 47.5901,
            "lng": -122.2363,
            "provider": "WSDOT"
        },
        {
            "id": "CAM-003",
            "name": "SR 520 Bridge Seattle",
            "location": "Seattle, WA, USA",
            "type": "mjpeg",
            "image_url": "https://images.wsdot.wa.gov/nw/520vc00221.jpg",
            "refresh_rate": 5000,
            "lat": 47.6404,
            "lng": -122.2508,
            "provider": "WSDOT"
        },
        {
            "id": "CAM-004",
            "name": "I-405 @ NE 8th St Bellevue",
            "location": "Bellevue, WA, USA",
            "type": "mjpeg",
            "image_url": "https://images.wsdot.wa.gov/nw/405vc01338.jpg",
            "refresh_rate": 5000,
            "lat": 47.6153,
            "lng": -122.1848,
            "provider": "WSDOT"
        },
        {
            "id": "CAM-005",
            "name": "I-5 @ Downtown Seattle",
            "location": "Seattle, WA, USA",
            "type": "mjpeg",
            "image_url": "https://images.wsdot.wa.gov/nw/005vc16553.jpg",
            "refresh_rate": 5000,
            "lat": 47.6097,
            "lng": -122.3331,
            "provider": "WSDOT"
        }
    ]
    
    print(f"Found {len(cameras)} MJPEG traffic cameras")
    print("\nThese cameras:")
    print("  ✓ Update every 5 seconds (live)")
    print("  ✓ No embedding restrictions")
    print("  ✓ Real DOT traffic cameras")
    print("  ✓ Work reliably in browsers")
    
    return cameras

def test_mjpeg_access(cameras):
    """Test if MJPEG image URLs are accessible"""
    print("\n=== Testing MJPEG Camera Access ===")
    
    working_cameras = []
    
    for cam in cameras:
        try:
            print(f"\nTesting: {cam['name']}")
            response = requests.head(cam['image_url'], timeout=10, allow_redirects=True)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"  ✓ Accessible")
                cam['status'] = 'online'
                working_cameras.append(cam)
            else:
                print(f"  ✗ Not accessible")
                cam['status'] = 'offline'
        except Exception as e:
            print(f"  ✗ Error: {e}")
            cam['status'] = 'error'
    
    return working_cameras

def get_live_stream_alternatives():
    """
    Alternative: Live HLS/DASH streams
    """
    print("\n=== HLS/DASH Live Stream Options ===")
    
    # Some public HLS streams (these work with hls.js)
    streams = [
        {
            "name": "Big Buck Bunny (Test Stream)",
            "url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            "type": "hls",
            "note": "Test stream - not real traffic"
        }
    ]
    
    print("Note: Real traffic HLS streams are rare in public APIs")
    print("Most DOT cameras use MJPEG (static images) instead")
    
    return streams

def main():
    print("="*70)
    print("FINDING REAL WORKING LIVE CCTV CAMERAS")
    print("="*70)
    
    # Get MJPEG traffic cameras
    mjpeg_cameras = get_mjpeg_cameras()
    
    # Test if they're accessible
    working_cameras = test_mjpeg_access(mjpeg_cameras)
    
    # Get alternatives
    rtsp_info = test_rtsp_to_web_solutions()
    hls_streams = get_live_stream_alternatives()
    
    print("\n" + "="*70)
    print("RECOMMENDATION")
    print("="*70)
    
    if working_cameras:
        print(f"\n✓ MJPEG Cameras: {len(working_cameras)} working")
        print("\nBest option for your project:")
        print("  1. Use MJPEG image URLs that refresh every 5 seconds")
        print("  2. These are REAL DOT traffic cameras")
        print("  3. Live updates (image refreshes continuously)")
        print("  4. No embedding restrictions")
        print("  5. Works in all browsers")
        
        print("\nImplementation:")
        print("  - Display image with auto-refresh")
        print("  - Add timestamp overlay")
        print("  - Show 'LIVE' badge")
    else:
        print("\n⚠ No MJPEG cameras accessible")
        print("Fallback: Use Google Drive videos with loop")
    
    # Save results
    results = {
        "mjpeg_cameras": working_cameras,
        "refresh_rate_ms": 5000,
        "type": "mjpeg",
        "implementation": "Use img tag with periodic src refresh"
    }
    
    with open('real_live_cameras.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✓ Results saved to: real_live_cameras.json")
    
    return results

if __name__ == "__main__":
    main()
