// src/utils/api.js
const API_BASE_URL = "https://masala-madness-logn.onrender.com/api"; // Backend base URL

// Get auth token from sessionStorage
const getToken = () => sessionStorage.getItem('token');

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
  // GET request
  async get(endpoint, authenticated = true) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(authenticated)
      });
      
      return await handleResponse(response);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // POST request
  async post(endpoint, data, authenticated = true) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(authenticated),
        body: JSON.stringify(data)
      });
      
      return await handleResponse(response);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  // PUT request
  async put(endpoint, data, authenticated = true) {
    try {
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
    