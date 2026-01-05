import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import RtmpTemplatesManager from '../components/RtmpTemplatesManager';
import PlatformConnections from '../components/PlatformConnections';
import UserManagement from '../components/UserManagement';
import PlanManagement from '../components/PlanManagement';

function Settings({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(user && user.role === 'admin' ? 'system' : 'profile'); // system, profile, password, rtmp, title, platforms, users, plans

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
  const [currentUser, setCurrentUser] = useState(null);

  // Refs for cleanup
  const messageTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    fetchUserProfile();

    // Check for URL parameters (tab selection, success/error messages from OAuth)
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const success = params.get('success');
    const error = params.get('error');

    if (tab) {
      setActiveTab(tab);
    }

    if (success) {
      const successMessages = {
        facebook_connected: 'Facebook account connected successfully!',
        youtube_connected: 'YouTube account connected successfully!',
        twitch_connected: 'Twitch account connected successfully!',
      };
      setMessage(successMessages[success] || 'Account connected successfully!');
      setTimeout(() => setMessage(''), 5000);

      // If this is a popup window (OAuth callback), close it
      if (window.opener) {
        setTimeout(() => window.close(), 1000);
      }
    }

    if (error) {
      const errorMessages = {
        facebook_auth_failed: 'Failed to connect Facebook account',
        youtube_auth_failed: 'Failed to connect YouTube account',
        twitch_auth_failed: 'Failed to connect Twitch account',
      };
      setMessage(errorMessages[error] || 'Authentication failed');
      setTimeout(() => setMessage(''), 5000);

      // If this is a popup window (OAuth callback), close it
      if (window.opener) {
        setTimeout(() => window.close(), 1000);
      }
    }

    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, [location]);

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
      setCurrentUser(response.data.user);
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
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => setMessage(''), 3000);
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
      if (profileData.email !== currentUser.email) {
        if (logoutTimeoutRef.current) {
          clearTimeout(logoutTimeoutRef.current);
        }
        logoutTimeoutRef.current = setTimeout(() => {
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
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
      logoutTimeoutRef.current = setTimeout(() => {
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
          <h2>Settings</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>

        {/* Tabs Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e1e8ed',
          marginBottom: '1.5rem',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {user && user.role === 'admin' && (
            <button
              className={activeTab === 'system' ? 'tab-active' : 'tab-inactive'}
              onClick={() => setActiveTab('system')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: activeTab === 'system' ? '#3498db' : 'transparent',
                color: activeTab === 'system' ? '#fff' : '#7f8c8d',
                cursor: 'pointer',
                fontWeight: '500',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.2s'
              }}
            >
              System Settings
            </button>
          )}
          <button
            className={activeTab === 'profile' ? 'tab-active' : 'tab-inactive'}
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'profile' ? '#3498db' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : '#7f8c8d',
              cursor: 'pointer',
              fontWeight: '500',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s'
            }}
          >
            Profile
          </button>
          <button
            className={activeTab === 'password' ? 'tab-active' : 'tab-inactive'}
            onClick={() => setActiveTab('password')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'password' ? '#3498db' : 'transparent',
              color: activeTab === 'password' ? '#fff' : '#7f8c8d',
              cursor: 'pointer',
              fontWeight: '500',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s'
            }}
          >
            Password
          </button>
          <button
            className={activeTab === 'rtmp' ? 'tab-active' : 'tab-inactive'}
            onClick={() => setActiveTab('rtmp')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'rtmp' ? '#3498db' : 'transparent',
              color: activeTab === 'rtmp' ? '#fff' : '#7f8c8d',
              cursor: 'pointer',
              fontWeight: '500',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s'
            }}
          >
            RTMP Templates
          </button>
          <button
            className={activeTab === 'title' ? 'tab-active' : 'tab-inactive'}
            onClick={() => setActiveTab('title')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'title' ? '#3498db' : 'transparent',
              color: activeTab === 'title' ? '#fff' : '#7f8c8d',
              cursor: 'pointer',
              fontWeight: '500',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s'
            }}
          >
            Title Settings
          </button>
          <button
            className={activeTab === 'platforms' ? 'tab-active' : 'tab-inactive'}
            onClick={() => setActiveTab('platforms')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'platforms' ? '#3498db' : 'transparent',
              color: activeTab === 'platforms' ? '#fff' : '#7f8c8d',
              cursor: 'pointer',
              fontWeight: '500',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s'
            }}
          >
            Platforms
          </button>
          {user && user.role === 'admin' && (
            <>
              <button
                className={activeTab === 'users' ? 'tab-active' : 'tab-inactive'}
                onClick={() => setActiveTab('users')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: activeTab === 'users' ? '#3498db' : 'transparent',
                  color: activeTab === 'users' ? '#fff' : '#7f8c8d',
                  cursor: 'pointer',
                  fontWeight: '500',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.2s'
                }}
              >
                Users
              </button>
              <button
                className={activeTab === 'plans' ? 'tab-active' : 'tab-inactive'}
                onClick={() => setActiveTab('plans')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: activeTab === 'plans' ? '#3498db' : 'transparent',
                  color: activeTab === 'plans' ? '#fff' : '#7f8c8d',
                  cursor: 'pointer',
                  fontWeight: '500',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.2s'
                }}
              >
                Plans
              </button>
            </>
          )}
        </div>

        {/* System Settings Tab (Admin Only) */}
        {activeTab === 'system' && user && user.role === 'admin' && (
          <div>
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
                  disabled={!user || user.role !== 'admin'}
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

              <div className="form-group">
                <label htmlFor="ffmpeg_threading">FFmpeg Threading Mode</label>
                <select
                  id="ffmpeg_threading"
                  className="form-control"
                  value={settings.ffmpeg_threading || 'auto'}
                  onChange={(e) => handleChange('ffmpeg_threading', e.target.value)}
                >
                  <option value="auto">Auto (Recommended - Uses all CPU cores)</option>
                  <option value="1">Single Thread (Lower CPU usage, slower encoding)</option>
                  <option value="2">2 Threads</option>
                  <option value="4">4 Threads</option>
                  <option value="8">8 Threads</option>
                </select>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  Auto mode uses all available CPU cores for faster encoding. Use single thread for low-resource VPS.
                  <br />
                  <strong>Note:</strong> Changes apply to newly started streams only. Restart existing streams to apply.
                </small>
              </div>

              {user && user.role === 'admin' ? (
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px', marginTop: '1rem' }}>
                  <small style={{ color: '#666' }}>
                    ℹ️ These are system-wide settings. Only administrators can modify them.
                  </small>
                </div>
              )}
            </form>

            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e1e8ed' }}>
              <h3 style={{ marginBottom: '1rem' }}>Server Information</h3>
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
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
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
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div>
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
        )}

        {/* RTMP Templates Tab */}
        {activeTab === 'rtmp' && (
          <div>
            <RtmpTemplatesManager />
          </div>
        )}

        {/* Title Settings Tab */}
        {activeTab === 'title' && (
          <div>
            {message && (
              <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-error'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title_bg_color">Background Color</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="title_bg_color"
                    className="form-control"
                    value={settings.title_bg_color || '#000000'}
                    onChange={(e) => handleChange('title_bg_color', e.target.value)}
                    style={{ width: '80px', height: '40px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    value={settings.title_bg_color || '#000000'}
                    onChange={(e) => handleChange('title_bg_color', e.target.value)}
                    placeholder="#000000"
                    style={{ width: '120px' }}
                  />
                </div>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  Background color for the title overlay
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="title_opacity">Background Opacity (%)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="range"
                    id="title_opacity"
                    min="0"
                    max="100"
                    value={settings.title_opacity || '80'}
                    onChange={(e) => handleChange('title_opacity', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    className="form-control"
                    value={settings.title_opacity || '80'}
                    onChange={(e) => handleChange('title_opacity', e.target.value)}
                    min="0"
                    max="100"
                    style={{ width: '80px' }}
                  />
                </div>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  0 = Transparent, 100 = Opaque. Current: {settings.title_opacity || '80'}%
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="title_position">Position</label>
                <select
                  id="title_position"
                  className="form-control"
                  value={settings.title_position || 'bottom-left'}
                  onChange={(e) => handleChange('title_position', e.target.value)}
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  Position of the title overlay on the video
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="title_text_color">Text Color</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="title_text_color"
                    className="form-control"
                    value={settings.title_text_color || '#FFFFFF'}
                    onChange={(e) => handleChange('title_text_color', e.target.value)}
                    style={{ width: '80px', height: '40px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    value={settings.title_text_color || '#FFFFFF'}
                    onChange={(e) => handleChange('title_text_color', e.target.value)}
                    placeholder="#FFFFFF"
                    style={{ width: '120px' }}
                  />
                </div>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  Text color for the title
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="title_font_size">Font Size (px)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="range"
                    id="title_font_size"
                    min="16"
                    max="72"
                    value={settings.title_font_size || '32'}
                    onChange={(e) => handleChange('title_font_size', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    className="form-control"
                    value={settings.title_font_size || '32'}
                    onChange={(e) => handleChange('title_font_size', e.target.value)}
                    min="16"
                    max="72"
                    style={{ width: '80px' }}
                  />
                </div>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  Font size for the title text. Current: {settings.title_font_size || '32'}px
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="title_box_padding">Box Padding (px)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="range"
                    id="title_box_padding"
                    min="0"
                    max="20"
                    value={settings.title_box_padding || '5'}
                    onChange={(e) => handleChange('title_box_padding', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    className="form-control"
                    value={settings.title_box_padding || '5'}
                    onChange={(e) => handleChange('title_box_padding', e.target.value)}
                    min="0"
                    max="20"
                    style={{ width: '80px' }}
                  />
                </div>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  Padding around text inside the box. Lower = less CPU usage. Current: {settings.title_box_padding || '5'}px
                </small>
              </div>

              {user && user.role === 'admin' ? (
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px', marginTop: '1rem' }}>
                  <small style={{ color: '#666' }}>
                    ℹ️ These are system-wide title settings. Only administrators can modify them.
                  </small>
                </div>
              )}
            </form>

            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e1e8ed' }}>
              <h3 style={{ marginBottom: '1rem' }}>Title Overlay Preview</h3>
              <div style={{
                position: 'relative',
                backgroundColor: '#2c3e50',
                borderRadius: '8px',
                padding: '2rem',
                minHeight: '200px',
                display: 'flex',
                alignItems: settings.title_position?.startsWith('top') ? 'flex-start' : 'flex-end',
                justifyContent: settings.title_position?.includes('center') ? 'center' : settings.title_position?.includes('right') ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  backgroundColor: settings.title_bg_color || '#000000',
                  opacity: (settings.title_opacity || 80) / 100,
                  padding: '1rem 1.5rem',
                  borderRadius: '4px',
                  color: settings.title_text_color || '#FFFFFF',
                  fontSize: `${settings.title_font_size || 32}px`,
                  fontWeight: 'bold',
                  maxWidth: '80%',
                  wordWrap: 'break-word'
                }}>
                  Example News Title Here
                </div>
              </div>
              <small style={{ color: '#7f8c8d', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                This is a preview of how the title overlay will appear on your stream. Enable the title overlay when creating/editing a channel.
              </small>
            </div>
          </div>
        )}

        {/* Platforms Tab */}
        {activeTab === 'platforms' && (
          <div>
            <PlatformConnections />
          </div>
        )}

        {/* Users Tab (Admin Only) */}
        {activeTab === 'users' && user && user.role === 'admin' && (
          <div>
            <UserManagement />
          </div>
        )}

        {/* Plans Tab (Admin Only) */}
        {activeTab === 'plans' && user && user.role === 'admin' && (
          <div>
            <PlanManagement />
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
