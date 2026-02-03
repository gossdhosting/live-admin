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
    };
    return iconMap[platform] || Radio;
  };

  const getPlatformColor = (platform) => {
    const colors = {
      facebook: '#1877f2',
      youtube: '#ff0000',
      twitch: '#9146ff',
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
        Connect your Facebook, YouTube, and Twitch accounts to stream directly to these platforms.
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

      <div className="grid gap-4">
        {['facebook', 'youtube', 'twitch'].map((platform) => {
          const connection = connections.find((c) => c.platform === platform);
          const isConnected = !!connection;
          const PlatformIcon = getPlatformIcon(platform);

          return (
            <div
              key={platform}
              className="border border-gray-200 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              style={{ backgroundColor: isConnected ? '#f9f9f9' : '#fff' }}
            >
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ backgroundColor: getPlatformColor(platform) + '20' }}
                >
                  <PlatformIcon className="w-6 h-6 sm:w-8 sm:h-8" color={getPlatformColor(platform)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-semibold capitalize m-0">
                    {platform}
                  </h4>
                  {isConnected ? (
                    <div>
                      <p className="mt-1 mb-0 text-green-500 text-sm flex items-center gap-1.5 flex-wrap">
                        <CheckCircle size={16} className="flex-shrink-0" />
                        <span className="break-words">Connected as {platform === 'facebook' && connection.platform_page_name
                          ? connection.platform_page_name
                          : (connection.platform_user_name || connection.platform_user_email)}</span>
                      </p>
                      {(platform === 'facebook' && facebookPages.length > 0) && (
                        <div className="mt-2">
                          <label className="block text-xs sm:text-sm text-gray-500 mb-1">
                            Select Page:
                          </label>
                          <select
                            value={selectedFacebookPage || ''}
                            onChange={handlePageChange}
                            disabled={loadingPages}
                            className="w-full sm:w-auto px-2 py-1.5 text-sm border border-gray-200 rounded bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {facebookPages.map(page => (
                              <option key={page.id} value={page.id}>
                                {page.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {(platform !== 'facebook' && connection.platform_channel_name) && (
                        <p className="mt-1 mb-0 text-gray-500 text-xs sm:text-sm">
                          Channel: {connection.platform_channel_name}
                        </p>
                      )}
                      {connection.is_expired && (
                        <p className="mt-1 mb-0 text-red-500 text-xs sm:text-sm flex items-center gap-1.5">
                          <AlertTriangle size={16} className="flex-shrink-0" />
                          Token expired - reconnect required
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 mb-0 text-gray-500 text-sm">
                      Not connected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 self-stretch sm:self-center">
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(connection.id, platform)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white border-none rounded cursor-pointer text-sm font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={connecting === platform}
                    className="w-full sm:w-auto px-4 py-2 text-white border-none rounded text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: getPlatformColor(platform) }}
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
