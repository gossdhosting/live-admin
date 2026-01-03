import React, { useState, useEffect } from 'react';
import api from '../services/api';

function RtmpSettings({ channelId, channelName }) {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'facebook',
    rtmp_url: '',
    stream_key: '',
    enabled: true,
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchDestinations();
  }, [channelId]);

  const fetchDestinations = async () => {
    try {
      const response = await api.get(`/channels/${channelId}/rtmp`);
      setDestinations(response.data.destinations);
    } catch (error) {
      console.error('Failed to fetch RTMP destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const getPlatformDefaults = (platform) => {
    const defaults = {
      facebook: {
        rtmp_url: 'rtmps://live-api-s.facebook.com:443/rtmp/',
        placeholder_key: 'Your Facebook stream key',
      },
      youtube: {
        rtmp_url: 'rtmp://a.rtmp.youtube.com/live2/',
        placeholder_key: 'Your YouTube stream key',
      },
      twitch: {
        rtmp_url: 'rtmp://live.twitch.tv/app/',
        placeholder_key: 'Your Twitch stream key',
      },
      custom: {
        rtmp_url: '',
        placeholder_key: 'Stream key',
      },
    };
    return defaults[platform] || defaults.custom;
  };

  const handlePlatformChange = (e) => {
    const platform = e.target.value;
    const defaults = getPlatformDefaults(platform);
    setFormData((prev) => ({
      ...prev,
      platform,
      rtmp_url: defaults.rtmp_url,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/rtmp/${editingId}`, formData);
      } else {
        await api.post(`/channels/${channelId}/rtmp`, formData);
      }
      fetchDestinations();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save RTMP destination');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (destination) => {
    setFormData({
      platform: destination.platform,
      rtmp_url: destination.rtmp_url,
      stream_key: destination.stream_key,
      enabled: destination.enabled === 1,
    });
    setEditingId(destination.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this RTMP destination?')) return;

    setLoading(true);
    try {
      await api.delete(`/rtmp/${id}`);
      fetchDestinations();
    } catch (error) {
      alert('Failed to delete RTMP destination');
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (destination) => {
    try {
      await api.put(`/rtmp/${destination.id}`, {
        enabled: destination.enabled === 1 ? 0 : 1,
      });
      fetchDestinations();
    } catch (error) {
      alert('Failed to update RTMP destination');
    }
  };

  const resetForm = () => {
    setFormData({
      platform: 'facebook',
      rtmp_url: '',
      stream_key: '',
      enabled: true,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      facebook: '📘',
      youtube: '📺',
      twitch: '🎮',
      custom: '🔧',
    };
    return icons[platform] || '🔧';
  };

  const getPlatformLabel = (platform) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  if (loading && destinations.length === 0) {
    return <div style={{ padding: '1rem' }}>Loading RTMP destinations...</div>;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0, color: '#2c3e50' }}>Multi-Platform Streaming</h3>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
        >
          {showAddForm ? 'Cancel' : '+ Add Destination'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          <div className="form-group">
            <label>Platform</label>
            <select
              name="platform"
              value={formData.platform}
              onChange={handlePlatformChange}
              className="form-control"
              required
            >
              <option value="facebook">Facebook Live</option>
              <option value="youtube">YouTube Live</option>
              <option value="twitch">Twitch</option>
              <option value="custom">Custom RTMP</option>
            </select>
          </div>

          <div className="form-group">
            <label>RTMP Server URL</label>
            <input
              type="text"
              name="rtmp_url"
              value={formData.rtmp_url}
              onChange={handleInputChange}
              className="form-control"
              placeholder="rtmp://..."
              required
            />
          </div>

          <div className="form-group">
            <label>Stream Key</label>
            <input
              type="password"
              name="stream_key"
              value={formData.stream_key}
              onChange={handleInputChange}
              className="form-control"
              placeholder={getPlatformDefaults(formData.platform).placeholder_key}
              required
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              name="enabled"
              checked={formData.enabled}
              onChange={handleInputChange}
              id="rtmp-enabled"
            />
            <label htmlFor="rtmp-enabled">Enable this destination</label>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {editingId ? 'Update' : 'Add'} Destination
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {destinations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#7f8c8d',
        }}>
          <p>No RTMP destinations configured.</p>
          <p style={{ fontSize: '0.9rem' }}>Add Facebook, YouTube, or Twitch to stream to multiple platforms simultaneously.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {destinations.map((dest) => (
            <div
              key={dest.id}
              style={{
                backgroundColor: dest.enabled ? '#e8f5e9' : '#f5f5f5',
                padding: '1rem',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `2px solid ${dest.enabled ? '#4caf50' : '#e0e0e0'}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getPlatformIcon(dest.platform)}</span>
                  <strong style={{ color: '#2c3e50', fontSize: '1rem' }}>
                    {getPlatformLabel(dest.platform)}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      backgroundColor: dest.enabled ? '#4caf50' : '#95a5a6',
                      color: 'white',
                    }}
                  >
                    {dest.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d', fontFamily: 'monospace' }}>
                  {dest.rtmp_url}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => toggleEnabled(dest)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  {dest.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleEdit(dest)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(dest.id)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RtmpSettings;
