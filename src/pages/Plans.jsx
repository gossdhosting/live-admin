import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Check, X, Cloud, HardDrive } from 'lucide-react';

function Plans() {
  const [plans, setPlans] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [upgradePreview, setUpgradePreview] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);

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

  const fetchUpgradePreview = async (planId, cycle) => {
    try {
      const response = await api.get('/billing/preview-upgrade', {
        params: { newPlanId: planId, billingCycle: cycle }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch upgrade preview:', error);
      return null;
    }
  };

  const fetchPaymentMethod = async () => {
    try {
      const response = await api.get('/billing/subscription');
      if (response.data.subscription?.default_payment_method) {
        setPaymentMethod(response.data.subscription.default_payment_method);
      }
    } catch (error) {
      console.error('Failed to fetch payment method:', error);
    }
  };

  useEffect(() => {
    if (userStats?.plan?.price_monthly > 0) {
      fetchPaymentMethod();
    }
  }, [userStats]);

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

  const handleSelectPlan = async (plan, cycle = 'monthly') => {
    const currentPlanId = userStats?.plan?.id;
    const currentPlanPrice = userStats?.plan?.price_monthly || 0;

    // User has active PAID subscription if they have a plan with price > 0
    const hasActivePaidSubscription = currentPlanId && currentPlanPrice > 0;
    const isUpgradeOrDowngrade = hasActivePaidSubscription && currentPlanId !== plan.id;

    if (isUpgradeOrDowngrade) {
      // Show confirmation modal for upgrades/downgrades
      const preview = await fetchUpgradePreview(plan.id, cycle);
      if (preview) {
        setUpgradePreview(preview);
        setSelectedPlan({ ...plan, billingCycle: cycle });
        setShowConfirmModal(true);
      } else {
        alert('Failed to calculate upgrade cost. Please try again.');
      }
    } else {
      // Direct checkout for new subscribers or free plan users
      await proceedWithCheckout(plan, cycle);
    }
  };

  const proceedWithCheckout = async (plan, cycle) => {
    try {
      setProcessingPlan(plan.id);

      const response = await api.post('/billing/create-checkout-session', {
        planId: plan.id,
        billingCycle: cycle,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert(error.response?.data?.error || 'Failed to start checkout. Please try again.');
      setProcessingPlan(null);
    }
  };

  const confirmUpgrade = async () => {
    try {
      setProcessingPlan(selectedPlan.id);
      setShowConfirmModal(false);

      const response = await api.post('/billing/upgrade-plan', {
        newPlanId: selectedPlan.id,
        billingCycle: selectedPlan.billingCycle,
      });

      // Check payment status
      if (response.data.paymentStatus === 'paid' || response.data.paymentStatus === 'success') {
        alert('Plan upgraded successfully! Payment has been processed.');
        // Reload page to refresh user data and plan info
        setTimeout(() => window.location.reload(), 1000);
      } else if (response.data.invoice?.status === 'paid') {
        alert('Plan upgraded successfully! Payment has been processed.');
        setTimeout(() => window.location.reload(), 1000);
      } else if (response.data.invoice?.client_secret) {
        alert('Additional authentication required. Please complete payment verification.');
        window.location.href = response.data.invoice.url;
      } else {
        // Upgrade initiated but payment pending
        alert('Plan upgrade initiated. Processing payment...');
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      alert(error.response?.data?.error || 'Failed to upgrade plan. Please try again.');
      setProcessingPlan(null);
      setShowConfirmModal(true); // Show modal again
    }
  };

  const planColors = {
    'Free': 'bg-gray-500',
    'Basic': 'bg-blue-500',
    'Pro': 'bg-purple-500',
    'Enterprise': 'bg-red-500'
  };

  const planBorderColors = {
    'Free': 'border-gray-500',
    'Basic': 'border-blue-500',
    'Pro': 'border-purple-500',
    'Enterprise': 'border-red-500'
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
        <p className="text-gray-600">Choose the plan that fits your streaming needs</p>

        {/* Billing Cycle Toggle */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                Save up to 17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Plan Card */}
      {userStats && (
        <Card className="mb-8 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Plan</p>
                <div className="flex items-center gap-2">
                  <Badge className={`${planColors[userStats.plan.name]} text-white text-lg px-3 py-1`}>
                    {userStats.plan.name}
                  </Badge>
                  {userStats.plan.price_monthly > 0 && (
                    <span className="text-gray-600">
                      ${userStats.plan.price_monthly}/month
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {userStats.running_channels || 0} / {userStats.limits?.max_concurrent_streams || 0} Active Streams
                </p>
                <p className="text-sm text-gray-600">
                  {formatStorage(userStats.storage_used_mb || 0)} / {formatStorage(userStats.limits?.storage_limit_mb || 0)} Storage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.filter(plan => !plan.is_hidden).map((plan) => {
          const isCurrentPlan = userStats && userStats.plan.id === plan.id;
          const colorClass = planColors[plan.name] || 'bg-blue-500';
          const borderClass = planBorderColors[plan.name] || 'border-blue-500';

          return (
            <Card
              key={plan.id}
              className={`relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                isCurrentPlan ? `border-4 ${borderClass} bg-gradient-to-br from-white to-gray-50` : 'border-2 border-gray-200'
              }`}
            >
              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className={`${colorClass} text-white`}>
                    CURRENT PLAN
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className={`text-2xl ${isCurrentPlan ? `text-${plan.name.toLowerCase()}-600` : ''}`}>
                  {plan.name}
                </CardTitle>
                <CardDescription className="min-h-[2.5rem]">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  {billingCycle === 'monthly' ? (
                    <div className="text-4xl font-bold text-gray-900">
                      ${plan.price_monthly}
                      <span className="text-base text-gray-600 font-normal">/month</span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl font-bold text-gray-900">
                        ${plan.price_yearly}
                        <span className="text-base text-gray-600 font-normal">/year</span>
                      </div>
                      {plan.price_yearly > 0 && plan.price_monthly > 0 && (
                        <p className="text-sm text-green-600 mt-1">
                          Save ${((plan.price_monthly * 12) - plan.price_yearly).toFixed(0)}/year
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600" />
                    <span><strong>{plan.max_concurrent_streams}</strong> Concurrent Stream{plan.max_concurrent_streams > 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600" />
                    <span><strong>{formatBitrate(plan.max_bitrate)}</strong> Quality</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600" />
                    <span><strong>{formatStorage(plan.storage_limit_mb)}</strong> Storage</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="flex items-center gap-1">
                      {plan.cloud_storage_enabled ? <Cloud className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
                      {plan.cloud_storage_enabled ? 'Cloud Storage (AWS S3)' : 'Local Storage'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600" />
                    <span><strong>{formatDuration(plan.max_stream_duration)}</strong> per Stream</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600" />
                    <span><strong>{plan.max_platform_connections || 1}</strong> Platform Connection{(plan.max_platform_connections || 1) > 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {plan.custom_watermark ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <span className={plan.custom_watermark ? '' : 'text-gray-500'}>
                      Custom Watermarks
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>24/7 Support</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                {(() => {
                  // Free plan button
                  if (plan.price_monthly === 0) {
                    return (
                      <Button
                        variant="outline"
                        disabled
                        className="w-full"
                      >
                        Free Plan
                      </Button>
                    );
                  }

                  // Current plan button
                  if (isCurrentPlan) {
                    return (
                      <Button variant="outline" disabled className="w-full">
                        Subscribed
                      </Button>
                    );
                  }

                  // Determine if upgrade or downgrade
                  const currentPrice = userStats?.plan?.price_monthly || 0;
                  const newPrice = plan.price_monthly;
                  const isUpgrade = newPrice > currentPrice;
                  const isDowngrade = currentPrice > 0 && newPrice < currentPrice;

                  // Disable downgrades to prevent credit balance issues
                  if (isDowngrade) {
                    return (
                      <Button
                        variant="outline"
                        disabled
                        className="w-full"
                        title="Downgrades are not available. Please contact support."
                      >
                        Contact Support
                      </Button>
                    );
                  }

                  let buttonText = 'Select Plan';
                  if (processingPlan === plan.id) {
                    buttonText = 'Processing...';
                  } else if (isUpgrade) {
                    buttonText = 'Upgrade';
                  }

                  return (
                    <Button
                      onClick={() => handleSelectPlan(plan, billingCycle)}
                      disabled={processingPlan === plan.id || (billingCycle === 'yearly' && (!plan.price_yearly || plan.price_yearly === 0))}
                      className={`w-full ${colorClass} hover:opacity-90`}
                    >
                      {buttonText}
                    </Button>
                  );
                })()}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Payment Note */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-900 text-center">
          💳 Secure payments powered by Stripe. Your subscription will auto-renew each month.
          {paymentMethod && (
            <span className="block mt-2">
              Card on file: •••• {paymentMethod.card?.last4} ({paymentMethod.card?.brand})
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Upgrade Confirmation Modal */}
      {showConfirmModal && upgradePreview && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">Confirm Plan {upgradePreview.currentPlan.price < upgradePreview.newPlan.price ? 'Upgrade' : 'Downgrade'}</h2>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Current Plan:</span>
                  <span className="font-semibold">{upgradePreview.currentPlan.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">New Plan:</span>
                  <span className="font-semibold">{selectedPlan.name} (${selectedPlan.billingCycle === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly}/{selectedPlan.billingCycle === 'monthly' ? 'mo' : 'yr'})</span>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600 mb-2">Charge Breakdown:</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>New plan charge:</span>
                    <span>${upgradePreview.proration.newPlanCharge?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Credit for unused time:</span>
                    <span>-${upgradePreview.proration.credit?.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Amount to charge today:</span>
                    <span className="text-blue-600">${upgradePreview.proration.dueNow?.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Remaining days in billing period: {upgradePreview.proration.remainingDays}
                </div>
              </div>

              {paymentMethod && (
                <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Will be charged to card ending in {paymentMethod.card?.last4}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedPlan(null);
                  setUpgradePreview(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmUpgrade}
                disabled={processingPlan === selectedPlan.id}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {processingPlan === selectedPlan.id ? 'Processing...' : 'Confirm & Pay'}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your card will be charged immediately. You'll receive a receipt via email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Plans;
