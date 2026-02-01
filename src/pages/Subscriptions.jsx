import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AlertCircle, CreditCard, DollarSign, TrendingUp, Users, X, Check, Search, Download, Trash2, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import api from '../services/api';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mode, setMode] = useState('sandbox');

  useEffect(() => {
    fetchSubscriptions();
    fetchInvoices();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/billing/admin/subscriptions');
      setSubscriptions(response.data.subscriptions || []);
      setStats(response.data.stats || {});
      setMode(response.data.mode || 'sandbox');
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/billing/admin/invoices');
      setInvoices(response.data.invoices || []);
      setRevenue(response.data.revenue || {});
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const handleCancelSubscription = async (subscriptionId, immediate = false) => {
    if (!confirm(`Are you sure you want to cancel this subscription ${immediate ? 'immediately' : 'at period end'}?`)) {
      return;
    }

    try {
      setCanceling(true);
      await api.post(`/billing/admin/subscription/${subscriptionId}/cancel`, {
        cancelAtPeriodEnd: !immediate,
      });
      await fetchSubscriptions();
      setSelectedSubscription(null);
      alert('Subscription canceled successfully');
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    if (!confirm('Are you sure you want to DELETE this subscription from the database? This action cannot be undone!')) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/billing/admin/subscription/${subscriptionId}`);
      await fetchSubscriptions();
      setSelectedSubscription(null);
      alert('Subscription deleted successfully');
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      alert('Failed to delete subscription');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-500',
      trialing: 'bg-blue-500',
      canceled: 'bg-red-500',
      past_due: 'bg-yellow-500',
      incomplete: 'bg-gray-500',
    };

    return (
      <Badge className={variants[status] || 'bg-gray-500'}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const search = searchTerm.toLowerCase();
    return (
      sub.user_email?.toLowerCase().includes(search) ||
      sub.user_name?.toLowerCase().includes(search) ||
      sub.plan_name?.toLowerCase().includes(search) ||
      sub.stripe_subscription_id?.toLowerCase().includes(search)
    );
  });

  const filteredInvoices = invoices.filter((inv) => {
    const search = searchTerm.toLowerCase();
    return (
      inv.user_email?.toLowerCase().includes(search) ||
      inv.user_name?.toLowerCase().includes(search) ||
      inv.stripe_invoice_id?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            Subscription Management
          </h1>
          <p className="text-gray-600 mt-1">Manage user subscriptions and billing</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-500" />
          <Badge className={mode === 'live' ? 'bg-green-500' : 'bg-yellow-500'}>
            {mode === 'live' ? 'LIVE MODE' : 'SANDBOX MODE'}
          </Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_subscriptions || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Check className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_subscriptions || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canceled Subscriptions</CardTitle>
              <X className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.canceled_subscriptions || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.monthly_recurring_revenue || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by user, email, plan, or subscription ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <DollarSign className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>View and manage all user subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Plan</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Billing</th>
                      <th className="text-left py-3 px-4">Current Period</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-500">
                          No subscriptions found
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{sub.user_name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{sub.user_email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{sub.plan_name || 'Unknown'}</div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(sub.status)}
                            {sub.cancel_at_period_end && (
                              <Badge variant="outline" className="ml-2">
                                Canceling
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize">{sub.billing_cycle || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div>Start: {formatDate(sub.current_period_start)}</div>
                              <div>End: {formatDate(sub.current_period_end)}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedSubscription(sub)}
                              >
                                View
                              </Button>
                              {sub.status === 'active' && !sub.cancel_at_period_end && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelSubscription(sub.stripe_subscription_id, false)}
                                  disabled={canceling}
                                >
                                  Cancel
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteSubscription(sub.stripe_subscription_id)}
                                disabled={deleting}
                                className="bg-red-700 hover:bg-red-800"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {revenue && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenue.total_revenue || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenue.month_revenue || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{revenue.total_invoices || 0}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>View payment history and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Invoice ID</th>
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-500">
                          No invoices found
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm">{invoice.stripe_invoice_id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{invoice.user_name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{invoice.user_email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium">
                              {formatCurrency(invoice.amount_total, invoice.currency?.toUpperCase())}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {invoice.paid ? (
                              <Badge className="bg-green-500">Paid</Badge>
                            ) : (
                              <Badge variant="destructive">Unpaid</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {invoice.paid_at ? formatDate(invoice.paid_at) : formatDate(invoice.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            {invoice.hosted_invoice_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subscription Details Modal */}
      {selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Subscription Details</CardTitle>
                  <CardDescription>{selectedSubscription.user_email}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSubscription(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Badge */}
              <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Payment Mode:</span>
                <Badge className={mode === 'live' ? 'bg-green-500' : 'bg-yellow-500'}>
                  {mode === 'live' ? 'LIVE' : 'SANDBOX'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">User</Label>
                  <div className="font-medium">{selectedSubscription.user_name}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <div className="font-medium">{selectedSubscription.user_email}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Plan</Label>
                  <div className="font-medium">{selectedSubscription.plan_name}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div>{getStatusBadge(selectedSubscription.status)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Billing Cycle</Label>
                  <div className="font-medium capitalize">{selectedSubscription.billing_cycle}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Stripe Subscription ID</Label>
                  <div className="font-mono text-sm">{selectedSubscription.stripe_subscription_id}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Current Period Start</Label>
                  <div className="font-medium">{formatDate(selectedSubscription.current_period_start)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Current Period End</Label>
                  <div className="font-medium">{formatDate(selectedSubscription.current_period_end)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Created At</Label>
                  <div className="font-medium">{formatDate(selectedSubscription.created_at)}</div>
                </div>
                {selectedSubscription.canceled_at && (
                  <div>
                    <Label className="text-gray-500">Canceled At</Label>
                    <div className="font-medium">{formatDate(selectedSubscription.canceled_at)}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedSubscription.status === 'active' && !selectedSubscription.cancel_at_period_end && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelSubscription(selectedSubscription.stripe_subscription_id, false)}
                      disabled={canceling}
                    >
                      Cancel at Period End
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCancelSubscription(selectedSubscription.stripe_subscription_id, true)}
                      disabled={canceling}
                    >
                      Cancel Immediately
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteSubscription(selectedSubscription.stripe_subscription_id)}
                  disabled={deleting}
                  className="bg-red-700 hover:bg-red-800 ml-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete from DB
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
