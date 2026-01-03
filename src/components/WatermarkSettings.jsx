import React, { useState } from 'react';
import api from '../services/api';

function WatermarkSettings({ channel, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    watermark_enabled: channel.watermark_enabled || false,
    watermark_path: channel.watermark_path || '',
    watermark_position: channel.watermark_position || 'top-left',
    watermark_opacity: channel.watermark_opacity || 1.0,
    watermark_scale: channel.watermark_scale || 1.0,
  });

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

    if (channel.status === 'running') {
      alert('Please stop the stream before uploading a watermark');
      return;
    }

    const formData = new FormData();
    formData.append('watermark', file);

    setUploading(true);
    try {
      const response = await api.post(`/watermark/upload/${channel.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSettings((prev) => ({ ...prev, watermark_path: response.data.path }));

      // Update channel with new watermark path
      await api.put(`/watermark/${channel.id}`, {
        watermark_path: response.data.path,
      });

      setHasChanges(false);
      alert('Watermark uploaded successfully');
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload watermark');
    } finally {
      setUploading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    if (channel.status === 'running') {
      alert('Please stop the stream before changing watermark settings');
      return;
    }

    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put(`/watermark/${channel.id}`, settings);
      setHasChanges(false);
      alert('Watermark settings saved successfully');
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update watermark settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete watermark?')) return;

    if (channel.status === 'running') {
      alert('Please stop the stream before deleting the watermark');
      return;
    }

    try {
      await api.delete(`/watermark/${channel.id}`);
      setSettings({
        watermark_enabled: false,
        watermark_path: '',
        watermark_position: 'top-left',
        watermark_opacity: 1.0,
        watermark_scale: 1.0,
      });
      setHasChanges(false);
      alert('Watermark deleted successfully');
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete watermark');
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0, color: '#2c3e50' }}>Watermark Settings</h3>
        <div className="checkbox-group">
          <input
            type="checkbox"
            id={`watermark-enabled-${channel.id}`}
            checked={settings.watermark_enabled}
            onChange={(e) => handleSettingChange('watermark_enabled', e.target.checked ? 1 : 0)}
          />
          <label htmlFor={`watermark-enabled-${channel.id}`}>Enable Watermark</label>
        </div>
      </div>

      {channel.status === 'running' && (
        <div style={{
          backgroundColor: '#fff3cd',
          padding: '0.75rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          color: '#856404',
          fontSize: '0.9rem',
        }}>
          ⚠️ Stop the stream to modify watermark settings
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
          Upload Watermark Image
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          onChange={handleFileUpload}
          disabled={uploading || channel.status === 'running'}
          style={{
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '100%',
          }}
        />
        {uploading && (
          <div style={{ marginTop: '0.5rem', color: '#3498db', fontSize: '0.9rem' }}>
            Uploading...
          </div>
        )}
        {settings.watermark_path && (
          <div style={{
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ color: '#27ae60', fontSize: '0.9rem' }}>
              ✓ Watermark uploaded
            </span>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={channel.status === 'running'}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {settings.watermark_path && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
              Position
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
            }}>
              {positions.map((pos) => (
                <button
                  key={pos.value}
                  className={`btn ${settings.watermark_position === pos.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleSettingChange('watermark_position', pos.value)}
                  disabled={channel.status === 'running'}
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{pos.icon}</span>
                  <span>{pos.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
              Opacity: {Math.round(settings.watermark_opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.watermark_opacity}
              onChange={(e) => handleSettingChange('watermark_opacity', parseFloat(e.target.value))}
              disabled={channel.status === 'running'}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#7f8c8d',
              marginTop: '0.25rem',
            }}>
              <span>Transparent</span>
              <span>Opaque</span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
              Size: {Math.round(settings.watermark_scale * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={settings.watermark_scale}
              onChange={(e) => handleSettingChange('watermark_scale', parseFloat(e.target.value))}
              disabled={channel.status === 'running'}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#7f8c8d',
              marginTop: '0.25rem',
            }}>
              <span>10% (Smallest)</span>
              <span>200% (Largest)</span>
            </div>
          </div>

          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '0.75rem',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#1976d2',
            marginBottom: '1rem',
          }}>
            ℹ️ Preview: Watermark will be positioned at <strong>{positions.find(p => p.value === settings.watermark_position)?.label}</strong> with <strong>{Math.round(settings.watermark_opacity * 100)}%</strong> opacity and <strong>{Math.round(settings.watermark_scale * 100)}%</strong> size when the stream starts.
          </div>

          <button
            className="btn btn-success"
            onClick={handleSaveSettings}
            disabled={!hasChanges || saving || channel.status === 'running'}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: '600',
            }}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Watermark Settings' : 'No Changes to Save'}
          </button>
        </>
      )}
    </div>
  );
}

export default WatermarkSettings;
