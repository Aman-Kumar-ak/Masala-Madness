import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Sessions will expire after 8 hours of inactivity
const SESSION_EXPIRY_TIME = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Check if session has expired
  const checkSessionExpiry = () => {
    const lastActivityTime = sessionStorage.getItem('lastActivityTime');
    if (lastActivityTime) {
      const currentTime = new Date().getTime();
      if (currentTime - parseInt(lastActivityTime) > SESSION_EXPIRY_TIME) {
        // Session expired, log the user out
        console.log('Session expired, logging out user');
        logoutUser();
        return false;
      }
    }
    return true;
  };
  
  // Update the last activity time
  const updateLastActivityTime = () => {
    sessionStorage.setItem('lastActivityTime', new Date().getTime().toString());
  };
  
  // Function to handle logout
  const logoutUser = () => {
    // Remove all session data
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('lastActivityTime');
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
  };
  
  // Update activity time on any user interaction
  useEffect(() => {
    const handleUserActivity = () => {
      if (isAuthenticated) {
        updateLastActivityTime();
      }
    };
    
    // Listen for user activity events
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    
    return () => {
      // Cleanup event listeners
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [isAuthenticated]);
  
  // Check if user is already logged in (via token in sessionStorage)
  useEffect(() => {
    const verifyUser = async () => {
      try {
        // Check if session expired
        if (!checkSessionExpiry()) {
          setLoading(false);
          return;
        }
        
        const token = sessionStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Use the api utility to verify the token
        const data = await api.get('/auth/verify');
        
        if (data.status === 'success') {
          setUser(data.user);
          setIsAuthenticated(true);
          updateLastActivityTime();
        } else {
          // Token invalid/expired, remove it
          logoutUser();
        }
      } catch (error) {
        console.error('Authentication verification failed:', error);
        logoutUser();
      } finally {
        setLoading(false);
      }
    };
    
    verifyUser();
    
    // Set up periodic checks for session expiry
    const sessionCheckInterval = setInterval(() => {
      if (isAuthenticated && !checkSessionExpiry()) {
        // Force navigation to login if session expired
        navigate('/login');
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [navigate, isAuthenticated]);
  
  // Login function
  const login = async (username, password) => {
    console.log('Attempting login with:', { username });
    
    try {
      // Use direct fetch for troubleshooting
      const response = await fetch('https://masala-madness-logn.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      console.log('Login response status:', response.status);
      
      // Get response body as text first to inspect
      const responseText = await response.text();
      console.log('Login response body:', responseText);
      
      // Parse the JSON if it's a valid JSON string
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        return { 
          success: false, 
          message: 'Invalid response from server. Please try again.' 
        };
      }
      
      if (response.ok && data.status === 'success') {
        console.log('Login successful');
        // Store token in sessionStorage
        sessionStorage.setItem('token', data.token);
        
        // Also store user data in sessionStorage
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        // Set last activity time
        updateLastActivityTime();
        
        // Update state
        setUser(data.user);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        console.log('Login failed with response:', data);
        return { 
          success: false, 
          message: data.message || 'Login failed. Please check your credentials.' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: 'Login failed. Please try again later.' 
      };
    }
  };
  
  // Logout function
  const logout = () => {
    logoutUser();
    
    // Redirect to login page
    navigate('/login');
  };
  
  // Provide auth data and functions to components
  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 