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
      <div className="bg-blue-50 p-3 rounded-md mt-3 border border-blue-200">
        <div className="mb-3 font-semibold text-gray-800 text-sm">
          RTMP Destinations
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {rtmpConnections.map((conn) => {
            const statusColor = conn.status === 'connected' ? 'border-green-500 text-green-600' :
                               conn.status === 'connecting' ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600';
            const dotColor = conn.status === 'connected' ? 'bg-green-500' :
                            conn.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500';
            const statusIcon = conn.status === 'connected' ? '✓' :
                              conn.status === 'connecting' ? '⟳' : '✗';
            const statusText = conn.status === 'connected' ? 'Connected' :
                              conn.status === 'connecting' ? 'Connecting' : 'Disconnected';

            return (
              <div key={conn.destinationId} className={`bg-white border-2 rounded-md p-3 flex items-center gap-2 ${statusColor}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold capitalize text-sm text-gray-800">
                    {conn.platform}
                  </div>
                  <div className="text-xs font-medium">
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
          <div className="p-5">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-1 font-medium">
                Input Source
              </div>
              <a
                href={channel.input_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 no-underline text-sm break-all hover:underline"
              >
                {channel.input_url}
              </a>
            </div>

            {getRuntimeInfo()}
            {getHealthInfo()}
            {getRtmpConnectionsInfo()}

            {channel.status === 'error' && channel.error_message && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-md mt-4 text-red-800 text-sm">
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
              <div className="mt-4">
                <div className="bg-black rounded-lg overflow-hidden relative">
                  <video
                    controls
                    autoPlay
                    muted
                    className="w-full max-h-96"
                    src={streamUrl}
                  >
                    Your browser does not support HLS playback.
                  </video>
                  <div className="absolute top-2 right-2 bg-red-600/90 text-white px-3 py-1.5 rounded text-xs font-semibold">
                    🔴 LIVE
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
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
          <div className="p-4">
            <WatermarkSettings channel={channel} onUpdate={onUpdate} />
          </div>
        );

      case 'logs':
        return (
          <div className="p-4">
            <div className="bg-gray-900 rounded-md p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-400 text-center p-8">No logs available</div>
              ) : (
                logs.map((log) => {
                  const borderColor = log.log_type === 'error' ? 'border-red-600' :
                                     log.log_type === 'warning' ? 'border-yellow-500' :
                                     log.log_type === 'info' ? 'border-blue-500' : 'border-gray-500';
                  const textColor = log.log_type === 'error' ? 'text-red-500' :
                                   log.log_type === 'warning' ? 'text-yellow-500' :
                                   log.log_type === 'info' ? 'text-blue-400' : 'text-gray-300';

                  return (
                    <div
                      key={log.id}
                      className={`p-2 mb-1 border-l-4 ${borderColor} ${textColor}`}
                    >
                      <span className="text-gray-500">[{new Date(log.created_at).toLocaleString()}]</span>{' '}
                      <span className="font-semibold">[{log.log_type.toUpperCase()}]</span>{' '}
                      {log.message}
                    </div>
                  );
                })
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
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50">
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <h2 className="m-0 text-lg sm:text-xl text-gray-800 font-semibold break-words">
            {channel.name}
          </h2>
          {channel.description && (
            <p className="text-gray-600 mt-1 mb-0 text-xs sm:text-sm break-words">
              {channel.description}
            </p>
          )}
        </div>
        <div className="self-start sm:self-auto">{getStatusBadge()}</div>
      </div>

      {/* Control Buttons */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex gap-2 sm:gap-3 flex-wrap bg-white">
        {channel.status !== 'running' ? (
          <Button
            onClick={handleStart}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
            size="sm"
          >
            {loading ? '⏳' : '▶️'} <span className="hidden sm:inline">{loading ? 'Starting...' : 'Start Stream'}</span><span className="sm:hidden">Start</span>
          </Button>
        ) : (
          <>
            <Button
              variant="destructive"
              onClick={handleStop}
              disabled={loading}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              {loading ? '⏳' : '⏹️'} <span className="hidden sm:inline">{loading ? 'Stopping...' : 'Stop Stream'}</span><span className="sm:hidden">Stop</span>
            </Button>
            <Button
              onClick={handleRestart}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white flex-1 sm:flex-none"
              size="sm"
            >
              {loading ? '⏳' : '🔄'} <span className="hidden sm:inline">{loading ? 'Restarting...' : 'Restart'}</span><span className="sm:hidden">Restart</span>
            </Button>
          </>
        )}
        {channel.status !== 'running' && (
          <Button
            variant="secondary"
            onClick={() => onEdit(channel)}
            className="ml-auto"
            size="sm"
          >
            ✏️ <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={loading || channel.status === 'running'}
          className={channel.status === 'running' ? 'ml-auto' : ''}
          size="sm"
        >
          🗑️ <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-50 border-t-2 border-gray-200">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">📊 Overview</span>
            <span className="sm:hidden">📊</span>
          </TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">🌐 Multi-Platform</span>
            <span className="sm:hidden">🌐</span>
          </TabsTrigger>
          <TabsTrigger value="watermark" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">🖼️ Watermark</span>
            <span className="sm:hidden">🖼️</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">📋 Logs</span>
            <span className="sm:hidden">📋</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="min-h-[200px] mt-0">
          {renderTabContent()}
        </TabsContent>

        <TabsContent value="platforms" className="min-h-[200px] mt-0">
          {renderTabContent()}
        </TabsContent>

        <TabsContent value="watermark" className="min-h-[200px] mt-0">
          {renderTabContent()}
        </TabsContent>

        <TabsContent value="logs" className="min-h-[200px] mt-0">
          {renderTabContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChannelCard;
