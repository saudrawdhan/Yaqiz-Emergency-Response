import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { generateIncidentReport } from '../../services/pdfService';
import Sidebar from '../../components/common/Sidebar';
import StatusBadge from '../../components/common/StatusBadge';
import MapView from '../../components/common/MapView';
import { supabase } from '../../services/supabase';
import {
  getValidActions,
  OrchestratorError,
  WorkflowAction,
  dispatchNearestUnits,
} from '../../services/incidentOrchestrator';
import './IncidentDetails.css';

// Lightweight profile shape for the assignee picker. Reads come from
// `profiles` directly; the actual assignment goes through the RPC.
interface AssignableResponder {
  id: string;
  name: string;
  agency: string | null;
}

const UNIT_STATUS_LABEL: Record<string, string> = {
  dispatched: 'Dispatched',
  en_route: 'En Route',
  on_scene: 'On Scene',
  cleared: 'Cleared',
};

// Maps OrchestratorError codes -> user-facing copy. Anything we don't
// recognise falls back to the raw message so admins still see the cause.
const ORCHESTRATOR_ERROR_COPY: Record<string, string> = {
  INVALID_TRANSITION: 'That action is not allowed from the current status.',
  FORBIDDEN: 'Your role is not permitted to take this action.',
  NOT_FOUND: 'This incident could not be found. It may have been deleted.',
  NOOP: 'The incident is already in that status.',
  TERMINAL: 'This incident is already closed and cannot be changed.',
  INVALID_ASSIGNEE: 'The selected responder is not active.',
  UNAUTHENTICATED: 'You are not signed in. Please log in again.',
  NO_PROFILE: 'Your account is missing a profile entry. Contact an admin.',
};

const IncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, updateIncidentStatus, assignIncident } = useIncidents();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [responders, setResponders] = useState<AssignableResponder[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [assignNote, setAssignNote] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  const incident = incidents.find(i => i.id === id);

  const validActions: WorkflowAction[] = incident && user
    ? getValidActions(incident, user)
    : [];

  // Lazy-load the responder picker when the assign dialog opens. Profiles
  // are public-readable for authenticated users, so this is safe.
  useEffect(() => {
    if (!assignDialogOpen || responders.length > 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, agency')
        .eq('role', 'responder')
        .eq('status', 'active')
        .order('name');
      if (cancelled) return;
      if (error) {
        showError('Could not load responders.');
        return;
      }
      setResponders((data ?? []) as AssignableResponder[]);
    })();
    return () => { cancelled = true; };
  }, [assignDialogOpen, responders.length, showError]);

  const handleOrchestratorError = (e: unknown, fallback: string) => {
    if (e instanceof OrchestratorError) {
      showError(ORCHESTRATOR_ERROR_COPY[e.code] ?? e.message);
    } else if (e instanceof Error) {
      showError(e.message || fallback);
    } else {
      showError(fallback);
    }
  };

  // Calls the dispatch-units Edge Function: assigns nearest units per agency
  // and fires a Telegram notification. Telegram failures are surfaced as
  // a warning toast but do not undo the assignment.
  const handleDispatchUnits = async () => {
    if (!incident) return;
    setIsDispatching(true);
    try {
      const result = await dispatchNearestUnits(incident.id);

      if (result.count === 0) {
        if (result.skipped.length > 0) {
          showError(
            `No units dispatched. Skipped: ${result.skipped
              .map(s => `${s.agency_type} (${s.reason.replace('_', ' ')})`)
              .join(', ')}`,
          );
        } else {
          showError('No eligible units available.');
        }
      } else {
        const summary = result.dispatched
          .map(u => `${u.agency_type}: ${u.unit_name} (${u.distance_km} km)`)
          .join(' · ');
        showSuccess(`Dispatched ${result.count} unit(s) — ${summary}`);

        if (!result.notification.ok) {
          showError(
            `Telegram notification failed: ${result.notification.detail}. ` +
              `Assignment is recorded.`,
          );
        }
      }
    } catch (e) {
      handleOrchestratorError(e, 'Failed to dispatch units.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!incident) return;
    setIsGeneratingPDF(true);
    try {
      generateIncidentReport(incident);
      showSuccess('PDF report generated successfully!');
    } catch {
      showError('Failed to generate PDF report. Please try again.');
    } finally {
      setTimeout(() => setIsGeneratingPDF(false), 1000);
    }
  };

  const handleAction = async (action: WorkflowAction) => {
    if (!incident) return;

    if (action.requiresAssignee) {
      setAssignDialogOpen(true);
      return;
    }

    setIsActing(true);
    try {
      await updateIncidentStatus(incident.id, action.targetStatus);
      showSuccess(`${action.label} — ${action.targetStatus.replace('_', ' ')}.`);
    } catch (e) {
      handleOrchestratorError(e, `Failed: ${action.label}.`);
    } finally {
      setIsActing(false);
    }
  };

  const handleConfirmAssign = async () => {
    if (!incident || !selectedAssignee) return;
    setIsActing(true);
    try {
      // Assignment + on_scene transition in a single RPC call: the orchestrator
      // sets assigned_to_user_id and moves status from acknowledged -> on_scene
      // atomically.
      await updateIncidentStatus(incident.id, 'on_scene', {
        assigneeId: selectedAssignee,
        note: assignNote.trim() || undefined,
      });
      showSuccess('Responder assigned. Incident is now active.');
      setAssignDialogOpen(false);
      setSelectedAssignee('');
      setAssignNote('');
    } catch (e) {
      handleOrchestratorError(e, 'Failed to assign responder.');
    } finally {
      setIsActing(false);
    }
  };

  // Reassignment without status change — only meaningful while the incident
  // is still active.
  const handleReassignOnly = async () => {
    if (!incident || !selectedAssignee) return;
    setIsActing(true);
    try {
      await assignIncident(incident.id, selectedAssignee, assignNote.trim() || undefined);
      showSuccess('Assignment updated.');
      setAssignDialogOpen(false);
      setSelectedAssignee('');
      setAssignNote('');
    } catch (e) {
      handleOrchestratorError(e, 'Failed to update assignment.');
    } finally {
      setIsActing(false);
    }
  };

  if (!incident) {
    return (
      <div className="incident-details-layout">
        <Sidebar userRole="responder" />
        <main className="incident-details-main">
          <div className="not-found">
            <h1>Incident Not Found</h1>
            <button className="btn btn-primary" onClick={() => navigate('/responder/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="incident-details-layout">
      <Sidebar userRole="responder" />

      <main className="incident-details-main">
        <div className="incident-container">
          {/* Breadcrumb */}
          <div className="id-breadcrumb">
            <button className="id-back-btn" onClick={() => navigate('/responder/dashboard')}>
              <span className="material-symbols-outlined">arrow_back</span>
              Dashboard
            </button>
            <span className="id-sep">/</span>
            <span className="id-crumb-current">Incident Details</span>
          </div>

          {/* Title bar */}
          <div className="id-title-bar">
            <div className="id-title-block">
              <h1 className="id-title">Accident Details</h1>
              <p className="id-subtitle">
                Case ID: <span className="id-case-id">{incident.caseId}</span>
              </p>
            </div>
            <div className="id-actions">
              {/* Workflow actions — gated by the orchestrator. The UI only
                  shows what is valid for the current status + role; the
                  server re-validates and is the source of truth. */}
              {validActions.length === 0 && (
                <span className="id-terminal-label">
                  This incident is closed.
                </span>
              )}
              {validActions.map((action, idx) => {
                const isPrimary = idx === 0 && !action.destructive;
                const className = action.destructive
                  ? 'btn btn-outline btn-danger'
                  : isPrimary
                    ? 'btn btn-primary'
                    : 'btn btn-outline';
                const icon = action.id === 'verify' ? 'check_circle'
                  : action.id === 'assign' ? 'person_add'
                  : action.id === 'mark_on_scene' ? 'directions_run'
                  : action.id === 'resolve' ? 'task_alt'
                  : action.id === 'close' ? 'lock'
                  : 'cancel';
                return (
                  <button
                    key={action.id}
                    className={className}
                    onClick={() => handleAction(action)}
                    disabled={isActing}
                    title={action.description}
                  >
                    <span className="material-symbols-outlined">{icon}</span>
                    {action.label}
                  </button>
                );
              })}
              {/* Assignment engine: only meaningful once verified and before closure */}
              {incident.status !== 'new' && incident.status !== 'closed' && (
                <button
                  className="btn btn-outline btn-dispatch"
                  onClick={handleDispatchUnits}
                  disabled={isDispatching}
                  title="Auto-assign the nearest active unit per agency and send a Telegram notification"
                >
                  {isDispatching ? (
                    <>
                      <span className="material-symbols-outlined spinning">sync</span>
                      Dispatching…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">send</span>
                      Dispatch Nearest Units
                    </>
                  )}
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleGeneratePDF} disabled={isGeneratingPDF}>
                {isGeneratingPDF ? (
                  <>
                    <span className="material-symbols-outlined spinning">sync</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">print</span>
                    Generate PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Grid */}
          <div className="incident-grid">
            {/* Left Column */}
            <div className="incident-left">
              {/* Location Card */}
              <div className="detail-card glass-panel">
                <h3 className="card-title">Location</h3>
                <div className="map-embed">
                  <MapView
                    center={[incident.coordinates.latitude, incident.coordinates.longitude]}
                    zoom={15}
                    markers={[{
                      id: incident.id,
                      position: [incident.coordinates.latitude, incident.coordinates.longitude],
                      severity: incident.severity === 'high' ? 'critical' :
                                incident.severity === 'moderate' ? 'high' : 'medium' as any,
                      title: incident.caseId,
                      description: incident.location
                    }]}
                    height="280px"
                  />
                </div>
                <div className="location-details">
                  <div className="detail-row">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{incident.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Time of Incident</span>
                    <span className="detail-value">{new Date(incident.time).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <StatusBadge label={incident.status.replace('_', ' ')} severity={
                      incident.status === 'new' ? 'critical' :
                      incident.status === 'acknowledged' ? 'high' : 'medium' as any
                    } />
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">AI Confidence</span>
                    <span className={`confidence-badge confidence-${incident.confidence}`}>
                      {incident.confidence.charAt(0).toUpperCase() + incident.confidence.slice(1)}
                    </span>
                  </div>
                  {incident.estimatedInjuries !== undefined && (
                    <div className="detail-row">
                      <span className="detail-label">Estimated Injuries</span>
                      <span className="detail-value">{incident.estimatedInjuries}</span>
                    </div>
                  )}
                  {incident.weather && (
                    <div className="detail-row">
                      <span className="detail-label">Weather</span>
                      <span className="detail-value">
                        {incident.weather.condition}, {incident.weather.temperature}°C — visibility {incident.weather.visibility}
                      </span>
                    </div>
                  )}
                  {incident.traffic && (
                    <div className="detail-row">
                      <span className="detail-label">Traffic</span>
                      <span className="detail-value">{incident.traffic}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary + Agency Grid */}
              <div className="summary-grid">
                <div className="detail-card glass-panel">
                  <h3 className="card-title">Event Summary</h3>
                  <p className="summary-text">{incident.aiSummary}</p>
                </div>

                <div className="detail-card glass-panel">
                  <h3 className="card-title">Agency Briefings</h3>
                  <div className="agency-briefings">
                    <div className="agency-briefing-item">
                      <span className="agency-briefing-label">Hospital</span>
                      <p className="summary-text">
                        {incident.llmHospital ?? 'No hospital briefing available.'}
                      </p>
                    </div>
                    <div className="agency-briefing-item">
                      <span className="agency-briefing-label">Police</span>
                      <p className="summary-text">
                        {incident.llmPolice ?? 'No police briefing available.'}
                      </p>
                    </div>
                    <div className="agency-briefing-item">
                      <span className="agency-briefing-label">Najm</span>
                      <p className="summary-text">
                        {incident.llmNajm ?? 'No Najm briefing available.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Photos — only shown when photos exist */}
              {incident.photos.length > 0 && (
                <div className="detail-card glass-panel">
                  <h3 className="card-title">
                    <span className="material-symbols-outlined">camera_alt</span>
                    Accident Evidence Photos
                  </h3>
                  <div className="image-gallery">
                    {incident.photos.slice(0, 3).map((photo, idx) => (
                      <div key={photo.id} className="gallery-item">
                        <img src={photo.uri} alt={`Evidence ${idx + 1}`} className="gallery-image" />
                        <div className="gallery-overlay">
                          <span className="material-symbols-outlined">zoom_in</span>
                        </div>
                      </div>
                    ))}
                    {incident.photos.length > 3 && (
                      <div className="gallery-more">
                        <span className="material-symbols-outlined">add_photo_alternate</span>
                        <p>+{incident.photos.length - 3} more</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="incident-right">
              {/* Action Log */}
              <div className="detail-card glass-panel">
                <h3 className="card-title">Action Log</h3>
                <div className="action-log">
                  {incident.actionLog.length === 0 && (
                    <p className="empty-text">No actions recorded yet.</p>
                  )}
                  {incident.actionLog.map((log, idx) => (
                    <div key={idx} className="log-entry">
                      <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="log-user">{log.user}</span>
                      <span className="log-action">{log.action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispatched Units */}
              <div className="detail-card glass-panel">
                <h3 className="card-title">
                  <span className="material-symbols-outlined">local_shipping</span>
                  Dispatched Units
                </h3>
                {incident.dispatchedUnits.length === 0 ? (
                  <p className="empty-text">No units dispatched yet.</p>
                ) : (
                  <div className="units-list">
                    {incident.dispatchedUnits.map(unit => (
                      <div key={unit.id} className="unit-item">
                        <div className="unit-header">
                          <span className="unit-name">{unit.name}</span>
                          <span className={`unit-status unit-status-${unit.status}`}>
                            {UNIT_STATUS_LABEL[unit.status] ?? unit.status}
                          </span>
                        </div>
                        <span className="unit-agency">{unit.agency}</span>
                        <span className="unit-time">
                          Dispatched {new Date(unit.dispatchedAt).toLocaleTimeString()}
                          {unit.onSceneAt && ` · On scene ${new Date(unit.onSceneAt).toLocaleTimeString()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collaboration Log */}
              <div className="detail-card glass-panel">
                <h3 className="card-title">
                  <span className="material-symbols-outlined">forum</span>
                  Inter-Agency Messages
                </h3>
                {incident.collaborationLog.length === 0 ? (
                  <p className="empty-text">No messages yet.</p>
                ) : (
                  <div className="collab-log">
                    {incident.collaborationLog.map(msg => (
                      <div key={msg.id} className="collab-message">
                        <div className="collab-meta">
                          <span className="collab-user">{msg.user}</span>
                          <span className="collab-agency">{msg.agency}</span>
                          <span className="collab-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="collab-text">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment dialog — opened by the Assign / Mark On Scene workflow
            action. Picks an active responder and routes through the
            orchestrator RPC, which sets assigned_to_user_id and moves
            status -> on_scene atomically. */}
        {assignDialogOpen && incident && (
          <div className="assign-dialog-overlay" onClick={() => !isActing && setAssignDialogOpen(false)}>
            <div className="assign-dialog glass-panel" onClick={e => e.stopPropagation()}>
              <h2 className="assign-dialog-title">
                <span className="material-symbols-outlined">person_add</span>
                Assign Responder
              </h2>
              <p className="assign-dialog-subtitle">
                Pick an active responder. They will be set as the assignee and
                this incident will move into active handling.
              </p>

              <label className="assign-dialog-label">
                Responder
                <select
                  className="assign-dialog-select"
                  value={selectedAssignee}
                  onChange={e => setSelectedAssignee(e.target.value)}
                  disabled={isActing}
                >
                  <option value="">Select a responder…</option>
                  {responders.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.agency ? ` — ${r.agency}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="assign-dialog-label">
                Note (optional)
                <textarea
                  className="assign-dialog-textarea"
                  rows={2}
                  value={assignNote}
                  onChange={e => setAssignNote(e.target.value)}
                  placeholder="e.g. ETA 8 minutes, dispatching unit 211"
                  disabled={isActing}
                />
              </label>

              <div className="assign-dialog-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={isActing}
                >
                  Cancel
                </button>
                {incident.status === 'on_scene' && (
                  <button
                    className="btn btn-outline"
                    onClick={handleReassignOnly}
                    disabled={!selectedAssignee || isActing}
                    title="Change the assigned responder without changing status"
                  >
                    Reassign Only
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmAssign}
                  disabled={!selectedAssignee || isActing}
                >
                  {isActing ? 'Working…' : 'Assign & Mark On Scene'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default IncidentDetails;
