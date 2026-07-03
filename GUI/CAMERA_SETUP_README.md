# 📹 Camera System - Current Setup & Deployment Info

## 🎬 Current Demo Setup

**Status:** ✅ **Working with Demo Videos**

Your cameras are currently displaying **sample videos** to simulate CCTV feeds. This is perfect for:
- Testing the UI
- Demonstrations
- Development
- Presentations

---

## 🔄 How It Works Now

```typescript
// src/services/dataService.ts

export const mockCameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    streamUrl: 'rtsp://camera1.example.com:554/stream', // Future: Real RTSP URL
    videoUrl: 'https://demo-video-url.mp4',              // Current: Demo video
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
  },
]
```

**The app shows:**
- ✅ Live preview thumbnails on camera cards
- ✅ Click to view full screen
- ✅ Auto-playing loops (simulating 24/7 CCTV)
- ✅ LIVE indicator badge
- ✅ Status tracking (online/offline)

---

## 🚀 When You Deploy to Production

### **Step 1: Get Real CCTV Camera URLs**

You'll receive from your camera installer:
```
Camera: Hikvision DS-2CD2143G0-I
IP: 192.168.1.100
Port: 554
Username: admin
Password: your_password
Stream URL: rtsp://admin:your_password@192.168.1.100:554/Streaming/Channels/101
```

### **Step 2: Update Camera Data**

Replace demo URLs with real camera URLs:

```typescript
// Option A: Direct Update (Simple)
export const mockCameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    streamUrl: 'rtsp://admin:password@192.168.1.100:554/stream1',
    videoUrl: 'https://your-streaming-server.com/hls/camera1.m3u8',
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
  },
]

// Option B: Load from API (Production)
const response = await fetch('https://your-api.com/cameras')
const cameras = await response.json()
```

### **Step 3: Setup Streaming Server**

**Why needed?** Browsers can't play RTSP streams directly. You need to convert RTSP → HLS.

**Easiest solution - MediaMTX:**
```bash
# Download and run MediaMTX
wget https://github.com/bluenviron/mediamtx/releases/latest/download/mediamtx_linux_amd64.tar.gz
tar -xzf mediamtx_linux_amd64.tar.gz
./mediamtx

# It automatically converts RTSP → HLS!
# Access at: http://server-ip:8888/camera-name
```

---

## 📝 Your Current Options

### **Option 1: Keep Demo Videos (Current)**
✅ Works right now  
✅ Perfect for presentations  
✅ No setup needed  
❌ Not real CCTV  

**Current videos:**
- Sample HD videos from Google Cloud Storage
- Auto-loop to simulate continuous feed
- Different videos for each camera

---

### **Option 2: Connect to Google Drive Videos**

Run the Python script to use your team's videos:

```bash
cd python
python get_video_urls.py
```

Then paste the URLs into `dataService.ts`:
```typescript
videoUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID',
```

✅ Custom videos  
✅ Your own content  
⚠️ Slower than direct hosting  

---

### **Option 3: Public Test CCTV Streams**

Use real public streams for testing:

```typescript
// Example: Public HLS stream
videoUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',

// Example: YouTube Live (with ytdl-core backend)
videoUrl: 'https://your-backend.com/api/youtube/stream?id=LIVE_ID',
```

---

### **Option 4: Local Network Cameras (Production)**

When you have real cameras:

1. **Get camera info** from installer
2. **Setup MediaMTX** streaming server
3. **Configure cameras** to stream to MediaMTX
4. **Update videoUrl** to point to MediaMTX HLS output

**Setup time:** ~30 minutes  
**See:** `CCTV_DEPLOYMENT_GUIDE.md` for step-by-step instructions

---

## 🎯 What You Need to Deploy

### **Minimum Requirements:**

1. **IP Cameras** (any brand supporting RTSP/HTTP)
2. **Server** (can be same as React app)
3. **MediaMTX** or nginx-rtmp
4. **Network connectivity** to cameras

### **Camera Specifications:**

- ✅ RTSP or HTTP stream support
- ✅ H.264 video codec (standard)
- ✅ Resolution: 720p minimum (1080p recommended)
- ✅ Fixed IP address or DDNS
- ✅ Authentication (username/password)

### **Common Camera Brands:**

- Hikvision
- Dahua
- Axis
- Hanwha (Samsung)
- Uniview
- TP-Link
- Any IP camera with RTSP

---

## 🔧 Quick Test with Your Cameras

Got a camera? Test it now:

```bash
# 1. Test if camera is accessible
ping camera-ip-address

# 2. Test RTSP stream with VLC
# Open VLC → Media → Open Network Stream
# Enter: rtsp://username:password@camera-ip:554/stream1

# 3. If it works in VLC, you can connect it to your app!
```

---

## 📊 Current vs Production Comparison

| Feature | Current (Demo) | Production |
|---------|---------------|------------|
| Video Source | Sample videos | Real cameras |
| Live Updates | Manual refresh | Real-time |
| Latency | N/A | 2-5 seconds |
| Quality | HD samples | Camera quality |
| Cost | Free | Camera + server |
| Setup Time | Ready now | ~1-2 hours |

---

## 💡 Recommendations

### **For Graduation Demo:**
✅ **Keep current setup** - Works perfectly for presentations  
✅ **Use Google Drive videos** - If you want custom footage  
✅ **Show the architecture** - Explain how it will connect to real cameras  

### **For Real Deployment:**
1. Read `CCTV_DEPLOYMENT_GUIDE.md`
2. Setup MediaMTX streaming server
3. Connect 1-2 cameras first (test)
4. Expand to full camera network

---

## 🎓 For Your Presentation

**You can say:**

> "Our system displays live CCTV feeds from traffic cameras across Riyadh. Currently we're using sample videos to demonstrate the functionality, but the architecture is ready to connect to real IP cameras via RTSP protocol with HLS streaming conversion. We've built the complete pipeline including auto-detection, multi-camera monitoring, and full-screen viewing capabilities."

**Architecture diagram to show:**
```
Real Cameras (RTSP)
    ↓
Streaming Server (MediaMTX)
    ↓
HLS Streams
    ↓
React App (Your UI)
    ↓
Emergency Response Actions
```

---

## 📞 Need Help?

- **Testing with demo videos:** ✅ You're all set!
- **Connecting Google Drive:** Run `python/get_video_urls.py`
- **Production deployment:** See `CCTV_DEPLOYMENT_GUIDE.md`
- **Camera setup questions:** Ask me!

---

Your system is **fully functional** for demonstrations and ready to connect to real cameras when you deploy! 🚀
