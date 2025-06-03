// src/utils/api.js
const API_BASE_URL = "https://masala-madness-production.up.railway.app/api"; // Backend base URL

// Default timeout for API requests (in milliseconds)
const DEFAULT_TIMEOUT = 5000;

// Get auth token from sessionStorage or deviceToken from localStorage as fallback
const getToken = () => {
  const sessionToken = sessionStorage.getItem('token');
  if (sessionToken) return sessionToken;
  
  // If no session token, try device token
  return localStorage.getItem('deviceToken');
};

// Common options for fetch requests
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// API methods
const api = {
  // GET request with timeout
  async get(endpoint, authenticated = true, timeout = DEFAULT_TIMEOUT) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(authenticated),
        signal: controller.signal,
        // Add cache control to prevent browser caching
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return await handleResponse(response);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // POST request with timeout
  async post(endpoint, data, authenticated = true, timeout = DEFAULT_TIMEOUT) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(authenticated),
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return await handleResponse(response);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // PUT request
  async put(endpoint, data, authenticated = true, timeout = DEFAULT_TIMEOUT) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(authenticated),
        body: JSON.stringify(data)
      });
      
      return await handleResponse(response);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // DELETE request
  async delete(endpoint, authenticated = true) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(authenticated)
      });
      
      return await handleResponse(response);
    } catch (error) {
      handleError(error);
      throw error;
    }
  }
};

// Handle API responses
async function handleResponse(response) {
  const data = await response.json();
  
  // If response is not ok, handle error
  if (!response.ok) {
    // If unauthorized, redirect to login
    if (response.status === 401) {
      sessionStorage.removeItem('token'); // Clear invalid token
      sessionStorage.removeItem('user'); // Clear user data
      window.location.href = '/login'; // Redirect to login
    }
    
    // Return error with data
    const error = new Error(data.message || 'API error');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// Handle and log errors
function handleError(error) {
  console.error('API Error:', error);
}

export { API_BASE_URL, api };
export default api;
    