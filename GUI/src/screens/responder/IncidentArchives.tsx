import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncidents } from '../../context/IncidentContext';
import Sidebar from '../../components/common/Sidebar';
import StatusBadge from '../../components/common/StatusBadge';
import CreateIncidentModal from '../../components/responder/CreateIncidentModal';
import './IncidentArchives.css';

const IncidentArchives: React.FC = () => {
  const { incidents, refreshIncidents } = useIncidents();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredIncidents = incidents.filter(incident =>
    incident.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    incident.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="archives-layout">
      <Sidebar userRole="responder" />
      
      <main className="archives-main">
        <div className="archives-container">
          {/* Header */}
          <header className="archives-header">
            <h1 className="archives-title">Incident Reports</h1>
            <button className="btn-create" onClick={() => setShowCreateModal(true)}>
              <span className="material-symbols-outlined">add</span>
              <span>Create New Report</span>
            </button>
          </header>

          {/* Search and Filters */}
          <div className="search-filters">
            <div className="search-box-large">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search by Report ID or keyword"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="filter-dropdown">
              <option>Status: All</option>
              <option>New</option>
              <option>Acknowledged</option>
              <option>Scene Cleared</option>
            </select>
            <select className="filter-dropdown">
              <option>Date Range</option>
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>

          {/* Archives Grid */}
          <div className="archives-grid">
            {filteredIncidents.map((incident) => (
              <div key={incident.id} className="archive-card" onClick={() => navigate(`/responder/incident/${incident.id}`)}>
                <div className="archive-card-header">
                  <span className="archive-case-id">{incident.caseId}</span>
                  <StatusBadge label={incident.status} severity={incident.severity as any} />
                </div>

                <div className="archive-card-body">
                  <div className="archive-location">
                    <span className="material-symbols-outlined">location_on</span>
                    <span>{incident.location.split(',')[0]}</span>
                  </div>
                  <p className="archive-summary">{incident.aiSummary}</p>

                  <div className="archive-details">
                    <div className="detail-item">
                      <span className="detail-item-label">Date</span>
                      <span className="detail-item-value">{new Date(incident.time).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-item-label">Time</span>
                      <span className="detail-item-value">{new Date(incident.time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="archive-card-footer">
                  <span className="archive-timestamp">
                    {new Date(incident.time).toLocaleString()}
                  </span>
                  <button className="btn-view-archive" onClick={(e) => { e.stopPropagation(); navigate(`/responder/incident/${incident.id}`); }}>
                    <span>View Details</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredIncidents.length === 0 && (
              <div className="empty-archives">
                <span className="material-symbols-outlined">folder_off</span>
                <p>No incident reports found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span className="pagination-info">Showing 1 to {filteredIncidents.length} of {filteredIncidents.length} results</span>
            <div className="pagination-buttons">
              <button className="pagination-button" disabled>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="pagination-button active">1</button>
              <button className="pagination-button">2</button>
              <button className="pagination-button">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false)
            await refreshIncidents()
          }}
        />
      )}
    </div>
  );
};

export default IncidentArchives;
