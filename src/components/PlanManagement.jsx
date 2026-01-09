import React, { useState, useEffect } from 'react';
import api from '../services/api';

function PlanManagement() {
  const [plans, setPlans] = useState([]);
  const [planStats, setPlanStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_concurrent_streams: 1,
    max_bitrate: 2500,
    max_stream_duration: null,
    storage_limit_mb: 500,
    custom_watermark: false,
    max_platform_connections: 1,
    is_active: true,
    is_hidden: false,
    youtube_restreaming: false
  });

  useEffect(() => {
    fetchPlans();
    fetchPlanStats();
  }, []);

  const fetchPlans = async () => {
    try {
      // Use admin endpoint to get all plans including hidden
      const response = await api.get('/plans/admin/all');
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      showMessage('Failed to load plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanStats = async () => {
    try {
      const response = await api.get('/plans/admin/stats');
      setPlanStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch plan stats:', error);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedPlan(null);
    setFormData({
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_concurrent_streams: 1,
      max_bitrate: 2500,
      max_stream_duration: null,
      storage_limit_mb: 500,
      custom_watermark: false,
      max_platform_connections: 1,
      is_active: true,
      is_hidden: false,
      youtube_restreaming: false
    });
    setShowModal(true);
  };

  const openEditModal = (plan) => {
    setModalMode('edit');
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_concurrent_streams: plan.max_concurrent_streams,
      max_bitrate: plan.max_bitrate,
      max_stream_duration: plan.max_stream_duration,
      storage_limit_mb: plan.storage_limit_mb,
      custom_watermark: plan.custom_watermark === 1,
      max_platform_connections: plan.max_platform_connections || 1,
      is_active: plan.is_active === 1,
      is_hidden: plan.is_hidden === 1,
      youtube_restreaming: plan.youtube_restreaming === 1
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        custom_watermark: formData.custom_watermark ? 1 : 0,
        is_active: formData.is_active ? 1 : 0,
        max_stream_duration: formData.max_stream_duration || null
      };

      if (modalMode === 'create') {
        await api.post('/plans', submitData);
        showMessage('Plan created successfully');
      } else {
        await api.put(`/plans/${selectedPlan.id}`, submitData);
        showMessage('Plan updated successfully');
      }

      setShowModal(false);
      fetchPlans();
      fetchPlanStats();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (planId, planName) => {
    const subscriberCount = planStats[planId]?.subscriber_count || 0;

    if (subscriberCount > 0) {
      if (!window.confirm(`This plan has ${subscriberCount} subscriber(s). Are you sure you want to delete it? Users will need to be reassigned to another plan.`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete the "${planName}" plan?`)) {
        return;
      }
    }

    try {
      await api.delete(`/plans/${planId}`);
      showMessage('Plan deleted successfully');
      fetchPlans();
      fetchPlanStats();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to delete plan', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  if (loading) {
    return <div>Loading plans...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Plan Management</h3>
        <button className="btn btn-primary" onClick={openCreateModal}>
          Create New Plan
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Price</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Streams</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Platforms</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Bitrate</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Storage</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Subscribers</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '0.75rem' }}>
                  <div>
                    <strong>{plan.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{plan.description}</div>
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div>${plan.price_monthly}/mo</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>${plan.price_yearly}/yr</div>
                </td>
                <td style={{ padding: '0.75rem' }}>{plan.max_concurrent_streams}</td>
                <td style={{ padding: '0.75rem' }}>{plan.max_platform_connections || 1}</td>
                <td style={{ padding: '0.75rem' }}>{plan.max_bitrate}k</td>
                <td style={{ padding: '0.75rem' }}>
                  {plan.storage_limit_mb >= 1024
                    ? `${(plan.storage_limit_mb / 1024).toFixed(1)}GB`
                    : `${plan.storage_limit_mb}MB`}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#ecf0f1',
                    fontWeight: '600'
                  }}>
                    {planStats[plan.id]?.subscriber_count || 0}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      backgroundColor: plan.is_active ? '#27ae60' : '#95a5a6',
                      color: '#fff'
                    }}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {plan.is_hidden === 1 && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        backgroundColor: '#f39c12',
                        color: '#fff'
                      }}>
                        Hidden
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEditModal(plan)}
                    style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDelete(plan.id, plan.name)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', backgroundColor: '#e74c3c', color: '#fff' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
          No plans found. Create your first plan to get started.
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModal(false);
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#fff' }}>
            <h3>{modalMode === 'create' ? 'Create New Plan' : 'Edit Plan'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Plan Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="price_monthly">Monthly Price ($) *</label>
                  <input
                    type="number"
                    id="price_monthly"
                    name="price_monthly"
                    className="form-control"
                    value={formData.price_monthly}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="price_yearly">Yearly Price ($) *</label>
                  <input
                    type="number"
                    id="price_yearly"
                    name="price_yearly"
                    className="form-control"
                    value={formData.price_yearly}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="max_concurrent_streams">Max Concurrent Streams *</label>
                  <input
                    type="number"
                    id="max_concurrent_streams"
                    name="max_concurrent_streams"
                    className="form-control"
                    value={formData.max_concurrent_streams}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="max_bitrate">Max Bitrate (kbps) *</label>
                  <input
                    type="number"
                    id="max_bitrate"
                    name="max_bitrate"
                    className="form-control"
                    value={formData.max_bitrate}
                    onChange={handleInputChange}
                    min="500"
                    required
                  />
                  <small style={{ color: '#666' }}>480p: 2500, 720p: 4000, 1080p: 6000</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="max_stream_duration">Max Stream Duration (min)</label>
                  <input
                    type="number"
                    id="max_stream_duration"
                    name="max_stream_duration"
                    className="form-control"
                    value={formData.max_stream_duration || ''}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Unlimited"
                  />
                  <small style={{ color: '#666' }}>Leave empty for unlimited</small>
                </div>

                <div className="form-group">
                  <label htmlFor="storage_limit_mb">Storage Limit (MB) *</label>
                  <input
                    type="number"
                    id="storage_limit_mb"
                    name="storage_limit_mb"
                    className="form-control"
                    value={formData.storage_limit_mb}
                    onChange={handleInputChange}
                    min="100"
                    required
                  />
                  <small style={{ color: '#666' }}>1024 MB = 1 GB</small>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="max_platform_connections">Max Platform Connections *</label>
                <input
                  type="number"
                  id="max_platform_connections"
                  name="max_platform_connections"
                  className="form-control"
                  value={formData.max_platform_connections}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
                <small style={{ color: '#666' }}>
                  Max number of platforms (Facebook, YouTube, Twitch, Custom RTMP) users can connect
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="custom_watermark"
                      name="custom_watermark"
                      checked={formData.custom_watermark}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="custom_watermark" style={{ marginBottom: 0 }}>
                      Custom Watermark
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="is_active" style={{ marginBottom: 0 }}>
                      Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="youtube_restreaming"
                    name="youtube_restreaming"
                    checked={formData.youtube_restreaming}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="youtube_restreaming" style={{ marginBottom: 0 }}>
                    YouTube Restreaming Access
                  </label>
                  <small style={{ color: '#666', display: 'block', marginLeft: '1.5rem' }}>
                    Allow users on this plan to restream from YouTube live URLs
                  </small>
                </div>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="is_hidden"
                    name="is_hidden"
                    checked={formData.is_hidden}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="is_hidden" style={{ marginBottom: 0 }}>
                    Hidden from Plans Page
                  </label>
                  <small style={{ color: '#666', display: 'block', marginLeft: '1.5rem' }}>
                    Hide this plan from the public plans page while keeping it active in the system
                  </small>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Create Plan' : 'Update Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanManagement;
