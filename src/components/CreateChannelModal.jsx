import React, { useState, useEffect } from 'react';
import api from '../services/api';
import UpgradePrompt from './UpgradePrompt';
import { Button } from './ui/button';

// Quality preset to bitrate mapping (must match backend)
const QUALITY_BITRATES = {
  '480p': 2500,
  '720p': 4000,
  '1080p': 6000
};

function CreateChannelModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    input_url: '',
    auto_restart: true,
    quality_preset: '480p',
    stream_title: '',
    input_type: 'youtube',
    media_file_id: null,
    loop_video: false,
    title_enabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    fetchMediaFiles();
    fetchUserStats();
  }, []);

  const fetchMediaFiles = async () => {
    try {
      const response = await api.get('/media');
      setMediaFiles(response.data.mediaFiles || []);
    } catch (err) {
      console.error('Failed to fetch media files:', err);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setUserStats(response.data);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate input based on input_type
    if (formData.input_type === 'video' && !formData.media_file_id) {
      setError('Please select a video file');
      return;
    }

    if (formData.input_type === 'youtube' && !formData.input_url) {
      setError('Please enter a YouTube Live URL');
      return;
    }

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
    let finalValue = type === 'checkbox' ? checked : value;

    // Convert media_file_id to number or null
    if (name === 'media_file_id') {
      finalValue = value ? parseInt(value, 10) : null;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
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
            <label>Input Type *</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 mb-0">
                <input
                  type="radio"
                  name="input_type"
                  value="youtube"
                  checked={formData.input_type === 'youtube'}
                  onChange={handleChange}
                />
                YouTube Live
              </label>
              <label className="flex items-center gap-2 mb-0">
                <input
                  type="radio"
                  name="input_type"
                  value="video"
                  checked={formData.input_type === 'video'}
                  onChange={handleChange}
                />
                Pre-recorded Video
              </label>
            </div>
          </div>

          {formData.input_type === 'youtube' && (
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
          )}

          {formData.input_type === 'video' && (
            <div className="form-group">
              <label htmlFor="media_file_id">Select Video *</label>
              <select
                id="media_file_id"
                name="media_file_id"
                className="form-control"
                value={formData.media_file_id || ''}
                onChange={handleChange}
                required
              >
                <option value="">-- Choose a video --</option>
                {mediaFiles.map((media) => (
                  <option key={media.id} value={media.id}>
                    {media.original_name}
                  </option>
                ))}
              </select>
              {mediaFiles.length === 0 && (
                <small style={{ color: '#e74c3c', fontSize: '0.85rem' }}>
                  No videos uploaded yet. Please upload a video in Media Manager first.
                </small>
              )}
            </div>
          )}

          {formData.input_type === 'video' && (
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="loop_video"
                  name="loop_video"
                  checked={formData.loop_video}
                  onChange={handleChange}
                />
                <label htmlFor="loop_video" style={{ marginBottom: 0 }}>
                  Loop video automatically
                </label>
              </div>
              <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                When enabled, the video will restart automatically when it ends
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="stream_title">Stream Title</label>
            <input
              type="text"
              id="stream_title"
              name="stream_title"
              className="form-control"
              value={formData.stream_title}
              onChange={handleChange}
              placeholder="e.g., Kata Srinivas Goud Followers Protest Outside Revanth Reddy House"
              maxLength="100"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              This title can be displayed as an overlay on the video (news headline style)
            </small>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="title_enabled"
                name="title_enabled"
                checked={formData.title_enabled}
                onChange={handleChange}
              />
              <label htmlFor="title_enabled" style={{ marginBottom: 0 }}>
                Show title overlay on video
              </label>
            </div>
            <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
              Display the stream title as an overlay on the video. Configure appearance in Settings → Title Settings.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="quality_preset">Default Output Quality *</label>

            {/* Show quality limit upgrade prompt if user is limited */}
            {userStats && userStats.limits.max_bitrate < 6000 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: '#856404'
                }}>
                  {userStats.limits.max_bitrate < 4000 ? (
                    <>
                      Your plan supports up to 480p quality. Upgrade to <strong>Basic plan</strong> for 720p HD streaming.
                    </>
                  ) : (
                    <>
                      Your plan supports up to 720p quality. Upgrade to <strong>Pro plan</strong> for 1080p Full HD streaming.
                    </>
                  )}
                </div>
              </div>
            )}

            <select
              id="quality_preset"
              name="quality_preset"
              className="form-control"
              value={formData.quality_preset}
              onChange={handleChange}
              required
            >
              <option value="480p">480p (854x480) - Low bandwidth</option>
              <option
                value="720p"
                disabled={userStats && userStats.limits.max_bitrate < QUALITY_BITRATES['720p']}
              >
                720p (1280x720) - HD {userStats && userStats.limits.max_bitrate < QUALITY_BITRATES['720p'] ? '(Upgrade Required)' : '(Recommended)'}
              </option>
              <option
                value="1080p"
                disabled={userStats && userStats.limits.max_bitrate < QUALITY_BITRATES['1080p']}
              >
                1080p (1920x1080) - Full HD {userStats && userStats.limits.max_bitrate < QUALITY_BITRATES['1080p'] ? '(Upgrade Required)' : '(Max)'}
              </option>
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
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChannelModal;
