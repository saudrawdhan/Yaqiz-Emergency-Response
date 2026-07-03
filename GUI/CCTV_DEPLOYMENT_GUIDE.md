# 🎥 CCTV Camera Deployment Guide

## 📋 Overview

This guide explains how to connect your Emergency Response Platform to real CCTV cameras for production deployment.

---

## 🔌 Camera Connection Types

### **1. RTSP (Real Time Streaming Protocol)**
**Used by:** Most IP cameras (Hikvision, Dahua, Axis, etc.)

```typescript
// Production camera configuration
{
  id: 'CAM-001-RUH',
  name: 'King Fahd Road @ Olaya Junction',
  streamUrl: 'rtsp://username:password@camera-ip:554/stream1',
  status: 'online',
  coordinates: { latitude: 24.7136, longitude: 46.6753 },
}
```

**⚠️ Browser Limitation:** Browsers cannot play RTSP streams directly!

**Solutions:**
1. **Use a streaming server** (convert RTSP → HLS/WebRTC)
2. **Backend proxy** with Node.js/FFmpeg
3. **Cloud streaming service** (AWS Kinesis, Azure Media Services)

---

### **2. HLS (HTTP Live Streaming)**
**Used by:** Modern IP cameras, streaming servers

```typescript
{
  streamUrl: 'https://camera.example.com/live/camera1.m3u8',
  videoUrl: 'https://camera.example.com/live/camera1.m3u8',
  protocol: 'https'
}
```

✅ **Works in browsers natively!**

---

### **3. WebRTC**
**Used by:** Modern cloud cameras, real-time applications

```typescript
{
  streamUrl: 'webrtc://camera.example.com/live/camera1',
  protocol: 'webrtc'
}
```

✅ **Ultra-low latency!**

---

## 🏗️ Architecture Options

### **Option A: Streaming Server (Recommended)**

```
IP Cameras (RTSP) 
    ↓
Streaming Server (nginx-rtmp/MediaMTX)
    ↓
HLS/WebRTC Streams
    ↓
Your React App
```

**Setup:**
1. Install nginx-rtmp or MediaMTX on server
2. Configure to receive RTSP streams
3. Output HLS/WebRTC
4. Your app connects to HLS URLs

**Benefits:**
- ✅ Works with any IP camera
- ✅ Browser-compatible
- ✅ Can record streams
- ✅ Multiple viewers supported

---

### **Option B: Direct Camera URLs (Simple)**

```
IP Cameras (HTTP/HLS)
    ↓
Your React App
```

**Requirements:**
- Cameras must support HTTP/HLS output
- Must be publicly accessible OR on VPN
- Configure CORS headers

**Setup:**
```typescript
// In dataService.ts
export const mockCameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'Camera 1',
    streamUrl: 'https://your-camera-ip/live.m3u8',
    videoUrl: 'https://your-camera-ip/live.m3u8',
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
  },
]
```

---

### **Option C: Cloud Service (Enterprise)**

```
IP Cameras (RTSP)
    ↓
AWS Kinesis / Azure Media Services
    ↓
HLS/DASH URLs
    ↓
Your React App
```

**Services:**
- AWS Kinesis Video Streams
- Azure Media Services
- Google Cloud Video Intelligence

---

## 🚀 Quick Start (For Testing)

### **Public Test Cameras**

Use these FREE public streams for development:

```typescript
// Update src/services/dataService.ts

export const mockCameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    location: 'King Fahd Road, Olaya District, Riyadh',
    streamUrl: 'rtsp://camera1.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    // Public demo stream - replace with your camera URL
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 'CAM-002-RUH',
    name: 'Northern Ring Road @ Exit 7',
    location: 'Northern Ring Road, Exit 7, Riyadh',
    streamUrl: 'rtsp://camera2.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.7736, longitude: 46.7381 },
    // Another demo stream
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
]
```

---

## 🔧 Production Deployment Steps

### **Step 1: Camera Infrastructure**

1. **Install IP cameras** at locations
2. **Configure network** (fixed IPs or DDNS)
3. **Enable RTSP/HTTP streams**
4. **Set credentials** (username/password)
5. **Test connectivity** with VLC media player

### **Step 2: Streaming Server Setup**

**Option A: nginx-rtmp**

```bash
# Install nginx-rtmp
sudo apt install nginx libnginx-mod-rtmp

# Configure /etc/nginx/nginx.conf
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

http {
    server {
        listen 8080;
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
            }
            root /tmp;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
    }
}
```

**Option B: MediaMTX (Modern, Easy)**

```bash
# Download MediaMTX
wget https://github.com/bluenviron/mediamtx/releases/download/v1.0.0/mediamtx_v1.0.0_linux_amd64.tar.gz
tar -xzf mediamtx_v1.0.0_linux_amd64.tar.gz

# Run it
./mediamtx

# It automatically converts RTSP → HLS/WebRTC!
```

### **Step 3: Update Camera Configuration**

```typescript
// src/services/api/cameraService.ts (NEW FILE)

export interface CameraConfig {
  id: string
  name: string
  location: string
  streamUrl: string  // RTSP URL (internal)
  hlsUrl: string     // HLS URL (for browsers)
  coordinates: { latitude: number; longitude: number }
  status: 'online' | 'offline'
}

// Fetch cameras from your backend
export async function fetchCameras(): Promise<CameraConfig[]> {
  const response = await fetch('/api/cameras')
  return response.json()
}
```

### **Step 4: Dynamic Camera Loading**

```typescript
// Update src/context/SystemContext.tsx

const refreshCameras = async () => {
  try {
    // Fetch from your backend API
    const response = await fetch('https://your-api.com/cameras')
    const camerasData = await response.json()
    setCameras(camerasData)
  } catch (error) {
    console.error('Failed to fetch cameras:', error)
    // Fallback to mock data
    setCameras(mockCameras)
  }
}
```

---

## 🌐 Backend API Example (Node.js)

```javascript
// server.js - Simple Express API
const express = require('express')
const app = express()

// Camera database (replace with your DB)
const cameras = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    streamUrl: 'rtsp://10.0.1.101:554/stream1',
    hlsUrl: 'https://streaming-server.com/hls/cam1.m3u8',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    status: 'online'
  },
  // ... more cameras
]

// API endpoint
app.get('/api/cameras', (req, res) => {
  res.json(cameras)
})

// Health check for cameras
app.get('/api/cameras/:id/status', async (req, res) => {
  const { id } = req.params
  const camera = cameras.find(c => c.id === id)
  
  // Check if stream is accessible
  const isOnline = await checkCameraStatus(camera.streamUrl)
  
  res.json({ 
    id, 
    status: isOnline ? 'online' : 'offline' 
  })
})

app.listen(3000)
```

---

## 📱 Testing Tools

### **Test RTSP Streams:**

**VLC Media Player:**
```
1. Open VLC
2. Media → Open Network Stream
3. Enter: rtsp://camera-ip:554/stream1
4. Should see video if working
```

**FFmpeg:**
```bash
# Test RTSP stream
ffmpeg -i rtsp://camera-ip:554/stream1 -f null -

# Convert RTSP to HLS (manual)
ffmpeg -i rtsp://camera-ip:554/stream1 \
  -c:v copy -c:a aac -f hls \
  -hls_time 3 -hls_list_size 5 \
  output.m3u8
```

---

## 🔐 Security Considerations

### **1. Authentication**
```typescript
// Add auth tokens to camera URLs
const videoUrl = `https://streaming.example.com/hls/cam1.m3u8?token=${userToken}`
```

### **2. HTTPS Required**
- All streams must use HTTPS in production
- Get SSL certificate (Let's Encrypt)
- Configure nginx/MediaMTX with SSL

### **3. Access Control**
```typescript
// Backend validates user permissions
app.get('/api/cameras/:id/stream', authenticateUser, (req, res) => {
  // Check if user has access to this camera
  if (!userHasAccess(req.user, req.params.id)) {
    return res.status(403).json({ error: 'Access denied' })
  }
  
  // Return temporary signed URL
  const signedUrl = generateSignedUrl(req.params.id)
  res.json({ streamUrl: signedUrl })
})
```

---

## 📊 Monitoring & Analytics

```typescript
// Track camera health
interface CameraHealth {
  id: string
  uptime: number
  lastSeen: Date
  bandwidth: number
  viewers: number
}

// Poll camera status every 30 seconds
setInterval(async () => {
  for (const camera of cameras) {
    const health = await checkCameraHealth(camera)
    updateDashboard(health)
  }
}, 30000)
```

---

## 🎯 Deployment Checklist

### **Before Going Live:**

- [ ] All cameras tested with RTSP URLs
- [ ] Streaming server configured and running
- [ ] HLS URLs accessible from browser
- [ ] HTTPS certificates installed
- [ ] Authentication implemented
- [ ] CORS headers configured
- [ ] Backup cameras configured
- [ ] Monitoring system active
- [ ] Load tested with multiple viewers
- [ ] Failover strategy in place

---

## 💡 Quick Tips

1. **Start with 1-2 cameras** for testing
2. **Use MediaMTX** for easiest setup
3. **Test with public streams** first
4. **Monitor bandwidth** - each stream is ~1-3 Mbps
5. **Use CDN** for multiple viewers
6. **Keep backups** of recordings

---

## 📞 Common Camera Brands & Their URLs

### **Hikvision:**
```
rtsp://username:password@camera-ip:554/Streaming/Channels/101
```

### **Dahua:**
```
rtsp://username:password@camera-ip:554/cam/realmonitor?channel=1&subtype=0
```

### **Axis:**
```
rtsp://username:password@camera-ip:554/axis-media/media.amp
```

### **Generic IP Camera:**
```
rtsp://username:password@camera-ip:554/stream1
```

---

## 🚀 Quick Deploy (Demo Mode)

For presentations/testing without real cameras:

```typescript
// Use sample videos as camera feeds
export const mockCameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    videoUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
  },
]
```

---

Need help with any step? Ask me! 🎥
