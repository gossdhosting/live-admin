import React, { createContext, useContext, useState, useCallback } from 'react';

const MinimizedStreamContext = createContext(null);

export function MinimizedStreamProvider({ children }) {
  // Track minimized streams: { id, type: 'webcam'|'screen', channel, streamRef, isStreaming, videoRef }
  const [minimizedStreams, setMinimizedStreams] = useState([]);

  const minimizeStream = useCallback((streamData) => {
    setMinimizedStreams(prev => {
      // Check if already minimized
      const existing = prev.find(s => s.id === streamData.id);
      if (existing) {
        return prev.map(s => s.id === streamData.id ? { ...s, ...streamData } : s);
      }
      return [...prev, streamData];
    });
  }, []);

  const maximizeStream = useCallback((id) => {
    const stream = minimizedStreams.find(s => s.id === id);
    setMinimizedStreams(prev => prev.filter(s => s.id !== id));
    return stream;
  }, [minimizedStreams]);

  const removeStream = useCallback((id) => {
    setMinimizedStreams(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateStream = useCallback((id, updates) => {
    setMinimizedStreams(prev =>
      prev.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }, []);

  const getStream = useCallback((id) => {
    return minimizedStreams.find(s => s.id === id);
  }, [minimizedStreams]);

  return (
    <MinimizedStreamContext.Provider value={{
      minimizedStreams,
      minimizeStream,
      maximizeStream,
      removeStream,
      updateStream,
      getStream
    }}>
      {children}
    </MinimizedStreamContext.Provider>
  );
}

export function useMinimizedStream() {
  const context = useContext(MinimizedStreamContext);
  if (!context) {
    throw new Error('useMinimizedStream must be used within MinimizedStreamProvider');
  }
  return context;
}

export default MinimizedStreamContext;
