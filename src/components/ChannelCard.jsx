import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import MultiPlatformStreaming from './MultiPlatformStreaming';
import WatermarkSettings from './WatermarkSettings';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

function ChannelCard({ channel, onUpdate, onDelete, onEdit, user }) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userStats, setUserStats] = useState(null);
  const [runtime, setRuntime] = useState(0);
  const copiedTimeoutRef = useRef(null);
  const isAdmin = user && user.role === 'admin';

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
        // Parse the timestamp - handle both ISO format and SQLite CURRENT_TIMESTAMP format
        let startTime;
        try {
          // SQLite returns UTC timestamp like "2025-01-06 12:34:56"
          // Convert it to ISO format by replacing space with 'T' and adding 'Z'
          const isoTimestamp = channel.last_started_at.includes('T')
            ? channel.last_started_at
            : channel.last_started_at.replace(' ', 'T') + 'Z';
          startTime = new Date(isoTimestamp).getTime();
        } catch (e) {
          console.error('Failed to parse timestamp:', channel.last_started_at);
          startTime = Date.now(); // Fallback to current time
        }

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRuntime(Math.max(0, elapsed)); // Ensure non-negative
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

    let variant = 'default';
    let statusIcon = '';
    let statusText = channel.status.toUpperCase();

    if (channel.status === 'running') {
      if (health.status === 'healthy') {
        statusIcon = '✓ ';
        variant = 'success';
      } else if (health.status === 'error' || health.errors > 0) {
        statusIcon = '⚠️ ';
        variant = 'warning';
      } else if (health.status === 'starting') {
        statusIcon = '⏳ ';
        variant = 'running';
      } else {
        variant = 'running';
      }

      if (runtime.uptime) {
        statusText = `${statusIcon}${statusText} (${formatUptime(runtime.uptime)})`;
      } else {
        statusText = `${statusIcon}${statusText}`;
      }
    } else if (channel.status === 'error') {
      statusIcon = '❌ ';
      variant = 'error';
      statusText = `${statusIcon}${statusText}`;
    } else if (channel.status === 'stopped') {
      variant = 'stopped';
    }

    return <Badge variant={variant}>{statusText}</Badge>;
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
      <div className="bg-gray-50 p-4 rounded-md mt-4" style={{ border: `2px solid ${statusColor}` }}>
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-semibold text-gray-800">
            {statusIcon} Stream Duration
          </div>
          <div className="text-lg font-bold font-mono" style={{ color: statusColor }}>
            {formatRuntime(runtime)}
          </div>
        </div>

        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Plan Limit: {maxDuration} minutes</span>
            <span className="font-semibold" style={{ color: statusColor }}>
              {remainingMinutes > 0 ? `${remainingMinutes} min remaining` : 'Limit reached'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-sm overflow-hidden">
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.min(percentComplete, 100)}%`,
                backgroundColor: statusColor
              }}
            />
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
      <div className="bg-gray-50 p-3 rounded-md mt-3 text-sm border border-gray-200">
        <div className="flex gap-6 flex-wrap">
          <div>
            <strong>Health:</strong> <span className="text-green-600">{runtime.status || 'unknown'}</span>
          </div>
          {errorCount > 0 && (
            <div className="text-orange-600">
              <strong>Errors:</strong> {errorCount}
            </div>
          )}
          {reconnectAttempts > 0 && (
            <div className="text-red-600">
              <strong>Reconnect Attempts:</strong> {reconnectAttempts}/{maxReconnectAttempts}
            </div>
          )}
          {runtime.lastError && (
            <div className="text-red-700 flex-1 w-full mt-2">
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
              <div className="bg-green-50 p-4 rounded-lg mt-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <strong className="text-gray-800 text-sm">🎥 Stream URL</strong>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCopyUrl}
                      className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                    >
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleOpenStream}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      🔗 Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {showPreview ? '👁️ Hide' : '👁️ Preview'}
                    </Button>
                  </div>
                </div>
                <div className="bg-white p-3 rounded font-mono text-xs break-all text-gray-800">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 mb-1">Quality</div>
                <div className="font-semibold text-gray-800">{channel.quality_preset}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Input Type</div>
                <div className="font-semibold text-gray-800 capitalize">{channel.input_type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Auto-restart</div>
                <div className={`font-semibold ${channel.auto_restart ? 'text-green-600' : 'text-gray-400'}`}>
                  {channel.auto_restart ? '✅ Enabled' : '⭕ Disabled'}
                </div>
              </div>
              {isAdmin && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">User ID</div>
                  <div className="font-semibold text-gray-800 font-mono">#{channel.user_id}</div>
                </div>
              )}
              {isAdmin && channel.process_id && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Process ID</div>
                  <div className="font-semibold text-gray-800 font-mono">{channel.process_id}</div>
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex-1">
          <h2 className="m-0 text-xl text-gray-800 font-semibold">
            {channel.name}
          </h2>
          {channel.description && (
            <p className="text-gray-600 mt-1 mb-0 text-sm">
              {channel.description}
            </p>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* Control Buttons */}
      <div className="px-6 py-4 border-b border-gray-200 flex gap-3 flex-wrap bg-white">
        {channel.status !== 'running' ? (
          <Button
            onClick={handleStart}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? '⏳ Starting...' : '▶️ Start Stream'}
          </Button>
        ) : (
          <>
            <Button
              variant="destructive"
              onClick={handleStop}
              disabled={loading}
            >
              {loading ? '⏳ Stopping...' : '⏹️ Stop Stream'}
            </Button>
            <Button
              onClick={handleRestart}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? '⏳ Restarting...' : '🔄 Restart Stream'}
            </Button>
          </>
        )}
        {channel.status !== 'running' && (
          <Button
            variant="secondary"
            onClick={() => onEdit(channel)}
            className="ml-auto"
          >
            ✏️ Edit
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={loading || channel.status === 'running'}
          className={channel.status === 'running' ? 'ml-auto' : ''}
        >
          🗑️ Delete
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200 bg-gray-50">
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'platforms', label: '🌐 Multi-Platform', icon: '🌐' },
          { id: 'watermark', label: '🖼️ Watermark', icon: '🖼️' },
          { id: 'logs', label: '📋 Logs', icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 p-4 text-sm font-semibold border-none bg-transparent transition-all outline-none cursor-pointer ${
              activeTab === tab.id
                ? 'border-b-3 border-blue-500 text-blue-500'
                : 'border-b-3 border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={{
              borderBottom: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default ChannelCard;
