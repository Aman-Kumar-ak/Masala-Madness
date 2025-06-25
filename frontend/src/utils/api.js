// src/utils/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://masala-madness.onrender.com/api"; // Backend base URL

// Get auth token from sessionStorage or fallback to device token from localStorage
const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('deviceToken');

// Common options for fetch requests
const getHeaders = (includeAuth = true, tokenOverride = null) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (includeAuth) {
    const token = tokenOverride || getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// API methods
const api = {
  // GET request
  async get(endpoint, authenticated = true, suppressAuthRedirect = false, token = null) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(authenticated, token)
      });
      
      return await handleResponse(response, suppressAuthRedirect);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // POST request
  async post(endpoint, data, authenticated = true, suppressAuthRedirect = false, token = null) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(authenticated, token),
        body: JSON.stringify(data)
      });
      
      return await handleResponse(response, suppressAuthRedirect);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // PUT request
  async put(endpoint, data, authenticated = true, suppressAuthRedirect = false) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(authenticated)
      });
      
      return await handleResponse(response, suppressAuthRedirect);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // DELETE request
  async delete(endpoint, authenticated = true, suppressAuthRedirect = false) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(authenticated)
      });
      
      return await handleResponse(response, suppressAuthRedirect);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // PATCH request
  async patch(endpoint, data, authenticated = true, suppressAuthRedirect = false, token = null) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(authenticated, token),
        body: JSON.stringify(data)
      });
      return await handleResponse(response, suppressAuthRedirect);
    } catch (error) {
      handleError(error);
      throw error;
    }
  }
};

// Handle API responses
async function handleResponse(response, suppressAuthRedirect = false) {
  let data;
  let isJson = true;
  try {
    data = await response.json();
  } catch (e) {
    isJson = false;
    data = null;
  }

  // If response is not ok, handle error
  if (!response.ok) {
    // If unauthorized AND not suppressing redirect, clear session and redirect to login
    if (response.status === 401 && !suppressAuthRedirect) {
      sessionStorage.removeItem('token'); // Clear invalid token
      sessionStorage.removeItem('user'); // Clear user data
      window.location.href = '/login'; // Redirect to login
      // Prevent further processing if redirect is happening
      throw new Error('Unauthorized - Redirecting to login');
    }

    // If 401 and suppressing redirect, or other error status, just throw the error without redirecting
    if (!isJson) {
      const error = new Error(`API error: Received non-JSON response (status ${response.status}). Possible 404 or server error.`);
      error.status = response.status;
      error.data = null;
      throw error;
    }

    // Return error with data
    const error = new Error((data && data.message) || 'API error');
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
