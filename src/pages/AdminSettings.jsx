import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import UserManagement from '../components/UserManagement';
import PlanManagement from '../components/PlanManagement';

function AdminSettings({ user }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('system'); // system, users, plans

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchSettings();
  }, [user, navigate]);

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

  if (loading) {
    return <div className="loading">Loading admin settings...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>Admin Settings</h2>
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
        </div>

        {/* System Settings Tab */}
        {activeTab === 'system' && (
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

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <UserManagement />
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div>
            <PlanManagement />
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSettings;
