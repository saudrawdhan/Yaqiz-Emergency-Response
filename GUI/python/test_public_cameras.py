"""
Test script to find and verify public CCTV camera feeds
Based on: EarthCam, Evercam, CameraFTP, and Government DOT feeds
"""

import requests
import json

def test_evercam_api():
    """Test Evercam Public Cameras API"""
    print("\n=== Testing Evercam API ===")
    try:
        # Evercam public cameras endpoint
        url = "https://api.evercam.io/v1/cameras/public"
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Found cameras: {len(data.get('cameras', []))}")
            
            # Show first few cameras
            cameras = data.get('cameras', [])[:5]
            for idx, cam in enumerate(cameras, 1):
                print(f"\nCamera {idx}:")
                print(f"  Name: {cam.get('name', 'N/A')}")
                print(f"  Location: {cam.get('location', 'N/A')}")
                print(f"  Status: {cam.get('status', 'N/A')}")
                print(f"  Stream URL: {cam.get('external_url', 'N/A')}")
            
            return cameras
        else:
            print(f"Error: {response.text}")
            return []
    except Exception as e:
        print(f"Error testing Evercam: {e}")
        return []

def test_dot_cameras():
    """Test Department of Transportation cameras (US)"""
    print("\n=== Testing DOT Traffic Cameras ===")
    
    # Try a few known DOT feeds
    sources = [
        {
            "name": "NYC DOT",
            "url": "https://webcams.nyctmc.org/api/cameras",
        },
        {
            "name": "Washington DOT",
            "url": "https://www.wsdot.wa.gov/traffic/api/cameras.json",
        }
    ]
    
    working_cameras = []
    
    for source in sources:
        try:
            print(f"\nTrying {source['name']}...")
            response = requests.get(source['url'], timeout=10)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Working! Found data: {len(str(data))} chars")
                
                # Try to extract camera info
                if isinstance(data, list):
                    cameras = data[:3]
                    for cam in cameras:
                        print(f"  Camera: {cam.get('name', cam.get('title', 'Unknown'))}")
                        working_cameras.append({
                            'source': source['name'],
                            'data': cam
                        })
                elif isinstance(data, dict):
                    print(f"  Response keys: {list(data.keys())}")
                    working_cameras.append({
                        'source': source['name'],
                        'data': data
                    })
            else:
                print(f"✗ Failed: {response.status_code}")
                
        except Exception as e:
            print(f"✗ Error: {e}")
    
    return working_cameras

def test_insecam():
    """Test Insecam (World's biggest directory of online surveillance cameras)"""
    print("\n=== Testing Insecam ===")
    try:
        # Insecam has cameras from around the world
        url = "http://www.insecam.org/en/jsoncountries/"
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Countries available: {len(data.get('countries', []))}")
            return data
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Error testing Insecam: {e}")
        return None

def test_webcams_travel():
    """Test Webcams.travel API"""
    print("\n=== Testing Webcams.travel ===")
    try:
        # This is a commercial API but has free tier
        # Note: Requires API key for most endpoints
        url = "https://webcamstravel.p.rapidapi.com/webcams/list/nearby=24.7136,46.6753,50"
        
        # Try without key first to see response
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        return None
    except Exception as e:
        print(f"Error testing Webcams.travel: {e}")
        return None

def test_direct_streams():
    """Test some known public stream URLs"""
    print("\n=== Testing Direct Public Streams ===")
    
    # Some known working public camera streams
    test_streams = [
        {
            "name": "Times Square NY",
            "url": "https://videos3.earthcam.com/fecnetwork/9974.flv/chunklist_w414825352.m3u8",
            "type": "HLS"
        },
        {
            "name": "Abbey Road London",
            "url": "https://videos-3.earthcam.com/fecnetwork/AbbeyRoadHD1.flv/chunklist_w414825352.m3u8",
            "type": "HLS"
        }
    ]
    
    working_streams = []
    
    for stream in test_streams:
        try:
            print(f"\nTesting: {stream['name']}")
            response = requests.head(stream['url'], timeout=10, allow_redirects=True)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"  ✓ Stream is accessible!")
                working_streams.append(stream)
            else:
                print(f"  ✗ Not accessible")
                
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    return working_streams

def main():
    print("="*60)
    print("TESTING PUBLIC CCTV CAMERA SOURCES")
    print("="*60)
    
    results = {
        'evercam': [],
        'dot': [],
        'insecam': None,
        'direct_streams': []
    }
    
    # Test all sources
    results['evercam'] = test_evercam_api()
    results['dot'] = test_dot_cameras()
    results['insecam'] = test_insecam()
    results['direct_streams'] = test_direct_streams()
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if results['evercam']:
        print(f"✓ Evercam: {len(results['evercam'])} cameras found")
    else:
        print("✗ Evercam: No cameras found")
    
    if results['dot']:
        print(f"✓ DOT Cameras: {len(results['dot'])} sources working")
    else:
        print("✗ DOT Cameras: No sources working")
    
    if results['insecam']:
        print(f"✓ Insecam: Data available")
    else:
        print("✗ Insecam: Not accessible")
    
    if results['direct_streams']:
        print(f"✓ Direct Streams: {len(results['direct_streams'])} working")
        for stream in results['direct_streams']:
            print(f"  - {stream['name']}")
    else:
        print("✗ Direct Streams: None working")
    
    print("\n" + "="*60)
    
    # Save results to file
    with open('public_cameras_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print("Results saved to: public_cameras_results.json")

if __name__ == "__main__":
    main()
