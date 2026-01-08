import React, { useState, useEffect } from 'react';
import api from '../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user',
    plan_id: '',
    subscription_type: 'monthly',
    status: 'active'
  });

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showMessage('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'user',
      plan_id: plans.length > 0 ? plans[0].id : '',
      subscription_type: 'monthly',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '', // Don't populate password for security
      name: user.name || '',
      role: user.role,
      plan_id: user.plan_id,
      subscription_type: user.subscription_type || 'monthly',
      status: user.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        if (!formData.password || formData.password.length < 6) {
          showMessage('Password must be at least 6 characters', 'error');
          return;
        }

        await api.post('/users/register', formData);
        showMessage('User created successfully');
      } else {
        // For edit, only send password if it's been changed
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }

        await api.put(`/users/${selectedUser.id}`, updateData);
        showMessage('User updated successfully');
      }

      setShowModal(false);
      fetchUsers();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete user "${userEmail}"? This will also delete all their channels and data.`)) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      showMessage('User deleted successfully');
      fetchUsers();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openDetailsModal = async (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setLoadingDetails(true);

    try {
      const response = await api.get(`/users/${user.id}/details`);
      setUserDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      showMessage('Failed to load user details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleLoginAsUser = async (userId) => {
    if (!window.confirm('Are you sure you want to login as this user? You will be switched to their account.')) {
      return;
    }

    try {
      const response = await api.post(`/auth/admin-login-as/${userId}`);

      // Store the admin token to return later
      const currentToken = localStorage.getItem('token');
      localStorage.setItem('adminToken', currentToken);

      // Set the new user token
      localStorage.setItem('token', response.data.token);

      // Reload to switch to user account
      window.location.href = '/';
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to login as user', 'error');
    }
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>User Management</h3>
        <button className="btn btn-primary" onClick={openCreateModal}>
          Create New User
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
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Plan</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '0.75rem' }}>{user.id}</td>
                <td style={{ padding: '0.75rem' }}>{user.email}</td>
                <td style={{ padding: '0.75rem' }}>{user.name || '-'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    backgroundColor: user.role === 'admin' ? '#e74c3c' : '#3498db',
                    color: '#fff'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>{user.plan_name || 'N/A'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    backgroundColor: user.status === 'active' ? '#27ae60' : '#95a5a6',
                    color: '#fff'
                  }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => openDetailsModal(user)}
                    style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem', backgroundColor: '#3498db', color: '#fff' }}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEditModal(user)}
                    style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDelete(user.id, user.email)}
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

      {users.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
          No users found. Create your first user to get started.
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModal(false);
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', background: '#fff' }}>
            <h3>{modalMode === 'create' ? 'Create New User' : 'Edit User'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password {modalMode === 'create' ? '*' : '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={modalMode === 'create'}
                  minLength="6"
                />
                <small style={{ color: '#666' }}>Minimum 6 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  className="form-control"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="plan_id">Plan *</label>
                <select
                  id="plan_id"
                  name="plan_id"
                  className="form-control"
                  value={formData.plan_id}
                  onChange={handleInputChange}
                  required
                >
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price_monthly}/month
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subscription_type">Billing Cycle *</label>
                <select
                  id="subscription_type"
                  name="subscription_type"
                  className="form-control"
                  value={formData.subscription_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  className="form-control"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Create User' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDetailsModal(false);
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>User Details: {selectedUser?.email}</h3>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : userDetails ? (
              <div>
                {/* User Information */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Account Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <strong>User ID:</strong> #{userDetails.user.id}
                    </div>
                    <div>
                      <strong>Email:</strong> {userDetails.user.email}
                    </div>
                    <div>
                      <strong>Name:</strong> {userDetails.user.name || 'N/A'}
                    </div>
                    <div>
                      <strong>Role:</strong> <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: userDetails.user.role === 'admin' ? '#e74c3c' : '#3498db',
                        color: '#fff'
                      }}>{userDetails.user.role}</span>
                    </div>
                    <div>
                      <strong>Status:</strong> <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        backgroundColor: userDetails.user.status === 'active' ? '#27ae60' : '#95a5a6',
                        color: '#fff'
                      }}>{userDetails.user.status}</span>
                    </div>
                    <div>
                      <strong>Joined:</strong> {new Date(userDetails.user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Plan Details */}
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Plan & Subscription</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <strong>Current Plan:</strong> {userDetails.plan.name}
                    </div>
                    <div>
                      <strong>Billing Cycle:</strong> {userDetails.user.subscription_type}
                    </div>
                    <div>
                      <strong>Max Streams:</strong> {userDetails.plan.max_concurrent_streams}
                    </div>
                    <div>
                      <strong>Max Duration:</strong> {userDetails.plan.max_stream_duration ? `${userDetails.plan.max_stream_duration} min` : 'Unlimited'}
                    </div>
                    <div>
                      <strong>Max Bitrate:</strong> {userDetails.plan.max_bitrate} kbps
                    </div>
                    <div>
                      <strong>Storage Limit:</strong> {(userDetails.plan.storage_limit_mb / 1024).toFixed(2)} GB
                    </div>
                  </div>
                </div>

                {/* Usage Statistics */}
                <div style={{
                  backgroundColor: '#fff3cd',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Activity & Usage</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <strong>Total Channels:</strong> {userDetails.stats.total_channels}
                    </div>
                    <div>
                      <strong>Running Channels:</strong> {userDetails.stats.running_channels}
                    </div>
                    <div>
                      <strong>Media Files:</strong> {userDetails.stats.total_media}
                    </div>
                    <div>
                      <strong>Storage Used:</strong> {(userDetails.stats.storage_used_mb / 1024).toFixed(2)} GB
                    </div>
                  </div>
                </div>

                {/* Platform Connections */}
                <div style={{
                  backgroundColor: '#d4edda',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Connected Platforms</h4>
                  {userDetails.platforms && userDetails.platforms.length > 0 ? (
                    <div style={{ fontSize: '0.9rem' }}>
                      {userDetails.platforms.map((platform, idx) => (
                        <div key={idx} style={{
                          padding: '0.5rem',
                          backgroundColor: '#fff',
                          borderRadius: '4px',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <strong style={{ textTransform: 'capitalize' }}>{platform.platform}:</strong>{' '}
                            {platform.platform_user_name || platform.platform_user_email || platform.platform_channel_name || 'Connected'}
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#666'
                          }}>
                            {new Date(platform.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>No platforms connected</div>
                  )}
                </div>

                {/* Custom RTMP Destinations */}
                <div style={{
                  backgroundColor: '#f3e5f5',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Custom RTMP Destinations</h4>
                  {userDetails.rtmp_destinations && userDetails.rtmp_destinations.length > 0 ? (
                    <div style={{ fontSize: '0.9rem' }}>
                      {userDetails.rtmp_destinations.map((dest, idx) => (
                        <div key={idx} style={{
                          padding: '0.5rem',
                          backgroundColor: '#fff',
                          borderRadius: '4px',
                          marginBottom: '0.5rem'
                        }}>
                          <strong>{dest.name}</strong> ({dest.platform})<br />
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            Channel: {dest.channel_name || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>No custom RTMP destinations</div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #dee2e6'
                }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleLoginAsUser(selectedUser.id)}
                    style={{ flex: 1 }}
                  >
                    🔐 Login to Profile
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDetailsModal(false)}
                    style={{ flex: 1 }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#e74c3c' }}>
                Failed to load user details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
