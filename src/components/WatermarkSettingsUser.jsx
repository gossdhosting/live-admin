import React, { useState, useEffect } from 'react';
import api from '../services/api';
import UpgradePrompt from './UpgradePrompt';
import StreamPreview from './StreamPreview';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

function WatermarkSettingsUser({ onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    watermark_path: '',
    watermark_position: 'top-left',
    watermark_opacity: 1.0,
    watermark_scale: 1.0,
  });

  useEffect(() => {
    fetchUserStats();
    fetchWatermarkSettings();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setUserStats(response.data);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const fetchWatermarkSettings = async () => {
    try {
      const response = await api.get('/user-settings');
      const userSettings = response.data.settings;

      setSettings({
        watermark_path: userSettings.watermark_path || '',
        watermark_position: userSettings.watermark_position || 'top-left',
        watermark_opacity: parseFloat(userSettings.watermark_opacity || '1.0'),
        watermark_scale: parseFloat(userSettings.watermark_scale || '1.0'),
      });
    } catch (err) {
      console.error('Failed to fetch watermark settings:', err);
    }
  };

  const positions = [
    { value: 'top-left', label: 'Top Left', icon: '↖️' },
    { value: 'top-center', label: 'Top Center', icon: '⬆️' },
    { value: 'top-right', label: 'Top Right', icon: '↗️' },
    { value: 'center-left', label: 'Center Left', icon: '⬅️' },
    { value: 'center', label: 'Center', icon: '⏺️' },
    { value: 'center-right', label: 'Center Right', icon: '➡️' },
    { value: 'bottom-left', label: 'Bottom Left', icon: '↙️' },
    { value: 'bottom-center', label: 'Bottom Center', icon: '⬇️' },
    { value: 'bottom-right', label: 'Bottom Right', icon: '↘️' },
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('watermark', file);

    setUploading(true);
    setMessage('');

    try {
      const response = await api.post('/user-settings/watermark/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSettings((prev) => ({ ...prev, watermark_path: response.data.path }));
      setMessage('Watermark uploaded successfully');
      setTimeout(() => setMessage(''), 3000);

      if (onUpdate) onUpdate();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to upload watermark');
    } finally {
      setUploading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage('');

    try {
      await api.put('/user-settings', {
        settings: {
          watermark_position: settings.watermark_position,
          watermark_opacity: settings.watermark_opacity.toString(),
          watermark_scale: settings.watermark_scale.toString(),
        }
      });

      setHasChanges(false);
      setMessage('Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);

      if (onUpdate) onUpdate();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update watermark settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete watermark? This will remove the watermark from all your channels.')) return;

    try {
      await api.delete('/user-settings/watermark');
      setSettings({
        watermark_path: '',
        watermark_position: 'top-left',
        watermark_opacity: 1.0,
        watermark_scale: 1.0,
      });
      setHasChanges(false);
      setMessage('Watermark deleted successfully');
      setTimeout(() => setMessage(''), 3000);

      if (onUpdate) onUpdate();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete watermark');
    }
  };

  // Check if user has watermark feature access
  const hasWatermarkAccess = userStats && userStats.limits.custom_watermark;

  return (
    <div>
      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <AlertDescription className="text-blue-800">
          <strong>ℹ️ Watermark Settings:</strong> Upload and configure a watermark that will be applied to all your channels. You can enable/disable it per channel.
        </AlertDescription>
      </Alert>

      {message && (
        <Alert className={message.includes('success') ? 'border-green-200 bg-green-50 mb-6' : 'border-red-200 bg-red-50 mb-6'}>
          <AlertDescription className={message.includes('success') ? 'text-green-800' : 'text-red-800'}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Show upgrade prompt if user doesn't have watermark access */}
      {userStats && !hasWatermarkAccess && (
        <div className="mb-6">
          <UpgradePrompt
            currentPlan={userStats.plan.name}
            requiredPlan="Pro"
            feature="custom watermarks"
          />
        </div>
      )}

      {hasWatermarkAccess && (
        <>
          <div className="space-y-2 mb-6">
            <Label htmlFor="watermark_file">Upload Watermark Image</Label>
            <input
              type="file"
              id="watermark_file"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            <p className="text-sm text-gray-500">
              Supported formats: JPEG, PNG, GIF (Max 5MB)
            </p>
            {uploading && (
              <p className="text-sm text-blue-600">
                Uploading...
              </p>
            )}
            {settings.watermark_path && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-green-600 font-medium">
                  ✓ Watermark uploaded
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>

          {settings.watermark_path && (
            <>
              <div className="space-y-2 mb-6">
                <Label>Position</Label>
                <div className="grid grid-cols-3 gap-2">
                  {positions.map((pos) => (
                    <Button
                      key={pos.value}
                      type="button"
                      variant={settings.watermark_position === pos.value ? 'default' : 'outline'}
                      onClick={() => handleSettingChange('watermark_position', pos.value)}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <span className="text-xl">{pos.icon}</span>
                      <span className="text-xs">{pos.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <Label htmlFor="watermark_opacity">
                  Opacity: {Math.round(settings.watermark_opacity * 100)}%
                </Label>
                <input
                  type="range"
                  id="watermark_opacity"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.watermark_opacity}
                  onChange={(e) => handleSettingChange('watermark_opacity', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Transparent</span>
                  <span>Opaque</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <Label htmlFor="watermark_scale">
                  Size: {Math.round(settings.watermark_scale * 100)}%
                </Label>
                <input
                  type="range"
                  id="watermark_scale"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.watermark_scale}
                  onChange={(e) => handleSettingChange('watermark_scale', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>10% (Smallest)</span>
                  <span>200% (Largest)</span>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3">Watermark Preview</h4>
                <StreamPreview
                  titleSettings={{}}
                  watermarkSettings={{
                    watermark_path: settings.watermark_path,
                    watermark_position: settings.watermark_position,
                    watermark_opacity: settings.watermark_opacity,
                    watermark_scale: settings.watermark_scale
                  }}
                  sampleTitle=""
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={!hasChanges || saving}
                >
                  {saving ? 'Saving...' : hasChanges ? 'Save Watermark Settings' : 'No Changes to Save'}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default WatermarkSettingsUser;
