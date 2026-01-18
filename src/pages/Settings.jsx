import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import RtmpTemplatesManager from '../components/RtmpTemplatesManager';
import PlatformConnections from '../components/PlatformConnections';
import WatermarkSettingsUser from '../components/WatermarkSettingsUser';
import StreamPreview from '../components/StreamPreview';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { User, Lock, Radio, FileText, Globe, Image as ImageIcon, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { TIMEZONES } from '../constants/timezones';

function Settings({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userSettings, setUserSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUserSettings, setSavingUserSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [userSettingsMessage, setUserSettingsMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, password, rtmp, watermark, platforms

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
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [timezoneMessage, setTimezoneMessage] = useState('');

  // Delete account state
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
        kick_connected: 'Kick account connected successfully!',
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
        kick_auth_failed: 'Failed to connect Kick account',
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

  const handleSaveTimezone = async () => {
    setTimezoneMessage('');
    setSavingTimezone(true);

    try {
      await api.put('/user-settings', { settings: { timezone: userSettings.timezone } });
      setTimezoneMessage('Timezone saved successfully');
      setTimeout(() => setTimezoneMessage(''), 3000);
    } catch (error) {
      setTimezoneMessage(error.response?.data?.error || 'Failed to save timezone');
    } finally {
      setSavingTimezone(false);
    }
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    setDeletingAccount(true);

    try {
      await api.delete('/users/me');

      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login?message=account_deleted';
    } catch (error) {
      setProfileMessage(error.response?.data?.error || 'Failed to delete account');
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
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
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="profile" className="text-xs sm:text-sm gap-1.5 py-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="password" className="text-xs sm:text-sm gap-1.5 py-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Password</span>
              </TabsTrigger>
              <TabsTrigger value="rtmp" className="text-xs sm:text-sm gap-1.5 py-2">
                <Radio className="w-4 h-4" />
                <span className="hidden sm:inline">RTMP</span>
              </TabsTrigger>
              <TabsTrigger value="watermark" className="text-xs sm:text-sm gap-1.5 py-2">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Watermark</span>
              </TabsTrigger>
              <TabsTrigger value="platforms" className="text-xs sm:text-sm gap-1.5 py-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Platforms</span>
              </TabsTrigger>
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
                  <Label htmlFor="timezone">Timezone</Label>
                  <div className="flex gap-2">
                    <select
                      id="timezone"
                      value={userSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
                      onChange={(e) => handleUserSettingsChange('timezone', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={handleSaveTimezone}
                      disabled={savingTimezone}
                      variant="outline"
                    >
                      {savingTimezone ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  {timezoneMessage && (
                    <p className={`text-sm ${timezoneMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                      {timezoneMessage}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Your timezone for scheduling streams and displaying times
                  </p>
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

              {/* Delete Account Section */}
              <div className="mt-12 pt-8 border-t border-red-200">
                <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2 mb-4">
                  <Trash2 className="w-5 h-5" />
                  Delete Account
                </h3>
                <Alert className="border-red-200 bg-red-50 mb-4">
                  <AlertDescription className="text-red-800">
                    <strong>Warning:</strong> Deleting your account is permanent and cannot be undone. This will:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Stop all running streams immediately</li>
                      <li>Delete all your channels and their configurations</li>
                      <li>Delete all your uploaded media files</li>
                      <li>Delete your watermarks and settings</li>
                      <li>Remove all platform connections</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-600">Delete Account Permanently?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4">
                        <p>
                          This action cannot be undone. All your data, including channels, media files,
                          and settings will be permanently deleted.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="deleteConfirm">
                            Type <strong>DELETE</strong> to confirm:
                          </Label>
                          <Input
                            id="deleteConfirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE to confirm"
                            className="border-red-300 focus:border-red-500"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deletingAccount ? 'Deleting...' : 'Delete Account Forever'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TabsContent>

            <TabsContent value="password" className="mt-6">
              {passwordMessage && (
                <Alert className={passwordMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={passwordMessage.includes('success') ? 'text-green-800' : 'text-red-800'}>
                    {passwordMessage}
                  </AlertDescription>
                </Alert>
              )}

              {currentUser && currentUser.auth_provider && currentUser.auth_provider !== 'local' ? (
                <Alert className="border-blue-200 bg-blue-50 mt-6">
                  <AlertDescription className="text-blue-800">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        {currentUser.auth_provider === 'google' && (
                          <>
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </>
                        )}
                        {currentUser.auth_provider === 'facebook' && (
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
                        )}
                        {currentUser.auth_provider === 'apple' && (
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
                        )}
                      </svg>
                      <div>
                        <strong>You're using {currentUser.auth_provider.charAt(0).toUpperCase() + currentUser.auth_provider.slice(1)} to sign in</strong>
                        <p className="mt-1">Password changes are not available for social login accounts. Please manage your password through {currentUser.auth_provider.charAt(0).toUpperCase() + currentUser.auth_provider.slice(1)}.</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
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
              )}
            </TabsContent>

            <TabsContent value="rtmp" className="mt-6">
              <RtmpTemplatesManager />
            </TabsContent>

            <TabsContent value="watermark" className="mt-6">
              {/* Watermark Settings Section */}
              <WatermarkSettingsUser onUpdate={fetchUserSettings} />

              {/* Title Settings Section */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <Alert className="border-green-200 bg-green-50 mb-6">
                  <AlertDescription className="text-green-800">
                    <strong>ℹ️ Title Settings:</strong> Customize how titles appear on your streams.
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
                <h3 className="text-lg font-semibold mb-4">Stream Preview (Title & Watermark)</h3>
                <StreamPreview
                  titleSettings={userSettings}
                  watermarkSettings={userSettings}
                  sampleTitle="Example News Title Here"
                />
                <p className="text-sm text-gray-500 mt-2">
                  This preview shows how both the title overlay and watermark will appear on your stream. Enable these features when creating/editing a channel.
                </p>
              </div>
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
