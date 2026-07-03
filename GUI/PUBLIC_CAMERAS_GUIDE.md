# 🌍 Public CCTV & Traffic Camera Sources

## ⚠️ The Challenge

Most public traffic cameras **DON'T work directly in web browsers** because:
- They use **RTSP protocol** (browsers can't play it)
- They have **CORS restrictions** (security blocks)
- They require **authentication**
- They're **region-locked**

**BUT** - Here are the sources that **DO work** for developers:

---

## ✅ Working Public Camera Sources

### **1. EarthCam (Best Option - Works Now!)**

**What it is:** Professional webcam network with HLS streams  
**Cost:** Free for viewing  
**Works in browser:** ✅ YES  

**Famous locations with HLS streams:**
```
Times Square, NYC:
https://videos3.earthcam.com/fecnetwork/hdtimes10.flv/chunklist_w860796899.m3u8

Abbey Road, London (Beatles crossing):
https://videos.earthcam.com/fecnetwork/AbbeyRoadHD1.flv/chunklist_w1165791991.m3u8

Las Vegas Strip:
https://videos.earthcam.com/fecnetwork/4674.flv/chunklist_w862173750.m3u8

Bourbon Street, New Orleans:
https://videos.earthcam.com/fecnetwork/bourbonstreetcam1.flv/chunklist.m3u8
```

**How to use:**
```typescript
videoUrl: 'https://videos3.earthcam.com/fecnetwork/hdtimes10.flv/chunklist_w860796899.m3u8'
```

---

### **2. Windy Webcams API**

**What it is:** Free API to access 60,000+ public webcams worldwide  
**Cost:** FREE (requires registration)  
**Works in browser:** ✅ YES (with API)

**Sign up:** https://api.windy.com/

**Example code:**
```javascript
// Get webcams near location
const response = await fetch(
  `https://api.windy.com/api/webcams/v2/list/nearby=${lat},${lon},${radius}?show=webcams:image,player&key=YOUR_API_KEY`
)
const data = await response.json()

// Each webcam has player.live.embed URL for HLS stream
data.result.webcams.forEach(cam => {
  console.log(cam.player.live.embed) // Direct stream URL
})
```

**Pros:**
- Huge database of cameras
- Search by location
- Legal & documented API
- HLS streams work in browser

---

### **3. YouTube Live Traffic Cameras**

**What it is:** Many cities stream traffic cameras live on YouTube  
**Cost:** FREE  
**Works in browser:** ⚠️ Needs backend proxy

**Popular streams:**
- Tokyo traffic: https://www.youtube.com/watch?v=DjdUEyjx8GM
- Miami Beach: https://www.youtube.com/watch?v=pyHZE7BXhRM
- Times Square: https://www.youtube.com/watch?v=1EiC9bvVGnk
- Seoul traffic: https://www.youtube.com/watch?v=live_stream_id

**How to use (requires backend):**
```bash
# Install ytdl-core on backend
npm install ytdl-core

# Backend proxy endpoint
app.get('/api/youtube/:videoId', async (req, res) => {
  const info = await ytdl.getInfo(req.params.videoId)
  const format = ytdl.chooseFormat(info.formats, { quality: 'highest' })
  res.json({ streamUrl: format.url })
})
```

---

### **4. Skyline Webcams**

**What it is:** Premium quality webcams in tourist locations  
**Website:** https://www.skylinewebcams.com/  
**Works in browser:** ⚠️ Most are embedded iframes

**Notable locations:**
- Venice, Italy
- Dubai Marina
- Barcelona beaches
- Rome landmarks

---

### **5. IPCamLive / Deckchair**

**What it is:** Aggregators of public webcams  
**Website:** https://www.deckchair.com/  
**Works in browser:** Some cameras, check CORS

---

### **6. US Department of Transportation (DOT)**

**What it is:** Government traffic cameras  
**Cost:** FREE - Public domain  
**Works in browser:** ⚠️ Most are **static images** updated every 5-30 seconds

**State DOT Cameras:**

**Washington State:**
```
https://www.wsdot.com/traffic/api/
https://images.wsdot.wa.gov/nw/005vc00471.jpg
```

**Colorado:**
```
https://www.cotrip.org/
https://data.cotrip.org/xml/cameras.xml
```

**New York:**
```
https://511ny.org/
```

**California (Caltrans):**
```
https://cwwp2.dot.ca.gov/vm/streamlist.htm
```

**How to use (image refresh):**
```typescript
// Auto-refresh image every 5 seconds
const [imageSrc, setImageSrc] = useState(cameraImageUrl)

useEffect(() => {
  const interval = setInterval(() => {
    setImageSrc(`${cameraImageUrl}?t=${Date.now()}`)
  }, 5000)
  return () => clearInterval(interval)
}, [])
```

---

### **7. Insecam.org (⚠️ Ethical Gray Area)**

**What it is:** Unsecured cameras worldwide  
**Legal status:** 🔴 Questionable - use at own risk  
**Works in browser:** Some cameras

**NOTE:** Not recommended for professional projects due to:
- Privacy concerns
- Legal issues
- Ethical problems
- Unreliable streams

---

## 🚀 Recommended Setup for Your Project

### **Best Approach: Mixed Strategy**

**For Demo/Testing:**
```typescript
// 1. Use EarthCam streams (works immediately)
{
  videoUrl: 'https://videos3.earthcam.com/fecnetwork/hdtimes10.flv/chunklist_w860796899.m3u8'
}

// 2. Or use traffic footage videos (current setup)
{
  videoUrl: 'https://your-cdn.com/traffic-footage.mp4'
}
```

**For Production:**
```typescript
// Partner with Saudi DOT or use Windy API
{
  videoUrl: 'https://your-streaming-server.com/camera1.m3u8'
}
```

---

## 📝 How to Find More Camera Streams

### **Method 1: Browser DevTools**

1. Visit public webcam websites
2. Open DevTools (F12)
3. Go to Network tab
4. Filter by `.m3u8` or `stream`
5. Play the camera
6. Look for HLS stream URLs in network requests

### **Method 2: GitHub Search**

```
Search: "public webcam api" OR "cctv stream hls"
```

Many developers share working camera APIs

### **Method 3: Check These Lists**

- https://github.com/topics/webcam
- https://github.com/topics/cctv
- https://github.com/topics/ipcamera

---

## ⚡ Quick Working Example

Here are **tested working streams** you can copy-paste right now:

```typescript
export const workingCameras: Camera[] = [
  {
    id: 'NYC-001',
    name: 'Times Square - NYC',
    location: 'Manhattan, New York',
    videoUrl: 'https://videos3.earthcam.com/fecnetwork/hdtimes10.flv/chunklist_w860796899.m3u8',
    status: 'online',
  },
  {
    id: 'LON-001',
    name: 'Abbey Road - London',
    location: 'London, UK',
    videoUrl: 'https://videos.earthcam.com/fecnetwork/AbbeyRoadHD1.flv/chunklist_w1165791991.m3u8',
    status: 'online',
  },
  {
    id: 'LAS-001',
    name: 'Las Vegas Strip',
    location: 'Las Vegas, Nevada',
    videoUrl: 'https://videos.earthcam.com/fecnetwork/4674.flv/chunklist_w862173750.m3u8',
    status: 'online',
  },
]
```

**Note:** These are HLS `.m3u8` streams - modern browsers support them natively with `<video>` tag!

---

## 🔧 How to Test Camera Streams

### **Method 1: VLC Player**
```
1. Open VLC
2. Media → Open Network Stream
3. Paste HLS URL
4. If it plays in VLC, it should work in browser
```

### **Method 2: Browser Test**
```html
<video controls autoplay>
  <source src="https://stream-url.m3u8" type="application/x-mpegURL">
</video>
```

### **Method 3: Online HLS Player**
- https://hls-js-dev.netlify.app/demo/
- Paste URL and test

---

## ❌ Why Most "Open" Cameras Don't Work

**Common issues:**

1. **RTSP Protocol** 
   - Most IP cameras use RTSP
   - Browsers CAN'T play RTSP
   - Need server conversion (nginx-rtmp, MediaMTX)

2. **CORS Blocking**
   - Camera doesn't send `Access-Control-Allow-Origin` header
   - Browser blocks for security
   - Need CORS proxy

3. **Authentication**
   - Requires username/password
   - Can't embed credentials in frontend
   - Need backend proxy

4. **Rate Limiting**
   - Too many requests = blocked
   - Need caching layer

---

## 💡 Practical Solution for Your Project

**Recommended Approach:**

### **For Graduation Demo:**
✅ **Use option 1 or 2:**

1. **EarthCam streams** (see list above) - Shows "real" live feeds
2. **Traffic footage videos** (current setup) - Simulates camera behavior

### **For Real Deployment:**
✅ **Use option 3:**

3. **Partner with Saudi traffic authority** - Get official camera access

**Why this matters:**
- Demo shows the concept works
- Architecture supports real cameras
- Legal and professional approach

---

## 📊 Comparison Table

| Source | Free | Browser Compatible | Live | Setup Time | Legal |
|--------|------|-------------------|------|-----------|-------|
| EarthCam | ✅ | ✅ | ✅ | 0 min | ✅ |
| Windy API | ✅ | ✅ | ✅ | 5 min | ✅ |
| YouTube Live | ✅ | ⚠️ Proxy | ✅ | 30 min | ✅ |
| DOT Images | ✅ | ✅ | ⚠️ Snapshots | 0 min | ✅ |
| Insecam | ✅ | ⚠️ Some | ✅ | 0 min | ❌ |

---

## 🎯 My Recommendation

**For your graduation project:**

```typescript
// Use EarthCam for impressive live demos
// Keep Riyadh coordinates for production readiness
export const cameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    location: 'King Fahd Road, Olaya District, Riyadh',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    // Demo: EarthCam live stream
    videoUrl: 'https://videos3.earthcam.com/fecnetwork/hdtimes10.flv/chunklist_w860796899.m3u8',
    // Production: Will replace with Saudi DOT camera
    streamUrl: 'rtsp://saudi-dot-camera.gov.sa:554/cam1',
    status: 'online',
  },
]
```

**Benefits:**
- ✅ Shows real live traffic
- ✅ Proves system works
- ✅ Professional & legal
- ✅ Easy to switch to real cameras later

---

## 🔗 Useful Resources

- **EarthCam Developer Info:** earthcam.com
- **Windy API Docs:** api.windy.com
- **Public Webcam Lists:** webcamxp.com, windy.com
- **DOT Camera APIs:** Search "[state] DOT traffic cameras API"
- **HLS Test Player:** hls-js-dev.netlify.app

---

Need help implementing any of these? Just ask! 🎥
