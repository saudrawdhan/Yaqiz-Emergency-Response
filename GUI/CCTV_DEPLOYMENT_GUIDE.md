# Camera System

## What's running in this demo

The dashboard displays real, periodically-refreshed traffic-camera footage from Transport for London's public JamCam network, standing in for the local traffic-camera access a production deployment in Saudi Arabia would use. Video is served directly as native HTML5 `<video>`, refreshed automatically in the background every 5 minutes, at 5 real intersections:

- Romford Rd / Tennyson Rd
- Piccadilly Circus
- Blackheath Rd / Greenwich High Rd
- Edgware Way / Broadfields Ave
- Cromwell Rd / Earls Court Rd

A secondary source (`src/services/publicCameraService.ts`) also wires in genuinely live public feeds (EarthCam, YouTube live channels) for additional demo variety, and a third (`src/services/driveCameras.ts`) pairs placeholder camera IDs with pre-recorded footage hosted on Google Drive for controlled testing. None of these are connected to real Saudi CCTV infrastructure — that access isn't available to a student project. The rest of this guide covers what a real deployment would need.

## Connecting real cameras

### RTSP (most IP cameras — Hikvision, Dahua, Axis)

```typescript
{
  id: 'CAM-001-RUH',
  name: 'King Fahd Road @ Olaya Junction',
  streamUrl: 'rtsp://username:password@camera-ip:554/stream1',
  status: 'online',
  coordinates: { latitude: 24.7136, longitude: 46.6753 },
}
```

Browsers cannot play RTSP directly. Options: a streaming server that converts RTSP to HLS/WebRTC, a backend proxy (Node.js/FFmpeg), or a cloud streaming service (AWS Kinesis, Azure Media Services).

### HLS (HTTP Live Streaming)

Works natively in browsers:

```typescript
{
  streamUrl: 'https://camera.example.com/live/camera1.m3u8',
  videoUrl: 'https://camera.example.com/live/camera1.m3u8',
  protocol: 'https'
}
```

### WebRTC

Lowest latency, used by modern cloud cameras:

```typescript
{
  streamUrl: 'webrtc://camera.example.com/live/camera1',
  protocol: 'webrtc'
}
```

## Architecture options

**Option A — Streaming server (recommended):** IP cameras (RTSP) → streaming server (nginx-rtmp or MediaMTX) → HLS/WebRTC → the React app. Works with any IP camera, browser-compatible, can record streams, supports multiple viewers.

**Option B — Direct camera URLs (simple):** cameras that already output HTTP/HLS, reachable publicly or over a VPN with CORS configured, feed the app directly.

**Option C — Cloud service (enterprise):** IP cameras → AWS Kinesis Video Streams / Azure Media Services / Google Cloud Video Intelligence → HLS/DASH → the app.

## Production deployment steps

**1. Camera infrastructure** — install IP cameras, configure networking (fixed IPs or DDNS), enable RTSP/HTTP streams, set credentials, test with VLC.

**2. Streaming server** — MediaMTX is the simplest option:

```bash
wget https://github.com/bluenviron/mediamtx/releases/download/v1.0.0/mediamtx_v1.0.0_linux_amd64.tar.gz
tar -xzf mediamtx_v1.0.0_linux_amd64.tar.gz
./mediamtx    # converts RTSP to HLS/WebRTC automatically
```

Or nginx-rtmp:

```nginx
rtmp {
    server {
        listen 1935;
        application live {
            live on;
            hls on;
            hls_path /tmp/hls;
            hls_fragment 3s;
        }
    }
}
```

**3. Camera configuration** — define a config type and fetch it from a backend instead of hardcoding:

```typescript
export interface CameraConfig {
  id: string
  name: string
  location: string
  streamUrl: string  // RTSP URL (internal)
  hlsUrl: string      // HLS URL (for browsers)
  coordinates: { latitude: number; longitude: number }
  status: 'online' | 'offline'
}

export async function fetchCameras(): Promise<CameraConfig[]> {
  const response = await fetch('/api/cameras')
  return response.json()
}
```

**4. Backend API** (Node.js/Express example):

```javascript
const express = require('express')
const app = express()

const cameras = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    streamUrl: 'rtsp://10.0.1.101:554/stream1',
    hlsUrl: 'https://streaming-server.com/hls/cam1.m3u8',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    status: 'online'
  },
]

app.get('/api/cameras', (req, res) => res.json(cameras))

app.get('/api/cameras/:id/status', async (req, res) => {
  const camera = cameras.find(c => c.id === req.params.id)
  const isOnline = await checkCameraStatus(camera.streamUrl)
  res.json({ id: req.params.id, status: isOnline ? 'online' : 'offline' })
})

app.listen(3000)
```

## Testing tools

**VLC:** Media → Open Network Stream → `rtsp://camera-ip:554/stream1`.

**FFmpeg:**

```bash
ffmpeg -i rtsp://camera-ip:554/stream1 -f null -

# Convert RTSP to HLS manually
ffmpeg -i rtsp://camera-ip:554/stream1 -c:v copy -c:a aac -f hls -hls_time 3 -hls_list_size 5 output.m3u8
```

## Security

- Sign or token-authenticate stream URLs rather than exposing raw camera addresses.
- HTTPS everywhere in production (Let's Encrypt is sufficient).
- Validate camera access per user on the backend before issuing a stream URL, not just in the frontend.

## Common camera brand RTSP paths

| Brand | Path |
|---|---|
| Hikvision | `rtsp://user:pass@ip:554/Streaming/Channels/101` |
| Dahua | `rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0` |
| Axis | `rtsp://user:pass@ip:554/axis-media/media.amp` |
| Generic | `rtsp://user:pass@ip:554/stream1` |

## Deployment checklist

- [ ] All cameras tested with RTSP URLs
- [ ] Streaming server configured and running
- [ ] HLS URLs accessible from the browser
- [ ] HTTPS certificates installed
- [ ] Authentication implemented
- [ ] CORS headers configured
- [ ] Backup cameras configured
- [ ] Monitoring active
- [ ] Load tested with multiple viewers
- [ ] Failover strategy in place
