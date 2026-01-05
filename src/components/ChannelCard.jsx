import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import MultiPlatformStreaming from './MultiPlatformStreaming';
import WatermarkSettings from './WatermarkSettings';

function ChannelCard({ channel, onUpdate, onDelete, onEdit }) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userStats, setUserStats] = useState(null);
  const [runtime, setRuntime] = useState(0);
  const copiedTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  // Fetch user stats for plan limits
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await api.get('/users/me/stats');
        setUserStats(response.data);
      } catch (error) {
        console.error('Failed to load user stats');
      }
    };
    fetchUserStats();
  }, []);

  // Track runtime when stream is running
  useEffect(() => {
    if (channel.status === 'running' && channel.last_started_at) {
      const updateRuntime = () => {
        const elapsed = Math.floor((Date.now() - new Date(channel.last_started_at)) / 1000);
        setRuntime(elapsed);
      };

      updateRuntime();
      const interval = setInterval(updateRuntime, 1000);

      return () => clearInterval(interval);
    } else {
      setRuntime(0);
    }
  }, [channel.status, channel.last_started_at]);

  // Use stream_key if available, fallback to channel_id for backwards compatibility
  const streamKey = channel.stream_key || `channel_${channel.id}`;
  const streamUrl = `${window.location.protocol}//${window.location.host}/hls/${streamKey}/index.m3u8`;

  const fetchLogs = async () => {
    try {
      const response = await api.get(`/channels/${channel.id}/logs`);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to load logs');
    }
  };

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
      await new Promise(resolve => setTimeout(resolve, 2000));
      await api.post(`/channels/${channel.id}/start`);
      onUpdate();
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

  const formatRuntime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getRuntimeInfo = () => {
    if (channel.status !== 'running' || !userStats?.limits?.max_stream_duration) return null;

    const runtimeMinutes = Math.floor(runtime / 60);
    const maxDuration = userStats.limits.max_stream_duration;
    const remainingMinutes = maxDuration - runtimeMinutes;
    const percentComplete = (runtimeMinutes / maxDuration) * 100;

    let statusColor = '#27ae60';
    let statusIcon = '⏱️';
    if (percentComplete >= 90) {
      statusColor = '#e74c3c';
      statusIcon = '⚠️';
    } else if (percentComplete >= 75) {
      statusColor = '#f39c12';
      statusIcon = '⚠️';
    }

    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        borderRadius: '6px',
        marginTop: '1rem',
        border: `2px solid ${statusColor}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2c3e50' }}>
            {statusIcon} Stream Duration
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'monospace', color: statusColor }}>
            {formatRuntime(runtime)}
          </div>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
            <span>Plan Limit: {maxDuration} minutes</span>
            <span style={{ color: statusColor, fontWeight: '600' }}>
              {remainingMinutes > 0 ? `${remainingMinutes} min remaining` : 'Limit reached'}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e9ecef',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(percentComplete, 100)}%`,
              height: '100%',
              backgroundColor: statusColor,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>
    );
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
        borderRadius: '6px',
        marginTop: '0.75rem',
        fontSize: '0.85rem',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <strong>Health:</strong> <span style={{ color: '#27ae60' }}>{runtime.status || 'unknown'}</span>
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
        borderRadius: '6px',
        marginTop: '0.75rem',
        border: '1px solid #d4e9ff'
      }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: '600', color: '#2c3e50', fontSize: '0.9rem' }}>
          RTMP Destinations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {rtmpConnections.map((conn) => {
            const statusColor = conn.status === 'connected' ? '#27ae60' :
                               conn.status === 'connecting' ? '#f39c12' : '#e74c3c';
            const statusIcon = conn.status === 'connected' ? '✓' :
                              conn.status === 'connecting' ? '⟳' : '✗';
            const statusText = conn.status === 'connected' ? 'Connected' :
                              conn.status === 'connecting' ? 'Connecting' : 'Disconnected';

            return (
              <div key={conn.destinationId} style={{
                backgroundColor: 'white',
                border: `2px solid ${statusColor}`,
                borderRadius: '6px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                  flexShrink: 0
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '0.9rem', color: '#2c3e50' }}>
                    {conn.platform}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: statusColor, fontWeight: '500' }}>
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.25rem', fontWeight: '500' }}>
                Input Source
              </div>
              <a
                href={channel.input_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3498db',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}
              >
                {channel.input_url}
              </a>
            </div>

            {getRuntimeInfo()}
            {getHealthInfo()}
            {getRtmpConnectionsInfo()}

            {channel.status === 'error' && channel.error_message && (
              <div style={{
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                padding: '0.75rem',
                borderRadius: '6px',
                marginTop: '1rem',
                color: '#c0392b',
                fontSize: '0.85rem'
              }}>
                <strong>❌ Error:</strong> {channel.error_message}
              </div>
            )}

            {channel.status === 'running' && (
              <div style={{
                backgroundColor: '#e8f5e9',
                padding: '1rem',
                borderRadius: '6px',
                marginTop: '1rem',
                border: '1px solid #c8e6c9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#2c3e50', fontSize: '0.9rem' }}>🎥 Stream URL</strong>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-sm"
                      onClick={handleCopyUrl}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        backgroundColor: copied ? '#27ae60' : '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={handleOpenStream}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        backgroundColor: '#9b59b6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      🔗 Open
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setShowPreview(!showPreview)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        backgroundColor: '#e67e22',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {showPreview ? '👁️ Hide' : '👁️ Preview'}
                    </button>
                  </div>
                </div>
                <div style={{
                  backgroundColor: 'white',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                  color: '#2c3e50'
                }}>
                  {streamUrl}
                </div>
              </div>
            )}

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
                    backgroundColor: 'rgba(231, 76, 60, 0.9)',
                    color: 'white',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    🔴 LIVE
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.5rem', textAlign: 'center' }}>
                  Note: Some browsers may not support HLS natively. Use VLC or a dedicated player for best results.
                </p>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Quality</div>
                <div style={{ fontWeight: '600', color: '#2c3e50' }}>{channel.quality_preset}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Input Type</div>
                <div style={{ fontWeight: '600', color: '#2c3e50', textTransform: 'capitalize' }}>{channel.input_type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Auto-restart</div>
                <div style={{ fontWeight: '600', color: channel.auto_restart ? '#27ae60' : '#95a5a6' }}>
                  {channel.auto_restart ? '✅ Enabled' : '⭕ Disabled'}
                </div>
              </div>
              {channel.process_id && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Process ID</div>
                  <div style={{ fontWeight: '600', color: '#2c3e50', fontFamily: 'monospace' }}>{channel.process_id}</div>
                </div>
              )}
            </div>
          </div>
        );

      case 'platforms':
        return (
          <div>
            <MultiPlatformStreaming
              channelId={channel.id}
              channelName={channel.name}
              streamTitle={channel.stream_title}
              streamDescription={channel.description}
              channelStatus={channel.status}
            />
          </div>
        );

      case 'watermark':
        return (
          <div style={{ padding: '1rem' }}>
            <WatermarkSettings channel={channel} onUpdate={onUpdate} />
          </div>
        );

      case 'logs':
        return (
          <div style={{ padding: '1rem' }}>
            <div className="logs-container" style={{
              backgroundColor: '#1e1e1e',
              borderRadius: '6px',
              padding: '1rem',
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem'
            }}>
              {logs.length === 0 ? (
                <div style={{ color: '#95a5a6', textAlign: 'center', padding: '2rem' }}>No logs available</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.5rem',
                      marginBottom: '0.25rem',
                      borderLeft: `3px solid ${
                        log.log_type === 'error' ? '#e74c3c' :
                        log.log_type === 'warning' ? '#f39c12' :
                        log.log_type === 'info' ? '#3498db' : '#95a5a6'
                      }`,
                      color: log.log_type === 'error' ? '#e74c3c' :
                            log.log_type === 'warning' ? '#f39c12' :
                            log.log_type === 'info' ? '#3498db' : '#ecf0f1'
                    }}
                  >
                    <span style={{ color: '#7f8c8d' }}>[{new Date(log.created_at).toLocaleString()}]</span>{' '}
                    <span style={{ fontWeight: '600' }}>[{log.log_type.toUpperCase()}]</span>{' '}
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      marginBottom: '1.5rem'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50', fontWeight: '600' }}>
            {channel.name}
          </h2>
          {channel.description && (
            <p style={{ color: '#6c757d', marginTop: '0.35rem', marginBottom: 0, fontSize: '0.9rem' }}>
              {channel.description}
            </p>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* Control Buttons */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        backgroundColor: 'white'
      }}>
        {channel.status !== 'running' ? (
          <button
            className="btn btn-success"
            onClick={handleStart}
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Starting...' : '▶️ Start Stream'}
          </button>
        ) : (
          <>
            <button
              className="btn btn-danger"
              onClick={handleStop}
              disabled={loading}
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Stopping...' : '⏹️ Stop Stream'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRestart}
              disabled={loading}
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                backgroundColor: '#f39c12'
              }}
            >
              {loading ? '⏳ Restarting...' : '🔄 Restart Stream'}
            </button>
          </>
        )}
        {channel.status !== 'running' && (
          <button
            className="btn btn-secondary"
            onClick={() => onEdit(channel)}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#6c757d',
              marginLeft: 'auto'
            }}
          >
            ✏️ Edit
          </button>
        )}
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={loading || channel.status === 'running'}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: (loading || channel.status === 'running') ? 'not-allowed' : 'pointer',
            opacity: (loading || channel.status === 'running') ? 0.5 : 1,
            marginLeft: channel.status === 'running' ? 'auto' : '0'
          }}
        >
          🗑️ Delete
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'platforms', label: '🌐 Multi-Platform', icon: '🌐' },
          { id: 'watermark', label: '🖼️ Watermark', icon: '🖼️' },
          { id: 'logs', label: '📋 Logs', icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent',
              color: activeTab === tab.id ? '#3498db' : '#6c757d',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '200px' }}>
        {renderTabContent()}
      </div>
    </div>
  );
}

export default ChannelCard;
