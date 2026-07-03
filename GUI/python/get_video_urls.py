"""
Video URL Generator for Camera System
======================================
This script helps you get direct video URLs from Google Drive
to use in your Emergency Response Camera Management system.

HOW TO USE:
1. Run this script: python get_video_urls.py
2. Copy the generated URLs
3. Update your camera data in src/services/dataService.ts

"""

import drive_manager

def get_shareable_link(service, file_id):
    """
    Get a public shareable link for a Drive file
    """
    try:
        # Make the file publicly accessible
        permission = {
            'type': 'anyone',
            'role': 'reader'
        }
        service.permissions().create(
            fileId=file_id,
            body=permission
        ).execute()
        
        # Get the file metadata
        file = service.files().get(
            fileId=file_id,
            fields='webViewLink, webContentLink, name'
        ).execute()
        
        # Convert to direct stream URL
        direct_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        return {
            'name': file.get('name'),
            'direct_url': direct_url,
            'view_link': file.get('webViewLink'),
        }
    except Exception as e:
        print(f"Error getting link: {e}")
        return None

def main():
    print("🎥 Camera Video URL Generator")
    print("=" * 50)
    
    # Authenticate
    print("\n📡 Connecting to Google Drive...")
    service = drive_manager.authenticate_user()
    
    # Get all videos from Dataset folder
    print(f"\n📂 Scanning Dataset folder...")
    videos = drive_manager.list_files_in_folder(service, drive_manager.DATASET_FOLDER_ID)
    
    if not videos:
        print("❌ No videos found in Dataset folder!")
        return
    
    print(f"\n✅ Found {len(videos)} videos!")
    print("\n" + "=" * 50)
    print("Copy these URLs to your dataService.ts:")
    print("=" * 50 + "\n")
    
    # Generate URLs for each video
    for i, video in enumerate(videos, 1):
        print(f"\n📹 Video {i}: {video['name']}")
        print(f"   ID: {video['id']}")
        
        link_info = get_shareable_link(service, video['id'])
        
        if link_info:
            print(f"   ✅ Direct URL: {link_info['direct_url']}")
            print(f"\n   💻 Add to your camera:")
            print(f"   videoUrl: '{link_info['direct_url']}',\n")
    
    print("\n" + "=" * 50)
    print("✨ Done! Copy the URLs above to your dataService.ts")
    print("=" * 50)
    
    # Example code to show
    print("\n📝 Example camera with video:")
    print("""
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    location: 'King Fahd Road, Olaya District, Riyadh',
    streamUrl: 'rtsp://camera1.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    videoUrl: 'YOUR_DIRECT_URL_HERE',  // ← Paste the URL here
  },
    """)

if __name__ == '__main__':
    main()
