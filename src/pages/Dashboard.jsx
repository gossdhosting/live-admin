import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ChannelCard from '../components/ChannelCard';
import CreateChannelModal from '../components/CreateChannelModal';

function Dashboard() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchChannels();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchChannels, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await api.get('/channels');
      setChannels(response.data.channels);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelDeleted = (id) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
  };

  if (loading) {
    return <div className="loading">Loading channels...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>Live Channels</h2>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Channel
          </button>
        </div>

        {channels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
            <p>No channels yet. Create your first channel to get started.</p>
          </div>
        ) : (
          <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '1rem' }}>
            Total Channels: {channels.length} | Running:{' '}
            {channels.filter((ch) => ch.status === 'running').length}
          </div>
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
