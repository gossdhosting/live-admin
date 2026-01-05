import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Plans() {
  const [plans, setPlans] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
    fetchUserStats();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      setPlans(response.data.plans.filter(plan => plan.is_active));
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setUserStats(response.data);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const formatStorage = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'Unlimited';
    if (minutes >= 60) {
      return `${(minutes / 60).toFixed(1)} hours`;
    }
    return `${minutes} minutes`;
  };

  const formatBitrate = (kbps) => {
    if (kbps >= 6000) return '1080p Full HD';
    if (kbps >= 4000) return '720p HD';
    return '480p SD';
  };

  const planColors = {
    'Free': '#95a5a6',
    'Basic': '#3498db',
    'Pro': '#9b59b6',
    'Enterprise': '#e74c3c'
  };

  if (loading) {
    return (
      <div className="page-container">
        <div>Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Subscription Plans</h1>
        <p style={{ color: '#7f8c8d' }}>Choose the plan that fits your streaming needs</p>
      </div>

      {/* Current Plan Badge */}
      {userStats && (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#ecf0f1',
          borderRadius: '8px',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.25rem' }}>
              Current Plan
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: planColors[userStats.plan.name] || '#3498db'
              }}>
                {userStats.plan.name}
              </span>
              {userStats.plan.price_monthly > 0 && (
                <span style={{ fontSize: '1rem', color: '#7f8c8d' }}>
                  ${userStats.plan.price_monthly}/month
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
              {userStats.stats.active_channels} / {userStats.limits.concurrent_streams} Active Streams
            </div>
            <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
              {formatStorage(userStats.stats.total_storage / (1024 * 1024))} / {formatStorage(userStats.limits.storage_limit / (1024 * 1024))} Storage
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {plans.map((plan) => {
          const isCurrentPlan = userStats && userStats.plan.id === plan.id;
          const borderColor = planColors[plan.name] || '#3498db';

          return (
            <div
              key={plan.id}
              style={{
                border: `3px solid ${isCurrentPlan ? borderColor : '#ddd'}`,
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: isCurrentPlan ? `${borderColor}10` : 'white',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                  backgroundColor: borderColor,
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  CURRENT PLAN
                </div>
              )}

              {/* Plan Header */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: '0.5rem',
                  fontSize: '1.5rem',
                  color: borderColor
                }}>
                  {plan.name}
                </h3>
                <p style={{
                  margin: 0,
                  color: '#7f8c8d',
                  fontSize: '0.9rem',
                  minHeight: '2.5rem'
                }}>
                  {plan.description}
                </p>
              </div>

              {/* Pricing */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  ${plan.price_monthly}
                  <span style={{ fontSize: '1rem', color: '#7f8c8d', fontWeight: 'normal' }}>
                    /month
                  </span>
                </div>
                {plan.price_yearly > 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#27ae60', marginTop: '0.25rem' }}>
                    or ${plan.price_yearly}/year (Save ${((plan.price_monthly * 12) - plan.price_yearly).toFixed(0)})
                  </div>
                )}
              </div>

              {/* Features List */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: '#27ae60', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>{plan.max_concurrent_streams}</strong> Concurrent Stream{plan.max_concurrent_streams > 1 ? 's' : ''}</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: '#27ae60', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>{formatBitrate(plan.max_bitrate)}</strong> Quality</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: '#27ae60', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>{formatStorage(plan.storage_limit_mb)}</strong> Storage</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: '#27ae60', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>{formatDuration(plan.max_stream_duration)}</strong> per Stream</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: plan.custom_watermark ? '#27ae60' : '#e74c3c', fontSize: '1.2rem' }}>
                    {plan.custom_watermark ? '✓' : '✗'}
                  </span>
                  <span style={{ color: plan.custom_watermark ? 'inherit' : '#7f8c8d' }}>
                    Custom Watermarks
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: '#27ae60', fontSize: '1.2rem' }}>✓</span>
                  <span>Multi-platform Streaming</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: '#27ae60', fontSize: '1.2rem' }}>✓</span>
                  <span>24/7 Support</span>
                </div>
              </div>

              {/* Action Button */}
              {isCurrentPlan ? (
                <button
                  className="btn"
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: '#ecf0f1',
                    color: '#7f8c8d',
                    cursor: 'not-allowed'
                  }}
                >
                  Current Plan
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => alert('Payment integration coming soon!')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: borderColor,
                    borderColor: borderColor
                  }}
                >
                  {userStats && userStats.plan.price_monthly < plan.price_monthly ? 'Upgrade' : 'Select'} Plan
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Note */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#1976d2',
        textAlign: 'center'
      }}>
        Payment integration coming soon. Contact administrator for plan upgrades.
      </div>
    </div>
  );
}

export default Plans;
