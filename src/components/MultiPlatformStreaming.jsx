import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Facebook, Youtube, Twitch, Wrench, Radio, Circle, CheckCircle, Lightbulb, AlertTriangle } from 'lucide-react';

function MultiPlatformStreaming({ channelId, channelName, streamTitle, streamDescription, channelStatus }) {
  const [platformConnections, setPlatformConnections] = useState([]);
  const [rtmpTemplates, setRtmpTemplates] = useState([]);
  const [rtmpDestinations, setRtmpDestinations] = useState([]);
  const [platformStreams, setPlatformStreams] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [channelId]);

  const fetchAll = async () => {
    try {
      const [connectionsRes, templatesRes, destinationsRes, streamsRes, statsRes] = await Promise.all([
        api.get('/platforms/connections'),
        api.get('/rtmp/templates?enabled=true'),
        api.get(`/channels/${channelId}/rtmp`),
        api.get(`/platforms/streams/${channelId}`),
        api.get('/users/stats'),
      ]);

      setPlatformConnections(connectionsRes.data.connections || []);
      setRtmpTemplates(templatesRes.data.templates || []);
      setRtmpDestinations(destinationsRes.data.destinations || []);
      setPlatformStreams(streamsRes.data.streams || []);
      setUserStats(statsRes.data);
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
        const selectedPageId = pagesRes.data.selectedPageId;

        if (pages.length === 0) {
          alert('No Facebook pages found. Please ensure your account has pages with publishing permissions.');
          setCreating(null);
          return;
        }

        // Use the selected page from settings, or fall back to first page
        const page = pages.find(p => p.id === selectedPageId) || pages[0];

        if (!page || !page.access_token) {
          alert('Facebook page access token not found. Please reconnect your Facebook account.');
          setCreating(null);
          return;
        }

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
    const iconMap = {
      facebook: Facebook,
      youtube: Youtube,
      twitch: Twitch,
      custom: Wrench,
    };
    return iconMap[platform] || Radio;
  };

  const getPlatformButtonClass = (platform) => {
    const classes = {
      facebook: 'bg-blue-600 hover:bg-blue-700 text-white',
      youtube: 'bg-red-600 hover:bg-red-700 text-white',
      twitch: 'bg-purple-600 hover:bg-purple-700 text-white',
      custom: 'bg-gray-600 hover:bg-gray-700 text-white',
    };
    return classes[platform] || 'bg-gray-600 hover:bg-gray-700 text-white';
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
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm text-gray-600 font-medium">
            Connected Platforms (OAuth)
          </h4>
          {userStats && (() => {
            const enabledRtmpCount = rtmpDestinations.filter(d => d.enabled === 1).length;
            const totalStreams = platformStreams.length + enabledRtmpCount;
            return (
              <Badge variant={totalStreams >= userStats.limits.max_platform_connections ? 'destructive' : 'secondary'}>
                {totalStreams} / {userStats.limits.max_platform_connections} Streaming
              </Badge>
            );
          })()}
        </div>

        {/* Platform Streaming Limit Warning */}
        {userStats && (() => {
          const enabledRtmpCount = rtmpDestinations.filter(d => d.enabled === 1).length;
          const totalStreams = platformStreams.length + enabledRtmpCount;
          return totalStreams >= userStats.limits.max_platform_connections && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-300">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Streaming Limit Reached!</strong> Your <strong>{userStats.plan?.name}</strong> plan allows streaming to <strong>{userStats.limits.max_platform_connections}</strong> destination{userStats.limits.max_platform_connections === 1 ? '' : 's'} simultaneously (platforms + custom RTMP).
                {userStats.limits.max_platform_connections < 3 && (
                  <span> Remove an active stream or <a href="/plans" className="underline font-semibold">upgrade your plan</a> to stream to more destinations.</span>
                )}
              </AlertDescription>
            </Alert>
          );
        })()}

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

              const PlatformIcon = getPlatformIcon(conn.platform);

              // Check if limit is reached - count both platform streams and enabled RTMP destinations
              // If this platform already has a stream, always allow showing it
              // Otherwise, check if we've reached the limit for new streams
              const enabledRtmpCount = rtmpDestinations.filter(d => d.enabled === 1).length;
              const totalStreams = platformStreams.length + enabledRtmpCount;
              const canGoLive = existingStream || !userStats || totalStreams < userStats.limits.max_platform_connections;

              return (
                <div
                  key={conn.id}
                  className={`flex items-center justify-between p-4 bg-white rounded-md border ${getPlatformBorder(conn.platform)}`}
                >
                  <div className="flex items-center gap-3">
                    <PlatformIcon className="w-8 h-8" />
                    <div>
                      <div className="font-semibold capitalize">
                        {conn.platform}
                      </div>
                      <div className="text-sm text-gray-500">
                        {conn.platform === 'facebook'
                          ? (conn.platform_page_name || conn.platform_user_name)
                          : (conn.platform_channel_name || conn.platform_user_name)
                        }
                      </div>
                    </div>
                  </div>

                  <div>
                    {existingStream ? (
                      <div className="flex items-center gap-2">
                        {channelStatus === 'running' ? (
                          <Badge variant="success" className="font-semibold gap-1.5">
                            <Circle className="w-3 h-3 fill-current" />
                            Live - Broadcasting
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1.5">
                            <CheckCircle className="w-3 h-3" />
                            Stream Created
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
                    ) : channelStatus !== 'running' ? (
                      canGoLive ? (
                        <Button
                          onClick={() => handleCreatePlatformStream(conn.platform, conn.id)}
                          disabled={creating === conn.platform}
                          className={`gap-1.5 ${getPlatformButtonClass(conn.platform)}`}
                          size="sm"
                        >
                          <Circle className="w-3 h-3 fill-current" />
                          {creating === conn.platform ? 'Going Live...' : 'Go Live'}
                        </Button>
                      ) : (
                        <Badge variant="destructive" className="gap-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          Limit Reached
                        </Badge>
                      )
                    ) : (
                      <span className="text-sm text-gray-500">
                        Stop this channel's stream to enable
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

              // Check if limit is reached - count both platform streams and enabled RTMP destinations
              const enabledRtmpCount = rtmpDestinations.filter(d => d.enabled === 1).length;
              const totalStreams = platformStreams.length + enabledRtmpCount;
              const canGoLive = activeDestination || !userStats || totalStreams < userStats.limits.max_platform_connections;

              return (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-4 bg-white rounded-md border ${activeDestination ? getPlatformBorder(template.platform) : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="w-8 h-8" />
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
                          <Badge variant="success" className="font-semibold gap-1.5">
                            <Circle className="w-3 h-3 fill-current" />
                            Live - Broadcasting
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1.5">
                            <CheckCircle className="w-3 h-3" />
                            Enabled
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
                    ) : channelStatus !== 'running' ? (
                      canGoLive ? (
                        <Button
                          onClick={() => handleToggleTemplate(template.id, false)}
                          className={`gap-1.5 ${getPlatformButtonClass(template.platform)}`}
                          size="sm"
                        >
                          <Circle className="w-3 h-3 fill-current" />
                          Go Live
                        </Button>
                      ) : (
                        <Badge variant="destructive" className="gap-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          Limit Reached
                        </Badge>
                      )
                    ) : (
                      <span className="text-sm text-gray-500">
                        Stop this channel's stream to enable
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
        <AlertDescription className="text-blue-900 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div><strong>Tip:</strong> OAuth platforms automatically manage stream keys. Custom RTMP destinations require manual configuration.</div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default MultiPlatformStreaming;
