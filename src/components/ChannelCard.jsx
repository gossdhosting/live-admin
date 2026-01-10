import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import MultiPlatformStreaming from './MultiPlatformStreaming';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Play, Square, RotateCw, Pencil, Trash2, Copy, ExternalLink, Eye, EyeOff,
  CheckCircle, AlertTriangle, XCircle, Loader2, BarChart3, Globe, Image as ImageIcon,
  FileText, Video, Check, X
} from 'lucide-react';

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
    if (!confirm(`Start stream "${channel.name}"?`)) return;

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
    if (!confirm(`Stop stream "${channel.name}"?`)) return;

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
    if (!confirm(`Restart stream "${channel.name}"?`)) return;

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
    if (!confirm(`Delete stream "${channel.name}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await api.delete(`/channels/${channel.id}`);
      onDelete(channel.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete stream');
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
    let StatusIcon = null;
    let statusText = channel.status.toUpperCase();

    if (channel.status === 'running') {
      if (health.status === 'healthy') {
        StatusIcon = CheckCircle;
        variant = 'success';
      } else if (health.status === 'error' || health.errors > 0) {
        StatusIcon = AlertTriangle;
        variant = 'warning';
      } else if (health.status === 'starting') {
        StatusIcon = Loader2;
        variant = 'running';
      } else {
        variant = 'running';
      }

      if (runtime.uptime) {
        statusText = `${statusText} (${formatUptime(runtime.uptime)})`;
      }
    } else if (channel.status === 'error') {
      StatusIcon = XCircle;
      variant = 'error';
    } else if (channel.status === 'stopped') {
      variant = 'stopped';
    }

    return (
      <Badge variant={variant} className="gap-1.5">
        {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
        {statusText}
      </Badge>
    );
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
          <div className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            {statusIcon === '⚠️' ? <AlertTriangle className="w-4 h-4" style={{ color: statusColor }} /> : <Video className="w-4 h-4" style={{ color: statusColor }} />}
            Stream Duration
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
            const StatusIcon = conn.status === 'connected' ? Check :
                              conn.status === 'connecting' ? RotateCw : X;
            const statusText = conn.status === 'connected' ? 'Connected' :
                              conn.status === 'connecting' ? 'Connecting' : 'Disconnected';

            return (
              <div key={conn.destinationId} className={`bg-white border-2 rounded-md p-3 flex items-center gap-2 ${statusColor}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold capitalize text-sm text-gray-800">
                    {conn.platform}
                  </div>
                  <div className="text-xs font-medium flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {statusText}
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
          <div className="p-6 space-y-4">
            {/* Input Source Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                Input Source
              </div>
              {channel.input_type === 'youtube' ? (
                <a
                  href={channel.input_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-medium text-sm break-all hover:underline flex items-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  {channel.input_url}
                </a>
              ) : (
                <div className="text-sm text-gray-800 font-medium flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-600" />
                  <span>{channel.media_file_name || 'Pre-uploaded Video'}</span>
                </div>
              )}
            </div>

            {getRuntimeInfo()}
            {getHealthInfo()}
            {getRtmpConnectionsInfo()}

            {/* Error Message */}
            {channel.status === 'error' && channel.error_message && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 p-4 rounded-lg text-red-900 text-sm flex items-start gap-3 shadow-sm">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                <div>
                  <div className="font-semibold mb-1">Stream Error</div>
                  <div className="text-red-800">{channel.error_message}</div>
                </div>
              </div>
            )}

            {/* Stream URL Section */}
            {channel.status === 'running' && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <strong className="text-gray-900 text-sm font-semibold">Live Stream URL</strong>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCopyUrl}
                      className={`gap-1.5 shadow-sm ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleOpenStream}
                      className="bg-purple-600 hover:bg-purple-700 gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 gap-1.5 shadow-sm"
                    >
                      {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPreview ? 'Hide' : 'Preview'}
                    </Button>
                  </div>
                </div>
                <div className="bg-white border border-green-200 p-3 rounded-md font-mono text-xs break-all text-gray-800 shadow-inner">
                  {streamUrl}
                </div>
              </div>
            )}

            {/* Video Preview */}
            {showPreview && channel.status === 'running' && (
              <div className="space-y-2">
                <div className="bg-black rounded-xl overflow-hidden relative shadow-2xl border-2 border-gray-800">
                  <video
                    controls
                    autoPlay
                    muted
                    className="w-full max-h-96"
                    src={streamUrl}
                  >
                    Your browser does not support HLS playback.
                  </video>
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center italic">
                  💡 Note: Some browsers may not support HLS natively. Use VLC or a dedicated player for best results.
                </p>
              </div>
            )}

            {/* Stream Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="text-xs text-gray-500 mb-1.5 font-medium">Quality Preset</div>
                <div className="font-bold text-gray-900">{channel.quality_preset}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="text-xs text-gray-500 mb-1.5 font-medium">Input Type</div>
                <div className="font-bold text-gray-900 capitalize">{channel.input_type}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="text-xs text-gray-500 mb-1.5 font-medium">Auto-restart</div>
                <div className={`font-bold flex items-center gap-1.5 ${channel.auto_restart ? 'text-green-600' : 'text-gray-400'}`}>
                  {channel.auto_restart ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {channel.auto_restart ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              {isAdmin && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 mb-1.5 font-medium">User ID</div>
                  <div className="font-bold text-gray-900 font-mono">#{channel.user_id}</div>
                </div>
              )}
              {isAdmin && channel.process_id && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 mb-1.5 font-medium">Process ID</div>
                  <div className="font-bold text-gray-900 font-mono">{channel.process_id}</div>
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
          <div className="p-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Enable Watermark</h4>
                <p className="text-sm text-gray-600">
                  {channel.watermark_enabled ? 'Watermark is enabled for this channel' : 'Watermark is disabled for this channel'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={channel.watermark_enabled || false}
                  onChange={async (e) => {
                    try {
                      await api.put(`/channels/${channel.id}`, {
                        watermark_enabled: e.target.checked ? 1 : 0
                      });
                      onUpdate();
                    } catch (error) {
                      alert(error.response?.data?.error || 'Failed to update watermark setting');
                    }
                  }}
                  disabled={channel.status === 'running'}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {channel.status === 'running' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Stop the stream to change watermark settings
                </p>
              </div>
            )}
          </div>
        );

      case 'logs':
        return (
          <div className="p-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 max-h-96 overflow-y-auto font-mono text-sm shadow-inner border border-gray-700">
              {logs.length === 0 ? (
                <div className="text-gray-400 text-center p-12 flex flex-col items-center gap-3">
                  <FileText className="w-12 h-12 text-gray-600" />
                  <div className="text-base font-semibold">No logs available</div>
                  <div className="text-xs text-gray-500">Stream logs will appear here when available</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const borderColor = log.log_type === 'error' ? 'border-red-500' :
                                       log.log_type === 'warning' ? 'border-yellow-400' :
                                       log.log_type === 'info' ? 'border-blue-400' : 'border-gray-500';
                    const bgColor = log.log_type === 'error' ? 'bg-red-500/10' :
                                   log.log_type === 'warning' ? 'bg-yellow-400/10' :
                                   log.log_type === 'info' ? 'bg-blue-400/10' : 'bg-gray-500/10';
                    const textColor = log.log_type === 'error' ? 'text-red-400' :
                                     log.log_type === 'warning' ? 'text-yellow-300' :
                                     log.log_type === 'info' ? 'text-blue-300' : 'text-gray-300';
                    const badgeColor = log.log_type === 'error' ? 'bg-red-600 text-white' :
                                      log.log_type === 'warning' ? 'bg-yellow-500 text-gray-900' :
                                      log.log_type === 'info' ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white';

                    return (
                      <div
                        key={log.id}
                        className={`p-3 border-l-4 ${borderColor} ${bgColor} rounded-r-md`}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>
                            {log.log_type.toUpperCase()}
                          </span>
                        </div>
                        <div className={`${textColor} text-sm leading-relaxed`}>
                          {log.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="mb-6 overflow-hidden border hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] bg-white">
      {/* Status Strip */}
      <div className={`h-1.5 w-full ${
        channel.status === 'running' ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600' :
        channel.status === 'error' ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600' :
        'bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600'
      }`} />

      {/* Compact Header */}
      <CardHeader className="pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`p-1.5 rounded-lg ${
                channel.status === 'running' ? 'bg-green-100' :
                channel.status === 'error' ? 'bg-red-100' :
                'bg-gray-100'
              }`}>
                <Video className={`w-4 h-4 ${
                  channel.status === 'running' ? 'text-green-600' :
                  channel.status === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 truncate">{channel.name}</h2>
            </div>
            {channel.description && (
              <p className="text-sm text-gray-600 line-clamp-2 ml-10">{channel.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            {channel.status === 'running' && runtime > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-semibold">
                ⏱ {formatRuntime(runtime)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Compact Action Buttons */}
      <CardContent className="pt-0 pb-4 px-6">
        <div className="flex gap-2 flex-wrap">
          {channel.status !== 'running' ? (
            <Button
              onClick={handleStart}
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-sm gap-2"
              size="sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{loading ? 'Starting...' : 'Start Stream'}</span>
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={handleStop}
                disabled={loading}
                className="font-semibold shadow-sm gap-2"
                size="sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                <span>{loading ? 'Stopping...' : 'Stop'}</span>
              </Button>
              <Button
                onClick={handleRestart}
                disabled={loading}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-sm gap-2"
                size="sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                <span>{loading ? 'Restarting...' : 'Restart'}</span>
              </Button>
            </>
          )}
          {channel.status !== 'running' && (
            <Button
              variant="outline"
              onClick={() => onEdit(channel)}
              className="ml-auto gap-2 font-medium"
              size="sm"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={loading || channel.status === 'running'}
            className={`gap-2 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ${channel.status === 'running' ? 'ml-auto opacity-50' : ''}`}
            size="sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </Button>
        </div>
      </CardContent>

      {/* Modern Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-t border-gray-200">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-b from-gray-50 to-white h-auto p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex flex-col sm:flex-row items-center gap-1.5 py-2.5 text-xs sm:text-sm font-medium"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="platforms"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex flex-col sm:flex-row items-center gap-1.5 py-2.5 text-xs sm:text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Platforms</span>
              <span className="sm:hidden">Multi</span>
            </TabsTrigger>
            <TabsTrigger
              value="watermark"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex flex-col sm:flex-row items-center gap-1.5 py-2.5 text-xs sm:text-sm font-medium"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Watermark</span>
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex flex-col sm:flex-row items-center gap-1.5 py-2.5 text-xs sm:text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="m-0 border-t">
          {renderTabContent()}
        </TabsContent>

        <TabsContent value="platforms" className="m-0 border-t">
          {renderTabContent()}
        </TabsContent>

        <TabsContent value="watermark" className="m-0 border-t">
          {renderTabContent()}
        </TabsContent>

        <TabsContent value="logs" className="m-0 border-t">
          {renderTabContent()}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

export default ChannelCard;
