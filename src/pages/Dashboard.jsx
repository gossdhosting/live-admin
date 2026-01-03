import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ChannelCard from '../components/ChannelCard';
import CreateChannelModal from '../components/CreateChannelModal';

function Dashboard() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [serverStats, setServerStats] = useState(null);

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

    fetchChannels();
    fetchServerStats();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchChannels(true);
      fetchServerStats();
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
      {/* Server Stats Section */}
      {serverStats && (
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + Create Channel
            </button>
          </div>
        </div>

        {channels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
            <p>No channels yet. Create your first channel to get started.</p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>{stats.total}</div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Total</div>
              </div>
              <div style={{
                backgroundColor: '#e8f5e9',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388e3c' }}>{stats.running}</div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Running</div>
              </div>
              <div style={{
                backgroundColor: '#c8e6c9',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                border: '2px solid #66bb6a'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2e7d32' }}>✓ {stats.healthy}</div>
                <div style={{ fontSize: '0.85rem', color: '#2e7d32' }}>Healthy</div>
              </div>
              <div style={{
                backgroundColor: '#fff9c4',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                border: '2px solid #fdd835'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57f17' }}>⚠️ {stats.warnings}</div>
                <div style={{ fontSize: '0.85rem', color: '#f57f17' }}>Warnings</div>
              </div>
              <div style={{
                backgroundColor: '#ffebee',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d32f2f' }}>{stats.stopped}</div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Stopped</div>
              </div>
              <div style={{
                backgroundColor: '#ffcdd2',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                border: '2px solid #ef5350'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c62828' }}>❌ {stats.error}</div>
                <div style={{ fontSize: '0.85rem', color: '#c62828' }}>Errors</div>
              </div>
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: '#95a5a6',
              textAlign: 'right',
              marginTop: '0.5rem'
            }}>
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
        />
      ))}

      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchChannels}
        />
      )}
    </div>
  );
}

export default Dashboard;
