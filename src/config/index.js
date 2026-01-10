// Application configuration
export const config = {
  // HLS streaming base URL
  hlsBaseUrl: import.meta.env.VITE_HLS_URL || 'https://panel.zebcast.app',

  // API base URL (already configured in api.js)
  apiBaseUrl: import.meta.env.VITE_API_URL || '',
};

export default config;
