import React from 'react';
import './StatusBadge.css';

export type BadgeType = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
export type SeverityType = 'critical' | 'high' | 'medium' | 'low' | 'cleared';

interface StatusBadgeProps {
  label: string;
  type?: BadgeType;
  severity?: SeverityType;
  showDot?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, type = 'primary', severity, showDot = true }) => {
  const badgeType = severity || type;
  
  return (
    <span className={`status-badge badge-${badgeType}`}>
      {showDot && <span className="status-dot"></span>}
      {label}
    </span>
  );
};

export default StatusBadge;
