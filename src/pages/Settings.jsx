import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import RtmpTemplatesManager from '../components/RtmpTemplatesManager';

function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile update state
  const [profileData, setProfileData] = useState({
    email: '',
    name: '',
    currentPassword: '',
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchUserProfile();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const settingsObj = {};
      response.data.settings.forEach((s) => {
        settingsObj[s.key] = s.value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setProfileData({
        email: response.data.user.email,
        name: response.data.user.name || '',
        currentPassword: '',
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSaving(true);

    try {
      await api.put('/settings', { settings });
      setMessage('Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage('');

    if (!profileData.currentPassword) {
      setProfileMessage('Current password is required');
      return;
    }

    if (!profileData.email && !profileData.name) {
      setProfileMessage('Please enter email or name to update');
      return;
    }

    setUpdatingProfile(true);

    try {
      await api.put('/auth/profile', {
        email: profileData.email,
        name: profileData.name,
        currentPassword: profileData.currentPassword,
      });

      setProfileMessage('Profile updated successfully! Please login again with your new email.');
      setProfileData((prev) => ({ ...prev, currentPassword: '' }));

      // Logout after 2 seconds if email changed
      if (profileData.email !== user.email) {
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else {
        // Just refresh user data
        fetchUserProfile();
      }
    } catch (error) {
      setProfileMessage(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage('All fields are required');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordMessage('Password changed successfully! Please login again.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Logout after 2 seconds
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setPasswordMessage(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>System Settings</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>

        {message && (
          <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="hls_segment_duration">HLS Segment Duration (seconds)</label>
            <input
              type="number"
              id="hls_segment_duration"
              className="form-control"
              value={settings.hls_segment_duration || ''}
              onChange={(e) => handleChange('hls_segment_duration', e.target.value)}
              min="1"
              max="10"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Recommended: 4 seconds. Lower values reduce latency but increase bandwidth.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="hls_list_size">HLS Playlist Size (segments)</label>
            <input
              type="number"
              id="hls_list_size"
              className="form-control"
              value={settings.hls_list_size || ''}
              onChange={(e) => handleChange('hls_list_size', e.target.value)}
              min="3"
              max="20"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Number of segments to keep in the playlist. Recommended: 6
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="max_concurrent_streams">Max Concurrent Streams</label>
            <input
              type="number"
              id="max_concurrent_streams"
              className="form-control"
              value={settings.max_concurrent_streams || ''}
              onChange={(e) => handleChange('max_concurrent_streams', e.target.value)}
              min="1"
              max="100"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Maximum number of streams that can run simultaneously.
            </small>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="auto_restart_enabled"
                checked={settings.auto_restart_enabled === 'true'}
                onChange={(e) => handleChange('auto_restart_enabled', e.target.checked ? 'true' : 'false')}
              />
              <label htmlFor="auto_restart_enabled" style={{ marginBottom: 0 }}>
                Enable Auto-restart (global)
              </label>
            </div>
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
              When enabled, streams will automatically restart if they crash.
            </small>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Update Profile</h2>
        </div>

        {profileMessage && (
          <div className={`alert ${profileMessage.includes('success') ? 'alert-success' : 'alert-error'}`}>
            {profileMessage}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={profileData.email}
              onChange={handleProfileChange}
              required
              autoComplete="email"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              This will be your new login email
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={profileData.name}
              onChange={handleProfileChange}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="profileCurrentPassword">Current Password * (required to confirm changes)</label>
            <input
              type="password"
              id="profileCurrentPassword"
              name="currentPassword"
              className="form-control"
              value={profileData.currentPassword}
              onChange={handleProfileChange}
              required
              autoComplete="current-password"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Enter your current password to confirm profile changes
            </small>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={updatingProfile}>
              {updatingProfile ? 'Updating...' : 'Update Profile'}
            </button>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
            <small style={{ color: '#0c5460' }}>
              ℹ️ If you change your email, you'll be logged out and need to login with the new email.
            </small>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Change Password</h2>
        </div>

        {passwordMessage && (
          <div className={`alert ${passwordMessage.includes('success') ? 'alert-success' : 'alert-error'}`}>
            {passwordMessage}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password *</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              className="form-control"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password *</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              className="form-control"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              minLength="6"
              autoComplete="new-password"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Minimum 6 characters
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-control"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              minLength="6"
              autoComplete="new-password"
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
            <small style={{ color: '#856404' }}>
              ⚠️ After changing your password, you will be logged out and need to login again.
            </small>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Server Information</h2>
        </div>
        <div style={{ fontSize: '0.9rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>HLS Base Path:</strong> /var/www/hls (configured on backend)
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>FFmpeg Path:</strong> /usr/bin/ffmpeg (configured on backend)
          </p>
          <p style={{ marginBottom: '0.5rem', color: '#7f8c8d' }}>
            Update these values in the backend .env file
          </p>
        </div>
      </div>

      <RtmpTemplatesManager />
    </div>
  );
}

export default Settings;
