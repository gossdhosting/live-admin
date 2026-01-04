import React, { useState, useEffect } from 'react';
import api from '../services/api';

function RtmpTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'custom',
    rtmp_url: '',
    stream_key: '',
    video_bitrate: '',
    audio_bitrate: '',
    profile: '',
    preset: '',
    fps: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/rtmp/templates');
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Failed to fetch RTMP templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getPlatformDefaults = (platform) => {
    // Only custom RTMP is supported - social platforms use OAuth integration
    const defaults = {
      custom: {
        rtmp_url: '',
        video_bitrate: '4000k',
        audio_bitrate: '128k',
        profile: 'main',
        preset: 'veryfast',
        fps: 30,
      },
    };
    return defaults.custom;
  };

  const handlePlatformChange = (e) => {
    const platform = e.target.value;
    const defaults = getPlatformDefaults(platform);
    setFormData((prev) => ({
      ...prev,
      platform,
      rtmp_url: defaults.rtmp_url,
      video_bitrate: defaults.video_bitrate,
      audio_bitrate: defaults.audio_bitrate,
      profile: defaults.profile,
      preset: defaults.preset,
      fps: defaults.fps,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/rtmp/templates/${editingId}`, formData);
      } else {
        await api.post('/rtmp/templates', formData);
      }
      fetchTemplates();
      resetForm();
      alert(editingId ? 'Template updated successfully' : 'Template created successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save RTMP template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      platform: template.platform,
      rtmp_url: template.rtmp_url,
      stream_key: template.stream_key,
    });
    setEditingId(template.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this RTMP template? This will affect all channels using it.')) return;

    setLoading(true);
    try {
      await api.delete(`/rtmp/templates/${id}`);
      fetchTemplates();
      alert('Template deleted successfully');
    } catch (error) {
      alert('Failed to delete RTMP template');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      platform: 'custom',
      rtmp_url: '',
      stream_key: '',
      video_bitrate: '',
      audio_bitrate: '',
      profile: '',
      preset: '',
      fps: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const getPlatformIcon = (platform) => {
    // All templates are custom RTMP now
    return '🔧';
  };

  const getPlatformLabel = (platform) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  if (loading && templates.length === 0) {
    return <div style={{ padding: '1rem' }}>Loading RTMP templates...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>Custom RTMP Destinations</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
            Add custom RTMP servers (Restream.io, custom CDN, backup servers, etc.)
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#95a5a6', fontSize: '0.85rem' }}>
            💡 For Facebook, YouTube, and Twitch, use the Platforms tab to connect via OAuth
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
        >
          {showAddForm ? 'Cancel' : '+ Add Template'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem',
        }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Template' : 'Create New Template'}</h3>

          <div className="form-group">
            <label>Template Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="form-control"
              placeholder="e.g., Backup Server, Restream.io, Custom CDN"
              required
            />
          </div>

          <div className="form-group">
            <label>Platform Type</label>
            <input
              type="text"
              value="Custom RTMP"
              className="form-control"
              disabled
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
              Use Settings → Platforms tab to connect Facebook, YouTube, or Twitch via OAuth
            </small>
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
              placeholder="Your stream key"
              required
            />
          </div>

          <h4 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#2c3e50' }}>Encoding Settings (Optional)</h4>
          <p style={{ marginTop: '0', marginBottom: '1rem', color: '#7f8c8d', fontSize: '0.85rem' }}>
            Leave blank to use platform defaults. These settings override platform defaults when set.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Video Bitrate</label>
              <input
                type="text"
                name="video_bitrate"
                value={formData.video_bitrate}
                onChange={handleInputChange}
                className="form-control"
                placeholder="e.g., 4000k, 6000k"
              />
              <small style={{ color: '#7f8c8d' }}>Format: number + 'k' (e.g., 4000k)</small>
            </div>

            <div className="form-group">
              <label>Audio Bitrate</label>
              <input
                type="text"
                name="audio_bitrate"
                value={formData.audio_bitrate}
                onChange={handleInputChange}
                className="form-control"
                placeholder="e.g., 128k, 160k"
              />
              <small style={{ color: '#7f8c8d' }}>Format: number + 'k' (e.g., 128k)</small>
            </div>

            <div className="form-group">
              <label>Profile</label>
              <select
                name="profile"
                value={formData.profile}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="">Platform Default</option>
                <option value="baseline">Baseline</option>
                <option value="main">Main</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Preset</label>
              <select
                name="preset"
                value={formData.preset}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="">Platform Default</option>
                <option value="ultrafast">Ultrafast (lowest CPU)</option>
                <option value="superfast">Superfast</option>
                <option value="veryfast">Veryfast (recommended)</option>
                <option value="faster">Faster</option>
                <option value="fast">Fast</option>
                <option value="medium">Medium (best quality)</option>
              </select>
            </div>

            <div className="form-group">
              <label>FPS (Frames Per Second)</label>
              <input
                type="number"
                name="fps"
                value={formData.fps}
                onChange={handleInputChange}
                className="form-control"
                placeholder="e.g., 30, 60"
                min="1"
                max="60"
              />
              <small style={{ color: '#7f8c8d' }}>Common values: 24, 30, 60</small>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {editingId ? 'Update' : 'Create'} Template
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {templates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#7f8c8d',
        }}>
          <p style={{ fontSize: '1.1rem' }}>No RTMP templates configured yet.</p>
          <p style={{ fontSize: '0.9rem' }}>Create a template to reuse RTMP settings across all channels.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {templates.map((template) => (
            <div
              key={template.id}
              style={{
                backgroundColor: '#fff',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '2rem' }}>{getPlatformIcon(template.platform)}</span>
                  <div>
                    <h4 style={{ margin: 0, color: '#2c3e50', fontSize: '1.1rem' }}>
                      {template.name}
                    </h4>
                    <span style={{
                      fontSize: '0.85rem',
                      color: '#7f8c8d',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}>
                      {getPlatformLabel(template.platform)}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#7f8c8d', fontFamily: 'monospace' }}>
                  {template.rtmp_url}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleEdit(template)}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(template.id)}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
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

export default RtmpTemplatesManager;
