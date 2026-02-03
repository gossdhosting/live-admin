import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PlatformConnections from '../components/PlatformConnections';
import RtmpTemplatesManager from '../components/RtmpTemplatesManager';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Globe, Radio } from 'lucide-react';

function Platforms() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('platforms');
  const [message, setMessage] = useState('');

  useEffect(() => {
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
  }, [location]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl">Platform Management</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </CardHeader>

        <CardContent>
          {message && (
            <Alert className={message.includes('success') || message.includes('Successfully') ? 'border-green-200 bg-green-50 mb-6' : 'border-red-200 bg-red-50 mb-6'}>
              <AlertDescription className={message.includes('success') || message.includes('Successfully') ? 'text-green-800' : 'text-red-800'}>
                {message}
              </AlertDescription>
            </Alert>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="platforms" className="text-xs sm:text-sm gap-1.5 py-2">
                <Globe className="w-4 h-4" />
                <span>Platform Connections</span>
              </TabsTrigger>
              <TabsTrigger value="rtmp" className="text-xs sm:text-sm gap-1.5 py-2">
                <Radio className="w-4 h-4" />
                <span>RTMP Templates</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="platforms" className="mt-6">
              <PlatformConnections />
            </TabsContent>

            <TabsContent value="rtmp" className="mt-6">
              <RtmpTemplatesManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default Platforms;
