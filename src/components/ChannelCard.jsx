import React, { useState } from 'react';
import api from '../services/api';
import RtmpSettings from './RtmpSettings';
import WatermarkSettings from './WatermarkSettings';

function ChannelCard({ channel, onUpdate, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRtmpSettings, setShowRtmpSettings] = useState(false);
  const [showWatermarkSettings, setShowWatermarkSettings] = useState(false);

  const streamUrl = `${window.location.protocol}//${window.location.host}/hls/channel_${channel.id}/index.m3u8`;

  const handleStart = async () => {
    if (!confirm(`Start streaming for "${channel.name}"?`)) return;

    setLoading(true);
    try {
      await api.post(`/channels/${channel.id}/start`);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!confirm(`Stop streaming for "${channel.name}"?`)) return;

    setLoading(true);
    try {
      await api.post(`/channels/${channel.id}/stop`);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to stop stream');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!confirm(`Restart streaming for "${channel.name}"?`)) return;

    setLoading(true);
    try {
      await api.post(`/channels/${channel.id}/stop`);
      // Wait a moment before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));
      await api.post(`/channels/${channel.id}/start`);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to restart stream');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete channel "${channel.name}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await api.delete(`/channels/${channel.id}`);
      onDelete(channel.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete channel');
      setLoading(false);
    }
  };

  const handleViewLogs = async () => {
    if (!showLogs) {
      try {
        const response = await api.get(`/channels/${channel.id}/logs`);
        setLogs(response.data.logs);
        setShowLogs(true);
      } catch (error) {
        alert('Failed to load logs');
      }
    } else {
      setShowLogs(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy URL');
    }
  };

  const handleOpenStream = () => {
    window.open(streamUrl, '_blank');
  };

  const getStatusBadge = () => {
    const statusClass = `status-badge status-${channel.status}`;
    const statusText = channel.status === 'running' && channel.runtime_status?.uptime
      ? `${channel.status.toUpperCase()} (${formatUptime(channel.runtime_status.uptime)})`
      : channel.status.toUpperCase();
    return <span className={statusClass}>{statusText}</span>;
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>{channel.name}</h2>
          {channel.description && <p style={{ color: '#7f8c8d', marginTop: '0.5rem' }}>{channel.description}</p>}
        </div>
        {getStatusBadge()}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
          <strong>Input URL:</strong>
          <a href={channel.input_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem', color: '#3498db' }}>
            {channel.input_url.substring(0, 60)}...
          </a>
        </div>

        {channel.status === 'running' && (
          <div className="stream-url-section" style={{
            backgroundColor: '#e8f5e9',
            padding: '1rem',
            borderRadius: '4px',
            marginTop: '1rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#2c3e50' }}>🎥 Stream URL:</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-sm"
                  onClick={handleCopyUrl}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.8rem',
                    backgroundColor: copied ? '#27ae60' : '#3498db',
                    color: 'white'
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button
                  className="btn btn-sm"
                  onClick={handleOpenStream}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.8rem',
                    backgroundColor: '#9b59b6',
                    color: 'white'
                  }}
                >
                  🔗 Open
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowPreview(!showPreview)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.8rem',
                    backgroundColor: '#e67e22',
                    color: 'white'
                  }}
                >
                  {showPreview ? '👁️ Hide' : '👁️ Preview'}
                </button>
              </div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '0.5rem',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              wordBreak: 'break-all',
              color: '#2c3e50'
            }}>
              {streamUrl}
            </div>
          </div>
        )}

        {channel.status === 'running' && channel.process_id && (
          <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
            <strong>Process ID:</strong> {channel.process_id}
          </p>
        )}
        {channel.error_message && (
          <div style={{
            backgroundColor: '#fee',
            padding: '0.75rem',
            borderRadius: '4px',
            marginTop: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <p style={{ fontSize: '0.9rem', color: '#e74c3c', margin: 0 }}>
              <strong>⚠️ Error:</strong> {channel.error_message}
            </p>
          </div>
        )}
        <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
          <strong>Auto-restart:</strong> {channel.auto_restart ? '✅ Enabled' : '❌ Disabled'}
        </p>
      </div>

      <div className="action-buttons">
        {channel.status !== 'running' ? (
          <button className="btn btn-success" onClick={handleStart} disabled={loading}>
            {loading ? 'Starting...' : 'Start Stream'}
          </button>
        ) : (
          <>
            <button className="btn btn-danger" onClick={handleStop} disabled={loading}>
              {loading ? 'Stopping...' : 'Stop Stream'}
            </button>
            <button className="btn btn-primary" onClick={handleRestart} disabled={loading}>
              {loading ? 'Restarting...' : 'Restart Stream'}
            </button>
          </>
        )}
        <button className="btn btn-secondary" onClick={handleViewLogs}>
          {showLogs ? 'Hide Logs' : 'View Logs'}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setShowRtmpSettings(!showRtmpSettings)}
          style={{ backgroundColor: '#9b59b6' }}
        >
          {showRtmpSettings ? 'Hide' : 'Multi-Platform'}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setShowWatermarkSettings(!showWatermarkSettings)}
          style={{ backgroundColor: '#e67e22' }}
        >
          {showWatermarkSettings ? 'Hide' : 'Watermark'}
        </button>
        <button className="btn btn-danger" onClick={handleDelete} disabled={loading || channel.status === 'running'}>
          Delete
        </button>
      </div>

      {showPreview && channel.status === 'running' && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <video
              controls
              autoPlay
              muted
              style={{ width: '100%', maxHeight: '400px' }}
              src={streamUrl}
            >
              Your browser does not support HLS playback.
            </video>
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem'
            }}>
              LIVE
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '0.5rem', textAlign: 'center' }}>
            Note: Some browsers may not support HLS natively. Use VLC or a dedicated player for best results.
          </p>
        </div>
      )}

      {showLogs && (
        <div style={{ marginTop: '1rem' }}>
          <div className="logs-container">
            {logs.length === 0 ? (
              <div>No logs available</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.log_type}`}>
                  [{new Date(log.created_at).toLocaleString()}] [{log.log_type.toUpperCase()}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showRtmpSettings && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
        }}>
          <RtmpSettings channelId={channel.id} channelName={channel.name} />
        </div>
      )}

      {showWatermarkSettings && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#fff5e6',
          borderRadius: '8px',
          border: '1px solid #ffe0b2',
        }}>
          <WatermarkSettings channel={channel} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

export default ChannelCard;
