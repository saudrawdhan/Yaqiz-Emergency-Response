// Windy Webcams API Integration
// Fetches real public webcams worldwide
import { Camera } from '../types/camera'

const WINDY_API_KEY = import.meta.env.VITE_WINDY_API_KEY ?? ''
const WINDY_BASE_URL = 'https://api.windy.com/api/webcams/v2'

export interface WindyWebcam {
  id: string
  title: string
  status: string
  location: {
    latitude: number
    longitude: number
    city: string
    country: string
  }
  player: {
    live: {
      embed?: string
      available: boolean
    }
    day?: {
      embed?: string
      available: boolean
    }
  }
  image: {
    current: {
      preview: string
      thumbnail: string
    }
  }
}

interface WindyResponse {
  status: string
  result: {
    webcams: WindyWebcam[]
    total: number
  }
}

/**
 * Fetch webcams from Windy API
 * Note: Free tier doesn't support location filtering - fetches random webcams instead
 */
export async function fetchWebcamsNearLocation(
  _latitude: number,
  _longitude: number,
  _radiusKm: number = 50
): Promise<WindyWebcam[]> {
  try {
    // Free tier only supports basic list endpoint
    // Fetch random webcams with traffic/city categories
    const url = `${WINDY_BASE_URL}/list/category=traffic,city?show=webcams:location,player,image&limit=20&key=${WINDY_API_KEY}`
    
    console.log('Fetching webcams from Windy (free tier - no location filtering):', url.replace(WINDY_API_KEY, '***'))
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`Windy API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return []
    }
    
    const data: WindyResponse = await response.json()
    
    if (data.status === 'OK' && data.result.webcams) {
      // Filter only webcams with live streams available
      const liveWebcams = data.result.webcams.filter(cam => cam.player?.live?.available)
      console.log(`✅ Found ${liveWebcams.length} live webcams from Windy`)
      return liveWebcams
    }
    
    return []
  } catch (error) {
    console.error('Error fetching Windy webcams:', error)
    return []
  }
}

/**
 * Fetch webcams in a specific region/country
 */
export async function fetchWebcamsByCountry(
  countryCode: string,
  limit: number = 10
): Promise<WindyWebcam[]> {
  try {
    // Correct Windy API v2 format: path parameters with forward slashes
    const url = `${WINDY_BASE_URL}/list/country/${countryCode}?show=webcams:location,player,image&limit=${limit}&key=${WINDY_API_KEY}`
    
    const response = await fetch(url)
    const data: WindyResponse = await response.json()
    
    if (data.status === 'OK' && data.result.webcams) {
      return data.result.webcams.filter(cam => cam.player.live.available)
    }
    
    return []
  } catch (error) {
    console.error('Error fetching webcams by country:', error)
    return []
  }
}

/**
 * Search for traffic/highway webcams
 */
export async function fetchTrafficWebcams(
  latitude: number,
  longitude: number,
  radiusKm: number = 100
): Promise<WindyWebcam[]> {
  const webcams = await fetchWebcamsNearLocation(latitude, longitude, radiusKm)
  
  // Filter for webcams likely to show traffic (based on title keywords)
  const trafficKeywords = ['traffic', 'highway', 'road', 'street', 'bridge', 'tunnel', 'junction', 'intersection']
  
  return webcams.filter(cam => {
    const title = cam.title.toLowerCase()
    return trafficKeywords.some(keyword => title.includes(keyword))
  })
}

/**
 * Get webcam stream URL
 */
export function getWebcamStreamUrl(webcam: WindyWebcam): string | null {
  // Try live stream first
  if (webcam.player.live.available && webcam.player.live.embed) {
    return webcam.player.live.embed
  }
  
  // Fallback to day stream
  if (webcam.player.day?.available && webcam.player.day?.embed) {
    return webcam.player.day.embed
  }
  
  return null
}

/**
 * Convert Windy webcam to our Camera format
 */
export function convertWindyWebcamToCamera(webcam: WindyWebcam): Camera {
  const streamUrl = getWebcamStreamUrl(webcam)
  
  return {
    id: `WINDY-${webcam.id}`,
    name: webcam.title,
    location: `${webcam.location.city}, ${webcam.location.country}`,
    streamUrl: streamUrl || '',
    status: (webcam.status === 'active' && streamUrl) ? 'online' as const : 'offline' as const,
    coordinates: {
      latitude: webcam.location.latitude,
      longitude: webcam.location.longitude
    },
    videoUrl: streamUrl || undefined,
    protocol: 'https' as const
  }
}

// Example usage for global webcams (free tier limitation)
export async function getRiyadhAreaWebcams() {
  console.log('🔍 Fetching webcams from Windy (free tier - global webcams)...')
  
  // Free tier doesn't support location filtering
  // Just fetch some traffic/city webcams
  const webcams = await fetchWebcamsNearLocation(24.7136, 46.6753, 50)
    
  if (webcams.length > 0) {
    console.log(`✅ Successfully loaded ${webcams.length} webcams from Windy`)
    return webcams.slice(0, 10) // Return max 10 cameras
  }
  
  console.log('⚠️ No webcams returned from Windy API')
  return []
}
