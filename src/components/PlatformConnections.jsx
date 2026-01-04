import React, { useState, useEffect } from 'react';
import api from '../services/api';

function PlatformConnections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await api.get('/platforms/connections');
      setConnections(response.data.connections || []);
    } catch (error) {
      console.error('Failed to fetch platform connections:', error);
      setMessage('Failed to load platform connections');
    } finally {
      setLoading(false);
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
          if (popup.closed) {
            clearInterval(pollTimer);
            setConnecting(null);
            fetchConnections();
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
    const icons = {
      facebook: '📘',
      youtube: '📺',
      twitch: '🎮',
    };
    return icons[platform] || '🔗';
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

      <div style={{ display: 'grid', gap: '1rem' }}>
        {['facebook', 'youtube', 'twitch'].map((platform) => {
          const connection = connections.find((c) => c.platform === platform);
          const isConnected = !!connection;

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
                    fontSize: '2rem',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: getPlatformColor(platform) + '20',
                    borderRadius: '8px',
                  }}
                >
                  {getPlatformIcon(platform)}
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
                      <p style={{ margin: '0.25rem 0 0 0', color: '#2ecc71', fontSize: '0.9rem' }}>
                        ✓ Connected as {connection.platform_user_name || connection.platform_user_email}
                      </p>
                      {connection.platform_channel_name && (
                        <p style={{ margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.85rem' }}>
                          Channel: {connection.platform_channel_name}
                        </p>
                      )}
                      {connection.is_expired && (
                        <p style={{ margin: '0.25rem 0 0 0', color: '#e74c3c', fontSize: '0.85rem' }}>
                          ⚠ Token expired - reconnect required
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
