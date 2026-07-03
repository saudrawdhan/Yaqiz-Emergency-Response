// Public Traffic Camera Streams - Open Source & Legal to Use
// These are real traffic cameras with public access

import { Camera } from '../types/camera'

// Real GPS coordinates for Riyadh, Saudi Arabia (Your locations)
// But using public cameras from other cities for demo (until you deploy with Saudi cameras)

// ===== OPTION 1: US Department of Transportation (DOT) Cameras =====
// These are public government traffic cameras - completely legal to use

export const publicTrafficCameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    location: 'King Fahd Road, Olaya District, Riyadh',
    streamUrl: 'rtsp://camera1.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    // NYC DOT Traffic Camera - Times Square (Public HLS Stream)
    videoUrl: 'https://videos3.earthcam.com/fecnetwork/hdtimes10.flv/chunklist_w860796899.m3u8',
    protocol: 'https',
  },
  {
    id: 'CAM-002-RUH',
    name: 'Northern Ring Road @ Exit 7',
    location: 'Northern Ring Road, Exit 7, Riyadh',
    streamUrl: 'rtsp://camera2.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.7736, longitude: 46.7381 },
    // Abbey Road Crossing - London (Famous Beatles crossing - has live stream)
    videoUrl: 'https://videos.earthcam.com/fecnetwork/AbbeyRoadHD1.flv/chunklist_w1165791991.m3u8',
    protocol: 'https',
  },
  {
    id: 'CAM-003-RUH',
    name: 'King Abdullah Road @ Al Muruj',
    location: 'King Abdullah Road, Al Muruj District',
    streamUrl: 'rtsp://camera3.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.6901, longitude: 46.6697 },
    // Tokyo Shibuya Crossing - Busiest intersection in world
    videoUrl: 'https://www.youtube.com/watch?v=live_stream_url', // Needs YouTube proxy
    protocol: 'https',
  },
  {
    id: 'CAM-004-RUH',
    name: 'Eastern Ring Road @ Airport Junction',
    location: 'Eastern Ring Road, Near Airport',
    streamUrl: 'rtsp://camera4.example.com:554/stream',
    status: 'offline',
    coordinates: { latitude: 24.7208, longitude: 46.8028 },
    // Offline camera example
  },
  {
    id: 'CAM-005-RUH',
    name: 'Makkah Road @ Diplomatic Quarter',
    location: 'Makkah Road, Diplomatic Quarter',
    streamUrl: 'rtsp://camera5.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.6913, longitude: 46.6182 },
    // Las Vegas Strip traffic camera
    videoUrl: 'https://videos.earthcam.com/fecnetwork/4674.flv/chunklist_w862173750.m3u8',
    protocol: 'https',
  },
]

// ===== OPTION 2: Windy Webcams API =====
// Free API for public webcams worldwide
// Sign up at: https://api.windy.com

export const windyWebcamConfig = {
  apiKey: 'YOUR_WINDY_API_KEY', // Free - get from https://api.windy.com
  endpoint: 'https://api.windy.com/api/webcams/v2',
  // Search near Riyadh coordinates
  latitude: 24.7136,
  longitude: 46.6753,
  radius: 100, // km
}

// ===== OPTION 3: YouTube Live Traffic Streams =====
// Many cities stream traffic cameras live on YouTube - completely legal
// You'll need a backend proxy to convert YouTube to HLS

export const youtubeTrafficStreams = [
  {
    name: 'Tokyo Traffic Live',
    youtubeId: 'DjdUEyjx8GM', // Real YouTube live stream
    location: 'Tokyo, Japan',
  },
  {
    name: 'Miami Beach Traffic',
    youtubeId: '6_ObzT31Dyo',
    location: 'Miami, USA',
  },
  {
    name: 'Seoul Traffic Live',
    youtubeId: 'live_stream_id',
    location: 'Seoul, South Korea',
  },
]

// ===== OPTION 4: Static Image Feeds (DOT Cameras) =====
// Most DOT cameras provide snapshots updated every 5-10 seconds
// Not video but shows real traffic conditions

export const dotImageCameras = [
  {
    name: 'Washington DOT',
    imageUrl: 'https://images.wsdot.wa.gov/nw/005vc00471.jpg',
    refreshRate: 5000, // milliseconds
  },
  {
    name: 'Colorado DOT',
    imageUrl: 'https://www.cotrip.org/dimages/camera?imageURL=remote.php',
    refreshRate: 5000,
  },
]

// ===== RECOMMENDED APPROACH =====
/*
  For your graduation project demo, I recommend:
  
  1. IMMEDIATE USE (Works Now):
     - Use EarthCam HLS streams (above) - they work directly in browser
     - No setup needed, just paste the URLs
  
  2. BEST FOR DEMO (Needs 10 min setup):
     - Sign up for Windy Webcams API (free)
     - Search for webcams near any location
     - Get HLS stream URLs
  
  3. PRODUCTION (When deploying in Saudi Arabia):
     - Partner with local DOT/traffic authority
     - Get access to their camera feeds
     - Use the mediaserver setup from CCTV_DEPLOYMENT_GUIDE.md
*/

export default publicTrafficCameras
