import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Alert } from './ui/alert';
import { Video, Mic, MicOff, VideoOff, Loader2, AlertCircle, CheckCircle2, Globe, Minus } from 'lucide-react';
import { Badge } from './ui/badge';
import { useMinimizedStream } from '../contexts/MinimizedStreamContext';

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
  const [streamStatus, setStreamStatus] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const { minimizeStream, getStream, removeStream } = useMinimizedStream();

  const streamId = `webcam-${channel.id}`;
  const minimizedData = getStream(streamId);

  // Restore state from minimized data when maximizing
  useEffect(() => {
    if (isOpen && minimizedData) {
      localStreamRef.current = minimizedData.mediaStream;
      peerConnectionRef.current = minimizedData.peerConnection;
      setPermissionsGranted(minimizedData.permissionsGranted);
      setIsStreaming(minimizedData.isStreaming);
      setStreamStatus(minimizedData.streamStatus);
      setIsMuted(minimizedData.isMuted);
      setIsVideoOff(minimizedData.isVideoOff);
      setPlatforms(minimizedData.platforms || []);

      setTimeout(() => {
        if (videoRef.current && localStreamRef.current) {
          videoRef.current.srcObject = localStreamRef.current;
          videoRef.current.play().catch(console.error);
        }
      }, 100);

      removeStream(streamId);
    }
  }, [isOpen, minimizedData, streamId, removeStream]);

  useEffect(() => {
    if (isOpen && !minimizedData) {
      fetchPlatforms();
    }
  }, [isOpen, channel.id]);

  const fetchPlatforms = async () => {
    try {
      const [streamsRes, destinationsRes] = await Promise.all([
        api.get(`/platforms/streams/${channel.id}`),
        api.get(`/channels/${channel.id}/rtmp`)
      ]);

      const platformStreams = Array.isArray(streamsRes.data?.streams) ? streamsRes.data.streams : [];
      const rtmpDestinations = Array.isArray(destinationsRes.data?.destinations) ? destinationsRes.data.destinations : [];

      const allPlatforms = [
        ...platformStreams.map(s => ({ name: s.platform, type: 'oauth' })),
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
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        throw new Error('Camera access requires HTTPS.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera/microphone access.');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(d => d.kind === 'videoinput');
      const hasMicrophone = devices.some(d => d.kind === 'audioinput');

      if (!hasCamera && !hasMicrophone) {
        throw new Error('No camera or microphone found.');
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: hasCamera ? {
          width: { min: 1280, ideal: 1280 },
          height: { min: 720, ideal: 720 },
          frameRate: { ideal: 30, max: 30 }
        } : false,
        audio: hasMicrophone ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      localStreamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current && stream.active) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.display = 'block';
          videoRef.current.play().catch(console.error);
        }
      }, 100);

      const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
      setCameraDevices(devicesWithLabels.filter(d => d.kind === 'videoinput'));
      setAudioDevices(devicesWithLabels.filter(d => d.kind === 'audioinput'));

      const currentVideoTrack = stream.getVideoTracks()[0];
      const currentAudioTrack = stream.getAudioTracks()[0];

      if (currentVideoTrack) {
        setSelectedCamera(currentVideoTrack.getSettings().deviceId || '');
      }
      if (currentAudioTrack) {
        setSelectedAudio(currentAudioTrack.getSettings().deviceId || '');
      }

      setPermissionsGranted(true);

    } catch (err) {
      console.error('Permission error:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionError('Camera and microphone permissions denied.');
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No camera or microphone found.');
      } else if (err.name === 'NotReadableError') {
        setPermissionError('Camera or microphone is already in use.');
      } else if (err.name === 'OverconstrainedError') {
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
      } else {
        setPermissionError(err.message || 'Failed to access camera/microphone.');
      }
    }
  };

  const switchCamera = async (deviceId) => {
    if (!localStreamRef.current) return;

    try {
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { min: 1280 }, height: { min: 720 }, frameRate: { ideal: 30 } },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      if (videoRef.current) videoRef.current.srcObject = localStreamRef.current;

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newVideoTrack);
      }

      setSelectedCamera(deviceId);
    } catch (err) {
      setError('Failed to switch camera');
    }
  };

  const switchAudio = async (deviceId) => {
    if (!localStreamRef.current) return;

    try {
      localStreamRef.current.getAudioTracks().forEach(track => track.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true }
      });

      const newAudioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
      if (oldAudioTrack) localStreamRef.current.removeTrack(oldAudioTrack);
      localStreamRef.current.addTrack(newAudioTrack);

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) await sender.replaceTrack(newAudioTrack);
      }

      setSelectedAudio(deviceId);
    } catch (err) {
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
    if (platforms.length === 0) {
      setError('No platforms connected.');
      return;
    }

    setError('');
    setStreamStatus('connecting');

    try {
      try { await api.post(`/webrtc/stop/${channel.id}`); } catch (e) {}

      await api.post(`/webrtc/start/${channel.id}`);

      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
        ],
        iceCandidatePoolSize: 10
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          api.post(`/webrtc/ice-candidate/${channel.id}`, { candidate: event.candidate.toJSON() }).catch(() => {});
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          setStreamStatus('connected');
          setIsStreaming(true);
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          setStreamStatus('error');
          setError('Connection lost');
          stopStreaming();
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const response = await api.post(`/webrtc/offer/${channel.id}`, { offer: { type: offer.type, sdp: offer.sdp } });
      await peerConnection.setRemoteDescription(new RTCSessionDescription(response.data.answer));

      setTimeout(async () => {
        if (peerConnection.connectionState === 'connected' || peerConnection.iceConnectionState === 'connected') {
          setStreamStatus('connected');
          setIsStreaming(true);
        }
      }, 2000);

      if (onUpdate) onUpdate();

    } catch (err) {
      console.error('Failed to start streaming:', err);
      setStreamStatus('error');
      setError(err.response?.data?.error || err.message || 'Failed to start streaming');
      setIsStreaming(false);
    }
  };

  const stopStreaming = async () => {
    try {
      if (isStreaming) {
        try { await api.post(`/channels/${channel.id}/stop`); } catch (e) {}
        try { await api.post(`/webrtc/stop/${channel.id}`); } catch (e) {}
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      if (videoRef.current) videoRef.current.srcObject = null;

      setIsStreaming(false);
      setStreamStatus('idle');
      setPermissionsGranted(false);

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to stop streaming:', err);
    }
  };

  const forceDisconnect = async () => {
    try {
      if (isStreaming) {
        await Promise.race([
          Promise.all([
            api.post(`/channels/${channel.id}/stop`).catch(() => {}),
            api.post(`/webrtc/stop/${channel.id}`).catch(() => {})
          ]),
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);
      }
    } catch (e) {}

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (videoRef.current) videoRef.current.srcObject = null;

    setIsStreaming(false);
    setStreamStatus('idle');
    setPermissionsGranted(false);
    setError('');
    setIsMuted(false);
    setIsVideoOff(false);

    removeStream(streamId);
    if (onUpdate) onUpdate();
    onClose();
  };

  const handleMinimize = () => {
    minimizeStream({
      id: streamId,
      type: 'webcam',
      channelId: channel.id,
      channelName: channel.name,
      mediaStream: localStreamRef.current,
      peerConnection: peerConnectionRef.current,
      permissionsGranted,
      isStreaming,
      streamStatus,
      isMuted,
      isVideoOff,
      platforms,
      onForceStop: forceDisconnect
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && (permissionsGranted || isStreaming)) return;
      if (!open) onClose();
    }}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] p-0 overflow-hidden sm:max-w-[95vw] sm:max-h-[95vh]"
        onPointerDownOutside={(e) => { if (permissionsGranted || isStreaming) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (permissionsGranted || isStreaming) e.preventDefault(); }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-slate-50 to-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Go Live: {channel.name}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Stream directly from your camera</p>
            </div>
            {(permissionsGranted || isStreaming) && (
              <Button onClick={handleMinimize} variant="outline" size="sm" className="gap-1.5" title="Minimize">
                <Minus className="w-4 h-4" />
                <span className="hidden sm:inline">Minimize</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Camera Preview */}
            <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-0">
              {!permissionsGranted ? (
                <div className="text-center p-8">
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-semibold mb-2">Camera Access Required</h3>
                  <p className="text-gray-400 text-sm mb-4 max-w-md">We need access to your camera and microphone</p>
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
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" style={{ display: 'block', backgroundColor: '#000' }} />

                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <Button onClick={toggleVideo} variant={isVideoOff ? "destructive" : "secondary"} size="sm" className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0">
                      {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                    <Button onClick={toggleMute} variant={isMuted ? "destructive" : "secondary"} size="sm" className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0">
                      {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                  </div>

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

            {/* Controls */}
            <div className="w-full md:w-96 border-l md:border-l border-t md:border-t-0 bg-white flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {permissionsGranted && !isStreaming && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Camera</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={selectedCamera} onChange={(e) => switchCamera(e.target.value)}>
                        {cameraDevices.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId.substring(0, 8)}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Microphone</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={selectedAudio} onChange={(e) => switchAudio(e.target.value)}>
                        {audioDevices.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${device.deviceId.substring(0, 8)}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

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

                {error && (
                  <Alert className="bg-red-50 border-red-200 text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="ml-2 text-sm">{error}</span>
                  </Alert>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t bg-gray-50 space-y-2 sm:space-y-3">
                {!isStreaming ? (
                  <Button onClick={startStreaming} disabled={!permissionsGranted || platforms.length === 0} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold h-12">
                    {streamStatus === 'connecting' ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting...</>
                    ) : (
                      <><Video className="w-5 h-5 mr-2" />Go Live</>
                    )}
                  </Button>
                ) : (
                  <Button onClick={stopStreaming} variant="destructive" className="w-full font-semibold h-12">Stop Streaming</Button>
                )}

                {(permissionsGranted || isStreaming) && (
                  <>
                    <Button onClick={handleMinimize} variant="outline" className="w-full gap-2 h-10">
                      <Minus className="w-4 h-4" />
                      Minimize Window
                    </Button>
                    <Button onClick={forceDisconnect} variant="outline" className="w-full border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold h-10">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      End Stream & Close
                    </Button>
                  </>
                )}

                {platforms.length === 0 && !isStreaming && (
                  <p className="text-xs text-amber-600 mt-2 text-center">Connect platforms before going live</p>
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
