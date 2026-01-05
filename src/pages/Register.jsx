import React, { useState, useEffect } from 'react';
import api from '../services/api';

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
      <div className="login-container">
        <div className="login-card">
          <h1>Registration Successful!</h1>
          <div className="alert alert-success">
            Your account has been created. Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '600px' }}>
        <h1>Create Account</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Sign up to start streaming to multiple platforms
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
            <small style={{ color: '#666' }}>Minimum 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-control"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan_id">Select Plan</label>
            <select
              id="plan_id"
              name="plan_id"
              className="form-control"
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
            <div style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>
                {selectedPlan.name} Plan
              </h3>
              <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                {selectedPlan.description}
              </p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>{selectedPlan.max_concurrent_streams} concurrent stream{selectedPlan.max_concurrent_streams > 1 ? 's' : ''}</li>
                <li>Up to {selectedPlan.max_bitrate}k bitrate ({selectedPlan.max_bitrate >= 6000 ? '1080p' : selectedPlan.max_bitrate >= 4000 ? '720p' : '480p'})</li>
                <li>{selectedPlan.max_stream_duration ? `${selectedPlan.max_stream_duration} min per stream` : 'Unlimited stream duration'}</li>
                <li>{selectedPlan.storage_limit_mb}MB storage</li>
                <li>{selectedPlan.custom_watermark ? 'Custom watermark' : 'No custom watermark'}</li>
              </ul>
              {selectedPlan.price_monthly > 0 && (
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Billing Cycle</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="radio"
                        name="subscription_type"
                        value="monthly"
                        checked={formData.subscription_type === 'monthly'}
                        onChange={handleChange}
                      />
                      <span>Monthly (${selectedPlan.price_monthly}/mo)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="radio"
                        name="subscription_type"
                        value="yearly"
                        checked={formData.subscription_type === 'yearly'}
                        onChange={handleChange}
                      />
                      <span>Yearly (${selectedPlan.price_yearly}/yr - Save ${(selectedPlan.price_monthly * 12 - selectedPlan.price_yearly)})</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#666' }}>
              Already have an account?{' '}
              <a href="/" style={{ color: '#007bff' }}>
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
