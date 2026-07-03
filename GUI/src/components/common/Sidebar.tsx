import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  userRole: 'admin' | 'responder';
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const adminNavItems: NavItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/cameras', label: 'Camera Management', icon: 'videocam' },
    { path: '/admin/users', label: 'User Management', icon: 'group' },
    { path: '/admin/audit', label: 'Audit Log', icon: 'analytics' },
    { path: '/admin/video-test', label: 'AI Test Lab', icon: 'science' },
  ];

  const responderNavItems: NavItem[] = [
    { path: '/responder/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/responder/archives', label: 'Incidents', icon: 'warning' },
    { path: '/responder/cameras', label: 'Cameras', icon: 'videocam' },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : responderNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="sidebar-hamburger"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* Triangle Logo at Top */}
      <div className="sidebar-top-logo">
        <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor"/>
        </svg>
      </div>

      {/* Brand Section */}
      <div className="sidebar-brand">
        <svg className="sidebar-logo" fill="currentColor" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M 5 20 L 5 80 L 45 80 L 45 70 L 15 70 L 15 55 L 45 55 L 45 45 L 15 45 L 15 30 L 45 30 L 45 20 L 5 20 Z"></path>
          <path d="M 55 20 L 55 80 L 75 80 C 85 80 90 75 90 65 L 90 55 C 90 45 85 40 75 40 L 65 40 L 65 20 L 55 20 Z M 65 50 L 75 50 C 80 50 80 55 80 57.5 L 80 62.5 C 80 65 80 70 75 70 L 65 70 L 65 50 Z"></path>
        </svg>
        <div className="sidebar-brand-text">
          <h2 className="sidebar-brand-name">Emergency Response</h2>
          <p className="sidebar-brand-tagline">Command Platform</p>
        </div>
      </div>

      {/* User Profile */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">{user?.role === 'admin' ? 'Administrator' : 'First Responder'}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            <span className={`material-symbols-outlined ${isActive(item.path) ? 'filled' : ''}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-divider"></div>

      {/* Logout Button */}
      <button className="sidebar-logout" onClick={handleLogout}>
        <span className="material-symbols-outlined">logout</span>
        <span>Logout</span>
      </button>
    </aside>
    </>
  );
};

export default Sidebar;
