"""
Download camera videos from Google Drive to local public folder
This makes videos reliable and always accessible for the camera preview system
"""

import os
from drive_manager import authenticate_user, list_files_in_folder, download_media

# The 5 video IDs from your Google Drive folder
VIDEO_IDS = {
    '17w9Fuzg7y4dKK6bYfB_G70d4MKUuMm1R': 'camera1.mp4',  # King Fahd Road
    '1xFzLZpN0JPl3kCmDHBCPhIQreuPgPZka': 'camera2.mp4',  # Northern Ring Road
    '1A17vcq9RPbV-OlLwEjdTGnyZfqRtgCHD': 'camera3.mp4',  # King Abdullah Road
    '1_jxfSP6VJ7tQzlZ51pNX5deUgGy70_6s': 'camera4.mp4',  # Eastern Ring Road
    '1MYt68Jp6tap5LXIQ2nkqeJzFsN1SU9BG': 'camera5.mp4',  # Makkah Road
}

def main():
    print("🎥 Downloading camera videos for local hosting...")
    print("=" * 60)
    
    # Authenticate with Google Drive
    service = authenticate_user()
    print("✅ Connected to Google Drive\n")
    
    # Create public/videos folder if it doesn't exist
    # Go up one directory from python/ to project root, then to public/videos
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    videos_folder = os.path.join(project_root, 'public', 'videos')
    
    if not os.path.exists(videos_folder):
        os.makedirs(videos_folder)
        print(f"✅ Created folder: {videos_folder}\n")
    else:
        print(f"✅ Using existing folder: {videos_folder}\n")
    
    # Download each video
    for file_id, filename in VIDEO_IDS.items():
        local_path = os.path.join(videos_folder, filename)
        
        if os.path.exists(local_path):
            file_size = os.path.getsize(local_path) / (1024 * 1024)  # Convert to MB
            print(f"⏭️  Skip: {filename} (already exists, {file_size:.1f} MB)")
        else:
            print(f"📥 Downloading: {filename}...")
            try:
                download_media(service, file_id, local_path)
                file_size = os.path.getsize(local_path) / (1024 * 1024)
                print(f"✅ Downloaded: {filename} ({file_size:.1f} MB)")
            except Exception as e:
                print(f"❌ Error downloading {filename}: {e}")
        print()
    
    print("=" * 60)
    print("🎉 All videos ready for local hosting!")
    print(f"\n📁 Videos location: {videos_folder}")
    print("\n💡 Next steps:")
    print("   1. Videos are now in your public folder")
    print("   2. Update dataService.ts to use: /videos/camera1.mp4")
    print("   3. Videos will work reliably like live CCTV feeds!")

if __name__ == '__main__':
    main()
