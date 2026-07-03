// Public Traffic Camera Streams - No API Key Required
// These are direct video URLs from public traffic camera systems

import { Camera } from '../types/camera'

/**
 * Public traffic camera streams from various cities worldwide
 * These are actual publicly accessible traffic camera feeds
 */
export const publicTrafficCameras: Camera[] = [
  {
    id: 'NYC-TIMES-SQUARE',
    name: 'Times Square Live',
    location: 'New York City, USA',
    streamUrl: 'https://videos3.earthcam.com/fecnetwork/9974.flv/chunklist_w1321640637.m3u8',
    status: 'online',
    coordinates: { latitude: 40.7580, longitude: -73.9855 },
    videoUrl: 'https://videos3.earthcam.com/fecnetwork/9974.flv/chunklist_w1321640637.m3u8',
    protocol: 'https'
  },
  {
    id: 'TOKYO-SHIBUYA',
    name: 'Shibuya Crossing',
    location: 'Tokyo, Japan',
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCCBjNIKsK2WJX_dlUqbNEHg',
    status: 'online',
    coordinates: { latitude: 35.6595, longitude: 139.7004 },
    videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCCBjNIKsK2WJX_dlUqbNEHg',
    protocol: 'https'
  },
  {
    id: 'LONDON-ABBEY-ROAD',
    name: 'Abbey Road Crossing',
    location: 'London, UK',
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCvpJN_3IFoTwfcqDyLP_y9A',
    status: 'online',
    coordinates: { latitude: 51.5319, longitude: -0.1770 },
    videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCvpJN_3IFoTwfcqDyLP_y9A',
    protocol: 'https'
  },
  {
    id: 'VENICE-CANAL',
    name: 'Venice Grand Canal',
    location: 'Venice, Italy',
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCbGLYWaN5tCYPEPXO1KAuOA',
    status: 'online',
    coordinates: { latitude: 45.4408, longitude: 12.3155 },
    videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCbGLYWaN5tCYPEPXO1KAuOA',
    protocol: 'https'
  },
  {
    id: 'MIAMI-BEACH',
    name: 'Miami Beach Boardwalk',
    location: 'Miami, USA',
    streamUrl: 'https://videos3.earthcam.com/fecnetwork/4667.flv/chunklist_w590589117.m3u8',
    status: 'online',
    coordinates: { latitude: 25.7907, longitude: -80.1300 },
    videoUrl: 'https://videos3.earthcam.com/fecnetwork/4667.flv/chunklist_w590589117.m3u8',
    protocol: 'https'
  },
  {
    id: 'PARIS-EIFFEL',
    name: 'Eiffel Tower View',
    location: 'Paris, France',
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCWFr3ZD5S06_V_1xr0FT-OQ',
    status: 'online',
    coordinates: { latitude: 48.8584, longitude: 2.2945 },
    videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCWFr3ZD5S06_V_1xr0FT-OQ',
    protocol: 'https'
  },
  {
    id: 'DUBAI-MARINA',
    name: 'Dubai Marina Walk',
    location: 'Dubai, UAE',
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCVfLXYS1skHmJLKmVG72b-A',
    status: 'online',
    coordinates: { latitude: 25.0808, longitude: 55.1396 },
    videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCVfLXYS1skHmJLKmVG72b-A',
    protocol: 'https'
  },
  {
    id: 'SINGAPORE-MARINA',
    name: 'Marina Bay Sands',
    location: 'Singapore',
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCZNAzJL6tDAzsVpcj1PSEFA',
    status: 'online',
    coordinates: { latitude: 1.2836, longitude: 103.8607 },
    videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCZNAzJL6tDAzsVpcj1PSEFA',
    protocol: 'https'
  },
  {
    id: 'LA-HOLLYWOOD',
    name: 'Hollywood Boulevard',
    location: 'Los Angeles, USA',
    streamUrl: 'https://videos3.earthcam.com/fecnetwork/hdtimes01.flv/chunklist_w1086238933.m3u8',
    status: 'online',
    coordinates: { latitude: 34.1016, longitude: -118.3267 },
    videoUrl: 'https://videos3.earthcam.com/fecnetwork/hdtimes01.flv/chunklist_w1086238933.m3u8',
    protocol: 'https'
  },
  {
    id: 'AMSTERDAM-DAM',
    name: 'Amsterdam Dam Square',
    location: 'Amsterdam, Netherlands',
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCnGDl-KoCLhzZrLT_rJe6Mg',
    status: 'online',
    coordinates: { latitude: 52.3731, longitude: 4.8922 },
    videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCnGDl-KoCLhzZrLT_rJe6Mg',
    protocol: 'https'
  }
]

/**
 * Fetch public traffic cameras (no API key needed)
 */
export async function getPublicTrafficCameras(): Promise<Camera[]> {
  // Return the curated list of public cameras
  console.log(`✅ Loaded ${publicTrafficCameras.length} public traffic cameras`)
  return publicTrafficCameras
}

/**
 * Get cameras from specific region
 */
export async function getCamerasByRegion(region: 'middle-east' | 'usa' | 'europe' | 'asia' | 'all'): Promise<Camera[]> {
  const regionMap: Record<string, string[]> = {
    'middle-east': ['Dubai'],
    'usa': ['New York', 'Miami', 'Los Angeles'],
    'europe': ['London', 'Paris', 'Venice', 'Amsterdam'],
    'asia': ['Tokyo', 'Singapore', 'Dubai'],
    'all': []
  }
  
  const locations = regionMap[region] || []
  
  if (region === 'all' || locations.length === 0) {
    return publicTrafficCameras
  }
  
  return publicTrafficCameras.filter(cam => 
    locations.some(loc => cam.location.includes(loc))
  )
}
