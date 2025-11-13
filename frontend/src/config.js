// Frontend configuration
// Uses environment variables from .env.local (development) or .env (production)

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://www.customerzone.in/api';
};

const getBackendUrl = () => {
  const apiUrl = getApiBaseUrl();
  // Remove /api suffix if present
  return apiUrl.replace(/\/api$/, '');
};

const getSocketUrl = () => {
  return process.env.REACT_APP_SOCKET_URL || getBackendUrl();
};

export const config = {
  apiBaseUrl: getApiBaseUrl(),
  backendUrl: getBackendUrl(),
  socketUrl: getSocketUrl(),
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
  environment: process.env.REACT_APP_ENVIRONMENT || process.env.NODE_ENV || 'development',
};

export default config;

