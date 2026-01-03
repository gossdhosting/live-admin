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

  useEffect(() => {
    fetchChannels();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchChannels(true);
    }, 5000);
    return () => clearInterval(interval);
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
    return { total, running, stopped, error };
  };

  if (loading) {
    return <div className="loading">Loading channels...</div>;
  }

  const stats = getStats();

  return (
    <div className="container">
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Total Channels</div>
              </div>
              <div style={{
                backgroundColor: '#e8f5e9',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388e3c' }}>{stats.running}</div>
                <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Running</div>
              </div>
              <div style={{
                backgroundColor: '#ffebee',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d32f2f' }}>{stats.stopped}</div>
                <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Stopped</div>
              </div>
              <div style={{
                backgroundColor: '#fff3e0',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>{stats.error}</div>
                <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Errors</div>
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
