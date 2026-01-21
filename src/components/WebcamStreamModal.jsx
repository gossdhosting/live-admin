import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Alert } from './ui/alert';
import { Video, Mic, MicOff, VideoOff, Loader2, AlertCircle, CheckCircle2, Globe } from 'lucide-react';
import { Badge } from './ui/badge';

function WebcamStreamModal({ channel, isOpen, onClose, onUpdate }) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [cameraDevices, setCameraDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [streamStatus, setStreamStatus] = useState('idle'); // idle, connecting, connected, error
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

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
      // Check if page is served over HTTPS (required for getUserMedia except localhost)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        throw new Error('Camera access requires HTTPS. Please access this page using https:// instead of http://');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      console.log('Browser supports getUserMedia');
      console.log('Current protocol:', window.location.protocol);

      // First, check if devices exist before requesting permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Enumerated devices before permission:', devices);

      const hasCamera = devices.some(d => d.kind === 'videoinput');
      const hasMicrophone = devices.some(d => d.kind === 'audioinput');

      console.log('Has camera:', hasCamera, 'Has microphone:', hasMicrophone);

      if (!hasCamera && !hasMicrophone) {
        throw new Error('No camera or microphone found. Please connect a device and try again.');
      }

      console.log('Requesting camera and microphone permissions...');

      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: hasCamera ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: hasMicrophone ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      console.log('Permissions granted, stream obtained:', stream);

      // Store stream
      localStreamRef.current = stream;

      // Display in video element - use a small delay to ensure DOM is ready
      setTimeout(() => {
        if (videoRef.current && stream.active) {
          console.log('Setting video srcObject...');
          videoRef.current.srcObject = stream;
          console.log('Video srcObject set:', videoRef.current.srcObject);
          console.log('Video element ready state:', videoRef.current.readyState);
          console.log('Video paused:', videoRef.current.paused);

          // Force video to be visible
          videoRef.current.style.display = 'block';

          try {
            const playPromise = videoRef.current.play();
            console.log('Play promise created');
            playPromise.then(() => {
              console.log('Video playback started successfully');
              console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            }).catch(playErr => {
              console.error('Failed to start video playback:', playErr);
              console.error('Error name:', playErr.name);
              console.error('Error message:', playErr.message);
            });
          } catch (e) {
            console.error('Play error:', e);
          }

          // Add event listeners to debug
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          };

          videoRef.current.onplay = () => {
            console.log('Video play event fired');
          };

          videoRef.current.onplaying = () => {
            console.log('Video playing event fired');
          };
        } else {
          console.error('videoRef.current is null or stream is not active!');
          console.log('videoRef.current:', videoRef.current);
          console.log('stream.active:', stream?.active);
        }
      }, 100); // Small delay to ensure React has mounted the element

      // Get available devices again with labels now available
      const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devicesWithLabels.filter(d => d.kind === 'videoinput');
      const audioDevices = devicesWithLabels.filter(d => d.kind === 'audioinput');

      console.log('Available cameras:', videoDevices);
      console.log('Available microphones:', audioDevices);

      setCameraDevices(videoDevices);
      setAudioDevices(audioDevices);

      // Set default selections
      const currentVideoTrack = stream.getVideoTracks()[0];
      const currentAudioTrack = stream.getAudioTracks()[0];

      if (currentVideoTrack) {
        const settings = currentVideoTrack.getSettings();
        setSelectedCamera(settings.deviceId || videoDevices[0]?.deviceId || '');
        console.log('Selected camera:', settings.deviceId);
      }
      if (currentAudioTrack) {
        const settings = currentAudioTrack.getSettings();
        setSelectedAudio(settings.deviceId || audioDevices[0]?.deviceId || '');
        console.log('Selected microphone:', settings.deviceId);
      }

      setPermissionsGranted(true);

    } catch (err) {
      console.error('Permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera and microphone permissions denied. Please click "Allow" when prompted by your browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera or microphone found. Please connect a camera/microphone and refresh the page.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionError('Camera or microphone is already in use by another application. Please close other apps and try again.');
      } else if (err.name === 'OverconstrainedError') {
        setPermissionError('Camera does not support the requested settings. Trying with default settings...');
        // Retry with minimal constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          setPermissionsGranted(true);
          setPermissionError('');
        } catch (retryErr) {
          setPermissionError(`Failed to access camera/microphone: ${retryErr.message}`);
        }
      } else if (err.message) {
        setPermissionError(err.message);
      } else {
        setPermissionError(`Failed to access camera/microphone: ${err.toString()}`);
      }
    }
  };

  const switchCamera = async (deviceId) => {
    if (!localStreamRef.current) return;

    try {
      // Stop current video track
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());

      // Get new video stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in local stream
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      localStreamRef.current.removeTrack(oldVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      // Update video element
      if (videoRef.current) {
        videoRef.current.srcObject = localStreamRef.current;
      }

      // If streaming, replace track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      setSelectedCamera(deviceId);
    } catch (err) {
      console.error('Failed to switch camera:', err);
      setError('Failed to switch camera');
    }
  };

  const switchAudio = async (deviceId) => {
    if (!localStreamRef.current) return;

    try {
      // Stop current audio track
      localStreamRef.current.getAudioTracks().forEach(track => track.stop());

      // Get new audio stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const newAudioTrack = newStream.getAudioTracks()[0];

      // Replace track in local stream
      const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
      localStreamRef.current.removeTrack(oldAudioTrack);
      localStreamRef.current.addTrack(newAudioTrack);

      // If streaming, replace track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
          await sender.replaceTrack(newAudioTrack);
        }
      }

      setSelectedAudio(deviceId);
    } catch (err) {
      console.error('Failed to switch microphone:', err);
      setError('Failed to switch microphone');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const startStreaming = async () => {
    // Validate platforms
    if (platforms.length === 0) {
      setError('No platforms connected. Please connect at least one platform before going live.');
      return;
    }

    setError('');
    setStreamStatus('connecting');

    try {
      console.log('Starting WebRTC stream for channel', channel.id);
      console.log('Video element before streaming:', videoRef.current);
      console.log('Video srcObject before streaming:', videoRef.current?.srcObject);
      console.log('Local stream:', localStreamRef.current);

      // FIX: Explicitly stop any existing session for this channel before starting a new one
      // This handles browser refreshes where the backend might still have a zombie connection
      try {
        console.log('[Pre-Start Cleanup] Stopping any existing WebRTC session for channel', channel.id);
        await api.post(`/webrtc/stop/${channel.id}`);
        console.log('[Pre-Start Cleanup] Existing session stopped (or none existed)');
      } catch (stopError) {
        // Ignore 404s or other errors - just means no session was running
        console.log('[Pre-Start Cleanup] Stop call result:', stopError.response?.status || 'error', '(safe to ignore)');
      }

      // Initialize WebRTC session
      console.log('Initializing WebRTC session on backend...');
      const startResponse = await api.post(`/webrtc/start/${channel.id}`);
      console.log('WebRTC session initialized:', startResponse.data);

      // Create peer connection with TURN servers for NAT traversal
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10
      };

      console.log('Creating RTCPeerConnection...');
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local tracks to peer connection
      console.log('Adding local tracks to peer connection...');
      const tracks = localStreamRef.current.getTracks();
      console.log('Available tracks:', tracks);

      tracks.forEach(track => {
        console.log('Adding track:', track.kind, track.label);
        peerConnection.addTrack(track, localStreamRef.current);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to backend');
          api.post(`/webrtc/ice-candidate/${channel.id}`, {
            candidate: event.candidate.toJSON()
          }).catch(err => console.error('Failed to send ICE candidate:', err));
        } else {
          console.log('All ICE candidates sent');
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);

        if (peerConnection.connectionState === 'connected') {
          console.log('WebRTC connection established!');
          setStreamStatus('connected');
          setIsStreaming(true);
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          console.error('WebRTC connection failed or disconnected');
          setStreamStatus('error');
          setError('Connection to server lost');
          stopStreaming();
        }
      };

      // Handle ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      // Create and send offer
      console.log('Creating SDP offer...');
      const offer = await peerConnection.createOffer();
      console.log('Created SDP offer');
      console.log('Full SDP offer:', offer.sdp);
      console.log('SDP has video:', offer.sdp.includes('m=video'));
      console.log('SDP has audio:', offer.sdp.includes('m=audio'));

      console.log('Setting local description...');
      await peerConnection.setLocalDescription(offer);

      console.log('Sending offer to backend...');
      const response = await api.post(`/webrtc/offer/${channel.id}`, {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });

      console.log('Received answer from backend:', response.data);

      // Set remote answer
      console.log('Setting remote description...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(response.data.answer));
      console.log('Remote description set successfully');
      console.log('Current connection state after setRemoteDescription:', peerConnection.connectionState);
      console.log('Current ICE connection state:', peerConnection.iceConnectionState);
      console.log('Current signaling state:', peerConnection.signalingState);

      // Wait for connection to establish and WebRTC bridge to start
      const waitForBridgeAndStartStream = async () => {
        console.log('Connection state after 2s:', peerConnection.connectionState);
        console.log('ICE connection state after 2s:', peerConnection.iceConnectionState);

        // If connected but UI not updated, manually update
        if (peerConnection.connectionState === 'connected' || peerConnection.iceConnectionState === 'connected') {
          console.log('Manually updating UI to connected state');
          setStreamStatus('connected');
          setIsStreaming(true);

          // Wait for WebRTC bridge to start publishing (check status)
          console.log('Waiting for WebRTC bridge to start publishing...');
          let attempts = 0;
          const maxAttempts = 15; // 15 seconds max wait

          while (attempts < maxAttempts) {
            try {
              const statusResponse = await api.get(`/webrtc/status/${channel.id}`);
              console.log('WebRTC bridge status:', statusResponse.data);

              // FIX: Response is {success: true, status: {status: 'connected', ...}}
              // So we need to check statusResponse.data.status.status (nested)
              if (statusResponse.data.status?.status === 'connected') {
                console.log('WebRTC bridge is connected!');
                // Backend will automatically start platform streaming after first frame
                // No need to call /channels/${channel.id}/start manually
                console.log('Platform streaming will start automatically when first frame is received');
                setStreamStatus('connected');
                setIsStreaming(true);
                break;
              }
            } catch (err) {
              console.log('Waiting for bridge...', err.message);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error('WebRTC bridge did not start in time');
            setError('WebRTC bridge failed to start. Please try again.');
          }
        }
      };

      setTimeout(waitForBridgeAndStartStream, 2000);

      // Update parent component
      if (onUpdate) {
        onUpdate();
      }

    } catch (err) {
      console.error('Failed to start streaming:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setStreamStatus('error');
      setError(err.response?.data?.error || err.message || 'Failed to start streaming');
      setIsStreaming(false);
    }
  };

  const stopStreaming = async () => {
    try {
      // Stop channel stream (platform streaming)
      if (isStreaming) {
        try {
          console.log('Stopping channel stream...');
          await api.post(`/channels/${channel.id}/stop`);
          console.log('Channel stream stopped');
        } catch (err) {
          console.error('Failed to stop channel stream:', err);
        }

        // Stop WebRTC on server
        try {
          console.log('Stopping WebRTC bridge...');
          await api.post(`/webrtc/stop/${channel.id}`);
          console.log('WebRTC bridge stopped');
        } catch (err) {
          console.error('Failed to stop WebRTC:', err);
        }
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsStreaming(false);
      setStreamStatus('idle');
      setPermissionsGranted(false);

      // Update parent component
      if (onUpdate) {
        onUpdate();
      }

    } catch (err) {
      console.error('Failed to stop streaming:', err);
    }
  };

  // FORCE DISCONNECT: Emergency cleanup even if backend is crashed or unresponsive
  const forceDisconnect = async () => {
    console.log('[Force Disconnect] Initiating emergency cleanup');

    try {
      // Try to stop backend (but don't wait if it fails)
      const stopPromises = [];

      if (isStreaming) {
        stopPromises.push(
          api.post(`/channels/${channel.id}/stop`).catch(err =>
            console.warn('[Force Disconnect] Backend channel stop failed (may be crashed):', err.message)
          )
        );
        stopPromises.push(
          api.post(`/webrtc/stop/${channel.id}`).catch(err =>
            console.warn('[Force Disconnect] Backend WebRTC stop failed (may be crashed):', err.message)
          )
        );
      }

      // Don't wait more than 2 seconds for backend
      await Promise.race([
        Promise.all(stopPromises),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);

    } catch (err) {
      console.error('[Force Disconnect] Backend cleanup error (continuing anyway):', err);
    }

    // CRITICAL: Always clean up local resources regardless of backend state
    try {
      // Close peer connection
      if (peerConnectionRef.current) {
        console.log('[Force Disconnect] Closing peer connection');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop all media tracks
      if (localStreamRef.current) {
        console.log('[Force Disconnect] Stopping local media tracks');
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`[Force Disconnect] Stopped ${track.kind} track`);
        });
        localStreamRef.current = null;
      }

      // Clear video element
      if (videoRef.current) {
        console.log('[Force Disconnect] Clearing video element');
        videoRef.current.srcObject = null;
      }

      console.log('[Force Disconnect] Local cleanup complete');
    } catch (err) {
      console.error('[Force Disconnect] Local cleanup error:', err);
    }

    // Reset all state
    setIsStreaming(false);
    setStreamStatus('idle');
    setPermissionsGranted(false);
    setError('');
    setIsMuted(false);
    setIsVideoOff(false);

    // Update parent component
    if (onUpdate) {
      onUpdate();
    }

    console.log('[Force Disconnect] Emergency disconnect complete');
  };

  // IMPORTANT: Don't stop streaming when modal closes - allow minimize
  // This prevents accidental disconnections and multiple connections
  const handleMinimize = () => {
    console.log('[Modal] Minimizing (keeping camera connection alive)');
    onClose(); // Just close the modal UI, don't stop streaming
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // CRITICAL: Only allow closing via explicit user action
      // Don't close when clicking outside or pressing ESC if camera is active
      if (!open && (permissionsGranted || isStreaming)) {
        console.log('[Modal] Prevented accidental close - camera is active');
        return; // Block the close
      }
      if (!open) {
        handleMinimize();
      }
    }}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] p-0 overflow-hidden sm:max-w-[95vw] sm:max-h-[95vh]"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking outside if camera is active
          if (permissionsGranted || isStreaming) {
            e.preventDefault();
            console.log('[Modal] Blocked outside click - use Disconnect button');
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with ESC key if camera is active
          if (permissionsGranted || isStreaming) {
            e.preventDefault();
            console.log('[Modal] Blocked ESC key - use Disconnect button');
          }
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Go Live: {channel.name}</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Stream directly from your camera to all connected platforms</p>
          </div>

          {/* Main Content - Responsive Layout */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left Side - Camera Preview (2/3 width on desktop, full width on mobile) */}
            <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-0">
              {!permissionsGranted ? (
                <div className="text-center p-8">
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-semibold mb-2">Camera Access Required</h3>
                  <p className="text-gray-400 text-sm mb-4 max-w-md">
                    We need access to your camera and microphone to start streaming
                  </p>
                  {permissionError && (
                    <Alert className="bg-red-900/50 border-red-700 text-red-200 mb-4 max-w-md mx-auto">
                      <AlertCircle className="w-4 h-4" />
                      <span className="ml-2">{permissionError}</span>
                    </Alert>
                  )}
                  <Button onClick={requestPermissions} className="bg-blue-600 hover:bg-blue-700">
                    <Video className="w-4 h-4 mr-2" />
                    Allow Camera & Microphone
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
                    style={{ display: 'block', backgroundColor: '#000' }}
                  />

                  {/* Camera Controls Overlay */}
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <Button
                      onClick={toggleVideo}
                      variant={isVideoOff ? "destructive" : "secondary"}
                      size="sm"
                      className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0"
                    >
                      {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                    <Button
                      onClick={toggleMute}
                      variant={isMuted ? "destructive" : "secondary"}
                      size="sm"
                      className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0"
                    >
                      {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                  </div>

                  {/* Stream Status Badge */}
                  {isStreaming && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-600 text-white animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block"></span>
                        LIVE
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Side - Controls and Info (1/3 width on desktop, full width on mobile) */}
            <div className="w-full md:w-96 border-l md:border-l border-t md:border-t-0 bg-white flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Device Selection */}
                {permissionsGranted && !isStreaming && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Camera</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        value={selectedCamera}
                        onChange={(e) => switchCamera(e.target.value)}
                      >
                        {cameraDevices.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Microphone</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        value={selectedAudio}
                        onChange={(e) => switchAudio(e.target.value)}
                      >
                        {audioDevices.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Platform List */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Streaming To ({platforms.length})
                  </h3>
                  {platforms.length === 0 ? (
                    <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="ml-2 text-sm">No platforms connected</span>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {platforms.map((platform, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                          <span className="text-sm font-medium text-gray-700 capitalize">{platform.name}</span>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stream Info */}
                {isStreaming && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-md">
                      <span className="text-sm font-medium text-gray-700">Status</span>
                      <Badge className="bg-green-600">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-md">
                      <span className="text-sm font-medium text-gray-700">Quality</span>
                      <span className="text-sm text-gray-600">720p @ 30fps</span>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <Alert className="bg-red-50 border-red-200 text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="ml-2 text-sm">{error}</span>
                  </Alert>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 sm:p-6 border-t bg-gray-50 space-y-2 sm:space-y-3">
                {!isStreaming ? (
                  <Button
                    onClick={startStreaming}
                    disabled={!permissionsGranted || platforms.length === 0}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold h-12"
                  >
                    {streamStatus === 'connecting' ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Video className="w-5 h-5 mr-2" />
                        Go Live
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={stopStreaming}
                    variant="destructive"
                    className="w-full font-semibold h-12"
                  >
                    Stop Streaming
                  </Button>
                )}

                {/* Force Disconnect Button - Always visible if camera is active */}
                {(permissionsGranted || isStreaming) && (
                  <Button
                    onClick={forceDisconnect}
                    variant="outline"
                    className="w-full border-2 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold h-10"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Force Disconnect Camera
                  </Button>
                )}

                {/* Minimize Button - Allow closing modal without stopping camera */}
                {(permissionsGranted || isStreaming) && (
                  <Button
                    onClick={handleMinimize}
                    variant="ghost"
                    className="w-full text-gray-600 hover:text-gray-800 h-10"
                  >
                    Minimize (Keep Camera Running)
                  </Button>
                )}

                {platforms.length === 0 && !isStreaming && (
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    Connect platforms in the Platforms tab before going live
                  </p>
                )}

                {(permissionsGranted || isStreaming) && (
                  <p className="text-xs text-blue-600 mt-2 text-center">
                    Modal prevents accidental closure. Use Force Disconnect to stop camera.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WebcamStreamModal;
