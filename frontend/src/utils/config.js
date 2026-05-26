// src/utils/config.js
const DEFAULT_API_URL = 'https://masala-madness-backend.onrender.com/api';

const normalizeApiUrl = (url = DEFAULT_API_URL) => {
  const trimmedUrl = String(url).trim().replace(/\/+$/, '');
  return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`;
};

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_URL = API_BASE_URL;
export const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '');
 
// Export other configuration values here
// Manually bump this when the privacy policy content changes
export const PRIVACY_POLICY_LAST_UPDATED = '2025-09-17';
