import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import UserManagement from '../components/UserManagement';
import PlanManagement from '../components/PlanManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Settings as SettingsIcon, Users, Gem, Mail, FileText, Bell, CreditCard, Ticket } from 'lucide-react';

function AdminSettings({ user }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('system');
  const [watermarkFile, setWatermarkFile] = useState(null);
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testingSMTP, setTestingSMTP] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState('');
  const [testingPushover, setTestingPushover] = useState(false);
  const [pushoverMessage, setPushoverMessage] = useState('');
  const [paymentSettings, setPaymentSettings] = useState({});
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    duration: 'once',
    durationMonths: '',
    maxRedemptions: '',
    validFrom: '',
    validUntil: '',
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchSettings();
    fetchPaymentSettings();
  }, [user, navigate]);

  const fetchPaymentSettings = async () => {
    try {
      const response = await api.get('/billing/admin/settings');
      setPaymentSettings(response.data.settings || {});
    } catch (error) {
      console.error('Failed to fetch payment settings:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentMessage('');
    setSavingPayment(true);

    try {
      // Prepare data, excluding masked values (don't send them at all)
      const dataToSend = {};

      Object.keys(paymentSettings).forEach(key => {
        const value = paymentSettings[key];
        // Only include non-masked values or mode
        // Check if value is a string before calling includes()
        if (key === 'mode' || (value && typeof value === 'string' && !value.includes('••••'))) {
          dataToSend[key] = value;
        }
      });

      await api.put('/billing/admin/settings', dataToSend);

      // Refresh settings to get the latest masked values
      await fetchPaymentSettings();

      setPaymentMessage('Payment settings saved successfully');
      setTimeout(() => setPaymentMessage(''), 3000);
    } catch (error) {
      setPaymentMessage('Failed to save payment settings: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingPayment(false);
    }
  };

  const handlePaymentChange = (key, value) => {
    setPaymentSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const response = await api.get('/billing/admin/coupons');
      setCoupons(response.data.coupons || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setCouponMessage('');
    setCreatingCoupon(true);

    try {
      await api.post('/billing/admin/coupons', couponFormData);
      setCouponMessage('Coupon created successfully');
      setCouponFormData({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        duration: 'once',
        durationMonths: '',
        maxRedemptions: '',
        validFrom: '',
        validUntil: '',
      });
      await fetchCoupons();
      setTimeout(() => setCouponMessage(''), 3000);
    } catch (error) {
      setCouponMessage('Failed to create coupon: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      await api.delete(`/billing/admin/coupons/${id}`);
      await fetchCoupons();
    } catch (error) {
      alert('Failed to delete coupon: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleCoupon = async (id, currentStatus) => {
    try {
      await api.put(`/billing/admin/coupons/${id}`, {
        isActive: !currentStatus,
      });
      await fetchCoupons();
    } catch (error) {
      alert('Failed to update coupon: ' + (error.response?.data?.error || error.message));
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const settingsObj = {};
      response.data.settings.forEach((s) => {
        settingsObj[s.key] = s.value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSaving(true);

    try {
      await api.put('/settings', { settings });
      setMessage('Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleWatermarkUpload = async () => {
    if (!watermarkFile) {
      setMessage('Please select a watermark file');
      return;
    }

    setWatermarkUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('watermark', watermarkFile);

      const response = await api.post('/settings/default-watermark', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage('Default watermark uploaded successfully');
      setWatermarkFile(null);
      setWatermarkPreview(null);

      // Update settings to reflect new watermark path
      setSettings((prev) => ({
        ...prev,
        default_watermark_path: response.data.path,
      }));

      // Refresh settings from server to get updated path
      await fetchSettings();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to upload watermark');
    } finally {
      setWatermarkUploading(false);
    }
  };

  const handleWatermarkDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the default watermark?')) {
      return;
    }

    setMessage('');

    try {
      await api.delete('/settings/default-watermark');
      setMessage('Default watermark deleted successfully');

      // Update settings to reflect deletion
      setSettings((prev) => ({
        ...prev,
        default_watermark_path: '',
      }));

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete watermark');
    }
  };

  const handleWatermarkFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setWatermarkFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestSMTP = async () => {
    if (!testEmail) {
      setSmtpMessage('Please enter a test email address');
      setTimeout(() => setSmtpMessage(''), 3000);
      return;
    }

    setTestingSMTP(true);
    setSmtpMessage('');

    try {
      const response = await api.post('/settings/test-smtp', { testEmail });
      setSmtpMessage(response.data.message);
      setTimeout(() => setSmtpMessage(''), 5000);
    } catch (error) {
      setSmtpMessage(error.response?.data?.error || 'Failed to send test email');
      setTimeout(() => setSmtpMessage(''), 5000);
    } finally {
      setTestingSMTP(false);
    }
  };

  const handleTestPushover = async () => {
    setTestingPushover(true);
    setPushoverMessage('');

    try {
      const response = await api.post('/settings/test-pushover');
      setPushoverMessage(response.data.message);
      setTimeout(() => setPushoverMessage(''), 5000);
    } catch (error) {
      setPushoverMessage(error.response?.data?.error || 'Failed to send notification');
      setTimeout(() => setPushoverMessage(''), 5000);
    } finally {
      setTestingPushover(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        Loading admin settings...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Admin Settings</CardTitle>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8 h-auto gap-1">
              <TabsTrigger value="system" className="text-xs sm:text-sm gap-1.5 py-2">
                <SettingsIcon className="w-4 h-4" />
                <span className="hidden sm:inline">System</span>
              </TabsTrigger>
              <TabsTrigger value="smtp" className="text-xs sm:text-sm gap-1.5 py-2">
                <Mail className="w-4 h-4" />
                <span>SMTP</span>
              </TabsTrigger>
              <TabsTrigger value="email-templates" className="text-xs sm:text-sm gap-1.5 py-2">
                <FileText className="w-4 h-4" />
                <span>Email</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs sm:text-sm gap-1.5 py-2">
                <Bell className="w-4 h-4" />
                <span>Notify</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="text-xs sm:text-sm gap-1.5 py-2">
                <CreditCard className="w-4 h-4" />
                <span>Payment</span>
              </TabsTrigger>
              <TabsTrigger value="coupons" className="text-xs sm:text-sm gap-1.5 py-2" onClick={fetchCoupons}>
                <Ticket className="w-4 h-4" />
                <span>Coupons</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm gap-1.5 py-2">
                <Users className="w-4 h-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="text-xs sm:text-sm gap-1.5 py-2">
                <Gem className="w-4 h-4" />
                <span>Plans</span>
              </TabsTrigger>
            </TabsList>

            {/* System Settings Tab */}
            <TabsContent value="system" className="mt-6 space-y-6">
              {message && (
                <Alert className={message.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={message.includes('success') ? 'text-green-800' : 'text-red-800'}>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hls_segment_duration">HLS Segment Duration (seconds)</Label>
                  <Input
                    type="number"
                    id="hls_segment_duration"
                    value={settings.hls_segment_duration || ''}
                    onChange={(e) => handleChange('hls_segment_duration', e.target.value)}
                    min="1"
                    max="10"
                  />
                  <p className="text-sm text-gray-500">
                    Recommended: 4 seconds. Lower values reduce latency but increase bandwidth.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hls_list_size">HLS Playlist Size (segments)</Label>
                  <Input
                    type="number"
                    id="hls_list_size"
                    value={settings.hls_list_size || ''}
                    onChange={(e) => handleChange('hls_list_size', e.target.value)}
                    min="3"
                    max="20"
                  />
                  <p className="text-sm text-gray-500">
                    Number of segments to keep in the playlist. Recommended: 6
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_concurrent_streams">Max Concurrent Streams</Label>
                  <Input
                    type="number"
                    id="max_concurrent_streams"
                    value={settings.max_concurrent_streams || ''}
                    onChange={(e) => handleChange('max_concurrent_streams', e.target.value)}
                    min="1"
                    max="100"
                  />
                  <p className="text-sm text-gray-500">
                    Maximum number of streams that can run simultaneously.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ffmpeg_threading">FFmpeg Threading Mode</Label>
                  <select
                    id="ffmpeg_threading"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={settings.ffmpeg_threading || 'auto'}
                    onChange={(e) => handleChange('ffmpeg_threading', e.target.value)}
                  >
                    <option value="auto">Auto (Recommended - Uses all CPU cores)</option>
                    <option value="1">Single Thread (Lower CPU usage, slower encoding)</option>
                    <option value="2">2 Threads</option>
                    <option value="4">4 Threads</option>
                    <option value="8">8 Threads</option>
                  </select>
                  <p className="text-sm text-gray-500">
                    Auto mode uses all available CPU cores for faster encoding. Use single thread for low-resource VPS.
                    <br />
                    <strong>Note:</strong> Changes apply to newly started streams only. Restart existing streams to apply.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4">Default Watermark</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This watermark will be applied to streams for users who don't have custom watermark permission.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_watermark_enabled">Enable Default Watermark</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="default_watermark_enabled"
                        checked={settings.default_watermark_enabled === '1'}
                        onChange={(e) => handleChange('default_watermark_enabled', e.target.checked ? '1' : '0')}
                        className="h-4 w-4"
                      />
                      <label htmlFor="default_watermark_enabled" className="text-sm">
                        Show default watermark for users without custom watermark permission
                      </label>
                    </div>
                  </div>

                  {settings.default_watermark_path && (
                    <div className="space-y-2">
                      <Label>Current Watermark</Label>
                      <div className="flex items-center gap-4">
                        <div className="p-4 border rounded bg-gray-50">
                          <img
                            src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace('/api', '')}/${settings.default_watermark_path.replace(/\\/g, '/')}`}
                            alt="Default watermark"
                            className="max-h-32 max-w-xs object-contain"
                            onError={(e) => {
                              console.error('Failed to load watermark:', e.target.src);
                              e.target.alt = 'Watermark file not accessible';
                            }}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          onClick={handleWatermarkDelete}
                          size="sm"
                        >
                          Delete Watermark
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="watermark_file">Upload New Watermark</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        id="watermark_file"
                        accept="image/*"
                        onChange={handleWatermarkFileChange}
                      />
                      <Button
                        onClick={handleWatermarkUpload}
                        disabled={!watermarkFile || watermarkUploading}
                      >
                        {watermarkUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                    {watermarkPreview && (
                      <div className="mt-2 p-4 border rounded bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">Preview:</p>
                        <img
                          src={watermarkPreview}
                          alt="Watermark preview"
                          className="max-h-32 max-w-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="space-y-2">
                      <Label htmlFor="default_watermark_position">Position</Label>
                      <select
                        id="default_watermark_position"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={settings.default_watermark_position || 'bottom-right'}
                        onChange={(e) => handleChange('default_watermark_position', e.target.value)}
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="center">Center</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_watermark_opacity">Opacity</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="range"
                          id="default_watermark_opacity"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.default_watermark_opacity || '0.7'}
                          onChange={(e) => handleChange('default_watermark_opacity', e.target.value)}
                        />
                        <span className="text-sm w-12">{settings.default_watermark_opacity || '0.7'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_watermark_scale">Scale</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="range"
                        id="default_watermark_scale"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={settings.default_watermark_scale || '0.15'}
                        onChange={(e) => handleChange('default_watermark_scale', e.target.value)}
                      />
                      <span className="text-sm w-12">{settings.default_watermark_scale || '0.15'}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Scale relative to video size (0.15 = 15% of video width)
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmit} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Watermark Settings'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4">Server Information</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>HLS Base Path:</strong> /var/www/hls (configured on backend)
                  </p>
                  <p>
                    <strong>FFmpeg Path:</strong> /usr/bin/ffmpeg (configured on backend)
                  </p>
                  <p className="text-gray-500">
                    Update these values in the backend .env file
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* SMTP Settings Tab */}
            <TabsContent value="smtp" className="mt-6 space-y-6">
              {smtpMessage && (
                <Alert className={smtpMessage.includes('success') || smtpMessage.includes('sent') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={smtpMessage.includes('success') || smtpMessage.includes('sent') ? 'text-green-800' : 'text-red-800'}>
                    {smtpMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Email Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure SMTP settings for sending email notifications (stream alerts, user notifications, etc.)
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">SMTP Host *</Label>
                    <Input
                      type="text"
                      id="smtp_host"
                      placeholder="smtp.gmail.com"
                      value={settings.smtp_host || ''}
                      onChange={(e) => handleChange('smtp_host', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Your SMTP server address
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">SMTP Port *</Label>
                    <Input
                      type="number"
                      id="smtp_port"
                      placeholder="587"
                      value={settings.smtp_port || ''}
                      onChange={(e) => handleChange('smtp_port', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Common: 587 (TLS), 465 (SSL), 25 (no encryption)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_secure">Use SSL/TLS</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtp_secure"
                      checked={settings.smtp_secure === '1'}
                      onChange={(e) => handleChange('smtp_secure', e.target.checked ? '1' : '0')}
                      className="h-4 w-4"
                    />
                    <label htmlFor="smtp_secure" className="text-sm">
                      Enable SSL/TLS encryption (recommended for port 465)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    For port 587, leave unchecked (it uses STARTTLS automatically)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_user">SMTP Username *</Label>
                    <Input
                      type="text"
                      id="smtp_user"
                      placeholder="your-email@example.com"
                      value={settings.smtp_user || ''}
                      onChange={(e) => handleChange('smtp_user', e.target.value)}
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">SMTP Password *</Label>
                    <Input
                      type="password"
                      id="smtp_password"
                      placeholder="••••••••"
                      value={settings.smtp_password || ''}
                      onChange={(e) => handleChange('smtp_password', e.target.value)}
                      autoComplete="current-password"
                    />
                    <p className="text-xs text-gray-500">
                      For Gmail, use an App Password
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_from_email">From Email Address *</Label>
                    <Input
                      type="email"
                      id="smtp_from_email"
                      placeholder="noreply@rexstream.net"
                      value={settings.smtp_from_email || ''}
                      onChange={(e) => handleChange('smtp_from_email', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Email address shown as sender
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_from_name">From Name</Label>
                    <Input
                      type="text"
                      id="smtp_from_name"
                      placeholder="RexStream"
                      value={settings.smtp_from_name || ''}
                      onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Display name for sender
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save SMTP Settings'}
                  </Button>
                </div>
              </form>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Test SMTP Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send a test email to verify your SMTP settings are working correctly.
                </p>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Enter test email address"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleTestSMTP}
                    disabled={testingSMTP || !testEmail}
                  >
                    {testingSMTP ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="font-semibold text-blue-900 mb-2">Gmail Configuration Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Enable 2-Step Verification in your Google Account</li>
                    <li>Generate an App Password at: myaccount.google.com/apppasswords</li>
                    <li>Use smtp.gmail.com as host, port 587, SSL/TLS unchecked</li>
                    <li>Use your Gmail address as username and the App Password as password</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Email Templates Tab */}
            <TabsContent value="email-templates" className="mt-6 space-y-6">
              {message && (
                <Alert className={message.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={message.includes('success') ? 'text-green-800' : 'text-red-800'}>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Email Templates</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Customize email templates sent to users. Use variables like {'${name}'}, {'${email}'}, {'${resetLink}'} in your templates.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email_header">Email Header</Label>
                  <textarea
                    id="email_header"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.email_header || ''}
                    onChange={(e) => handleChange('email_header', e.target.value)}
                    placeholder='<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;"><div style="background: white; padding: 20px; border-radius: 8px;">'
                  />
                  <p className="text-sm text-gray-500">
                    HTML header added to all emails (logo, branding, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_footer">Email Footer</Label>
                  <textarea
                    id="email_footer"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.email_footer || ''}
                    onChange={(e) => handleChange('email_footer', e.target.value)}
                    placeholder='</div><p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">© 2026 RexStream. All rights reserved.</p></div>'
                  />
                  <p className="text-sm text-gray-500">
                    HTML footer added to all emails (copyright, unsubscribe, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_template_registration">Registration Email Template</Label>
                  <textarea
                    id="email_template_registration"
                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.email_template_registration || ''}
                    onChange={(e) => handleChange('email_template_registration', e.target.value)}
                    placeholder={'<h2>Welcome to RexStream!</h2><p>Hi ${name},</p><p>Thank you for registering...</p>'}
                  />
                  <p className="text-sm text-gray-500">
                    Variables: {'${name}'}, {'${email}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_template_forgot_password">Forgot Password Email Template</Label>
                  <textarea
                    id="email_template_forgot_password"
                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.email_template_forgot_password || ''}
                    onChange={(e) => handleChange('email_template_forgot_password', e.target.value)}
                    placeholder={'<h2>Reset Your Password</h2><p>Click the button below:</p><a href="${resetLink}" style="...">Reset Password</a>'}
                  />
                  <p className="text-sm text-gray-500">
                    Variables: {'${resetLink}'} (required)
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Email Templates'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="mt-6 space-y-6">
              {pushoverMessage && (
                <Alert className={pushoverMessage.includes('success') || pushoverMessage.includes('sent') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={pushoverMessage.includes('success') || pushoverMessage.includes('sent') ? 'text-green-800' : 'text-red-800'}>
                    {pushoverMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure email and push notifications for admin alerts
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Admin Email Notifications */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-semibold">Admin Email Notifications</h4>

                  <div className="space-y-2">
                    <Label htmlFor="admin_notification_email">Admin Email Address</Label>
                    <Input
                      type="email"
                      id="admin_notification_email"
                      placeholder="admin@example.com"
                      value={settings.admin_notification_email || ''}
                      onChange={(e) => handleChange('admin_notification_email', e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Email address to receive admin notifications (new signups, etc.)
                    </p>
                  </div>
                </div>

                {/* Pushover Settings */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-semibold">Pushover Push Notifications</h4>
                  <p className="text-sm text-gray-600">
                    Get instant push notifications on your phone via <a href="https://pushover.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Pushover</a>
                  </p>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pushover_enabled"
                      checked={settings.pushover_enabled === 'true'}
                      onChange={(e) => handleChange('pushover_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="pushover_enabled" className="cursor-pointer">
                      Enable Pushover Notifications
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pushover_token">Application Token</Label>
                    <Input
                      type="text"
                      id="pushover_token"
                      placeholder="azGDORePK8gMaC0QOYAMyEEuzJnyUi"
                      value={settings.pushover_token || ''}
                      onChange={(e) => handleChange('pushover_token', e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Get your API token from <a href="https://pushover.net/apps/build" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">pushover.net/apps/build</a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pushover_user">User Key</Label>
                    <Input
                      type="text"
                      id="pushover_user"
                      placeholder="uQiRzpo4DXghDmr9QzzfQu27cmVRsG"
                      value={settings.pushover_user || ''}
                      onChange={(e) => handleChange('pushover_user', e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Find your user key at <a href="https://pushover.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">pushover.net</a> (top right)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleTestPushover}
                      disabled={testingPushover || !settings.pushover_token || !settings.pushover_user}
                      variant="outline"
                    >
                      {testingPushover ? 'Sending...' : 'Test Notification'}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Payment Settings Tab */}
            <TabsContent value="payment" className="mt-6">
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                {paymentMessage && (
                  <Alert className={paymentMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <AlertDescription className={paymentMessage.includes('success') ? 'text-green-800' : 'text-red-800'}>
                      {paymentMessage}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Stripe Configuration</h3>
                  <p className="text-sm text-gray-600">
                    Configure Stripe payment gateway for subscription billing. Get your API keys from{' '}
                    <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Stripe Dashboard
                    </a>
                  </p>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="mode">Active Mode</Label>
                      <select
                        id="mode"
                        value={paymentSettings.mode || 'sandbox'}
                        onChange={(e) => handlePaymentChange('mode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="sandbox">Sandbox (Test Mode)</option>
                        <option value="live">Live (Production)</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Switch between sandbox and live keys. Configure both sets of keys below.
                      </p>
                    </div>

                    {/* Sandbox Keys Section */}
                    <div className="border border-blue-300 bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <span>🧪</span> Sandbox Keys (Test Mode)
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="stripe_publishable_key_sandbox">Sandbox Publishable Key</Label>
                          <Input
                            id="stripe_publishable_key_sandbox"
                            type="text"
                            value={paymentSettings.stripe_publishable_key_sandbox || ''}
                            onChange={(e) => handlePaymentChange('stripe_publishable_key_sandbox', e.target.value)}
                            placeholder="pk_test_..."
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label htmlFor="stripe_secret_key_sandbox">Sandbox Secret Key</Label>
                          <Input
                            id="stripe_secret_key_sandbox"
                            type="password"
                            value={paymentSettings.stripe_secret_key_sandbox || ''}
                            onChange={(e) => handlePaymentChange('stripe_secret_key_sandbox', e.target.value)}
                            placeholder="sk_test_..."
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label htmlFor="stripe_webhook_secret_sandbox">Sandbox Webhook Secret</Label>
                          <Input
                            id="stripe_webhook_secret_sandbox"
                            type="password"
                            value={paymentSettings.stripe_webhook_secret_sandbox || ''}
                            onChange={(e) => handlePaymentChange('stripe_webhook_secret_sandbox', e.target.value)}
                            placeholder="whsec_..."
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Keys Section */}
                    <div className="border border-red-300 bg-red-50 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <span>🔴</span> Live Keys (Production Mode)
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="stripe_publishable_key_live">Live Publishable Key</Label>
                          <Input
                            id="stripe_publishable_key_live"
                            type="text"
                            value={paymentSettings.stripe_publishable_key_live || ''}
                            onChange={(e) => handlePaymentChange('stripe_publishable_key_live', e.target.value)}
                            placeholder="pk_live_..."
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label htmlFor="stripe_secret_key_live">Live Secret Key</Label>
                          <Input
                            id="stripe_secret_key_live"
                            type="password"
                            value={paymentSettings.stripe_secret_key_live || ''}
                            onChange={(e) => handlePaymentChange('stripe_secret_key_live', e.target.value)}
                            placeholder="sk_live_..."
                            className="bg-white"
                          />
                          <p className="text-sm text-red-600 mt-1">
                            ⚠️ Keep this secret! Never share or expose this key.
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="stripe_webhook_secret_live">Live Webhook Secret</Label>
                          <Input
                            id="stripe_webhook_secret_live"
                            type="password"
                            value={paymentSettings.stripe_webhook_secret_live || ''}
                            onChange={(e) => handlePaymentChange('stripe_webhook_secret_live', e.target.value)}
                            placeholder="whsec_..."
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        <strong>Webhook endpoint:</strong>{' '}
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {window.location.origin}/api/webhooks/stripe
                        </code>
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h4>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Create a Stripe account at <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="underline">stripe.com</a></li>
                        <li>Get your API keys from the Developers section</li>
                        <li>Create products and prices for your plans in Stripe</li>
                        <li>Add the Stripe Price IDs to your plans in the Plans tab</li>
                        <li>Configure webhooks to receive real-time updates</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchPaymentSettings}
                    disabled={savingPayment}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={savingPayment}>
                    {savingPayment ? 'Saving...' : 'Save Payment Settings'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>

            {/* Plans Tab */}
            {/* Coupons Tab */}
            <TabsContent value="coupons" className="mt-6">
              <div className="space-y-6">
                {couponMessage && (
                  <Alert className={couponMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <AlertDescription className={couponMessage.includes('success') ? 'text-green-800' : 'text-red-800'}>
                      {couponMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Create Coupon Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Coupon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateCoupon} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="coupon_code">Coupon Code *</Label>
                          <Input
                            id="coupon_code"
                            type="text"
                            value={couponFormData.code}
                            onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                            placeholder="SUMMER2024"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="discount_type">Discount Type *</Label>
                          <select
                            id="discount_type"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={couponFormData.discountType}
                            onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value })}
                          >
                            <option value="percentage">Percentage Off</option>
                            <option value="fixed">Fixed Amount Off</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="discount_value">
                            Discount Value * {couponFormData.discountType === 'percentage' ? '(%)' : '($)'}
                          </Label>
                          <Input
                            id="discount_value"
                            type="number"
                            step={couponFormData.discountType === 'percentage' ? '1' : '0.01'}
                            min="0"
                            max={couponFormData.discountType === 'percentage' ? '100' : undefined}
                            value={couponFormData.discountValue}
                            onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration *</Label>
                          <select
                            id="duration"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={couponFormData.duration}
                            onChange={(e) => setCouponFormData({ ...couponFormData, duration: e.target.value })}
                          >
                            <option value="once">Once</option>
                            <option value="repeating">Repeating</option>
                            <option value="forever">Forever</option>
                          </select>
                        </div>

                        {couponFormData.duration === 'repeating' && (
                          <div className="space-y-2">
                            <Label htmlFor="duration_months">Duration (Months)</Label>
                            <Input
                              id="duration_months"
                              type="number"
                              min="1"
                              value={couponFormData.durationMonths}
                              onChange={(e) => setCouponFormData({ ...couponFormData, durationMonths: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="max_redemptions">Max Redemptions</Label>
                          <Input
                            id="max_redemptions"
                            type="number"
                            min="1"
                            value={couponFormData.maxRedemptions}
                            onChange={(e) => setCouponFormData({ ...couponFormData, maxRedemptions: e.target.value })}
                            placeholder="Unlimited"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="valid_from">Valid From</Label>
                          <Input
                            id="valid_from"
                            type="datetime-local"
                            value={couponFormData.validFrom}
                            onChange={(e) => setCouponFormData({ ...couponFormData, validFrom: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="valid_until">Valid Until</Label>
                          <Input
                            id="valid_until"
                            type="datetime-local"
                            value={couponFormData.validUntil}
                            onChange={(e) => setCouponFormData({ ...couponFormData, validUntil: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={creatingCoupon}>
                          {creatingCoupon ? 'Creating...' : 'Create Coupon'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Coupons List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Existing Coupons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingCoupons ? (
                      <div className="text-center py-8">Loading coupons...</div>
                    ) : coupons.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No coupons created yet</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4">Code</th>
                              <th className="text-left py-3 px-4">Discount</th>
                              <th className="text-left py-3 px-4">Duration</th>
                              <th className="text-left py-3 px-4">Redeemed</th>
                              <th className="text-left py-3 px-4">Status</th>
                              <th className="text-left py-3 px-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {coupons.map((coupon) => (
                              <tr key={coupon.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <span className="font-mono font-semibold">{coupon.code}</span>
                                </td>
                                <td className="py-3 px-4">
                                  {coupon.discount_type === 'percentage'
                                    ? `${coupon.discount_value}%`
                                    : `$${coupon.discount_value}`}
                                </td>
                                <td className="py-3 px-4 capitalize">
                                  {coupon.duration}
                                  {coupon.duration === 'repeating' && coupon.duration_months ? ` (${coupon.duration_months}m)` : ''}
                                </td>
                                <td className="py-3 px-4">
                                  {coupon.total_redemptions || 0}
                                  {coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ' / ∞'}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {coupon.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                                    >
                                      {coupon.is_active ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteCoupon(coupon.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="plans" className="mt-6">
              <PlanManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSettings;
