import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncidents } from '../../context/IncidentContext';
import Sidebar from '../../components/common/Sidebar';
import StatusBadge from '../../components/common/StatusBadge';
import MapView from '../../components/common/MapView';
import './ResponderDashboard.css';

const ResponderDashboard: React.FC = () => {
  const { incidents, loading, error, refreshIncidents } = useIncidents();
  const navigate = useNavigate();
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

  const activeIncidents = incidents.filter(i => i.status !== 'closed' && i.status !== 'scene_cleared');

  const getTimeAgo = (time: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(time).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Riyadh center coordinates
  const mapCenter: [number, number] = [24.7136, 46.6753];

  // Prepare map markers from incidents
  const mapMarkers = activeIncidents.map(incident => ({
    id: incident.id,
    position: [incident.coordinates.latitude, incident.coordinates.longitude] as [number, number],
    severity: incident.severity === 'high' ? 'critical' : 
              incident.severity === 'moderate' ? 'high' : 'medium' as any,
    title: incident.caseId,
    description: incident.location,
    onClick: () => {
      setSelectedIncident(incident.id);
      navigate(`/responder/incident/${incident.id}`);
    }
  }));

  return (
    <div className="responder-dashboard-layout">
      <Sidebar userRole="responder" />
      
      <main className="responder-dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Active Incidents</h1>
            <p className="dashboard-subtitle">Real-time monitoring and response coordination</p>
          </div>
          <div className="dashboard-stats">
            <div className="stat-chip stat-chip-new">
              <span className="material-symbols-outlined stat-chip-icon">warning</span>
              <span className="stat-label">New</span>
              <span className="stat-value stat-value-new">{activeIncidents.filter(i => i.status === 'new').length}</span>
            </div>
            <div className="stat-chip stat-chip-acknowledged">
              <span className="material-symbols-outlined stat-chip-icon">check_circle</span>
              <span className="stat-label">Acknowledged</span>
              <span className="stat-value stat-value-acknowledged">{activeIncidents.filter(i => i.status === 'acknowledged').length}</span>
            </div>
            <div className="stat-chip stat-chip-active">
              <span className="material-symbols-outlined stat-chip-icon">directions_run</span>
              <span className="stat-label">On Scene</span>
              <span className="stat-value stat-value-active">{activeIncidents.filter(i => i.status === 'on_scene').length}</span>
            </div>
            <div className="stat-chip stat-chip-total">
              <span className="material-symbols-outlined stat-chip-icon">list_alt</span>
              <span className="stat-label">Total Active</span>
              <span className="stat-value">{activeIncidents.length}</span>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Incidents List */}
          <div className="incidents-panel glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Incidents</h2>
              <div className="search-box-small">
                <span className="material-symbols-outlined">search</span>
                <input type="text" placeholder="Search location..." />
              </div>
            </div>
            
            <div className="incidents-list">
              {loading && (
                <div className="empty-state">
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  <p>Loading incidents...</p>
                  <p className="loading-hint">This may take a moment on first load</p>
                </div>
              )}
              {!loading && error && (
                <div className="empty-state error-state">
                  <span className="material-symbols-outlined">cloud_off</span>
                  <p>{error}</p>
                  <button className="retry-btn" onClick={refreshIncidents}>
                    <span className="material-symbols-outlined">refresh</span>
                    Retry
                  </button>
                </div>
              )}
              {!loading && !error && activeIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`incident-card incident-card-status-${incident.status} ${selectedIncident === incident.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedIncident(incident.id);
                    navigate(`/responder/incident/${incident.id}`);
                  }}
                >
                  <div className="incident-card-header">
                    <span className="incident-id">{incident.caseId}</span>
                    <div className="incident-badges">
                      <span className={`incident-status-chip incident-status-chip-${incident.status}`}>
                        <span className="material-symbols-outlined">
                          {incident.status === 'new' ? 'warning' :
                           incident.status === 'acknowledged' ? 'check_circle' :
                           incident.status === 'on_scene' ? 'directions_run' : 'task_alt'}
                        </span>
                        {incident.status === 'new' ? 'New' :
                         incident.status === 'acknowledged' ? 'Acknowledged' :
                         incident.status === 'on_scene' ? 'On Scene' : incident.status.replace('_', ' ')}
                      </span>
                      <StatusBadge
                        label={incident.severity}
                        severity={incident.severity === 'high' ? 'critical' :
                                  incident.severity === 'moderate' ? 'high' : 'medium' as any}
                      />
                    </div>
                  </div>

                  <div className="incident-location">
                    <span className="material-symbols-outlined">location_on</span>
                    <span>{incident.location.split(',')[0]}</span>
                  </div>

                  <p className="incident-summary">{incident.aiSummary.substring(0, 80)}...</p>

                  <div className="incident-footer">
                    <span className="incident-time">{getTimeAgo(incident.time)}</span>
                    <button className="btn-view" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/responder/incident/${incident.id}`);
                    }}>
                      View Details
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}

              {!loading && !error && activeIncidents.length === 0 && (
                <div className="empty-state">
                  <span className="material-symbols-outlined">check_circle</span>
                  <p>No active incidents</p>
                </div>
              )}
            </div>
          </div>

          {/* Real Interactive Map Panel */}
          <div className="map-panel glass-panel">
            <MapView
              center={mapCenter}
              zoom={12}
              markers={mapMarkers}
              height="100%"
            />
            
            {/* Map Legend */}
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-dot critical"></span>
                <span>Critical</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot high"></span>
                <span>High</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot medium"></span>
                <span>Medium</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot low"></span>
                <span>Low</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResponderDashboard;
