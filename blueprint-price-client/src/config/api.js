// API Configuration
const API_CONFIG = {
  development: {
    baseURL: 'http://127.0.0.1:8081'
  },
  production: {
    baseURL: process.env.REACT_APP_API_BASE_URL || 'https://your-zeabur-api-domain.zeabur.app'
  }
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';

// Export API base URL
export const API_BASE_URL = API_CONFIG[environment].baseURL;

// API endpoints
export const API_ENDPOINTS = {
  predict: '/predict',
  history: '/history',
  health: '/health'
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint, params = '') => {
  const baseUrl = API_BASE_URL;
  const url = `${baseUrl}${endpoint}${params ? `?${params}` : ''}`;
  return url;
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl
};