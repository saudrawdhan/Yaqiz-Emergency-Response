import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import Sidebar from '../../components/common/Sidebar';
import { supabase } from '../../services/supabase';
import { Camera } from '../../types/camera';
import './CameraManagement.css';

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

const EMBED = (videoId: string) =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${videoId}&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0`;

const CameraManagement: React.FC = () => {
  const { cameras, isLoadingCameras, refreshCameras } = useSystem();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCamera, setExpandedCamera] = useState<Camera | null>(null);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', location: '', url: '', status: 'online' });
  const [addError, setAddError] = useState('');
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  // Edit modal
  const [editCamera, setEditCamera] = useState<Camera | null>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', url: '', status: 'online' });
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Camera | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCameras = cameras.filter(camera =>
    camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    camera.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCameras  = cameras.filter(c => c.status === 'online').length;
  const offlineCameras = cameras.filter(c => c.status === 'offline').length;

  // ── Add ──────────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setAddForm({ name: '', location: '', url: '', status: 'online' });
    setAddError('');
    setShowAddModal(true);
  };

  const handleAdd = async () => {
    setAddError('');
    if (!addForm.name.trim() || !addForm.location.trim() || !addForm.url.trim()) {
      setAddError('All fields are required.');
      return;
    }
    const videoId = extractVideoId(addForm.url);
    if (!videoId) {
      setAddError('Could not extract a valid YouTube video ID from that URL.');
      return;
    }
    setIsSavingAdd(true);
    const newId = `CAM-${Date.now()}-RUH`;
    const { error } = await supabase.from('cameras').insert({
      id: newId,
      name: addForm.name.trim(),
      location: addForm.location.trim(),
      stream_url: videoId,
      status: addForm.status,
      lat: 0,
      lng: 0,
    });
    setIsSavingAdd(false);
    if (error) { setAddError(error.message); return; }
    await refreshCameras();
    setShowAddModal(false);
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEditModal = (camera: Camera) => {
    setEditCamera(camera);
    setEditForm({
      name: camera.name,
      location: camera.location,
      url: camera.streamUrl,
      status: camera.status,
    });
    setEditError('');
  };

  const handleEdit = async () => {
    if (!editCamera) return;
    setEditError('');
    if (!editForm.name.trim() || !editForm.location.trim() || !editForm.url.trim()) {
      setEditError('All fields are required.');
      return;
    }
    const videoId = extractVideoId(editForm.url);
    if (!videoId) {
      setEditError('Could not extract a valid YouTube video ID from that URL.');
      return;
    }
    setIsSavingEdit(true);
    const { error } = await supabase.from('cameras').update({
      name: editForm.name.trim(),
      location: editForm.location.trim(),
      stream_url: videoId,
      status: editForm.status,
    }).eq('id', editCamera.id);
    setIsSavingEdit(false);
    if (error) { setEditError(error.message); return; }
    await refreshCameras();
    setEditCamera(null);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await supabase.from('cameras').delete().eq('id', deleteTarget.id);
    setIsDeleting(false);
    if (!error) {
      if (expandedCamera?.id === deleteTarget.id) setExpandedCamera(null);
      await refreshCameras();
    }
    setDeleteTarget(null);
  };

  return (
    <div className="camera-management-layout">
      <Sidebar userRole="admin" />

      <main className="camera-management-main">
        <div className="camera-container">
          {/* Header */}
          <header className="camera-header">
            <div>
              <h1>Camera Management</h1>
              <p>Monitor and configure surveillance infrastructure</p>
            </div>
            <button className="btn-add" onClick={openAddModal}>
              <span className="material-symbols-outlined">add</span>
              <span>Add Camera</span>
            </button>
          </header>

          {/* Stats */}
          <div className="camera-stats">
            <div className="stat-card-small">
              <span className="material-symbols-outlined stat-icon-large success">videocam</span>
              <div className="stat-content">
                <p className="stat-value-small">{onlineCameras}</p>
                <p className="stat-label-small">Online Cameras</p>
              </div>
            </div>
            <div className="stat-card-small">
              <span className="material-symbols-outlined stat-icon-large warning">videocam_off</span>
              <div className="stat-content">
                <p className="stat-value-small">{offlineCameras}</p>
                <p className="stat-label-small">Offline Cameras</p>
              </div>
            </div>
            <div className="stat-card-small">
              <span className="material-symbols-outlined stat-icon-large">grid_view</span>
              <div className="stat-content">
                <p className="stat-value-small">{cameras.length}</p>
                <p className="stat-label-small">Total Cameras</p>
              </div>
            </div>
          </div>

          {/* Camera List Card */}
          <div className="camera-list-card">
            <div className="list-header">
              <h2>Active Cameras</h2>
              <div className="search-box-small">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  placeholder="Search cameras..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="camera-grid">
              {isLoadingCameras ? (
                <div className="loading-container" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
                  <div className="loading-spinner" style={{ width: '48px', height: '48px', border: '4px solid rgba(158, 238, 43, 0.2)', borderTop: '4px solid #9dee2b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: '#a8a8a8' }}>Loading camera feeds...</p>
                </div>
              ) : filteredCameras.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#a8a8a8' }}>
                  No cameras found
                </div>
              ) : (
                filteredCameras.map(camera => {
                  const videoId = extractVideoId(camera.streamUrl);
                  return (
                    <div key={camera.id} className="camera-item">
                      <div className="camera-item-header">
                        <span className="material-symbols-outlined filled">videocam</span>
                        <span className={`camera-status ${camera.status}`}>{camera.status.toUpperCase()}</span>
                      </div>

                      <div
                        className="camera-preview-container"
                        onClick={() => setExpandedCamera(expandedCamera?.id === camera.id ? null : camera)}
                        title="Click to expand"
                      >
                        {camera.status === 'online' && videoId ? (
                          <iframe
                            className="camera-preview-video"
                            src={EMBED(videoId)}
                            loading="lazy"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                          />
                        ) : camera.status === 'online' ? (
                          <div className="camera-preview-placeholder">
                            <span className="material-symbols-outlined">live_tv</span>
                            <span className="preview-text">Live Stream</span>
                          </div>
                        ) : (
                          <div className="camera-preview-placeholder offline">
                            <span className="material-symbols-outlined">videocam_off</span>
                            <span className="preview-text">Offline</span>
                          </div>
                        )}
                      </div>

                      <div className="camera-item-body">
                        <h3 className="camera-name">{camera.name}</h3>
                        <p className="camera-location">
                          <span className="material-symbols-outlined">location_on</span>
                          <span>{camera.location}</span>
                        </p>
                        <p className="camera-id">ID: {camera.id}</p>

                        <div className="camera-actions">
                          <button
                            className="btn-icon"
                            onClick={() => setExpandedCamera(expandedCamera?.id === camera.id ? null : camera)}
                            title="Expand Feed"
                          >
                            <span className="material-symbols-outlined">
                              {expandedCamera?.id === camera.id ? 'close_fullscreen' : 'fullscreen'}
                            </span>
                          </button>
                          <button
                            className="btn-icon"
                            title="Edit Camera"
                            onClick={() => openEditModal(camera)}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            className="btn-icon delete"
                            title="Delete Camera"
                            onClick={() => setDeleteTarget(camera)}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Expanded CCTV Feed Modal */}
      {expandedCamera && (
        <div className="cctv-modal-backdrop" onClick={() => setExpandedCamera(null)}>
          <div className="cctv-modal-box" onClick={e => e.stopPropagation()}>
            <div className="cctv-modal-header">
              <div>
                <span className="cctv-modal-id">{expandedCamera.id}</span>
                <h2 className="cctv-modal-name">{expandedCamera.name}</h2>
                <p className="cctv-modal-location">{expandedCamera.location}</p>
              </div>
              <button className="cctv-modal-close" onClick={() => setExpandedCamera(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="cctv-modal-feed">
              {(() => {
                const vid = extractVideoId(expandedCamera.streamUrl);
                return vid ? (
                  <iframe
                    src={EMBED(vid)}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    style={{ position: 'absolute', top: '-10%', left: '-2px', width: 'calc(100% + 4px)', height: '120%', border: 'none', pointerEvents: 'none' }}
                  />
                ) : (
                  <div className="camera-preview-placeholder" style={{ position: 'absolute', inset: 0 }}>
                    <span className="material-symbols-outlined">live_tv</span>
                    <span className="preview-text">No stream available</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="cctv-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="cam-form-modal" onClick={e => e.stopPropagation()}>
            <div className="cam-form-header">
              <h2>Add Camera</h2>
              <button onClick={() => setShowAddModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="cam-form-body">
              <label>Camera Name
                <input type="text" placeholder="e.g. King Fahd Road @ Olaya" value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </label>
              <label>Location
                <input type="text" placeholder="e.g. King Fahd Road, Riyadh" value={addForm.location}
                  onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} />
              </label>
              <label>YouTube URL or Video ID
                <input type="text" placeholder="https://youtube.com/watch?v=... or video ID" value={addForm.url}
                  onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))} />
              </label>
              <label>Status
                <select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="degraded">Degraded</option>
                </select>
              </label>
              {addError && <p className="cam-form-error">{addError}</p>}
            </div>
            <div className="cam-form-footer">
              <button className="btn-cancel-form" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-confirm-form" onClick={handleAdd} disabled={isSavingAdd}>
                {isSavingAdd ? 'Saving...' : 'Add Camera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Camera Modal */}
      {editCamera && (
        <div className="cctv-modal-backdrop" onClick={() => setEditCamera(null)}>
          <div className="cam-form-modal" onClick={e => e.stopPropagation()}>
            <div className="cam-form-header">
              <h2>Edit Camera — {editCamera.id}</h2>
              <button onClick={() => setEditCamera(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="cam-form-body">
              <label>Camera Name
                <input type="text" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </label>
              <label>Location
                <input type="text" value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
              </label>
              <label>YouTube URL or Video ID
                <input type="text" value={editForm.url}
                  onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} />
              </label>
              <label>Status
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="degraded">Degraded</option>
                </select>
              </label>
              {editError && <p className="cam-form-error">{editError}</p>}
            </div>
            <div className="cam-form-footer">
              <button className="btn-cancel-form" onClick={() => setEditCamera(null)}>Cancel</button>
              <button className="btn-confirm-form" onClick={handleEdit} disabled={isSavingEdit}>
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="cctv-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="cam-form-modal" onClick={e => e.stopPropagation()}>
            <div className="cam-form-header">
              <h2>Delete Camera</h2>
              <button onClick={() => setDeleteTarget(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="cam-form-body">
              <p style={{ color: '#ccc', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong style={{ color: '#fff' }}>{deleteTarget.name}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="cam-form-footer">
              <button className="btn-cancel-form" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-delete-form" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete Camera'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraManagement;
