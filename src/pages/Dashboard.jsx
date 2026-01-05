import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ChannelCard from '../components/ChannelCard';
import CreateChannelModal from '../components/CreateChannelModal';
import EditChannelModal from '../components/EditChannelModal';
import UpgradePrompt from '../components/UpgradePrompt';
import { Button } from '../components/ui/button';

function Dashboard({ user }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [serverStats, setServerStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchChannels = async (silent = false) => {
      try {
        if (!silent && isMounted) setRefreshing(true);
        const response = await api.get('/channels');
        if (isMounted) {
          setChannels(response.data.channels);
          setLastUpdate(new Date());
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch channels:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const fetchServerStats = async () => {
      try {
        const response = await api.get('/server-stats');
        if (isMounted) {
          setServerStats(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch server stats:', error);
        }
      }
    };

    const fetchUserStats = async () => {
      try {
        const response = await api.get('/users/stats');
        if (isMounted) {
          setUserStats(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch user stats:', error);
        }
      }
    };

    fetchChannels();
    fetchServerStats();
    fetchUserStats();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchChannels(true);
      fetchServerStats();
      fetchUserStats();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const fetchChannels = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const response = await api.get('/channels');
      setChannels(response.data.channels);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChannelDeleted = (id) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel);
    setShowEditModal(true);
  };

  const handleRefresh = () => {
    fetchChannels();
  };

  const getStats = () => {
    const total = channels.length;
    const running = channels.filter(ch => ch.status === 'running').length;
    const stopped = channels.filter(ch => ch.status === 'stopped').length;
    const error = channels.filter(ch => ch.status === 'error').length;

    // Health stats for running streams
    const healthy = channels.filter(ch =>
      ch.status === 'running' &&
      ch.runtime_status?.healthMetrics?.status === 'healthy'
    ).length;

    const warnings = channels.filter(ch =>
      ch.status === 'running' &&
      (ch.runtime_status?.errorCount > 0 || ch.runtime_status?.reconnectAttempts > 0)
    ).length;

    return { total, running, stopped, error, healthy, warnings };
  };

  if (loading) {
    return <div className="loading">Loading channels...</div>;
  }

  const stats = getStats();

  return (
    <div className="container">
      {/* Plan & Usage Stats Section (for users) */}
      {user && user.role !== 'admin' && userStats && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Your Plan & Usage</h2>
            <div style={{ fontSize: '0.85rem', color: '#95a5a6' }}>
              {userStats.plan?.name} Plan
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1rem'
          }}>
            {/* Concurrent Streams */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Concurrent Streams</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {stats.running} / {userStats.limits.max_concurrent_streams}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {userStats.limits.max_concurrent_streams - stats.running} available
              </div>
              <div style={{
                marginTop: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                height: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'white',
                  height: '100%',
                  width: `${Math.min(100, (stats.running / userStats.limits.max_concurrent_streams) * 100)}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Max Quality/Bitrate */}
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Max Quality</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {userStats.limits.max_bitrate >= 6000 ? '1080p' : userStats.limits.max_bitrate >= 4000 ? '720p' : '480p'}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {userStats.limits.max_bitrate}k bitrate
              </div>
            </div>

            {/* Storage */}
            <div style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Storage</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {userStats?.usage?.storage_mb || 0} MB
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {userStats.limits.storage_limit_mb} MB limit
              </div>
              <div style={{
                marginTop: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                height: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'white',
                  height: '100%',
                  width: `${Math.min(100, ((userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb) * 100)}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Stream Duration */}
            <div style={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Stream Duration</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {userStats.limits.max_stream_duration || '∞'}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {userStats.limits.max_stream_duration ? `${userStats.limits.max_stream_duration} min max` : 'Unlimited'}
              </div>
            </div>
          </div>
          {userStats?.canCreate && !userStats.canCreate.stream && (
            <UpgradePrompt
              currentPlan={userStats.plan?.name}
              requiredPlan={userStats.plan?.name === 'Free' ? 'Basic' : userStats.plan?.name === 'Basic' ? 'Pro' : 'Enterprise'}
              currentLimit={`${userStats.limits.max_concurrent_streams} concurrent ${userStats.limits.max_concurrent_streams === 1 ? 'stream' : 'streams'}`}
              requiredLimit={userStats.plan?.name === 'Free' ? '3 concurrent streams' : userStats.plan?.name === 'Basic' ? '10 concurrent streams' : '50 concurrent streams'}
              style={{ margin: '1rem' }}
            />
          )}

          {/* Storage limit warning (80% used) */}
          {userStats && (userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb > 0.8 && (
            <div style={{
              margin: '1rem',
              padding: '1rem',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              color: '#856404'
            }}>
              ⚠️ You're using {Math.round((userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb * 100)}% of your storage limit.
              {(userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb > 0.95 && ' Uploads may fail soon.'}
            </div>
          )}

          {/* Show upgrade prompt if storage near limit */}
          {userStats && (userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb > 0.9 && (
            <UpgradePrompt
              currentPlan={userStats.plan?.name}
              requiredPlan={userStats.plan?.name === 'Free' ? 'Basic' : userStats.plan?.name === 'Basic' ? 'Pro' : 'Enterprise'}
              currentLimit={`${userStats.limits.storage_limit_mb} MB storage`}
              requiredLimit={userStats.plan?.name === 'Free' ? '5 GB storage' : userStats.plan?.name === 'Basic' ? '50 GB storage' : '200 GB storage'}
              style={{ margin: '1rem' }}
            />
          )}

          {/* Show upgrade prompt for duration limit (Free plan only) */}
          {userStats && userStats.plan?.name === 'Free' && userStats.limits.max_stream_duration && (
            <div style={{
              margin: '1rem',
              padding: '0.75rem 1rem',
              background: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '8px',
              color: '#1565c0',
              fontSize: '0.9rem'
            }}>
              ℹ️ Your streams will auto-stop after {userStats.limits.max_stream_duration} minutes. Upgrade to Basic or higher for unlimited streaming.
            </div>
          )}

          {/* Show upgrade prompt for quality limit */}
          {userStats && userStats.limits.max_bitrate < 6000 && (
            <div style={{
              margin: '1rem',
              padding: '0.75rem 1rem',
              background: '#f3e5f5',
              border: '1px solid #9c27b0',
              borderRadius: '8px',
              color: '#6a1b9a',
              fontSize: '0.9rem'
            }}>
              ℹ️ Your plan supports up to {userStats.limits.max_bitrate >= 4000 ? '720p' : '480p'} quality.
              {userStats.limits.max_bitrate < 6000 && ' Upgrade to Pro for 1080p streaming!'}
            </div>
          )}
        </div>
      )}

      {/* Server Stats Section (for admins) */}
      {user && user.role === 'admin' && serverStats && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Server Status</h2>
            <div style={{ fontSize: '0.85rem', color: '#95a5a6' }}>
              {serverStats.system.hostname} • {serverStats.system.osDistro} • Uptime: {serverStats.system.uptimeFormatted}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1rem'
          }}>
            {/* CPU Card */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>CPU Usage</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {serverStats.cpu.usage}%
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {serverStats.cpu.cores} Cores
                {serverStats.cpu.temperature && ` • ${serverStats.cpu.temperature}°C`}
              </div>
              <div style={{
                marginTop: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                height: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'white',
                  height: '100%',
                  width: `${Math.min(100, serverStats.cpu.usage)}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* RAM Card */}
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>RAM Usage</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {serverStats.memory.usedPercent}%
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {serverStats.memory.usedGB} GB / {serverStats.memory.totalGB} GB
              </div>
              <div style={{
                marginTop: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                height: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'white',
                  height: '100%',
                  width: `${serverStats.memory.usedPercent}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Disk Card */}
            {serverStats.disk && (
              <div style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                padding: '1.5rem',
                borderRadius: '12px',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Disk Usage</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {serverStats.disk.usedPercent}%
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {serverStats.disk.usedGB} GB / {serverStats.disk.totalGB} GB
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  height: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: 'white',
                    height: '100%',
                    width: `${serverStats.disk.usedPercent}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Network Card */}
            {serverStats.network && (
              <div style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                padding: '1.5rem',
                borderRadius: '12px',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Network</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  ↓ {(serverStats.network.rx_sec / 1024 / 1024).toFixed(2)} MB/s
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  ↑ {(serverStats.network.tx_sec / 1024 / 1024).toFixed(2)} MB/s
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {serverStats.network.interface}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Live Channels</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              + Create Channel
            </Button>
          </div>
        </div>

        {channels.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p>No channels yet. Create your first channel to get started.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-700">{stats.running}</div>
                <div className="text-sm text-gray-500">Running</div>
              </div>
              <div className="bg-green-100 p-4 rounded-lg text-center border-2 border-green-400">
                <div className="text-3xl font-bold text-green-800">✓ {stats.healthy}</div>
                <div className="text-sm text-green-800">Healthy</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center border-2 border-yellow-400">
                <div className="text-3xl font-bold text-yellow-700">⚠️ {stats.warnings}</div>
                <div className="text-sm text-yellow-700">Warnings</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">{stats.stopped}</div>
                <div className="text-sm text-gray-500">Stopped</div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center border-2 border-red-400">
                <div className="text-3xl font-bold text-red-800">❌ {stats.error}</div>
                <div className="text-sm text-red-800">Errors</div>
              </div>
            </div>
            <div className="text-sm text-gray-400 text-right mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh: Every 5s
            </div>
          </>
        )}
      </div>

      {channels.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          onUpdate={fetchChannels}
          onDelete={handleChannelDeleted}
          onEdit={handleEditChannel}
          user={user}
        />
      ))}

      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchChannels}
        />
      )}

      {showEditModal && editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          onClose={() => {
            setShowEditModal(false);
            setEditingChannel(null);
          }}
          onSuccess={fetchChannels}
        />
      )}
    </div>
  );
}

export default Dashboard;
