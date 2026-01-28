import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Facebook, Youtube, Twitch, Settings } from 'lucide-react';

function RtmpSettingsNew({ channelId, channelName }) {
  const [templates, setTemplates] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [channelId]);

  const fetchData = async () => {
    try {
      const [templatesRes, destinationsRes] = await Promise.all([
        api.get('/rtmp/templates/templates'),
        api.get(`/channels/${channelId}/rtmp`),
      ]);
      setTemplates(templatesRes.data.templates);
      setDestinations(destinationsRes.data.destinations);
    } catch (error) {
      console.error('Failed to fetch RTMP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTemplateEnabled = (templateId) => {
    return destinations.some(dest => dest.template_id === templateId && (dest.enabled === 1 || dest.enabled === true));
  };

  const toggleTemplate = async (template, enabled) => {
    try {
      await api.post(`/channels/${channelId}/rtmp/template/${template.id}/toggle`, { enabled });
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to toggle template');
    }
  };

  const getPlatformIcon = (platform) => {
    const iconProps = { style: { width: '1.25rem', height: '1.25rem' } };
    switch (platform) {
      case 'facebook': return <Facebook {...iconProps} color="#1877f2" />;
      case 'youtube': return <Youtube {...iconProps} color="#ff0000" />;
      case 'twitch': return <Twitch {...iconProps} color="#9146ff" />;
      default: return <Settings {...iconProps} color="#666" />;
    }
  };

  const getPlatformLabel = (platform) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading...</div>;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0, color: '#2c3e50' }}>Multi-Platform Streaming</h3>
      </div>

      {templates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#7f8c8d',
        }}>
          <p>No RTMP templates configured.</p>
          <p style={{ fontSize: '0.9rem' }}>Go to Settings to create global RTMP templates first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {templates.map((template) => {
            const enabled = isTemplateEnabled(template.id);
            return (
              <div
                key={template.id}
                style={{
                  backgroundColor: enabled ? '#e8f5e9' : '#f5f5f5',
                  padding: '1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `2px solid ${enabled ? '#4caf50' : '#e0e0e0'}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{getPlatformIcon(template.platform)}</span>
                    <div>
                      <strong style={{ color: '#2c3e50', fontSize: '1rem' }}>
                        {template.name}
                      </strong>
                      <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                        {getPlatformLabel(template.platform)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        backgroundColor: enabled ? '#4caf50' : '#95a5a6',
                        color: 'white',
                        marginLeft: '0.5rem',
                      }}
                    >
                      {enabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7f8c8d', fontFamily: 'monospace' }}>
                    {template.rtmp_url}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`btn ${enabled ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => toggleTemplate(template, !enabled)}
                    style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                  >
                    {enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px',
        fontSize: '0.85rem',
        color: '#1976d2',
      }}>
        ℹ️ These are global RTMP templates. Enable/disable which ones to use for this channel. Go to Settings to manage templates.
      </div>
    </div>
  );
}

export default RtmpSettingsNew;
