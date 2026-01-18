import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Wrench, CheckCircle, XCircle, Pencil, Trash2, Plus, Lightbulb, Monitor, Smartphone } from 'lucide-react';

function RtmpTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'custom',
    rtmp_url: '',
    stream_key: '',
    video_orientation: '16:9', // Default to landscape
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
      const response = await api.get('/rtmp/templates/templates');
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
        await api.put(`/rtmp/templates/templates/${editingId}`, formData);
      } else {
        await api.post('/rtmp/templates/templates', formData);
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
      video_orientation: template.video_orientation || '16:9',
    });
    setEditingId(template.id);
    setShowAddForm(true);
  };

  const handleToggleEnabled = async (id, currentEnabled) => {
    try {
      console.log('Toggling template:', id, 'from', currentEnabled, 'to', currentEnabled ? 0 : 1);
      const response = await api.put(`/rtmp/templates/templates/${id}`, { enabled: currentEnabled ? 0 : 1 });
      console.log('Toggle response:', response.data);
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to toggle template status:', error);
      alert(error.response?.data?.error || 'Failed to toggle template status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this RTMP template? This will affect all channels using it.')) return;

    setLoading(true);
    try {
      await api.delete(`/rtmp/templates/templates/${id}`);
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
      video_orientation: '16:9',
      video_bitrate: '',
      audio_bitrate: '',
      profile: '',
      preset: '',
      fps: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const getPlatformIcon = () => {
    // All templates are custom RTMP now
    return Wrench;
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
          <p style={{ margin: '0.25rem 0 0 0', color: '#95a5a6', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb className="w-4 h-4" />
            <span>For Facebook, YouTube, and Twitch, use the Platforms tab to connect via OAuth</span>
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {!showAddForm && <Plus className="w-4 h-4" />}
          <span className="hidden sm:inline">{showAddForm ? 'Cancel' : 'Add Template'}</span>
          <span className="sm:hidden">{showAddForm ? 'Cancel' : 'Add'}</span>
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

          <div className="form-group">
            <label>Video Orientation</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, video_orientation: '16:9' }))}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: formData.video_orientation === '16:9' ? '2px solid #3498db' : '1px solid #ddd',
                  backgroundColor: formData.video_orientation === '16:9' ? '#ebf5fb' : '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                <Monitor className="w-8 h-8" style={{ color: formData.video_orientation === '16:9' ? '#3498db' : '#7f8c8d' }} />
                <span style={{ fontWeight: formData.video_orientation === '16:9' ? '600' : '400', color: formData.video_orientation === '16:9' ? '#3498db' : '#2c3e50' }}>
                  Landscape (16:9)
                </span>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  YouTube, Twitch, Facebook
                </small>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, video_orientation: '9:16' }))}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: formData.video_orientation === '9:16' ? '2px solid #3498db' : '1px solid #ddd',
                  backgroundColor: formData.video_orientation === '9:16' ? '#ebf5fb' : '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                <Smartphone className="w-8 h-8" style={{ color: formData.video_orientation === '9:16' ? '#3498db' : '#7f8c8d' }} />
                <span style={{ fontWeight: formData.video_orientation === '9:16' ? '600' : '400', color: formData.video_orientation === '9:16' ? '#3498db' : '#2c3e50' }}>
                  Portrait (9:16)
                </span>
                <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                  Instagram, TikTok, Stories
                </small>
              </button>
            </div>
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
              Choose the aspect ratio for your target platform. Portrait mode (9:16) is optimized for mobile-first platforms like Instagram and TikTok.
            </small>
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
                  <div style={{ padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {React.createElement(getPlatformIcon(), { className: 'w-8 h-8 text-gray-700' })}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h4 style={{ margin: 0, color: '#2c3e50', fontSize: '1.1rem' }}>
                        {template.name}
                      </h4>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: template.enabled ? '#d4edda' : '#f8d7da',
                        color: template.enabled ? '#155724' : '#721c24',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        {template.enabled ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Disabled</span>
                          </>
                        )}
                      </span>
                    </div>
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
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  onClick={() => handleToggleEnabled(template.id, template.enabled)}
                  style={{
                    fontSize: '0.9rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: template.enabled ? '#ffc107' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {template.enabled ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Disable</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Enable</span>
                    </>
                  )}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleEdit(template)}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(template.id)}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
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
