import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Alert } from './ui/alert';
import { Monitor, Volume2, VolumeX, Loader2, AlertCircle, CheckCircle2, Globe } from 'lucide-react';
import { Badge } from './ui/badge';

function ScreenShareModal({ channel, isOpen, onClose, onUpdate }) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState('');
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [streamStatus, setStreamStatus] = useState('idle'); // idle, connecting, connected, error
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Fetch platforms on mount
  useEffect(() => {
    if (isOpen) {
      fetchPlatforms();
    }
  }, [isOpen, channel.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  // Update video element when stream is ready
  useEffect(() => {
    if (videoRef.current && localStreamRef.current && permissionsGranted) {
      videoRef.current.srcObject = localStreamRef.current;
    }
  }, [permissionsGranted]);

  const fetchPlatforms = async () => {
    try {
      const [streamsRes, destinationsRes] = await Promise.all([
        api.get(`/platforms/streams/${channel.id}`),
        api.get(`/channels/${channel.id}/rtmp`)
      ]);

      const platformStreams = Array.isArray(streamsRes.data?.streams) ? streamsRes.data.streams : [];
      const rtmpDestinations = Array.isArray(destinationsRes.data?.destinations) ? destinationsRes.data.destinations : [];

      const allPlatforms = [
        ...platformStreams.map(s => ({
          name: s.platform,
          type: 'oauth'
        })),
        ...rtmpDestinations.filter(d => d.enabled === 1 || d.enabled === true).map(d => ({
          name: d.platform || 'Custom RTMP',
          type: 'rtmp'
        }))
      ];

      setPlatforms(allPlatforms);
    } catch (error) {
      console.error('Failed to fetch platforms:', error);
      setPlatforms([]);
    }
  };

  const requestPermissions = async () => {
    setPermissionError('');
    setError('');

    try {
      // Check if page is served over HTTPS (required for getDisplayMedia except localhost)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        throw new Error('Screen share requires HTTPS. Please access this page using https:// instead of http://');
      }

      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Your browser does not support screen sharing. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      console.log('Browser supports getDisplayMedia');
      console.log('Current protocol:', window.location.protocol);

      // Stop any existing tracks before requesting new media
      if (localStreamRef.current) {
        console.log('Stopping existing tracks before requesting new media');
        localStreamRef.current.getTracks().forEach(track => {
          console.log(`Stopping old ${track.kind} track: ${track.label}`);
          track.stop();
        });
        localStreamRef.current = null;
      }

      // Request screen share with optional system audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: includeSystemAudio // System audio (desktop sound)
      });

      console.log('Screen share permission granted, display stream obtained:', displayStream);

      // Log actual stream resolution
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('Screen video track settings:', settings);
        console.log(`Actual resolution: ${settings.width}x${settings.height}, frameRate: ${settings.frameRate}`);
      }

      // If user wants microphone audio, get it separately
      let micStream = null;
      if (selectedAudio) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: selectedAudio,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          console.log('Microphone audio obtained:', micStream);
        } catch (micError) {
          console.warn('Failed to get microphone audio:', micError);
          // Continue without mic audio
        }
      }

      // Combine screen video + audio tracks
      let combinedStream = new MediaStream();

      // Add screen video track
      displayStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
        console.log('Added screen video track:', track.label);
      });

      // Add system audio if available (from displayStream)
      displayStream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
        console.log('Added system audio track:', track.label);
      });

      // Add microphone audio if available
      if (micStream) {
        micStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
          console.log('Added microphone audio track:', track.label);
        });
      }

      // Store stream
      localStreamRef.current = combinedStream;

      // Display preview
      if (videoRef.current) {
        videoRef.current.srcObject = combinedStream;
      }

      // Enumerate audio devices for user selection
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput' && d.deviceId);
      console.log('Audio input devices:', audioInputs);
      setAudioDevices(audioInputs);

      // Auto-select first audio device if none selected
      if (!selectedAudio && audioInputs.length > 0) {
        setSelectedAudio(audioInputs[0].deviceId);
      }

      setPermissionsGranted(true);
      console.log('Screen share setup complete');

      // Handle screen share stop event (user clicks "Stop sharing" in browser)
      videoTrack.onended = () => {
        console.log('Screen share stopped by user');
        stopStreaming();
      };

    } catch (err) {
      console.error('Permission request failed:', err);
      setPermissionError(err.message || 'Failed to access screen share. Please allow screen recording when prompted.');
    }
  };

  const changeAudioSource = async (deviceId) => {
    if (!localStreamRef.current) return;

    try {
      // Stop existing microphone audio tracks
      localStreamRef.current.getAudioTracks().forEach(track => {
        if (track.label.includes('Microphone') || !track.label.includes('system')) {
          track.stop();
          localStreamRef.current.removeTrack(track);
        }
      });

      // Get new microphone audio
      if (deviceId) {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        micStream.getAudioTracks().forEach(track => {
          localStreamRef.current.addTrack(track);
          console.log('Changed to microphone:', track.label);
        });

        // Update peer connection senders if streaming
        if (peerConnectionRef.current && isStreaming) {
          const audioTrack = micStream.getAudioTracks()[0];
          const senders = peerConnectionRef.current.getSenders();
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(audioTrack);
            console.log('Replaced audio track in peer connection');
          }
        }
      }

      setSelectedAudio(deviceId);
    } catch (err) {
      console.error('Failed to change audio source:', err);
      setError('Failed to change audio source');
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;

    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = isMuted;
    });
    setIsMuted(!isMuted);
  };

  const startStreaming = async () => {
    if (!localStreamRef.current) {
      setError('No screen share active. Please allow screen recording first.');
      return;
    }

    if (platforms.length === 0) {
      setError('No platforms connected. Please connect at least one platform before going live.');
      return;
    }

    setStreamStatus('connecting');
    setError('');

    try {
      console.log('Starting WebRTC connection for screen share...');

      // Initialize WebRTC session on backend
      await api.post(`/webrtc/start/${channel.id}`, {});
      console.log('Backend WebRTC session initialized');

      // Create peer connection
      const config = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const pc = new RTCPeerConnection(config);
      peerConnectionRef.current = pc;

      console.log('Peer connection created');

      // Add all tracks to peer connection
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection:`, track.label, track.getSettings());
        pc.addTrack(track, localStreamRef.current);
      });

      console.log('All tracks added to peer connection');

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to backend');
          api.post(`/webrtc/ice-candidate/${channel.id}`, {
            candidate: event.candidate
          }).catch(err => console.error('Failed to send ICE candidate:', err));
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setStreamStatus('connected');
          setIsStreaming(true);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStreamStatus('error');
          setError('Connection lost. Please try again.');
          stopStreaming();
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      console.log('Created offer');

      await pc.setLocalDescription(offer);
      console.log('Set local description');

      // Send offer to backend
      const response = await api.post(`/webrtc/offer/${channel.id}`, {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });

      console.log('Offer sent to backend, received answer');

      // Set remote description
      const answer = response.data.answer;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Set remote description');

      console.log('WebRTC connection established successfully');

      // Refresh channel data
      if (onUpdate) {
        onUpdate();
      }

    } catch (err) {
      console.error('Failed to start streaming:', err);
      setStreamStatus('error');
      setError(err.response?.data?.error || err.message || 'Failed to start streaming');
      stopStreaming();
    }
  };

  const stopStreaming = async () => {
    console.log('Stopping screen share stream...');

    try {
      // Notify backend
      if (isStreaming && channel?.id) {
        await api.post(`/webrtc/stop/${channel.id}`, {});
        console.log('Backend notified of stream stop');
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        localStreamRef.current = null;
      }

      // Clear video preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsStreaming(false);
      setStreamStatus('idle');
      setPermissionsGranted(false);

      // Refresh channel data
      if (onUpdate) {
        onUpdate();
      }

      console.log('Screen share stopped successfully');
    } catch (err) {
      console.error('Error stopping stream:', err);
    }
  };

  const handleClose = () => {
    if (isStreaming) {
      if (window.confirm('You are currently live. Do you want to stop streaming?')) {
        stopStreaming();
        onClose();
      }
    } else {
      stopStreaming();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-purple-600" />
                  Screen Share - {channel.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Share your screen with your audience
                </p>
              </div>
              <div className="flex items-center gap-2">
                {streamStatus === 'connected' && (
                  <Badge variant="success" className="bg-red-500 text-white animate-pulse">
                    🔴 LIVE
                  </Badge>
                )}
                {streamStatus === 'connecting' && (
                  <Badge variant="secondary" className="bg-yellow-500 text-white">
                    Connecting...
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Left: Video Preview */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {!permissionsGranted ? (
                <div className="text-center px-8 py-12">
                  <Monitor className="w-24 h-24 mx-auto text-purple-400 mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-3">Screen Share Required</h3>
                  <p className="text-gray-300 mb-6">
                    To start streaming your screen, you need to grant screen recording permission.
                  </p>
                  {permissionError && (
                    <Alert className="bg-red-900 border-red-700 text-red-100 mb-4">
                      <AlertCircle className="w-4 h-4" />
                      <span className="ml-2">{permissionError}</span>
                    </Alert>
                  )}
                  <Button onClick={requestPermissions} className="bg-purple-600 hover:bg-purple-700">
                    <Monitor className="w-4 h-4 mr-2" />
                    Share Screen
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  {streamStatus === 'connected' && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 animate-pulse">
                      <span className="w-3 h-3 bg-white rounded-full"></span>
                      LIVE
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Controls */}
            <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto p-6 space-y-6">
              {/* Platforms */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Streaming To ({platforms.length})
                </h3>
                {platforms.length === 0 ? (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="ml-2 text-amber-900 text-sm">No platforms connected</span>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {platforms.map((platform, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-sm">{platform.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{platform.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Source Selection */}
              {permissionsGranted && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Audio Source</h3>
                  <div className="space-y-3">
                    <select
                      value={selectedAudio}
                      onChange={(e) => changeAudioSource(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">No Microphone</option>
                      {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        id="systemAudio"
                        checked={includeSystemAudio}
                        onChange={(e) => setIncludeSystemAudio(e.target.checked)}
                        disabled={isStreaming}
                        className="rounded"
                      />
                      <label htmlFor="systemAudio" className="text-sm text-gray-700 cursor-pointer">
                        Include system audio
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      System audio must be enabled before sharing screen
                    </p>
                  </div>
                </div>
              )}

              {/* Audio Controls */}
              {permissionsGranted && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Audio Controls</h3>
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "outline"}
                    className="w-full"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="ml-2 text-red-900 text-sm">{error}</span>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {!isStreaming ? (
                  <Button
                    onClick={startStreaming}
                    disabled={!permissionsGranted || platforms.length === 0 || streamStatus === 'connecting'}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-6 text-lg"
                  >
                    {streamStatus === 'connecting' ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Monitor className="w-5 h-5 mr-2" />
                        GO LIVE
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={stopStreaming}
                    variant="destructive"
                    className="w-full py-6 text-lg font-bold"
                  >
                    Stop Streaming
                  </Button>
                )}
                <Button onClick={handleClose} variant="outline" className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ScreenShareModal;
