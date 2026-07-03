import React, { useEffect, useState } from 'react';
import './CctvFeed.css';

interface CctvFeedProps {
  cameraId: string;
  location: string;
  status: 'online' | 'offline' | 'degraded';
  /** Optional: extra label shown bottom-right (e.g. "North Junction") */
  sublabel?: string;
}

const CctvFeed: React.FC<CctvFeedProps> = ({ cameraId, location, status, sublabel }) => {
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const d = now.toLocaleDateString('en-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const t = now.toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setTimestamp(`${d}  ${t}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (status === 'offline' || status === 'degraded') {
    return (
      <div className="cctv-feed cctv-offline">
        <div className="cctv-noise" />
        <div className="cctv-offline-body">
          <span className="material-symbols-outlined">videocam_off</span>
          <p>SIGNAL LOST</p>
          <p className="cctv-offline-id">{cameraId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cctv-feed cctv-online">
      {/* noise grain */}
      <div className="cctv-noise" />
      {/* scanline sweep */}
      <div className="cctv-scanline" />

      {/* top-left: timestamp */}
      <div className="cctv-overlay cctv-top-left">
        <span className="cctv-timestamp">{timestamp}</span>
      </div>

      {/* top-right: REC */}
      <div className="cctv-overlay cctv-top-right">
        <span className="cctv-rec-dot" />
        <span className="cctv-rec-text">REC</span>
      </div>

      {/* center: crosshair */}
      <div className="cctv-crosshair">
        <div className="cctv-cross-h" />
        <div className="cctv-cross-v" />
        <div className="cctv-cross-circle" />
      </div>

      {/* bottom-left: camera ID */}
      <div className="cctv-overlay cctv-bottom-left">
        <span className="cctv-cam-id">{cameraId}</span>
        <span className="cctv-cam-location">{sublabel ?? location}</span>
      </div>

      {/* bottom-right: system label */}
      <div className="cctv-overlay cctv-bottom-right">
        <span className="cctv-system-label">ER-PLATFORM</span>
      </div>
    </div>
  );
};

export default CctvFeed;
