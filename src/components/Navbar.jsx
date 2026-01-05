import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminSession = localStorage.getItem('adminToken') !== null;

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleReturnToAdmin = () => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      localStorage.removeItem('adminToken');
      localStorage.setItem('token', adminToken);
      window.location.href = '/';
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/media', label: 'Media', icon: '🎬' },
    { path: '/plans', label: 'Plans', icon: '💎' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    ...(user && user.role === 'admin' ? [{ path: '/admin', label: 'Admin', icon: '👑' }] : [])
  ];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Logo/Brand */}
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo">🎥</span>
          <span className="navbar-title">TT Broadcast</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'nav-link-active' : ''}`}
            >
              <span className="nav-link-icon">{link.icon}</span>
              <span className="nav-link-text">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Desktop User Menu */}
        <div className="navbar-user">
          {isAdminSession && (
            <button
              className="btn"
              onClick={handleReturnToAdmin}
              style={{
                marginRight: '1rem',
                backgroundColor: '#f39c12',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              👑 Return to Admin
            </button>
          )}
          <div className="user-info">
            <span className="user-avatar">{user.email.charAt(0).toUpperCase()}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="btn btn-logout" onClick={handleLogout}>
            <span className="btn-icon">🚪</span>
            <span className="btn-text">Logout</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="navbar-mobile-toggle" onClick={toggleMobileMenu}>
          <span className={`hamburger ${mobileMenuOpen ? 'hamburger-open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'navbar-mobile-menu-open' : ''}`}>
        <div className="navbar-mobile-user">
          <span className="user-avatar-mobile">{user.email.charAt(0).toUpperCase()}</span>
          <span className="user-email-mobile">{user.email}</span>
        </div>
        {isAdminSession && (
          <button
            className="btn"
            onClick={() => { handleReturnToAdmin(); setMobileMenuOpen(false); }}
            style={{
              width: '100%',
              marginBottom: '0.5rem',
              backgroundColor: '#f39c12',
              color: '#fff',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            👑 Return to Admin
          </button>
        )}
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`nav-link-mobile ${isActive(link.path) ? 'nav-link-mobile-active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="nav-link-icon">{link.icon}</span>
            <span className="nav-link-text">{link.label}</span>
          </Link>
        ))}
        <button className="btn btn-logout-mobile" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
          <span className="btn-icon">🚪</span>
          <span className="btn-text">Logout</span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
    </nav>
  );
}

export default Navbar;
