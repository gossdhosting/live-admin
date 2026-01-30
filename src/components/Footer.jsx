import React, { useState, useEffect } from 'react';
import { Heart, Activity } from 'lucide-react';
import api from '../services/api';

function Footer() {
  const currentYear = new Date().getFullYear();
  const [backendStatus, setBackendStatus] = useState('checking');
  const [statusDetails, setStatusDetails] = useState(null);

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await api.get('/status');
        if (response.data && response.data.services) {
          // Check if all services are online
          const allOnline = response.data.services.every(
            service => service.status === 'online'
          );
          setBackendStatus(allOnline ? 'online' : 'degraded');
          setStatusDetails(response.data);
        } else {
          setBackendStatus('online');
        }
      } catch (error) {
        setBackendStatus('offline');
        setStatusDetails(null);
      }
    };

    // Check immediately
    checkBackendStatus();

    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'online':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case 'online':
        return 'All Systems Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'offline':
        return 'Service Unavailable';
      default:
        return 'Checking Status...';
    }
  };

  return (
    <footer className="bg-gradient-to-r from-[#212836] to-black text-white py-6 mt-auto border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          {/* Status Banner */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-gray-700">
              <Activity className="w-4 h-4 text-gray-300" />
              <span className="text-xs font-medium text-gray-300">Rexstream Backbone Status:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
                <span className="text-xs font-semibold text-white">{getStatusText()}</span>
              </div>
            </div>
          </div>

          {/* Main Footer Content */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-300">
                © {currentYear} Rexstream. All rights reserved.
              </p>
            </div>

            {/* Made with love */}
            <div className="text-center">
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                Made with <Heart className="w-4 h-4 text-red-500 fill-current" /> by Rexstream Team
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-4 text-sm text-gray-300">
              <a href="https://www.rexstream.net" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Website
              </a>
              <span className="text-gray-600">•</span>
              <a href="https://www.rexstream.net/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Privacy
              </a>
              <span className="text-gray-600">•</span>
              <a href="https://www.rexstream.net/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
