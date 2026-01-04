import React, { useState, useEffect } from 'react';
import api from '../services/api';

function MultiPlatformStreaming({ channelId, channelName, streamTitle, streamDescription, channelStatus }) {
  const [platformConnections, setPlatformConnections] = useState([]);
  const [rtmpTemplates, setRtmpTemplates] = useState([]);
  const [platformStreams, setPlatformStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [channelId]);

  const fetchAll = async () => {
    try {
      const [connectionsRes, templatesRes, streamsRes] = await Promise.all([
        api.get('/platforms/connections'),
        api.get('/rtmp/templates?enabled=true'), // Only fetch enabled templates
        api.get(`/platforms/streams/${channelId}`),
      ]);

      console.log('Platform connections:', connectionsRes.data.connections);
      console.log('RTMP templates:', templatesRes.data.templates);
      console.log('Platform streams:', streamsRes.data.streams);

      setPlatformConnections(connectionsRes.data.connections || []);
      setRtmpTemplates(templatesRes.data.templates || []);
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
        // For Facebook, we need to select a page first
        const pagesRes = await api.get('/platforms/facebook/pages');
        const pages = pagesRes.data.pages;

        if (pages.length === 0) {
          alert('No Facebook pages found. Please ensure your account has pages with publishing permissions.');
          setCreating(null);
          return;
        }

        // Use first page (or could show selection UI)
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

  const handleToggleTemplate = async (templateId, currentEnabled) => {
    try {
      // This would enable/disable the template for this channel
      // You'll need to implement this endpoint
      alert('Template toggle - to be implemented');
    } catch (error) {
      alert('Failed to toggle template');
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
      facebook: '#1877f2',
      youtube: '#ff0000',
      twitch: '#9146ff',
      custom: '#6c757d',
    };
    return colors[platform] || '#6c757d';
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>
        Multi-Platform Streaming
      </h3>

      {/* OAuth Platform Connections */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.95rem', color: '#6c757d', marginBottom: '0.75rem' }}>
          Connected Platforms (OAuth)
        </h4>

        {platformConnections.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '0.9rem', margin: 0 }}>
            No platforms connected. Go to Settings → Platforms to connect your accounts.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {platformConnections.map((conn) => {
              const existingStream = platformStreams.find(
                (s) => s.platform === conn.platform && s.platform_connection_id === conn.id
              );

              return (
                <div
                  key={conn.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fff',
                    borderRadius: '6px',
                    border: `1px solid ${getPlatformColor(conn.platform)}33`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{getPlatformIcon(conn.platform)}</span>
                    <div>
                      <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                        {conn.platform}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                        {conn.platform_channel_name || conn.platform_user_name}
                      </div>
                    </div>
                  </div>

                  <div>
                    {existingStream ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {channelStatus === 'running' ? (
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#d4edda',
                              color: '#155724',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                            }}
                          >
                            🟢 Live - Broadcasting
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                            }}
                          >
                            ✓ Stream Created
                          </span>
                        )}
                        <button
                          onClick={() => handleDeletePlatformStream(existingStream.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCreatePlatformStream(conn.platform, conn.id)}
                        disabled={creating === conn.platform}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: getPlatformColor(conn.platform),
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: creating === conn.platform ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          opacity: creating === conn.platform ? 0.6 : 1,
                        }}
                      >
                        {creating === conn.platform ? 'Creating...' : 'Create Stream'}
                      </button>
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
        <h4 style={{ fontSize: '0.95rem', color: '#6c757d', marginBottom: '0.75rem' }}>
          Custom RTMP Destinations
        </h4>

        {rtmpTemplates.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '0.9rem', margin: 0 }}>
            No custom RTMP templates. Go to Settings → RTMP to create custom destinations.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {rtmpTemplates.map((template) => (
              <div
                key={template.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fff',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔧</span>
                  <div>
                    <div style={{ fontWeight: '600' }}>{template.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                      {template.rtmp_url}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#6c757d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#e7f3ff',
          borderLeft: '3px solid #2196f3',
          fontSize: '0.85rem',
          color: '#1976d2',
        }}
      >
        <strong>💡 Tip:</strong> OAuth platforms automatically manage stream keys. Custom RTMP
        destinations require manual configuration.
      </div>
    </div>
  );
}

export default MultiPlatformStreaming;
