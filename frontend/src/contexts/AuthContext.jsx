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
    localStorage.removeItem('deviceToken'); // Remove deviceToken on logout
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
        if (token) {
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
          setLoading(false);
          return;
        }
        // If no session token, check for deviceToken in localStorage
        const deviceToken = localStorage.getItem('deviceToken');
        if (deviceToken) {
          // Try to verify device token
          try {
            const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/verify', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${deviceToken}`
              }
            });
            const data = await response.json();
            if (response.ok && data.status === 'success') {
              setUser(data.user);
              setIsAuthenticated(true);
              updateLastActivityTime();
              navigate('/home');
            } else {
              // Device token invalid/expired, remove it
              localStorage.removeItem('deviceToken');
              logoutUser();
            }
          } catch (err) {
            localStorage.removeItem('deviceToken');
            logoutUser();
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Authentication verification failed:', error);
        logoutUser();
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
  const login = async (username, password, rememberDevice = true, deviceToken = null) => {
    console.log('Attempting login...');
    try {
      const body = { username, password, rememberDevice };
      if (deviceToken) body.deviceToken = deviceToken;
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      console.log('Login response status:', response.status);
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON');
        return { 
          success: false, 
          message: 'Invalid response from server. Please try again.' 
        };
      }
      if (response.ok && data.status === 'success') {
        console.log('Login successful');
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        updateLastActivityTime();
        setUser(data.user);
        setIsAuthenticated(true);
        if (data.deviceToken && rememberDevice) {
          localStorage.setItem('deviceToken', data.deviceToken);
        }
        return { success: true, deviceToken: data.deviceToken };
      } else {
        console.log('Login failed');
        return { 
          success: false, 
          message: data.message || 'Login failed. Please check your credentials.' 
        };
      }
    } catch (error) {
      console.error('Login error occurred');
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