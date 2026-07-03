import React, { useState } from 'react';
import Sidebar from '../../components/common/Sidebar';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import './CamerasScreen.css';

const extractVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
    const v = url.searchParams.get('v');
    if (v) return v;
    // handles /live/ID, /embed/ID, /shorts/ID, /v/ID
    const segs = url.pathname.split('/').filter(Boolean);
    const last = segs[segs.length - 1].split('?')[0];
    if (/^[a-zA-Z0-9_-]{11}$/.test(last)) return last;
    return null;
  } catch {
    return null;
  }
};

const embedUrl = (videoId: string) =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${videoId}&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0`;

const CamerasScreen: React.FC = () => {
  const { cameras, refreshCameras, isLoadingCameras } = useSystem();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', url: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const expandedCamera = cameras.find(c => c.id === expanded);
  const onlineCameras  = cameras.filter(c => c.status === 'online');
  const offlineCameras = cameras.filter(c => c.status !== 'online');

  const handleAddCamera = async () => {
    setFormError('');
    if (!form.name.trim() || !form.location.trim() || !form.url.trim()) {
      setFormError('All fields are required.');
      return;
    }
    const videoId = extractVideoId(form.url);
    if (!videoId) {
      setFormError('Could not extract a valid YouTube video ID from that URL.');
      return;
    }
    setIsSaving(true);
    const newId = `CAM-${Date.now()}-RUH`;
    const { error } = await supabase.from('cameras').insert({
      id: newId,
      name: form.name.trim(),
      location: form.location.trim(),
      stream_url: videoId,
      status: 'online',
      lat: 0,
      lng: 0,
    });
    setIsSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    await refreshCameras();
    setForm({ name: '', location: '', url: '' });
    setShowModal(false);
  };

  const handleRemoveCamera = async (id: string) => {
    const { error } = await supabase.from('cameras').delete().eq('id', id);
    if (!error) {
      if (expanded === id) setExpanded(null);
      await refreshCameras();
    }
  };

  const renderFeed = (streamUrl: string, name: string, status: string) => {
    if (status !== 'online') {
      return (
        <div className="offline-placeholder">
          <span className="material-symbols-outlined">videocam_off</span>
          <p>Feed unavailable</p>
        </div>
      );
    }
    const videoId = extractVideoId(streamUrl);
    if (videoId) {
      return (
        <iframe
          src={embedUrl(videoId)}
          title={name}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return (
      <div className="offline-placeholder">
        <span className="material-symbols-outlined">info</span>
        <p>This live stream recording is not available.</p>
      </div>
    );
  };

  return (
    <div className="cameras-layout">
      <Sidebar userRole="responder" />

      <main className="cameras-main">
        <header className="cameras-header">
          <div>
            <h1 className="cameras-title">Live Camera Feeds</h1>
            <p className="cameras-subtitle">Real-time CCTV monitoring — {onlineCameras.length} cameras online</p>
          </div>
          <div className="cameras-header-right">
            <span className="cam-stat online">
              <span className="status-dot" />
              {onlineCameras.length} Online
            </span>
            <span className="cam-stat offline">
              <span className="status-dot offline-dot" />
              {offlineCameras.length} Offline
            </span>
            {isAdmin && (
              <button className="add-camera-btn" onClick={() => setShowModal(true)}>
                <span className="material-symbols-outlined">add</span>
                Add Camera
              </button>
            )}
          </div>
        </header>

        {isLoadingCameras && cameras.length === 0 && (
          <div className="cameras-loading">
            <span className="material-symbols-outlined spinning">sync</span>
            Loading cameras...
          </div>
        )}

        {/* Add Camera Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal-box glass-panel" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Add Camera</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Camera Name</label>
                  <input className="form-input" type="text" placeholder="e.g. Camera 07"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" type="text" placeholder="e.g. King Abdullah Road — Exit 3"
                    value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">YouTube URL or Video ID</label>
                  <input className="form-input" type="text" placeholder="https://youtube.com/watch?v=... or video ID"
                    value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
                </div>
                {formError && <p className="form-error">{formError}</p>}
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={handleAddCamera} disabled={isSaving}>
                  <span className="material-symbols-outlined">videocam</span>
                  {isSaving ? 'Saving...' : 'Add Camera'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expanded view */}
        {expanded && expandedCamera && (
          <div className="camera-expanded glass-panel">
            <div className="expanded-header">
              <div>
                <span className="cam-id">{expandedCamera.id}</span>
                <h2 className="expanded-name">{expandedCamera.name}</h2>
                <p className="expanded-location">{expandedCamera.location}</p>
              </div>
              <button className="close-btn" onClick={() => setExpanded(null)}>
                <span className="material-symbols-outlined">close_fullscreen</span>
                Close
              </button>
            </div>
            <div className="expanded-embed">
              {renderFeed(expandedCamera.streamUrl, expandedCamera.name, expandedCamera.status)}
            </div>
          </div>
        )}

        {/* Camera grid */}
        <div className={`cameras-grid ${expanded ? 'cameras-grid-mini' : ''}`}>
          {cameras.map(camera => (
            <div key={camera.id}
              className={`camera-card glass-panel ${expanded === camera.id ? 'card-active' : ''}`}
            >
              <div className="camera-card-header">
                <div className="camera-meta">
                  <span className="cam-id">{camera.id}</span>
                  <span className={`cam-status-badge ${camera.status === 'online' ? 'online' : 'offline'}`}>
                    <span className="status-dot" />
                    {camera.status === 'online' ? 'Live' : 'Offline'}
                  </span>
                </div>
                <div className="card-actions">
                  <button className="expand-btn"
                    onClick={() => setExpanded(expanded === camera.id ? null : camera.id)}
                    title="Expand">
                    <span className="material-symbols-outlined">
                      {expanded === camera.id ? 'close_fullscreen' : 'open_in_full'}
                    </span>
                  </button>
                  {isAdmin && (
                    <button className="remove-btn" onClick={() => handleRemoveCamera(camera.id)} title="Remove">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="camera-embed">
                {renderFeed(camera.streamUrl, camera.name, camera.status)}
              </div>

              <div className="camera-card-footer">
                <span className="material-symbols-outlined footer-icon">location_on</span>
                <span className="camera-location">{camera.location}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CamerasScreen;
