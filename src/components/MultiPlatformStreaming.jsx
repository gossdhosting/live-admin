import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

function MultiPlatformStreaming({ channelId, channelName, streamTitle, streamDescription, channelStatus }) {
  const [platformConnections, setPlatformConnections] = useState([]);
  const [rtmpTemplates, setRtmpTemplates] = useState([]);
  const [rtmpDestinations, setRtmpDestinations] = useState([]);
  const [platformStreams, setPlatformStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [channelId]);

  const fetchAll = async () => {
    try {
      const [connectionsRes, templatesRes, destinationsRes, streamsRes] = await Promise.all([
        api.get('/platforms/connections'),
        api.get('/rtmp/templates?enabled=true'),
        api.get(`/channels/${channelId}/rtmp`),
        api.get(`/platforms/streams/${channelId}`),
      ]);

      setPlatformConnections(connectionsRes.data.connections || []);
      setRtmpTemplates(templatesRes.data.templates || []);
      setRtmpDestinations(destinationsRes.data.destinations || []);
      setPlatformStreams(streamsRes.data.streams || []);
    } catch (error) {
      console.error('Failed to fetch multi-platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlatformStream = async (platform, connectionId) => {
    setCreating(platform);

    try {
      let response;
      const title = streamTitle || channelName || 'Live Stream';
      const description = streamDescription || '';

      if (platform === 'facebook') {
        const pagesRes = await api.get('/platforms/facebook/pages');
        const pages = pagesRes.data.pages;

        if (pages.length === 0) {
          alert('No Facebook pages found. Please ensure your account has pages with publishing permissions.');
          setCreating(null);
          return;
        }

        const page = pages[0];
        response = await api.post('/platforms/facebook/create-stream', {
          channelId,
          pageId: page.id,
          pageAccessToken: page.access_token,
          title,
          description,
        });
      } else if (platform === 'youtube') {
        response = await api.post('/platforms/youtube/create-broadcast', {
          channelId,
          title,
          description,
        });
      } else if (platform === 'twitch') {
        response = await api.post('/platforms/twitch/setup-stream', {
          channelId,
          title,
        });
      }

      if (response?.data?.success) {
        alert(`${platform} stream created successfully!`);
        fetchAll();
      }
    } catch (error) {
      console.error(`Failed to create ${platform} stream:`, error);
      alert(error.response?.data?.error || `Failed to create ${platform} stream`);
    } finally {
      setCreating(null);
    }
  };

  const handleDeletePlatformStream = async (streamId) => {
    if (!window.confirm('Delete this platform stream?')) return;

    try {
      await api.delete(`/platforms/streams/${streamId}`);
      fetchAll();
    } catch (error) {
      alert('Failed to delete stream');
    }
  };

  const handleToggleTemplate = async (templateId, currentlyEnabled) => {
    try {
      const enabled = !currentlyEnabled;
      await api.post(`/channels/${channelId}/rtmp/template/${templateId}/toggle`, { enabled });
      fetchAll();
    } catch (error) {
      console.error('Failed to toggle template:', error);
      alert(error.response?.data?.error || 'Failed to toggle template');
    }
  };

  const handleRemoveDestination = async (destinationId) => {
    if (!window.confirm('Remove this RTMP destination?')) return;

    try {
      await api.delete(`/rtmp/${destinationId}`);
      fetchAll();
    } catch (error) {
      alert('Failed to remove destination');
    }
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      facebook: '📘',
      youtube: '📺',
      twitch: '🎮',
      custom: '🔧',
    };
    return icons[platform] || '🔗';
  };

  const getPlatformColor = (platform) => {
    const colors = {
      facebook: 'bg-blue-600 hover:bg-blue-700',
      youtube: 'bg-red-600 hover:bg-red-700',
      twitch: 'bg-purple-600 hover:bg-purple-700',
      custom: 'bg-gray-600 hover:bg-gray-700',
    };
    return colors[platform] || 'bg-gray-600 hover:bg-gray-700';
  };

  const getPlatformBorder = (platform) => {
    const borders = {
      facebook: 'border-blue-200',
      youtube: 'border-red-200',
      twitch: 'border-purple-200',
      custom: 'border-gray-200',
    };
    return borders[platform] || 'border-gray-200';
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="mt-0 mb-4 text-lg font-semibold">
        Multi-Platform Streaming
      </h3>

      {/* OAuth Platform Connections */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-600 mb-3 font-medium">
          Connected Platforms (OAuth)
        </h4>

        {platformConnections.length === 0 ? (
          <p className="text-gray-500 text-sm m-0">
            No platforms connected. Go to Settings → Platforms to connect your accounts.
          </p>
        ) : (
          <div className="grid gap-3">
            {platformConnections.map((conn) => {
              const existingStream = platformStreams.find(
                (s) => s.platform === conn.platform && s.platform_connection_id === conn.id
              );

              return (
                <div
                  key={conn.id}
                  className={`flex items-center justify-between p-4 bg-white rounded-md border ${getPlatformBorder(conn.platform)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getPlatformIcon(conn.platform)}</span>
                    <div>
                      <div className="font-semibold capitalize">
                        {conn.platform}
                      </div>
                      <div className="text-sm text-gray-500">
                        {conn.platform_channel_name || conn.platform_user_name}
                      </div>
                    </div>
                  </div>

                  <div>
                    {existingStream ? (
                      <div className="flex items-center gap-2">
                        {channelStatus === 'running' ? (
                          <Badge variant="success" className="font-semibold">
                            🟢 Live - Broadcasting
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            ✓ Stream Created
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeletePlatformStream(existingStream.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : channelStatus === 'stopped' ? (
                      <Button
                        onClick={() => handleCreatePlatformStream(conn.platform, conn.id)}
                        disabled={creating === conn.platform}
                        className={getPlatformColor(conn.platform)}
                      >
                        {creating === conn.platform ? 'Going Live...' : '🔴 Go Live'}
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Stop stream to enable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom RTMP Templates */}
      <div>
        <h4 className="text-sm text-gray-600 mb-3 font-medium">
          Custom RTMP Destinations
        </h4>

        {rtmpTemplates.length === 0 ? (
          <p className="text-gray-500 text-sm m-0">
            No custom RTMP templates. Go to Settings → RTMP to create custom destinations.
          </p>
        ) : (
          <div className="grid gap-3">
            {rtmpTemplates.map((template) => {
              const activeDestination = rtmpDestinations.find(
                (dest) => dest.template_id === template.id && dest.enabled === 1
              );

              return (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-4 bg-white rounded-md border ${activeDestination ? getPlatformBorder(template.platform) : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔧</span>
                    <div>
                      <div className="font-semibold">{template.name}</div>
                      <div className="text-sm text-gray-500 break-all">
                        {template.rtmp_url}
                      </div>
                    </div>
                  </div>

                  <div>
                    {activeDestination ? (
                      <div className="flex items-center gap-2">
                        {channelStatus === 'running' ? (
                          <Badge variant="success" className="font-semibold">
                            🟢 Live - Broadcasting
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            ✓ Enabled
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveDestination(activeDestination.id)}
                        >
                          Disable
                        </Button>
                      </div>
                    ) : channelStatus === 'stopped' ? (
                      <Button
                        onClick={() => handleToggleTemplate(template.id, false)}
                        className={getPlatformColor(template.platform)}
                      >
                        🔴 Go Live
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Stop stream to enable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Alert className="mt-4 bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-900">
          <strong>💡 Tip:</strong> OAuth platforms automatically manage stream keys. Custom RTMP
          destinations require manual configuration.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default MultiPlatformStreaming;
