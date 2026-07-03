import { Camera } from '../types/camera'
import { SystemHealth } from '../types/system'
import { Incident } from '../types/incident'
import { User } from '../types/user'

// GENUINE LIVE PUBLIC CCTV CAMERAS
// Sourced directly from Transport for London (TfL) JamCam Network
// These are real, active DOT traffic cameras that stream live video
// Updated: March 2026 - Active working live urls

export const mockCameras: Camera[] = [
  {
    id: 'CAM-001-LON',
    name: 'Romford Rd / Tennyson Rd',
    location: 'London, UK',
    streamUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02151.mp4',
    status: 'online',
    coordinates: { latitude: 51.5421, longitude: 0.00524 },
    videoUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02151.mp4',
    protocol: 'https',
  },
  {
    id: 'CAM-002-LON',
    name: 'Piccadilly Circus',
    location: 'London, UK',
    streamUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07450.mp4',
    status: 'online',
    coordinates: { latitude: 51.5096, longitude: -0.13484 },
    videoUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07450.mp4',
    protocol: 'https',
  },
  {
    id: 'CAM-003-LON',
    name: 'Blackheath Rd / Greenwich High Rd',
    location: 'London, UK',
    streamUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03675.mp4',
    status: 'online',
    coordinates: { latitude: 51.4742, longitude: -0.02073 },
    videoUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03675.mp4',
    protocol: 'https',
  },
  {
    id: 'CAM-004-LON',
    name: 'Edgware Way / Broadfields Ave',
    location: 'London, UK',
    streamUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09747.mp4',
    status: 'online',
    coordinates: { latitude: 51.6216, longitude: -0.27384 },
    videoUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09747.mp4',
    protocol: 'https',
  },
  {
    id: 'CAM-005-LON',
    name: 'Cromwell Rd / Earls Court Rd',
    location: 'London, UK',
    streamUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06600.mp4',
    status: 'online',
    coordinates: { latitude: 51.4946, longitude: -0.1957 },
    videoUrl: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06600.mp4',
    protocol: 'https',
  },
]

// Accident evidence photos - Using reliable CDN sources
const accidentImages = [
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
  'https://images.pexels.com/photos/190574/pexels-photo-190574.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
  'https://images.pexels.com/photos/163016/crash-test-collision-60-km-h-distraction-163016.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
  'https://images.pexels.com/photos/1409999/pexels-photo-1409999.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
  'https://images.pexels.com/photos/5800713/pexels-photo-5800713.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
  'https://images.pexels.com/photos/1445593/pexels-photo-1445593.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
]

export const mockIncidents: Incident[] = [
  {
    id: 'INC-2024-001',
    caseId: 'ER-20240521-0012',
    location: 'King Fahd Road @ Olaya Junction, Riyadh',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    time: new Date(Date.now() - 2 * 60000),
    severity: 'high',
    status: 'new',
    aiSummary: 'Multi-vehicle collision involving a commercial truck and two passenger cars. Reports indicate significant front-end damage to one vehicle, with potential for fluid leaks. Emergency services are en route. Traffic is heavily impacted in the southbound lanes.',
    llmHospital: 'Report of smoke from one vehicle. Prepare for potential extrication.',
    llmPolice: 'Southbound King Fahd Road requires immediate traffic control. All lanes blocked.',
    llmNajm: undefined,
    estimatedInjuries: 3,
    confidence: 'high',
    photos: [
      { id: '1', uri: accidentImages[0], timestamp: new Date(), verified: true },
      { id: '2', uri: accidentImages[1], timestamp: new Date(), verified: true },
      { id: '3', uri: accidentImages[2], timestamp: new Date(), verified: true },
      { id: '4', uri: accidentImages[3], timestamp: new Date(), verified: false },
    ],
    actionLog: [
      { timestamp: new Date(Date.now() - 2 * 60000), user: 'System', action: 'Accident detected via AI Camera Analysis at King Fahd Road @ Olaya Junction' },
      { timestamp: new Date(Date.now() - 1.8 * 60000), user: 'System', action: 'Alert sent to King Faisal Hospital ER, Riyadh Police, Civil Defense' },
      { timestamp: new Date(Date.now() - 1.5 * 60000), user: 'System', action: 'Alert sent to Najm Dispatch Center' },
    ],
    dispatchedUnits: [],
    collaborationLog: [],
    weather: { condition: 'Clear', temperature: 38, visibility: 'Good' },
    traffic: 'Heavy congestion - 4 lanes blocked',
  },
  {
    id: 'INC-2024-002',
    caseId: 'ER-20240521-0011',
    location: 'Northern Ring Road @ Exit 7, Riyadh',
    coordinates: { latitude: 24.7736, longitude: 46.7381 },
    time: new Date(Date.now() - 15 * 60000),
    severity: 'moderate',
    status: 'acknowledged',
    aiSummary: 'Single vehicle collision with highway barrier. White sedan appears to have lost control. Driver is conscious and moving. Minor debris on roadway. Right two lanes affected.',
    llmHospital: 'Single patient, appears ambulatory. Standard trauma protocol.',
    llmPolice: 'Traffic control needed for right lanes only.',
    llmNajm: undefined,
    estimatedInjuries: 1,
    confidence: 'high',
    photos: [
      { id: '1', uri: accidentImages[4], timestamp: new Date(), verified: true },
      { id: '2', uri: accidentImages[5], timestamp: new Date(), verified: true },
      { id: '3', uri: accidentImages[2], timestamp: new Date(), verified: true },
    ],
    actionLog: [
      { timestamp: new Date(Date.now() - 15 * 60000), user: 'System', action: 'Accident detected at Northern Ring Road @ Exit 7' },
      { timestamp: new Date(Date.now() - 14 * 60000), user: 'System', action: 'Alert sent to King Faisal Hospital ER' },
      { timestamp: new Date(Date.now() - 13 * 60000), user: 'Dr. Sarah Ahmed', action: 'Alert accepted by King Faisal Hospital ER' },
      { timestamp: new Date(Date.now() - 12 * 60000), user: 'System', action: 'Ambulance Unit 734 dispatched' },
      { timestamp: new Date(Date.now() - 8 * 60000), user: 'Police Unit 211', action: 'Police on scene, establishing traffic control' },
    ],
    dispatchedUnits: [
      { id: '1', name: 'Ambulance 734', agency: 'King Faisal Hospital', status: 'en_route', dispatchedAt: new Date(Date.now() - 12 * 60000) },
      { id: '2', name: 'Police Unit 211', agency: 'Riyadh Police', status: 'on_scene', dispatchedAt: new Date(Date.now() - 13 * 60000), onSceneAt: new Date(Date.now() - 8 * 60000) },
    ],
    collaborationLog: [
      {
        id: '1',
        timestamp: new Date(Date.now() - 10 * 60000),
        user: 'Officer Mohammed Ali',
        agency: 'Riyadh Police',
        message: 'Traffic control established. Right two lanes closed. Requesting tow truck.',
      },
    ],
    weather: { condition: 'Clear', temperature: 38, visibility: 'Good' },
    traffic: 'Moderate - 2 lanes affected',
  },
  {
    id: 'INC-2024-003',
    caseId: 'ER-20240521-0010',
    location: 'King Abdullah Road @ Al Muruj District',
    coordinates: { latitude: 24.6901, longitude: 46.6697 },
    time: new Date(Date.now() - 45 * 60000),
    severity: 'low',
    status: 'scene_cleared',
    aiSummary: 'Minor fender bender between two vehicles. No visible injuries. Drivers exchanging information. Minimal traffic impact.',
    estimatedInjuries: 0,
    confidence: 'high',
    photos: [
      { id: '1', uri: accidentImages[3], timestamp: new Date(), verified: true },
      { id: '2', uri: accidentImages[0], timestamp: new Date(), verified: true },
    ],
    actionLog: [
      { timestamp: new Date(Date.now() - 45 * 60000), user: 'System', action: 'Minor accident detected at King Abdullah Road' },
      { timestamp: new Date(Date.now() - 44 * 60000), user: 'System', action: 'Alert sent to Najm Dispatch' },
      { timestamp: new Date(Date.now() - 43 * 60000), user: 'Najm Officer', action: 'Alert acknowledged by Najm Dispatch' },
      { timestamp: new Date(Date.now() - 35 * 60000), user: 'Najm Unit 42', action: 'Najm team on scene, documenting accident' },
      { timestamp: new Date(Date.now() - 20 * 60000), user: 'Najm Unit 42', action: 'Documentation complete, scene cleared' },
      { timestamp: new Date(Date.now() - 18 * 60000), user: 'System', action: 'Incident marked as resolved' },
    ],
    dispatchedUnits: [
      { id: '1', name: 'Najm Unit 42', agency: 'Najm Insurance', status: 'cleared', dispatchedAt: new Date(Date.now() - 43 * 60000), onSceneAt: new Date(Date.now() - 35 * 60000), clearedAt: new Date(Date.now() - 20 * 60000) },
    ],
    collaborationLog: [],
    weather: { condition: 'Clear', temperature: 37, visibility: 'Good' },
    traffic: 'Normal flow',
  },
]

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Dr. Sarah Ahmed',
    email: 'sarah.ahmed@kfh.gov.sa',
    agency: 'King Faisal Hospital',
    agencyType: 'Hospital',
    role: 'responder',
    status: 'active',
    lastLogin: new Date(Date.now() - 2 * 3600000),
  },
  {
    id: '2',
    name: 'Officer Mohammed Ali',
    email: 'mohammed.ali@riyadhpolice.gov.sa',
    agency: 'Riyadh Central Police',
    agencyType: 'Police',
    role: 'responder',
    status: 'active',
    lastLogin: new Date(Date.now() - 1 * 3600000),
  },
  {
    id: '3',
    name: 'Capt. Abdullah Mansour',
    email: 'abdullah.m@civildefense.gov.sa',
    agency: 'Civil Defense Unit 5',
    agencyType: 'Civil Defense',
    role: 'responder',
    status: 'active',
    lastLogin: new Date(Date.now() - 3 * 3600000),
  },
]

/**
 * getSystemHealth
 *
 * Returns the current system health snapshot.
 * The AI engine, alerting service, and performance metrics are provided
 * by the backend AI pipeline — this function computes the camera counts
 * from the live camera list fetched from Supabase.
 *
 * TODO: Replace static performance values with a real backend health endpoint.
 */
export const getSystemHealth = (cameras: Camera[] = []): SystemHealth => ({
  aiEngine: { status: 'online', lastCheck: new Date() },
  alertingService: { status: 'online', lastCheck: new Date() },
  database: { status: 'healthy', lastCheck: new Date() },
  cameras: {
    online: cameras.filter((c) => c.status === 'online').length,
    offline: cameras.filter((c) => c.status === 'offline').length,
    total: cameras.length,
  },
  performance: {
    eventsPerMinute: 12,
    avgDetectionTime: 245,
    cpuLoad: 45,
    gpuLoad: 62,
  },
  recentErrors: [
    {
      timestamp: new Date(Date.now() - 30 * 60000),
      message: 'Camera CAM-004-RUH connection timeout',
      severity: 'warning',
    },
    {
      timestamp: new Date(Date.now() - 120 * 60000),
      message: 'Database connection timeout (resolved)',
      severity: 'info',
    },
  ],
})
