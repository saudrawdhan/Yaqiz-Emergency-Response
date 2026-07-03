# 🎥 Camera Video Viewing System - Setup Guide

## ✅ What We Just Built

You can now **view CCTV videos in two ways**:

1. 📺 **Small live previews** on each camera card - see all cameras at once
2. 🖥️ **Full-screen modal** - click any preview or the fullscreen button for big view

Both show real-time simulated CCTV feeds!

---

## 🌟 New Features

### **Live Video Thumbnails**
- ✅ **Auto-playing previews** on every camera card
- ✅ **"LIVE" indicator** with pulsing red badge
- ✅ **Click anywhere on preview** to open full screen
- ✅ **Hover effect** shows fullscreen icon overlay
- ✅ **Muted by default** (unmute in full screen)
- ✅ **Continuous loop** simulating 24/7 CCTV

### **Full Screen Modal**
- ✅ **Click preview or fullscreen button** to open
- ✅ **Large video player** with full controls
- ✅ **Camera details** (name, ID, status)
- ✅ **Keyboard shortcuts** (ESC to close)
- ✅ **Professional dark theme**

---

## 🚀 Quick Start (3 Steps)

### **Step 1: Get Video URLs from Google Drive**

```bash
cd python
python get_video_urls.py
```

This will:
- ✅ Connect to your Google Drive
- ✅ Find all videos in your Dataset folder
- ✅ Generate direct URLs you can use
- ✅ Show you exactly what to copy

### **Step 2: Update Camera Data**

Open: `src/services/dataService.ts`

Replace the placeholder URLs with your real Google Drive URLs:

```typescript
export const mockCameras: Camera[] = [
  {
    id: 'CAM-001-RUH',
    name: 'King Fahd Road @ Olaya Junction',
    location: 'King Fahd Road, Olaya District, Riyadh',
    streamUrl: 'rtsp://camera1.example.com:554/stream',
    status: 'online',
    coordinates: { latitude: 24.7136, longitude: 46.6753 },
    videoUrl: 'YOUR_GOOGLE_DRIVE_URL_HERE',  // ← Paste here
  },
  // ... repeat for other cameras
]
```

### **Step 3: Test It!**

```bash
npm run dev
```

1. Go to Admin → Camera Management
2. Click the **eye icon** (👁️) on any camera
3. Watch the video play! 🎉

---

## 📁 What We Created

### New Files:
```
src/components/common/
├── VideoModal.tsx      # Video player popup
└── VideoModal.css      # Styling

python/
└── get_video_urls.py   # Helper to get Drive URLs
```

### Modified Files:
```
src/screens/admin/CameraManagement.tsx  # Added video viewer
src/types/camera.ts                     # Added videoUrl field
src/services/dataService.ts             # Added sample URLs
```

---

## 🎬 How It Works

```
1. Click eye icon → Opens VideoModal
2. VideoModal checks camera status
3. If ONLINE + has videoUrl → Play video
4. If ONLINE + no video → Show "Live Stream Ready" message
5. If OFFLINE → Show "Camera Offline" message
```

---

## 🔧 Customization Options

### Change Video Player Settings

Edit `VideoModal.tsx`:

```tsx
<video 
  controls      // Show play/pause controls
  autoPlay      // Auto-start on open
  loop          // Loop the video
  muted         // Start muted (optional)
>
```

### Add More Camera Info

Edit the video footer in `VideoModal.tsx`:

```tsx
<div className="info-item">
  <span className="material-symbols-outlined">your_icon</span>
  <span>Your Info</span>
</div>
```

---

## 🌟 Features Included

✅ **Modal Popup** - Professional full-screen video viewer  
✅ **Auto-play** - Videos start automatically  
✅ **Loop** - Videos repeat continuously (like CCTV)  
✅ **Status Badges** - Shows ONLINE/OFFLINE status  
✅ **Keyboard Support** - Press `ESC` to close  
✅ **Click Outside** - Click backdrop to close  
✅ **Responsive** - Works on all screen sizes  
✅ **Dark Theme** - Matches your app design  
✅ **Glassmorphism** - Beautiful frosted glass effect  

---

## 🎨 Visual Effects

- ✨ **Pulsing status dot** for online cameras
- 🎭 **Smooth animations** for opening/closing
- 🌈 **Lime green accents** matching your theme
- 💫 **Hover effects** on all buttons

---

## 🔗 Google Drive Integration

### Option 1: Direct URLs (Current - Simple)
```typescript
videoUrl: 'https://drive.google.com/uc?export=download&id=FILE_ID'
```

### Option 2: Embedded Player (Alternative)
```typescript
videoUrl: 'https://drive.google.com/file/d/FILE_ID/preview'
```

### Option 3: Local Files (For Testing)
```typescript
// Put video in public/videos/ folder
videoUrl: '/videos/camera1.mp4'
```

---

## 🐛 Troubleshooting

### Video Not Playing?

**Issue**: "Video format not supported"  
**Fix**: Google Drive might block direct streaming. Solutions:
1. Make file publicly accessible
2. Use the `get_video_urls.py` script (it sets permissions)
3. Or upload videos to a public CDN

**Issue**: Video loads slowly  
**Fix**: 
- Compress videos (target 10-20 MB for demo)
- Use MP4 format (H.264 codec)

**Issue**: Modal not opening  
**Fix**: Check browser console for errors

### Get File ID from Google Drive URL

```
Google Drive Link:
https://drive.google.com/file/d/1DL5msjVLw2CPoH8ZGkiA3iEdM2Xcobtl/view

File ID (the middle part):
1DL5msjVLw2CPoH8ZGkiA3iEdM2Xcobtl

Use in camera:
videoUrl: 'https://drive.google.com/uc?export=download&id=1DL5msjVLw2CPoH8ZGkiA3iEdM2Xcobtl'
```

---

## 💡 Pro Tips

1. **Use short test videos** (10-30 seconds) for faster loading
2. **Name videos clearly** in Drive: `CAM-001-sample.mp4`
3. **Test with one camera first** before adding all videos
4. **Keep videos under 50MB** each for best performance
5. **Use MP4 format** (most compatible)

---

## 🎯 Next Steps (Optional Enhancements)

Want to make it even better? Add:

- [ ] **Download button** to save videos
- [ ] **Fullscreen mode** for better viewing
- [ ] **Playback speed controls** (0.5x, 1x, 2x)
- [ ] **Timestamp display** on video
- [ ] **Multiple video angles** per camera
- [ ] **Real-time streaming** integration
- [ ] **Video thumbnails** on camera cards

---

## 📞 Need Help?

If videos aren't working:

1. Check the browser console (F12) for errors
2. Verify the video URL works in a new tab
3. Make sure the Drive file is publicly accessible
4. Try using the placeholder URLs first to test the modal

---

## ✨ You're All Set!

Your camera system now has **live video previews + full-screen viewing**! 🎉

### **Two Ways to View Videos:**

1. **Grid View** (new!) - See all camera feeds at once in small thumbnails
2. **Full Screen** - Click any preview or the fullscreen button

Just run the Python script, copy the URLs, paste them in your camera data, and you're live!

---

## 🎮 How to Use

### **On Camera Management Page:**

1. **See all cameras live** - Small video previews show on each card
2. **Red "LIVE" badge** appears on active cameras
3. **Hover over preview** - Shows fullscreen icon
4. **Click preview** - Opens full-screen modal
5. **Or click fullscreen button** - Same result!

### **Visual Indicators:**

- 🔴 **LIVE badge** - Camera is streaming
- 🟢 **Green border** - Online camera (hover effect)
- 📺 **Live TV icon** - Camera online but no video loaded
- 🚫 **Offline icon** - Camera is offline

---

## 🎨 What Makes It Special

✨ **Professional CCTV Look:**
- All cameras visible simultaneously (like real control rooms)
- Auto-playing silent previews
- Glowing borders and effects
- Smooth hover animations
- Pulsing LIVE indicators

🎯 **User-Friendly:**
- No buttons needed - just click the preview
- Fullscreen icon appears on hover
- Works exactly like YouTube thumbnails
- Keyboard shortcuts supported
