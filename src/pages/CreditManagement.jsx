import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  DollarSign, Users, TrendingUp, RefreshCw
} from 'lucide-react';

function CreditManagement() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [usersWithCredits, setUsersWithCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState(null);

  // Adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    userId: '',
    userEmail: '',
    amount: '',
    reason: ''
  });

  // User search
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, transactionsRes, usersRes] = await Promise.all([
        api.get('/credits/admin/stats'),
        api.get('/credits/admin/transactions', { params: { limit: 50 } }),
        api.get('/credits/admin/users', { params: { limit: 50 } })
      ]);

      setStats(statsRes.data);
      setTransactions(transactionsRes.data.transactions);
      setUsersWithCredits(usersRes.data.users);
    } catch (error) {
      console.error('Failed to fetch credit data:', error);
      showMessage('Failed to load credit data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAdjustCredit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/credits/admin/adjust', {
        userId: parseInt(adjustmentData.userId),
        amount: parseFloat(adjustmentData.amount),
        reason: adjustmentData.reason
      });

      showMessage(`Credit adjusted successfully for ${adjustmentData.userEmail}`);
      setShowAdjustModal(false);
      setAdjustmentData({ userId: '', userEmail: '', amount: '', reason: '' });
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to adjust credit', 'error');
    }
  };

  const openAdjustModal = (user = null) => {
    if (user) {
      setAdjustmentData({
        userId: user.id.toString(),
        userEmail: user.email,
        amount: '',
        reason: ''
      });
      setUserSearch('');
      setUserSearchResults([]);
    } else {
      setAdjustmentData({ userId: '', userEmail: '', amount: '', reason: '' });
      setUserSearch('');
      setUserSearchResults([]);
    }
    setShowAdjustModal(true);
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const response = await api.get('/users', { params: { search: query, limit: 10 } });
      setUserSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleUserSearchChange = (e) => {
    const value = e.target.value;
    setUserSearch(value);
    searchUsers(value);
  };

  const selectUser = (user) => {
    setAdjustmentData(prev => ({
      ...prev,
      userId: user.id.toString(),
      userEmail: user.email
    }));
    setUserSearch(`${user.name || user.email} (${user.email})`);
    setUserSearchResults([]);
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'purchase': return 'bg-green-100 text-green-800';
      case 'subscription_credit': return 'bg-blue-100 text-blue-800';
      case 'plan_payment': return 'bg-purple-100 text-purple-800';
      case 'admin_adjustment': return 'bg-yellow-100 text-yellow-800';
      case 'refund': return 'bg-orange-100 text-orange-800';
      case 'bonus': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTransactionType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Credit Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => openAdjustModal()}>
            <DollarSign className="w-4 h-4 mr-2" />
            Adjust Credit
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Credits Outstanding</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats?.total_credits_outstanding?.toFixed(2) || '0.00'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Users with Credits</p>
                <p className="text-2xl font-bold">{stats?.users_with_credits || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Transactions (30 days)</p>
                <p className="text-2xl font-bold">{stats?.transactions_last_30_days || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'transactions', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tx.user_email}</p>
                      <p className="text-xs text-gray-500">{tx.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <Badge className={`text-xs ${getTransactionTypeColor(tx.transaction_type)}`}>
                        {formatTransactionType(tx.transaction_type)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Users by Credit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Users by Credit Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {usersWithCredits.slice(0, 10).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${parseFloat(user.account_credit).toFixed(2)}</p>
                      <Button size="sm" variant="ghost" onClick={() => openAdjustModal(user)}>
                        Adjust
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-right py-3 px-4">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium">{tx.user_name || tx.user_email}</div>
                        <div className="text-xs text-gray-500">{tx.user_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getTransactionTypeColor(tx.transaction_type)}>
                          {formatTransactionType(tx.transaction_type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{tx.description}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">${parseFloat(tx.balance_after).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>Users with Credit Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Plan</th>
                    <th className="text-right py-3 px-4">Balance</th>
                    <th className="text-right py-3 px-4">Transactions</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersWithCredits.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{user.name || user.email}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{user.plan_name || 'Free'}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">
                        ${parseFloat(user.account_credit).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">{user.transaction_count}</td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => openAdjustModal(user)}>
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adjust Credit Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Adjust User Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustCredit} className="space-y-4">
                <div>
                  <Label>Search User</Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      type="text"
                      value={userSearch}
                      onChange={handleUserSearchChange}
                      placeholder="Type name or email to search..."
                      disabled={!!adjustmentData.userId}
                    />
                    {searchingUsers && (
                      <div style={{ position: 'absolute', right: '10px', top: '10px' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #ccc', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      </div>
                    )}
                    {userSearchResults.length > 0 && !adjustmentData.userId && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        marginTop: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 10,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}>
                        {userSearchResults.map(user => (
                          <div
                            key={user.id}
                            onClick={() => selectUser(user)}
                            style={{
                              padding: '10px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>
                              {user.name || user.email}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {user.email} • {user.plan_name || 'Free'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {adjustmentData.userId && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p className="text-sm text-gray-500">
                        Selected: {adjustmentData.userEmail} (ID: {adjustmentData.userId})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustmentData(prev => ({ ...prev, userId: '', userEmail: '' }));
                          setUserSearch('');
                        }}
                        style={{
                          fontSize: '12px',
                          color: '#ef4444',
                          textDecoration: 'underline',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustmentData.amount}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Positive to add, negative to deduct"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Use positive value to add, negative to deduct</p>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input
                    type="text"
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason for adjustment (e.g., Refund, Bonus)"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Adjust Credit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CreditManagement;
