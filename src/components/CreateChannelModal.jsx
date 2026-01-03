import React, { useState } from 'react';
import api from '../services/api';

function CreateChannelModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    input_url: '',
    auto_restart: true,
    quality_preset: '720p',
    stream_title: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/channels', formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Create New Channel</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Channel Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., My Live Stream"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              type="text"
              id="description"
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
            />
          </div>

          <div className="form-group">
            <label htmlFor="input_url">YouTube Live URL *</label>
            <input
              type="url"
              id="input_url"
              name="input_url"
              className="form-control"
              value={formData.input_url}
              onChange={handleChange}
              required
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Paste the YouTube Live stream URL
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="stream_title">Stream Title</label>
            <input
              type="text"
              id="stream_title"
              name="stream_title"
              className="form-control"
              value={formData.stream_title}
              onChange={handleChange}
              placeholder="e.g., Live Gaming Session - Fortnite"
              maxLength="100"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              This title will be sent to Twitch/YouTube when stream starts (requires API setup)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="quality_preset">Default Output Quality *</label>
            <select
              id="quality_preset"
              name="quality_preset"
              className="form-control"
              value={formData.quality_preset}
              onChange={handleChange}
              required
            >
              <option value="480p">480p (854x480) - Low bandwidth</option>
              <option value="720p">720p (1280x720) - HD (Recommended)</option>
              <option value="1080p">1080p (1920x1080) - Full HD (Max)</option>
            </select>
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Maximum resolution for re-broadcasting. Higher quality requires more bandwidth.
            </small>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="auto_restart"
                name="auto_restart"
                checked={formData.auto_restart}
                onChange={handleChange}
              />
              <label htmlFor="auto_restart" style={{ marginBottom: 0 }}>
                Auto-restart on failure
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChannelModal;
