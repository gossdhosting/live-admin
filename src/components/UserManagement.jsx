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
    const visiblePlans = plans.filter(plan => !plan.is_hidden);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'user',
      plan_id: visiblePlans.length > 0 ? visiblePlans[0].id : '',
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
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Auth</th>
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
                  {user.auth_provider && user.auth_provider !== 'local' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {user.auth_provider === 'google' && (
                        <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      {user.auth_provider === 'facebook' && (
                        <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )}
                      {user.auth_provider === 'apple' && (
                        <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                      )}
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: '#667eea',
                        color: '#fff'
                      }}>
                        {user.auth_provider.charAt(0).toUpperCase() + user.auth_provider.slice(1)}
                      </span>
                      {user.email_verified === 1 && (
                        <span style={{ color: '#27ae60', fontSize: '0.8rem' }} title="Email Verified">✓</span>
                      )}
                    </div>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      backgroundColor: '#95a5a6',
                      color: '#fff'
                    }}>
                      Local
                    </span>
                  )}
                </td>
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
                  {plans.filter(plan => !plan.is_hidden).map(plan => (
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
                    <div>
                      <strong>Auth Provider:</strong>{' '}
                      {userDetails.user.auth_provider && userDetails.user.auth_provider !== 'local' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          {userDetails.user.auth_provider === 'google' && (
                            <svg style={{ width: '14px', height: '14px', display: 'inline-block' }} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                          )}
                          {userDetails.user.auth_provider === 'facebook' && (
                            <svg style={{ width: '14px', height: '14px', display: 'inline-block' }} viewBox="0 0 24 24" fill="#1877F2">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          )}
                          {userDetails.user.auth_provider === 'apple' && (
                            <svg style={{ width: '14px', height: '14px', display: 'inline-block' }} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                          )}
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: '#667eea',
                            color: '#fff'
                          }}>
                            {userDetails.user.auth_provider.charAt(0).toUpperCase() + userDetails.user.auth_provider.slice(1)}
                          </span>
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: '#95a5a6',
                          color: '#fff'
                        }}>
                          Local
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>Email Verified:</strong>{' '}
                      {userDetails.user.email_verified === 1 ? (
                        <span style={{ color: '#27ae60', fontWeight: '600' }}>✓ Yes</span>
                      ) : (
                        <span style={{ color: '#e74c3c' }}>✗ No</span>
                      )}
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
