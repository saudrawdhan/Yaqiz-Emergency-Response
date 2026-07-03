// Google Drive Camera Videos
// EASY SETUP: Just paste your Google Drive video file IDs below!
// 
// HOW TO GET FILE IDs:
// 1. Open your folder: https://drive.google.com/drive/folders/1Ex1Z8SG8qC3SueDllZslH_wC69Sfy2N1
// 2. Right-click each video → "Get link"
// 3. Copy the ID from: https://drive.google.com/file/d/FILE_ID_HERE/view
// 4. Paste it below

import { Camera } from '../types/camera'

// === PASTE YOUR VIDEO FILE IDs HERE ===
const driveVideoIds: string[] = [
  // Example: '1ABC123xyz456',
  // Add your video IDs below:
  
]

// === CAMERA LOCATIONS (Real Riyadh GPS coordinates) ===
const riyadhLocations = [
  { name: 'King Fahd Road @ Olaya Junction', location: 'King Fahd Road, Olaya District', coords: { latitude: 24.7136, longitude: 46.6753 } },
  { name: 'Northern Ring Road @ Exit 7', location: 'Northern Ring Road, Exit 7', coords: { latitude: 24.7736, longitude: 46.7381 } },
  { name: 'King Abdullah Road @ Al Muruj', location: 'King Abdullah Road, Al Muruj District', coords: { latitude: 24.6901, longitude: 46.6697 } },
  { name: 'Eastern Ring Road @ Airport', location: 'Eastern Ring Road, Near Airport', coords: { latitude: 24.7208, longitude: 46.8028 } },
  { name: 'Makkah Road @ Diplomatic Quarter', location: 'Makkah Road, Diplomatic Quarter', coords: { latitude: 24.6913, longitude: 46.6182 } },
  { name: 'King Khalid Road @ Downtown', location: 'King Khalid Road, City Center', coords: { latitude: 24.7080, longitude: 46.6750 } },
  { name: 'Prince Turki Road @ Al Olaya', location: 'Prince Turki Road, Al Olaya', coords: { latitude: 24.7186, longitude: 46.6722 } },
  { name: 'King Abdulaziz Road @ Al Malaz', location: 'King Abdulaziz Road, Al Malaz', coords: { latitude: 24.6977, longitude: 46.7266 } },
  { name: 'Imam Saud Road @ Al Murabba', location: 'Imam Saud Road, Al Murabba', coords: { latitude: 24.6556, longitude: 46.7104 } },
  { name: 'King Fahd Road @ Al Sahafa', location: 'King Fahd Road, Al Sahafa District', coords: { latitude: 24.7542, longitude: 46.6437 } },
]

/**
 * Convert Google Drive file ID to direct video stream URL
 */
function getDriveVideoUrl(fileId: string): string {
  // Multiple formats that work for streaming:
  
  // Format 1: Direct download (works for most videos)
  // return `https://drive.google.com/uc?export=download&id=${fileId}`
  
  // Format 2: Embedded player (better for larger files)
  return `https://drive.google.com/file/d/${fileId}/preview`
  
  // Format 3: Direct stream (best for video playback)
  // return `https://drive.google.com/uc?id=${fileId}&export=download`
}

/**
 * Generate cameras from your Google Drive videos
 */
export function getDriveCameras(): Camera[] {
  if (driveVideoIds.length === 0) {
    console.warn('⚠️ No Google Drive video IDs configured in driveCameras.ts')
    return []
  }

  const cameras: Camera[] = driveVideoIds.map((fileId, index) => {
    const location = riyadhLocations[index % riyadhLocations.length]
    
    return {
      id: `CAM-DRIVE-${String(index + 1).padStart(3, '0')}`,
      name: location.name,
      location: location.location,
      streamUrl: `rtsp://camera${index + 1}.riyadh.gov.sa:554/stream`,
      status: 'online' as const,
      coordinates: location.coords,
      videoUrl: getDriveVideoUrl(fileId),
      protocol: 'https' as const,
    }
  })

  console.log(`📹 Generated ${cameras.length} cameras from Google Drive videos`)
  return cameras
}

/**
 * Check if Drive cameras are configured
 */
export function hasDriveCameras(): boolean {
  return driveVideoIds.length > 0
}

// === QUICK PASTE HELPER ===
// Paste your file IDs like this:
// 
// const driveVideoIds = [
//   '1abc123xyz',
//   '1def456uvw', 
//   '1ghi789rst',
// ]
//
// That's it! The system will automatically:
// ✅ Create camera cards for each video
// ✅ Assign Riyadh locations
// ✅ Generate proper streaming URLs
// ✅ Show live previews in your dashboard
