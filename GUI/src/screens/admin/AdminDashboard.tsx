import React from 'react';
import { useSystem } from '../../context/SystemContext';
import Sidebar from '../../components/common/Sidebar';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const { systemHealth, cameras } = useSystem();

  const onlineCameras = cameras?.filter(c => c.status === 'online').length || 0;
  const totalCameras = cameras?.length || 0;
  const offlineCameras = totalCameras - onlineCameras;

  const stats = [
    {
      icon: 'warning',
      label: 'Active Incidents',
      value: '23',
      trend: '+5 since last hour',
      trendColor: 'red',
      trendIcon: 'arrow_upward'
    },
    {
      icon: 'health_and_safety',
      label: 'System Health',
      value: `${systemHealth?.database.status === 'healthy' ? '99.8%' : '95.0%'}`,
      trend: 'Operational',
      trendColor: 'green',
      trendIcon: 'check_circle'
    },
    {
      icon: 'videocam',
      label: 'Active Cameras',
      value: `${onlineCameras}`,
      trend: offlineCameras > 0 ? `${offlineCameras} offline` : 'All online',
      trendColor: offlineCameras > 0 ? 'red' : 'green',
      trendIcon: offlineCameras > 0 ? 'warning' : 'visibility'
    },
    {
      icon: 'timer',
      label: 'Avg. Response Time',
      value: '8 min',
      trend: '-1 min',
      trendColor: 'teal',
      trendIcon: 'trending_down'
    },
    {
      icon: 'local_police',
      label: 'Dispatched Units',
      value: '12',
      trend: 'Real-time',
      trendColor: 'blue',
      trendIcon: 'sync'
    },
    {
      icon: 'pending_actions',
      label: 'Pending Approvals',
      value: '7',
      trend: '+2 new',
      trendColor: 'yellow',
      trendIcon: 'trending_up'
    },
    {
      icon: 'task_alt',
      label: 'Open Tasks',
      value: '15',
      trend: 'Due today',
      trendColor: 'purple',
      trendIcon: 'update'
    },
    {
      icon: 'notifications',
      label: 'Unread Notifications',
      value: '4',
      trend: 'High priority',
      trendColor: 'orange',
      trendIcon: 'priority_high'
    }
  ];

  const getTrendColorClass = (color: string) => {
    const colorMap: {[key: string]: string} = {
      red: 'trend-red',
      green: 'trend-green',
      yellow: 'trend-yellow',
      teal: 'trend-teal',
      blue: 'trend-blue',
      purple: 'trend-purple',
      orange: 'trend-orange'
    };
    return colorMap[color] || 'trend-gray';
  };

  return (
    <div className="admin-dashboard-layout">
      <Sidebar userRole="admin" />
      
      <main className="admin-dashboard-main">
        <div className="dashboard-glass-container glass-panel">
          {/* Header */}
          <header className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Operational Dashboard</h1>
              <p className="dashboard-subtitle">Real-time overview of system metrics and emergency operations.</p>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card glass-panel">
                <div className="stat-header">
                  <span className="material-symbols-outlined stat-icon filled">
                    {stat.icon}
                  </span>
                  <span className={`stat-trend ${getTrendColorClass(stat.trendColor)}`}>
                    <span className="material-symbols-outlined trend-icon">
                      {stat.trendIcon}
                    </span>
                    {stat.trend}
                  </span>
                </div>
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
