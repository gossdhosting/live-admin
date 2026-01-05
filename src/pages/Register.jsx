import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    plan_id: '',
    subscription_type: 'monthly'
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      setPlans(response.data.plans);
      // Set default to Free plan
      const freePlan = response.data.plans.find(p => p.name === 'Free');
      if (freePlan) {
        setFormData(prev => ({ ...prev, plan_id: freePlan.id }));
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/users/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        plan_id: formData.plan_id,
        subscription_type: formData.subscription_type
      });

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getSelectedPlan = () => {
    return plans.find(p => p.id === parseInt(formData.plan_id));
  };

  const selectedPlan = getSelectedPlan();

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Registration Successful!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="success">
              <AlertDescription>
                Your account has been created. Redirecting to login...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Sign up to start streaming to multiple platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength="6"
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_id">Select Plan</Label>
              <select
                id="plan_id"
                name="plan_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.plan_id}
                onChange={handleChange}
                required
              >
                <option value="">Choose a plan...</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price_monthly}/month
                  </option>
                ))}
              </select>
            </div>

            {selectedPlan && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {selectedPlan.name} Plan
                    <Badge variant={selectedPlan.price_monthly === 0 ? 'secondary' : 'default'}>
                      ${selectedPlan.price_monthly}/mo
                    </Badge>
                  </CardTitle>
                  <CardDescription>{selectedPlan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      {selectedPlan.max_concurrent_streams} concurrent stream{selectedPlan.max_concurrent_streams > 1 ? 's' : ''}
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      Up to {selectedPlan.max_bitrate}k bitrate ({selectedPlan.max_bitrate >= 6000 ? '1080p' : selectedPlan.max_bitrate >= 4000 ? '720p' : '480p'})
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      {selectedPlan.max_stream_duration ? `${selectedPlan.max_stream_duration} min per stream` : 'Unlimited stream duration'}
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      {selectedPlan.storage_limit_mb}MB storage
                    </li>
                    <li className="flex items-center">
                      <span className={`mr-2 ${selectedPlan.custom_watermark ? "text-green-600" : "text-muted-foreground"}`}>
                        {selectedPlan.custom_watermark ? '✓' : '✗'}
                      </span>
                      {selectedPlan.custom_watermark ? 'Custom watermark' : 'No custom watermark'}
                    </li>
                  </ul>

                  {selectedPlan.price_monthly > 0 && (
                    <div className="pt-4 space-y-2">
                      <Label>Billing Cycle</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="subscription_type"
                            value="monthly"
                            checked={formData.subscription_type === 'monthly'}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">Monthly (${selectedPlan.price_monthly}/mo)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="subscription_type"
                            value="yearly"
                            checked={formData.subscription_type === 'yearly'}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">
                            Yearly (${selectedPlan.price_yearly}/yr - Save ${(selectedPlan.price_monthly * 12 - selectedPlan.price_yearly)})
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default Register;
