import React, { useState, useEffect } from 'react';
import api from '../services/api';
import UpgradePrompt from './UpgradePrompt';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './ui/alert';

// Quality preset to bitrate mapping (must match backend)
const QUALITY_BITRATES = {
  '480p': 2500,
  '720p': 4000,
  '1080p': 6000
};

function CreateChannelModal({ onClose, onSuccess, isOpen }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    input_url: '',
    auto_restart: true,
    quality_preset: '480p',
    stream_title: '',
    input_type: 'video', // Default to video, will be set to youtube if user has access
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

  // Update default input_type when userStats is loaded
  useEffect(() => {
    if (userStats && (userStats.youtube_restreaming === true || userStats.youtube_restreaming === 1)) {
      setFormData(prev => ({ ...prev, input_type: 'youtube' }));
    }
  }, [userStats]);

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

    // RTMP input type doesn't require input_url or media_file_id
    // Stream will come from nginx-rtmp server via stream key

    setLoading(true);

    try {
      await api.post('/channels', formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create stream');
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Stream</DialogTitle>
          <DialogDescription>
            Set up a new streaming channel to broadcast your content
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="bg-red-50 border-red-200 text-red-800">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Stream Name *</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., My Live Stream"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label>Input Type *</Label>
            <div className="flex flex-col gap-2 mt-2">
              {(userStats?.youtube_restreaming === true || userStats?.youtube_restreaming === 1) && (
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
              )}
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
              <label className="flex items-center gap-2 mb-0">
                <input
                  type="radio"
                  name="input_type"
                  value="rtmp"
                  checked={formData.input_type === 'rtmp'}
                  onChange={handleChange}
                />
                Custom RTMP Input (OBS/vMix/etc.)
              </label>
            </div>
            {!(userStats?.youtube_restreaming === true || userStats?.youtube_restreaming === 1) && (
              <p className="text-xs text-slate-500 mt-1">
                YouTube restreaming is not available on your plan. Contact admin for access.
              </p>
            )}
          </div>

          {formData.input_type === 'youtube' && (
            <div className="space-y-2">
              <Label htmlFor="input_url">YouTube Live URL *</Label>
              <Input
                type="url"
                id="input_url"
                name="input_url"
                value={formData.input_url}
                onChange={handleChange}
                required
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-slate-500">
                Paste the YouTube Live stream URL
              </p>
            </div>
          )}

          {formData.input_type === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="media_file_id">Select Video *</Label>
              <select
                id="media_file_id"
                name="media_file_id"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <p className="text-xs text-red-600">
                  No videos uploaded yet. Please upload a video in Media Manager first.
                </p>
              )}
            </div>
          )}

          {formData.input_type === 'rtmp' && (
            <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    RTMP Input Instructions
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1.5">
                    <li>• After creating this channel, you'll receive unique RTMP credentials</li>
                    <li>• Use OBS Studio, vMix, or any RTMP encoder to push your stream to our server</li>
                    <li>• Your stream will be automatically forwarded to all connected platforms</li>
                    <li>• The RTMP server URL and stream key will be displayed after channel creation</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white border border-blue-200 rounded p-3 text-xs font-mono text-gray-700">
                <p className="font-semibold text-gray-900 mb-1">RTMP Server:</p>
                <p className="mb-2">rtmp://panel.zebcast.app:1935/live</p>
                <p className="font-semibold text-gray-900 mb-1">Stream Key:</p>
                <p className="text-gray-500 italic">Will be generated after creation</p>
              </div>
            </div>
          )}

          {formData.input_type === 'video' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="loop_video"
                  name="loop_video"
                  checked={formData.loop_video}
                  onChange={handleChange}
                />
                <Label htmlFor="loop_video" className="mb-0 cursor-pointer">
                  Loop video automatically
                </Label>
              </div>
              <p className="text-xs text-slate-500">
                When enabled, the video will restart automatically when it ends
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stream_title">Stream Title</Label>
            <Input
              type="text"
              id="stream_title"
              name="stream_title"
              value={formData.stream_title}
              onChange={handleChange}
              placeholder="e.g., Kata Srinivas Goud Followers Protest Outside Revanth Reddy House"
              maxLength="100"
            />
            <p className="text-xs text-slate-500">
              This title can be displayed as an overlay on the video (news headline style)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="title_enabled"
                name="title_enabled"
                checked={formData.title_enabled}
                onChange={handleChange}
              />
              <Label htmlFor="title_enabled" className="mb-0 cursor-pointer">
                Show title overlay on video
              </Label>
            </div>
            <p className="text-xs text-slate-500">
              Display the stream title as an overlay on the video. Configure appearance in Settings → Title Settings.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quality_preset">Default Output Quality *</Label>

            {/* Show quality limit upgrade prompt if user is limited */}
            {userStats && userStats.limits.max_bitrate < 6000 && (
              <div className="p-3 mb-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
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
            )}

            <select
              id="quality_preset"
              name="quality_preset"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <p className="text-xs text-slate-500">
              Maximum resolution for re-broadcasting. Higher quality requires more bandwidth.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_restart"
                name="auto_restart"
                checked={formData.auto_restart}
                onChange={handleChange}
              />
              <Label htmlFor="auto_restart" className="mb-0 cursor-pointer">
                Auto-restart on failure
              </Label>
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary">
              {loading ? 'Creating Stream...' : 'Create Stream'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateChannelModal;
