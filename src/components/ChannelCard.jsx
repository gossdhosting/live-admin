import React, { useState } from 'react';
import api from '../services/api';

function ChannelCard({ channel, onUpdate, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  const handleStart = async () => {
    if (!confirm(`Start streaming for "${channel.name}"?`)) return;

    setLoading(true);
    try {
      await api.post(`/channels/${channel.id}/start`);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!confirm(`Stop streaming for "${channel.name}"?`)) return;

    setLoading(true);
    try {
      await api.post(`/channels/${channel.id}/stop`);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to stop stream');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete channel "${channel.name}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await api.delete(`/channels/${channel.id}`);
      onDelete(channel.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete channel');
      setLoading(false);
    }
  };

  const handleViewLogs = async () => {
    if (!showLogs) {
      try {
        const response = await api.get(`/channels/${channel.id}/logs`);
        setLogs(response.data.logs);
        setShowLogs(true);
      } catch (error) {
        alert('Failed to load logs');
      }
    } else {
      setShowLogs(false);
    }
  };

  const getStatusBadge = () => {
    const statusClass = `status-badge status-${channel.status}`;
    return <span className={statusClass}>{channel.status.toUpperCase()}</span>;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>{channel.name}</h2>
          {channel.description && <p style={{ color: '#7f8c8d', marginTop: '0.5rem' }}>{channel.description}</p>}
        </div>
        {getStatusBadge()}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
          <strong>Input URL:</strong> {channel.input_url}
        </p>
        {channel.status === 'running' && channel.output_path && (
          <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
            <strong>HLS URL:</strong> /hls/channel_{channel.id}/index.m3u8
          </p>
        )}
        {channel.status === 'running' && channel.process_id && (
          <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
            <strong>Process ID:</strong> {channel.process_id}
          </p>
        )}
        {channel.error_message && (
          <p style={{ fontSize: '0.9rem', color: '#e74c3c', marginBottom: '0.5rem' }}>
            <strong>Error:</strong> {channel.error_message}
          </p>
        )}
        <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
          <strong>Auto-restart:</strong> {channel.auto_restart ? 'Enabled' : 'Disabled'}
        </p>
      </div>

      <div className="action-buttons">
        {channel.status !== 'running' ? (
          <button className="btn btn-success" onClick={handleStart} disabled={loading}>
            {loading ? 'Starting...' : 'Start Stream'}
          </button>
        ) : (
          <button className="btn btn-danger" onClick={handleStop} disabled={loading}>
            {loading ? 'Stopping...' : 'Stop Stream'}
          </button>
        )}
        <button className="btn btn-secondary" onClick={handleViewLogs}>
          {showLogs ? 'Hide Logs' : 'View Logs'}
        </button>
        <button className="btn btn-danger" onClick={handleDelete} disabled={loading || channel.status === 'running'}>
          Delete
        </button>
      </div>

      {showLogs && (
        <div style={{ marginTop: '1rem' }}>
          <div className="logs-container">
            {logs.length === 0 ? (
              <div>No logs available</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.log_type}`}>
                  [{new Date(log.created_at).toLocaleString()}] [{log.log_type.toUpperCase()}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChannelCard;
