import requests
from bs4 import BeautifulSoup
import time

def test_cameras():
    # Example NYCDOT cameras 
    # List of NYCDOT camera images, usually formatted like: https://webcams.nyctmc.org/images/cctv72.jpg
    
    cameras = [
        "https://webcams.nyctmc.org/images/cctv72.jpg",
        "https://webcams.nyctmc.org/images/cctv112.jpg",
        "https://webcams.nyctmc.org/images/cctv114.jpg"
    ]
    
    for cam in cameras:
        try:
            head = requests.head(cam, timeout=5)
            print(f"{cam}: {head.status_code}")
            if head.status_code == 200:
                print(f"Content-Type: {head.headers.get('Content-Type')}")
                print(f"Content-Length: {head.headers.get('Content-Length')}")
        except Exception as e:
            print(e)

if __name__ == "__main__":
    test_cameras()
