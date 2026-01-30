import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { X, Mail, User, Calendar, CreditCard, Crown, Loader2 } from 'lucide-react';

function UserDetailsModal({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}`);
      setUser(response.data.user);
      setError('');
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            User Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : user ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-gray-900 font-medium">{user.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      {user.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                      <span className={user.role === 'admin' ? 'text-yellow-600' : ''}>
                        {user.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Registration Date</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscription Information */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Subscription Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Plan</label>
                    <p className="text-gray-900 font-medium">{user.plan_name || 'No Plan'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="font-medium">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        user.subscription_status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : user.subscription_status === 'trialing'
                          ? 'bg-blue-100 text-blue-800'
                          : user.subscription_status === 'past_due'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.subscription_status || 'inactive'}
                      </span>
                    </p>
                  </div>
                  {user.subscription_end_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Subscription End Date</label>
                      <p className="text-gray-900 font-medium">{formatDate(user.subscription_end_date)}</p>
                    </div>
                  )}
                  {user.stripe_customer_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Stripe Customer ID</label>
                      <p className="text-gray-900 font-mono text-sm">{user.stripe_customer_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Limits */}
              {user.plan_name && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Limits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Max Concurrent Streams</label>
                      <p className="text-gray-900 font-medium">{user.max_concurrent_streams || 'Unlimited'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Max Bitrate</label>
                      <p className="text-gray-900 font-medium">{user.max_bitrate ? `${user.max_bitrate} kbps` : 'Unlimited'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Max Stream Duration</label>
                      <p className="text-gray-900 font-medium">{user.max_stream_duration ? `${user.max_stream_duration} minutes` : 'Unlimited'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Storage Limit</label>
                      <p className="text-gray-900 font-medium">{user.storage_limit_mb ? `${user.storage_limit_mb} MB` : 'Unlimited'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Custom Watermark</label>
                      <p className="text-gray-900 font-medium">{user.custom_watermark ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">User not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;
