export type CameraStatus = 'online' | 'offline' | 'degraded'

export interface Camera {
  id: string
  name: string
  location: string
  streamUrl: string
  status: CameraStatus
  coordinates: { latitude: number; longitude: number }
  protocol?: 'rtsp' | 'http' | 'https'
  username?: string
  port?: number
  path?: string
  videoUrl?: string  // URL to recorded video from Google Drive
}

