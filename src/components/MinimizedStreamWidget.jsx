import React, { useEffect, useRef } from 'react';
import { useMinimizedStream } from '../contexts/MinimizedStreamContext';
import { Video, Monitor, Maximize2, X, Mic, MicOff, VideoOff } from 'lucide-react';
import { Badge } from './ui/badge';

function MinimizedStreamWidget({ onMaximize }) {
  const { minimizedStreams, removeStream } = useMinimizedStream();

  if (minimizedStreams.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[320px] sm:max-w-[280px]">
      {minimizedStreams.map((stream) => (
        <MinimizedStreamCard
          key={stream.id}
          stream={stream}
          onMaximize={() => onMaximize(stream)}
          onClose={() => {
            // Call the stream's stop function if provided
            if (stream.onForceStop) {
              stream.onForceStop();
            }
            removeStream(stream.id);
          }}
        />
      ))}
    </div>
  );
}

function MinimizedStreamCard({ stream, onMaximize, onClose }) {
  const videoRef = useRef(null);

  // Attach the stream to the video element
  useEffect(() => {
    if (videoRef.current && stream.mediaStream) {
      videoRef.current.srcObject = stream.mediaStream;
    }
  }, [stream.mediaStream]);

  const isWebcam = stream.type === 'webcam';
  const Icon = isWebcam ? Video : Monitor;
  const bgGradient = isWebcam
    ? 'from-red-600 to-red-700'
    : 'from-purple-600 to-indigo-700';

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-right-5 duration-300">
      {/* Header */}
      <div className={`bg-gradient-to-r ${bgGradient} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2 text-white">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {stream.channelName || 'Stream'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {stream.isStreaming && (
            <Badge className="bg-white/20 text-white text-xs px-1.5 py-0.5 animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Status indicators overlay */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {stream.isMuted && (
            <div className="bg-red-500 rounded-full p-1">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
          {stream.isVideoOff && (
            <div className="bg-red-500 rounded-full p-1">
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Live indicator */}
        {stream.isStreaming && (
          <div className="absolute top-2 left-2">
            <div className="flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-gray-200">
        <button
          onClick={onMaximize}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Maximize</span>
        </button>
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">End</span>
        </button>
      </div>
    </div>
  );
}

export default MinimizedStreamWidget;
