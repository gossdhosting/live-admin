import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';

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
        {plans.map((plan) => {
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
                  <div className="text-4xl font-bold text-gray-900">
                    ${plan.price_monthly}
                    <span className="text-base text-gray-600 font-normal">/month</span>
                  </div>
                  {plan.price_yearly > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      or ${plan.price_yearly}/year (Save ${((plan.price_monthly * 12) - plan.price_yearly).toFixed(0)})
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 text-lg">✓</span>
                    <span><strong>{plan.max_concurrent_streams}</strong> Concurrent Stream{plan.max_concurrent_streams > 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 text-lg">✓</span>
                    <span><strong>{formatBitrate(plan.max_bitrate)}</strong> Quality</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 text-lg">✓</span>
                    <span><strong>{formatStorage(plan.storage_limit_mb)}</strong> Storage</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 text-lg">✓</span>
                    <span><strong>{formatDuration(plan.max_stream_duration)}</strong> per Stream</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className={`text-lg ${plan.custom_watermark ? 'text-green-600' : 'text-red-600'}`}>
                      {plan.custom_watermark ? '✓' : '✗'}
                    </span>
                    <span className={plan.custom_watermark ? '' : 'text-gray-500'}>
                      Custom Watermarks
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 text-lg">✓</span>
                    <span>Multi-platform Streaming</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 text-lg">✓</span>
                    <span>24/7 Support</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <Button variant="outline" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => alert('Payment integration coming soon!')}
                    className={`w-full ${colorClass} hover:opacity-90`}
                  >
                    {userStats && userStats.plan.price_monthly < plan.price_monthly ? 'Upgrade' : 'Select'} Plan
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Payment Note */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-900 text-center">
          Payment integration coming soon. Contact administrator for plan upgrades.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default Plans;
