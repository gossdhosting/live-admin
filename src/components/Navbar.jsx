import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <h1>Live Streaming Admin</h1>
        </Link>
        <div className="navbar-actions">
          <span className="user-email">{user.email}</span>
          <Link to="/media">
            <button className="btn btn-secondary">Media Manager</button>
          </Link>
          <Link to="/settings">
            <button className="btn btn-secondary">Settings</button>
          </Link>
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
