import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Facebook, Youtube, Twitch, Radio, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

function PlatformConnections() {
  const [connections, setConnections] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [connecting, setConnecting] = useState(null);
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedFacebookPage, setSelectedFacebookPage] = useState(null);
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const [connectionsRes, statsRes] = await Promise.all([
        api.get('/platforms/connections'),
        api.get('/users/stats'),
      ]);
      setConnections(connectionsRes.data.connections || []);
      setUserStats(statsRes.data);

      // If Facebook is connected, fetch available pages
      const fbConnection = connectionsRes.data.connections.find(c => c.platform === 'facebook');
      if (fbConnection) {
        fetchFacebookPages();
      }
    } catch (error) {
      console.error('Failed to fetch platform connections:', error);
      setMessage('Failed to load platform connections');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacebookPages = async () => {
    setLoadingPages(true);
    try {
      const response = await api.get('/platforms/facebook/pages');
      setFacebookPages(response.data.pages || []);
      setSelectedFacebookPage(response.data.selectedPageId);
    } catch (error) {
      console.error('Failed to fetch Facebook pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const handlePageChange = async (e) => {
    const pageId = e.target.value;
    setLoadingPages(true);
    try {
      await api.put('/platforms/facebook/select-page', { pageId });
      setSelectedFacebookPage(pageId);
      setMessage('Facebook page updated successfully');
      fetchConnections(); // Refresh to show updated page name
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update Facebook page:', error);
      setMessage('Failed to update Facebook page');
    } finally {
      setLoadingPages(false);
    }
  };

  const handleConnect = async (platform) => {
    setConnecting(platform);
    setMessage('');

    try {
      const response = await api.get(`/platforms/auth/${platform}`);

      if (response.data.authUrl) {
        // Open OAuth flow in popup window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          response.data.authUrl,
          `Connect ${platform}`,
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for popup close
        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              setConnecting(null);
              fetchConnections();
            }
          } catch (e) {
            // Ignore CORS errors when checking popup.closed
            // This happens when popup navigates to OAuth provider
          }
        }, 500);
      }
    } catch (error) {
      console.error(`Failed to initiate ${platform} connection:`, error);
      setMessage(`Failed to connect to ${platform}`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (connectionId, platform) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${platform} account?`)) {
      return;
    }

    try {
      await api.delete(`/platforms/connections/${connectionId}`);
      setMessage(`${platform} account disconnected successfully`);
      fetchConnections();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setMessage('Failed to disconnect account');
    }
  };

  const getPlatformIcon = (platform) => {
    const iconMap = {
      facebook: Facebook,
      youtube: Youtube,
      twitch: Twitch,
      kick: Zap,
    };
    return iconMap[platform] || Radio;
  };

  const getPlatformColor = (platform) => {
    const colors = {
      facebook: '#1877f2',
      youtube: '#ff0000',
      twitch: '#9146ff',
      kick: '#53fc18',
    };
    return colors[platform] || '#3498db';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading platform connections...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>
        Platform Connections
      </h3>
      <p style={{ color: '#7f8c8d', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Connect your Facebook, YouTube, Twitch, and Kick accounts to stream directly to these platforms.
      </p>

      {message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: message.includes('Failed') ? '#fee' : '#efe',
            color: message.includes('Failed') ? '#c00' : '#060',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {['facebook', 'youtube', 'twitch', 'kick'].map((platform) => {
          const connection = connections.find((c) => c.platform === platform);
          const isConnected = !!connection;
          const PlatformIcon = getPlatformIcon(platform);

          return (
            <div
              key={platform}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isConnected ? '#f9f9f9' : '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: getPlatformColor(platform) + '20',
                    borderRadius: '8px',
                  }}
                >
                  <PlatformIcon size={32} color={getPlatformColor(platform)} />
                </div>
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {platform}
                  </h4>
                  {isConnected ? (
                    <div>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#2ecc71', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={16} />
                        Connected as {connection.platform_user_name || connection.platform_user_email}
                      </p>
                      {(platform === 'facebook' && facebookPages.length > 0) && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '0.25rem' }}>
                            Select Page:
                          </label>
                          <select
                            value={selectedFacebookPage || ''}
                            onChange={handlePageChange}
                            disabled={loadingPages}
                            style={{
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.85rem',
                              border: '1px solid #e0e0e0',
                              borderRadius: '4px',
                              backgroundColor: loadingPages ? '#f5f5f5' : '#fff',
                              cursor: loadingPages ? 'not-allowed' : 'pointer',
                              minWidth: '200px'
                            }}
                          >
                            {facebookPages.map(page => (
                              <option key={page.id} value={page.id}>
                                {page.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {(platform === 'facebook' && connection.platform_page_name && facebookPages.length === 0) && (
                        <p style={{ margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.85rem' }}>
                          Page: {connection.platform_page_name}
                        </p>
                      )}
                      {(platform !== 'facebook' && connection.platform_channel_name) && (
                        <p style={{ margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.85rem' }}>
                          Channel: {connection.platform_channel_name}
                        </p>
                      )}
                      {connection.is_expired && (
                        <p style={{ margin: '0.25rem 0 0 0', color: '#e74c3c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={16} />
                          Token expired - reconnect required
                        </p>
                      )}
                    </div>
                  ) : (
                    <p style={{ margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
                      Not connected
                    </p>
                  )}
                </div>
              </div>

              <div>
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(connection.id, platform)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#e74c3c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={connecting === platform}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: getPlatformColor(platform),
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: connecting === platform ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      opacity: connecting === platform ? 0.6 : 1,
                    }}
                  >
                    {connecting === platform ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#6c757d',
        }}
      >
        <strong>Note:</strong> After connecting accounts, you'll be able to create live streams
        directly to these platforms when creating or editing a channel.
      </div>
    </div>
  );
}

export default PlatformConnections;
