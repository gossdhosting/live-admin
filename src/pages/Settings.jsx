import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import RtmpTemplatesManager from '../components/RtmpTemplatesManager';
import PlatformConnections from '../components/PlatformConnections';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

function Settings({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userSettings, setUserSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUserSettings, setSavingUserSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [userSettingsMessage, setUserSettingsMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, password, rtmp, title, platforms

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile update state
  const [profileData, setProfileData] = useState({
    email: '',
    name: '',
    currentPassword: '',
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Refs for cleanup
  const messageTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);

  useEffect(() => {
    fetchUserSettings();
    fetchUserProfile();

    // Check for URL parameters (tab selection, success/error messages from OAuth)
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const success = params.get('success');
    const error = params.get('error');

    if (tab) {
      setActiveTab(tab);
    }

    if (success) {
      const successMessages = {
        facebook_connected: 'Facebook account connected successfully!',
        youtube_connected: 'YouTube account connected successfully!',
        twitch_connected: 'Twitch account connected successfully!',
      };
      setMessage(successMessages[success] || 'Account connected successfully!');
      setTimeout(() => setMessage(''), 5000);

      // If this is a popup window (OAuth callback), close it
      if (window.opener) {
        setTimeout(() => window.close(), 1000);
      }
    }

    if (error) {
      const errorMessages = {
        facebook_auth_failed: 'Failed to connect Facebook account',
        youtube_auth_failed: 'Failed to connect YouTube account',
        twitch_auth_failed: 'Failed to connect Twitch account',
      };
      setMessage(errorMessages[error] || 'Authentication failed');
      setTimeout(() => setMessage(''), 5000);

      // If this is a popup window (OAuth callback), close it
      if (window.opener) {
        setTimeout(() => window.close(), 1000);
      }
    }

    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, [location]);

  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user-settings');
      setUserSettings(response.data.settings);
    } catch (error) {
      console.error('Failed to fetch user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setCurrentUser(response.data.user);
      setProfileData({
        email: response.data.user.email,
        name: response.data.user.name || '',
        currentPassword: '',
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleUserSettingsChange = (key, value) => {
    setUserSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUserSettingsSubmit = async (e) => {
    e.preventDefault();
    setUserSettingsMessage('');
    setSavingUserSettings(true);

    try {
      await api.put('/user-settings', { settings: userSettings });
      setUserSettingsMessage('Settings saved successfully');
      setTimeout(() => setUserSettingsMessage(''), 3000);
    } catch (error) {
      setUserSettingsMessage(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSavingUserSettings(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage('');

    if (!profileData.currentPassword) {
      setProfileMessage('Current password is required');
      return;
    }

    if (!profileData.email && !profileData.name) {
      setProfileMessage('Please enter email or name to update');
      return;
    }

    setUpdatingProfile(true);

    try {
      await api.put('/auth/profile', {
        email: profileData.email,
        name: profileData.name,
        currentPassword: profileData.currentPassword,
      });

      setProfileMessage('Profile updated successfully! Please login again with your new email.');
      setProfileData((prev) => ({ ...prev, currentPassword: '' }));

      // Logout after 2 seconds if email changed
      if (profileData.email !== currentUser.email) {
        if (logoutTimeoutRef.current) {
          clearTimeout(logoutTimeoutRef.current);
        }
        logoutTimeoutRef.current = setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else {
        // Just refresh user data
        fetchUserProfile();
      }
    } catch (error) {
      setProfileMessage(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage('All fields are required');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordMessage('Password changed successfully! Please login again.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Logout after 2 seconds
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
      logoutTimeoutRef.current = setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setPasswordMessage(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Settings</CardTitle>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="rtmp">RTMP Templates</TabsTrigger>
              <TabsTrigger value="title">Title Settings</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              {profileMessage && (
                <Alert className={profileMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={profileMessage.includes('success') ? 'text-green-800' : 'text-red-800'}>
                    {profileMessage}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    required
                    autoComplete="email"
                  />
                  <p className="text-sm text-gray-500">
                    This will be your new login email
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileCurrentPassword">Current Password * (required to confirm changes)</Label>
                  <Input
                    type="password"
                    id="profileCurrentPassword"
                    name="currentPassword"
                    value={profileData.currentPassword}
                    onChange={handleProfileChange}
                    required
                    autoComplete="current-password"
                  />
                  <p className="text-sm text-gray-500">
                    Enter your current password to confirm profile changes
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={updatingProfile}>
                    {updatingProfile ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    ℹ️ If you change your email, you'll be logged out and need to login with the new email.
                  </AlertDescription>
                </Alert>
              </form>
            </TabsContent>

            <TabsContent value="password" className="mt-6">
              {passwordMessage && (
                <Alert className={passwordMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={passwordMessage.includes('success') ? 'text-green-800' : 'text-red-800'}>
                    {passwordMessage}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password *</Label>
                  <Input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password *</Label>
                  <Input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="6"
                    autoComplete="new-password"
                  />
                  <p className="text-sm text-gray-500">
                    Minimum 6 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="6"
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>

                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertDescription className="text-yellow-800">
                    ⚠️ After changing your password, you will be logged out and need to login again.
                  </AlertDescription>
                </Alert>
              </form>
            </TabsContent>

            <TabsContent value="rtmp" className="mt-6">
              <RtmpTemplatesManager />
            </TabsContent>

            <TabsContent value="title" className="mt-6">
              <Alert className="border-green-200 bg-green-50 mb-6">
                <AlertDescription className="text-green-800">
                  <strong>ℹ️ Your Title Settings:</strong> Customize how titles appear on your streams.
                </AlertDescription>
              </Alert>

              {userSettingsMessage && (
                <Alert className={userSettingsMessage.includes('success') ? 'border-green-200 bg-green-50 mb-6' : 'border-red-200 bg-red-50 mb-6'}>
                  <AlertDescription className={userSettingsMessage.includes('success') ? 'text-green-800' : 'text-red-800'}>
                    {userSettingsMessage}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleUserSettingsSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title_bg_color">Background Color</Label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="color"
                      id="title_bg_color"
                      value={userSettings.title_bg_color || '#000000'}
                      onChange={(e) => handleUserSettingsChange('title_bg_color', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={userSettings.title_bg_color || '#000000'}
                      onChange={(e) => handleUserSettingsChange('title_bg_color', e.target.value)}
                      placeholder="#000000"
                      className="w-32"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Background color for the title overlay
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title_opacity">Background Opacity (%)</Label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      id="title_opacity"
                      min="0"
                      max="100"
                      value={userSettings.title_opacity || '80'}
                      onChange={(e) => handleUserSettingsChange('title_opacity', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={userSettings.title_opacity || '80'}
                      onChange={(e) => handleUserSettingsChange('title_opacity', e.target.value)}
                      min="0"
                      max="100"
                      className="w-20"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    0 = Transparent, 100 = Opaque. Current: {userSettings.title_opacity || '80'}%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title_position">Position</Label>
                  <select
                    id="title_position"
                    value={userSettings.title_position || 'bottom-left'}
                    onChange={(e) => handleUserSettingsChange('title_position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                  <p className="text-sm text-gray-500">
                    Position of the title overlay on the video
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title_text_color">Text Color</Label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="color"
                      id="title_text_color"
                      value={userSettings.title_text_color || '#FFFFFF'}
                      onChange={(e) => handleUserSettingsChange('title_text_color', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={userSettings.title_text_color || '#FFFFFF'}
                      onChange={(e) => handleUserSettingsChange('title_text_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="w-32"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Text color for the title
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title_font_size">Font Size (px)</Label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      id="title_font_size"
                      min="16"
                      max="72"
                      value={userSettings.title_font_size || '16'}
                      onChange={(e) => handleUserSettingsChange('title_font_size', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={userSettings.title_font_size || '16'}
                      onChange={(e) => handleUserSettingsChange('title_font_size', e.target.value)}
                      min="16"
                      max="72"
                      className="w-20"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Font size for the title text. Current: {userSettings.title_font_size || '16'}px
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title_box_padding">Box Padding (px)</Label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      id="title_box_padding"
                      min="0"
                      max="20"
                      value={userSettings.title_box_padding || '5'}
                      onChange={(e) => handleUserSettingsChange('title_box_padding', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={userSettings.title_box_padding || '5'}
                      onChange={(e) => handleUserSettingsChange('title_box_padding', e.target.value)}
                      min="0"
                      max="20"
                      className="w-20"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Padding around text inside the box. Lower = less CPU usage. Current: {userSettings.title_box_padding || '5'}px
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={savingUserSettings}>
                    {savingUserSettings ? 'Saving...' : 'Save My Settings'}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Title Overlay Preview</h3>
                <div
                  className="relative bg-slate-700 rounded-lg p-8 min-h-52 flex"
                  style={{
                    alignItems: userSettings.title_position?.startsWith('top') ? 'flex-start' : 'flex-end',
                    justifyContent: userSettings.title_position?.includes('center') ? 'center' : userSettings.title_position?.includes('right') ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      backgroundColor: userSettings.title_bg_color || '#000000',
                      opacity: (userSettings.title_opacity || 80) / 100,
                      padding: '1rem 1.5rem',
                      borderRadius: '4px',
                      color: userSettings.title_text_color || '#FFFFFF',
                      fontSize: `${userSettings.title_font_size || 16}px`,
                      fontWeight: 'bold',
                      maxWidth: '80%',
                      wordWrap: 'break-word'
                    }}
                  >
                    Example News Title Here
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This is a preview of how the title overlay will appear on your stream. Enable the title overlay when creating/editing a channel.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="platforms" className="mt-6">
              <PlatformConnections />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default Settings;
