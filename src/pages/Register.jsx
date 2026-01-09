import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { signInWithGoogle, signInWithFacebook, signInWithTwitter, isFirebaseAvailable } from '../config/firebase';

function Register() {
  const navigate = useNavigate();
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
  const [socialLoading, setSocialLoading] = useState(null);

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

  const handleSocialSignup = async (provider, signInFunction) => {
    setError('');
    setSocialLoading(provider);

    try {
      const result = await signInFunction();
      const idToken = await result.user.getIdToken();

      const response = await api.post('/auth/social-login', {
        idToken,
        provider
      });

      // Store token and redirect
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Signup cancelled');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Please allow popups for this site');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different login method');
      } else {
        setError(err.response?.data?.error || err.message || 'Social signup failed');
      }
    } finally {
      setSocialLoading(null);
    }
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

          {isFirebaseAvailable() && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  disabled={socialLoading !== null}
                  onClick={() => handleSocialSignup('google', signInWithGoogle)}
                  className="w-full"
                >
                  {socialLoading === 'google' ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={socialLoading !== null}
                  onClick={() => handleSocialSignup('facebook', signInWithFacebook)}
                  className="w-full"
                >
                  {socialLoading === 'facebook' ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={socialLoading !== null}
                  onClick={() => handleSocialSignup('twitter', signInWithTwitter)}
                  className="w-full"
                >
                  {socialLoading === 'twitter' ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  )}
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
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
