import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import RtmpSettingsNew from './RtmpSettingsNew';
import WatermarkSettings from './WatermarkSettings';

function ChannelCard({ channel, onUpdate, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRtmpSettings, setShowRtmpSettings] = useState(false);
  const [showWatermarkSettings, setShowWatermarkSettings] = useState(false);
  const copiedTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

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
      // Stop the stream first
      await api.post(`/channels/${channel.id}/stop`);

      // Wait a moment before restarting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start the stream
      try {
        await api.post(`/channels/${channel.id}/start`);
        onUpdate();
      } catch (startError) {
        // If start fails, still update to show the stopped state
        onUpdate();
        throw new Error('Failed to start stream after stopping: ' + (startError.response?.data?.error || startError.message));
      }
    } catch (error) {
      alert(error.response?.data?.error || error.message || 'Failed to restart stream');
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
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy URL');
    }
  };

  const handleOpenStream = () => {
    window.open(streamUrl, '_blank');
  };

  const getStatusBadge = () => {
    const runtime = channel.runtime_status || {};
    const health = runtime.healthMetrics || {};

    // Determine health status
    let statusClass = `status-badge status-${channel.status}`;
    let statusIcon = '';
    let statusText = channel.status.toUpperCase();

    if (channel.status === 'running') {
      if (health.status === 'healthy') {
        statusIcon = '✓ ';
        statusClass = 'status-badge status-healthy';
      } else if (health.status === 'error' || health.errors > 0) {
        statusIcon = '⚠️ ';
        statusClass = 'status-badge status-warning';
      } else if (health.status === 'starting') {
        statusIcon = '⏳ ';
      }

      if (runtime.uptime) {
        statusText = `${statusIcon}${statusText} (${formatUptime(runtime.uptime)})`;
      } else {
        statusText = `${statusIcon}${statusText}`;
      }
    } else if (channel.status === 'error') {
      statusIcon = '❌ ';
      statusText = `${statusIcon}${statusText}`;
    }

    return <span className={statusClass}>{statusText}</span>;
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getHealthInfo = () => {
    const runtime = channel.runtime_status || {};

    if (channel.status !== 'running' || !runtime.running) return null;

    const errorCount = runtime.errorCount || 0;
    const reconnectAttempts = runtime.reconnectAttempts || 0;
    const maxReconnectAttempts = runtime.maxReconnectAttempts || 5;

    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '0.75rem',
        borderRadius: '4px',
        marginTop: '0.5rem',
        fontSize: '0.85rem'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <strong>Health:</strong> {runtime.status || 'unknown'}
          </div>
          {errorCount > 0 && (
            <div style={{ color: '#e67e22' }}>
              <strong>Errors:</strong> {errorCount}
            </div>
          )}
          {reconnectAttempts > 0 && (
            <div style={{ color: '#e74c3c' }}>
              <strong>Reconnect Attempts:</strong> {reconnectAttempts}/{maxReconnectAttempts}
            </div>
          )}
          {runtime.lastError && (
            <div style={{ color: '#c0392b', flex: '1 1 100%', marginTop: '0.5rem' }}>
              <strong>Last Error:</strong> {runtime.lastError}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getRtmpConnectionsInfo = () => {
    const runtime = channel.runtime_status || {};
    const rtmpConnections = runtime.rtmpConnections || [];

    if (channel.status !== 'running' || rtmpConnections.length === 0) return null;

    return (
      <div style={{
        backgroundColor: '#f0f8ff',
        padding: '0.75rem',
        borderRadius: '4px',
        marginTop: '0.5rem',
        fontSize: '0.85rem'
      }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
          RTMP Destinations:
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {rtmpConnections.map((conn) => {
            const statusColor = conn.status === 'connected' ? '#27ae60' :
                               conn.status === 'connecting' ? '#f39c12' : '#e74c3c';
            const statusIcon = conn.status === 'connected' ? '✓' :
                              conn.status === 'connecting' ? '⟳' : '✗';
            const statusText = conn.status === 'connected' ? 'CONNECTED' :
                              conn.status === 'connecting' ? 'CONNECTING' : 'DISCONNECTED';

            return (
              <div key={conn.destinationId} style={{
                backgroundColor: 'white',
                border: `2px solid ${statusColor}`,
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '150px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                  animation: conn.status === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                    {conn.platform}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: statusColor, fontWeight: '600' }}>
                    {statusIcon} {statusText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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

        {/* Health Metrics Display */}
        {getHealthInfo()}

        {/* RTMP Connections Status */}
        {getRtmpConnectionsInfo()}

        {/* Error Message Display */}
        {channel.status === 'error' && channel.error_message && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            padding: '0.75rem',
            borderRadius: '4px',
            marginTop: '0.5rem',
            color: '#c0392b',
            fontSize: '0.85rem'
          }}>
            <strong>❌ Error:</strong> {channel.error_message}
          </div>
        )}

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
          <RtmpSettingsNew channelId={channel.id} channelName={channel.name} />
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
