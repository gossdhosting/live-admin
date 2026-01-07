import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import UserManagement from '../components/UserManagement';
import PlanManagement from '../components/PlanManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Settings as SettingsIcon, Users, Gem } from 'lucide-react';

function AdminSettings({ user }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('system');
  const [watermarkFile, setWatermarkFile] = useState(null);
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState(null);

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

  const handleWatermarkUpload = async () => {
    if (!watermarkFile) {
      setMessage('Please select a watermark file');
      return;
    }

    setWatermarkUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('watermark', watermarkFile);

      const response = await api.post('/settings/default-watermark', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage('Default watermark uploaded successfully');
      setWatermarkFile(null);
      setWatermarkPreview(null);

      // Update settings to reflect new watermark path
      setSettings((prev) => ({
        ...prev,
        default_watermark_path: response.data.path,
      }));

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to upload watermark');
    } finally {
      setWatermarkUploading(false);
    }
  };

  const handleWatermarkDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the default watermark?')) {
      return;
    }

    setMessage('');

    try {
      await api.delete('/settings/default-watermark');
      setMessage('Default watermark deleted successfully');

      // Update settings to reflect deletion
      setSettings((prev) => ({
        ...prev,
        default_watermark_path: '',
      }));

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete watermark');
    }
  };

  const handleWatermarkFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setWatermarkFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        Loading admin settings...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Admin Settings</CardTitle>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="system" className="text-xs sm:text-sm gap-1.5 py-2">
                <SettingsIcon className="w-4 h-4" />
                <span className="hidden sm:inline">System Settings</span>
                <span className="sm:hidden">System</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm gap-1.5 py-2">
                <Users className="w-4 h-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="text-xs sm:text-sm gap-1.5 py-2">
                <Gem className="w-4 h-4" />
                <span>Plans</span>
              </TabsTrigger>
            </TabsList>

            {/* System Settings Tab */}
            <TabsContent value="system" className="mt-6 space-y-6">
              {message && (
                <Alert className={message.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={message.includes('success') ? 'text-green-800' : 'text-red-800'}>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hls_segment_duration">HLS Segment Duration (seconds)</Label>
                  <Input
                    type="number"
                    id="hls_segment_duration"
                    value={settings.hls_segment_duration || ''}
                    onChange={(e) => handleChange('hls_segment_duration', e.target.value)}
                    min="1"
                    max="10"
                  />
                  <p className="text-sm text-gray-500">
                    Recommended: 4 seconds. Lower values reduce latency but increase bandwidth.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hls_list_size">HLS Playlist Size (segments)</Label>
                  <Input
                    type="number"
                    id="hls_list_size"
                    value={settings.hls_list_size || ''}
                    onChange={(e) => handleChange('hls_list_size', e.target.value)}
                    min="3"
                    max="20"
                  />
                  <p className="text-sm text-gray-500">
                    Number of segments to keep in the playlist. Recommended: 6
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_concurrent_streams">Max Concurrent Streams</Label>
                  <Input
                    type="number"
                    id="max_concurrent_streams"
                    value={settings.max_concurrent_streams || ''}
                    onChange={(e) => handleChange('max_concurrent_streams', e.target.value)}
                    min="1"
                    max="100"
                  />
                  <p className="text-sm text-gray-500">
                    Maximum number of streams that can run simultaneously.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ffmpeg_threading">FFmpeg Threading Mode</Label>
                  <select
                    id="ffmpeg_threading"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={settings.ffmpeg_threading || 'auto'}
                    onChange={(e) => handleChange('ffmpeg_threading', e.target.value)}
                  >
                    <option value="auto">Auto (Recommended - Uses all CPU cores)</option>
                    <option value="1">Single Thread (Lower CPU usage, slower encoding)</option>
                    <option value="2">2 Threads</option>
                    <option value="4">4 Threads</option>
                    <option value="8">8 Threads</option>
                  </select>
                  <p className="text-sm text-gray-500">
                    Auto mode uses all available CPU cores for faster encoding. Use single thread for low-resource VPS.
                    <br />
                    <strong>Note:</strong> Changes apply to newly started streams only. Restart existing streams to apply.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4">Default Watermark</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This watermark will be applied to streams for users who don't have custom watermark permission.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_watermark_enabled">Enable Default Watermark</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="default_watermark_enabled"
                        checked={settings.default_watermark_enabled === '1'}
                        onChange={(e) => handleChange('default_watermark_enabled', e.target.checked ? '1' : '0')}
                        className="h-4 w-4"
                      />
                      <label htmlFor="default_watermark_enabled" className="text-sm">
                        Show default watermark for users without custom watermark permission
                      </label>
                    </div>
                  </div>

                  {settings.default_watermark_path && (
                    <div className="space-y-2">
                      <Label>Current Watermark</Label>
                      <div className="flex items-center gap-4">
                        <div className="p-4 border rounded bg-gray-50">
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${settings.default_watermark_path.replace(/\\/g, '/').replace('uploads/', 'uploads/')}`}
                            alt="Default watermark"
                            className="max-h-32 max-w-xs"
                            onError={(e) => { e.target.src = ''; e.target.alt = 'Watermark file not accessible'; }}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          onClick={handleWatermarkDelete}
                          size="sm"
                        >
                          Delete Watermark
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="watermark_file">Upload New Watermark</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        id="watermark_file"
                        accept="image/*"
                        onChange={handleWatermarkFileChange}
                      />
                      <Button
                        onClick={handleWatermarkUpload}
                        disabled={!watermarkFile || watermarkUploading}
                      >
                        {watermarkUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                    {watermarkPreview && (
                      <div className="mt-2 p-4 border rounded bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">Preview:</p>
                        <img
                          src={watermarkPreview}
                          alt="Watermark preview"
                          className="max-h-32 max-w-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="space-y-2">
                      <Label htmlFor="default_watermark_position">Position</Label>
                      <select
                        id="default_watermark_position"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={settings.default_watermark_position || 'bottom-right'}
                        onChange={(e) => handleChange('default_watermark_position', e.target.value)}
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="center">Center</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_watermark_opacity">Opacity</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="range"
                          id="default_watermark_opacity"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.default_watermark_opacity || '0.7'}
                          onChange={(e) => handleChange('default_watermark_opacity', e.target.value)}
                        />
                        <span className="text-sm w-12">{settings.default_watermark_opacity || '0.7'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_watermark_scale">Scale</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="range"
                        id="default_watermark_scale"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={settings.default_watermark_scale || '0.15'}
                        onChange={(e) => handleChange('default_watermark_scale', e.target.value)}
                      />
                      <span className="text-sm w-12">{settings.default_watermark_scale || '0.15'}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Scale relative to video size (0.15 = 15% of video width)
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4">Server Information</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>HLS Base Path:</strong> /var/www/hls (configured on backend)
                  </p>
                  <p>
                    <strong>FFmpeg Path:</strong> /usr/bin/ffmpeg (configured on backend)
                  </p>
                  <p className="text-gray-500">
                    Update these values in the backend .env file
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="mt-6">
              <PlanManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSettings;
