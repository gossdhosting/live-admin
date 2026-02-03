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
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="m-0 text-gray-800 text-lg sm:text-xl font-semibold">Custom RTMP Destinations</h2>
          <p className="mt-2 mb-0 text-gray-500 text-sm">
            Add custom RTMP servers (Restream.io, custom CDN, backup servers, etc.)
          </p>
          <p className="mt-1 mb-0 text-gray-400 text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
            <Lightbulb className="w-4 h-4 flex-shrink-0" />
            <span>For Facebook, YouTube, and Twitch, use the Platforms tab to connect via OAuth</span>
          </p>
        </div>
        <button
          className="btn btn-primary w-full sm:w-auto flex-shrink-0"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {!showAddForm && <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 sm:p-8 rounded-lg mb-6">
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
        <div className="flex flex-col gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {React.createElement(getPlatformIcon(), { className: 'w-6 h-6 sm:w-8 sm:h-8 text-gray-700' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="m-0 text-gray-800 text-base sm:text-lg font-semibold truncate">
                        {template.name}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded font-semibold flex items-center gap-1 flex-shrink-0 ${template.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
                    <span className="text-sm text-gray-500 mt-1 block">
                      {getPlatformLabel(template.platform)}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 font-mono break-all">
                  {template.rtmp_url}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  className="btn flex-1 sm:flex-none"
                  onClick={() => handleToggleEnabled(template.id, template.enabled)}
                  style={{
                    fontSize: '0.875rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: template.enabled ? '#ffc107' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {template.enabled ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  <span className="hidden sm:inline">{template.enabled ? 'Disable' : 'Enable'}</span>
                </button>
                <button
                  className="btn btn-primary flex-1 sm:flex-none"
                  onClick={() => handleEdit(template)}
                  style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  className="btn btn-danger flex-1 sm:flex-none"
                  onClick={() => handleDelete(template.id)}
                  style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
