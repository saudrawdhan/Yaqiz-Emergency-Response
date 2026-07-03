import React, { useEffect, useState } from 'react';
import './VideoModal.css';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraName: string;
  cameraId: string;
  videoUrl?: string;
  status: 'online' | 'offline' | 'degraded';
}

const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  cameraName,
  cameraId,
  videoUrl,
  status
}) => {
  // Real-time API simulator for DOT cameras
  const [videoTimestamp, setVideoTimestamp] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    
    // Refresh the DOT video feed every 5 minutes while modal is open
    const interval = setInterval(() => {
      setVideoTimestamp(Date.now());
    }, 300000); 
    
    return () => clearInterval(interval);
  }, [isOpen]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="video-modal-header">
          <div className="video-modal-title">
            <span className="material-symbols-outlined">videocam</span>
            <div>
              <h2>{cameraName}</h2>
              <p className="camera-id-subtitle">{cameraId}</p>
            </div>
          </div>
          <div className="video-modal-actions">
            <span className={`status-badge ${status}`}>
              <span className="status-dot"></span>
              {status.toUpperCase()}
            </span>
            <button className="btn-close" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="video-player-container">
          {status === 'online' && videoUrl ? (
            // Check if it's an embeddable URL (YouTube, Skyline Webcams, or Google Drive)
            (videoUrl.includes('youtube.com/embed') || 
             videoUrl.includes('youtu.be') ||
             videoUrl.includes('skylinewebcams.com') ||
             (videoUrl.includes('drive.google.com') && videoUrl.includes('/preview'))) ? (
              <iframe
                className="video-player"
                src={videoUrl}
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <video 
                key={videoTimestamp}
                className="video-player"
                controls
                autoPlay
                loop
                src={`${videoUrl}?t=${videoTimestamp}`}
              >
                Your browser does not support the video tag.
              </video>
            )
          ) : status === 'online' && !videoUrl ? (
            <div className="video-placeholder">
              <span className="material-symbols-outlined">live_tv</span>
              <h3>Live Stream</h3>
              <p>Camera feed is online but no recorded video available</p>
              <p className="stream-info">RTSP Stream Ready</p>
            </div>
          ) : (
            <div className="video-placeholder offline">
              <span className="material-symbols-outlined">videocam_off</span>
              <h3>Camera Offline</h3>
              <p>This camera is currently unavailable</p>
              <p className="offline-info">Last seen: 2 hours ago</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="video-modal-footer">
          <div className="video-info">
            <div className="info-item">
              <span className="material-symbols-outlined">schedule</span>
              <span>Live Feed</span>
            </div>
            <div className="info-item">
              <span className="material-symbols-outlined">high_quality</span>
              <span>1080p HD</span>
            </div>
            <div className="info-item">
              <span className="material-symbols-outlined">speed</span>
              <span>30 FPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
