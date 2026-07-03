import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Incident } from '../../types/incident';
import './AlertModal.css';

interface AlertModalProps {
  incident: Incident;
  onAccept: () => void;
  onDismiss: () => void;
  autoAcceptTime?: number; // in seconds
}

const AlertModal: React.FC<AlertModalProps> = ({ 
  incident, 
  onAccept, 
  onDismiss,
  autoAcceptTime = 10 
}) => {
  const [timeLeft, setTimeLeft] = useState(autoAcceptTime);
  const [isAccepting, setIsAccepting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Play alert sound (you can add audio file here)
    // const audio = new Audio();
    // audio.src = '/alert-sound.mp3';
    // audio.play().catch(e => console.log('Audio play failed', e));

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-escalate to next agency
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDismiss]);

  const handleAccept = () => {
    setIsAccepting(true);
    setTimeout(() => {
      onAccept();
      navigate(`/responder/incident/${incident.id}`);
    }, 500);
  };

  const getSeverityClass = () => {
    if (incident.severity === 'high') return 'critical';
    if (incident.severity === 'moderate') return 'high';
    return 'medium';
  };

  const progressPercentage = (timeLeft / autoAcceptTime) * 100;

  return (
    <div className="alert-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className={`alert-modal-container ${getSeverityClass()}`}>
        {/* Alert Icon */}
        <div className="alert-icon-container">
          <div className="alert-icon-pulse"></div>
          <span className="material-symbols-outlined alert-icon filled">warning</span>
        </div>

        {/* Alert Content */}
        <div className="alert-content">
          <h1 className="alert-title">URGENT: New Accident Detected</h1>
          
          <div className="alert-details">
            <div className="alert-detail-item">
              <span className="material-symbols-outlined">location_on</span>
              <div>
                <span className="alert-label">Location</span>
                <span className="alert-value">{incident.location}</span>
              </div>
            </div>

            <div className="alert-detail-item">
              <span className="material-symbols-outlined">schedule</span>
              <div>
                <span className="alert-label">Time</span>
                <span className="alert-value">{new Date(incident.time).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="alert-detail-item">
              <span className="material-symbols-outlined">local_hospital</span>
              <div>
                <span className="alert-label">Estimated Injuries</span>
                <span className="alert-value">{incident.estimatedInjuries || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* AI Summary Preview */}
          <div className="alert-summary">
            <p className="summary-label">AI Analysis:</p>
            <p className="summary-text">{incident.aiSummary.substring(0, 150)}...</p>
          </div>
        </div>

        {/* Timer Section */}
        <div className="alert-timer-section">
          <div className="timer-progress-bar">
            <div 
              className="timer-progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="timer-text">
            {timeLeft > 0 
              ? `Alert will escalate to next agency in ${timeLeft} seconds` 
              : 'Escalating...'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="alert-actions">
          <button 
            className={`btn-accept ${isAccepting ? 'accepting' : ''}`}
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <>
                <span className="material-symbols-outlined spinning">sync</span>
                Accepting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Accept & Respond
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
