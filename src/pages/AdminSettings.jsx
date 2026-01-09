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
import { Settings as SettingsIcon, Users, Gem, Mail, FileText, Bell } from 'lucide-react';

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

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchSettings();
  }, [user, navigate]);

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
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto gap-1">
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
                      placeholder="noreply@zebcast.app"
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
                      placeholder="ZebCast"
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
                    placeholder='</div><p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">© 2026 ZebCast. All rights reserved.</p></div>'
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
                    placeholder={'<h2>Welcome to ZebCast!</h2><p>Hi ${name},</p><p>Thank you for registering...</p>'}
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

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>

            {/* Plans Tab */}
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
