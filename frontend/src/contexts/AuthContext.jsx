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
  const logoutUser = async (keepDeviceToken = false) => {
    try {
      // If we have a device token and we're not keeping it, try to revoke it on the server
      const deviceToken = localStorage.getItem('deviceToken');
      if (deviceToken && !keepDeviceToken) {
        try {
          // Attempt to notify the server about logout
          await fetch('https://masala-madness-production.up.railway.app/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${deviceToken}`,
              'Content-Type': 'application/json'
            }
          });
          // Remove from localStorage regardless of server response
          localStorage.removeItem('deviceToken');
        } catch (err) {
          console.error('Error during device logout:', err);
          // Still remove from localStorage even if server call fails
          localStorage.removeItem('deviceToken');
        }
      }
    } catch (error) {
      console.error('Error in logout process:', error);
    } finally {
      // Remove all session data
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('lastActivityTime');
      sessionStorage.removeItem('jwtVerified');
      // Update state
      setUser(null);
      setIsAuthenticated(false);
    }
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
  
  // Check if user is already logged in (via token in sessionStorage or deviceToken in localStorage)
  useEffect(() => {
    const verifyUser = async () => {
      try {
        setLoading(true);
        // Check if session expired
        if (!checkSessionExpiry()) {
          setLoading(false);
          return;
        }
        // Only verify JWT once per session
        const jwtVerified = sessionStorage.getItem('jwtVerified');
        const token = sessionStorage.getItem('token');
        if (token && jwtVerified === 'true') {
          // Already verified this session, just use session data
          const userData = sessionStorage.getItem('user');
          if (userData) {
            setUser(JSON.parse(userData));
            setIsAuthenticated(true);
            updateLastActivityTime();
          }
          setLoading(false);
          return;
        }
        // First try JWT token from session storage (higher priority)
        if (token) {
          console.log('Found JWT token, verifying...');
          try {
            // Use the api utility to verify the token
            const data = await api.get('/auth/verify');
            if (data.status === 'success') {
              setUser(data.user);
              setIsAuthenticated(true);
              updateLastActivityTime();
              sessionStorage.setItem('jwtVerified', 'true');
              setLoading(false);
              return;
            } else {
              // Token invalid/expired, remove it
              console.log('JWT token invalid, removing...');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              sessionStorage.removeItem('jwtVerified');
              // Continue to try device token
            }
          } catch (jwtError) {
            console.error('JWT verification error:', jwtError);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('jwtVerified');
            // Continue to try device token
          }
        }
        // If no valid session token, check for deviceToken in localStorage
        const deviceToken = localStorage.getItem('deviceToken');
        if (deviceToken) {
          console.log('Found device token, verifying...');
          try {
            // Add a timeout to prevent hanging on slow connections
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/verify', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${deviceToken}`
              },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (response.ok && data.status === 'success') {
              console.log('Device token valid, auto-login successful');
              setUser(data.user);
              setIsAuthenticated(true);
              updateLastActivityTime();
              sessionStorage.setItem('user', JSON.stringify(data.user));
              sessionStorage.setItem('jwtVerified', 'true');
              // Don't navigate if we're already on a valid route
              const currentPath = window.location.pathname;
              if (currentPath === '/login' || currentPath === '/') {
                navigate('/home');
              }
            } else {
              // Device token invalid/expired, remove it
              console.log('Device token invalid, removing...');
              localStorage.removeItem('deviceToken');
              sessionStorage.removeItem('jwtVerified');
            }
          } catch (err) {
            console.error('Device token verification error:', err);
            if (err.name === 'AbortError') {
              console.log('Device token verification timed out');
            }
            localStorage.removeItem('deviceToken');
            sessionStorage.removeItem('jwtVerified');
          }
        } else if (!token) {
          // No JWT and no device token, not authenticated
          setIsAuthenticated(false);
          setLoading(false);
          return;
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
        console.log('Session expired during periodic check');
        // Force navigation to login if session expired
        logoutUser();
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
  const logout = async (options = {}) => {
    const { keepDeviceToken = false, redirectToLogin = true } = options;
    
    await logoutUser(keepDeviceToken);
    
    // Redirect to login page if requested
    if (redirectToLogin) {
      navigate('/login');
    }
  };
  
  // Function to get user's remembered devices
  const getUserDevices = async () => {
    try {
      // Use the current active token (either JWT or device token)
      const token = sessionStorage.getItem('token') || localStorage.getItem('deviceToken');
      if (!token) return { success: false, message: 'No authentication token available' };
      
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/devices', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        return { success: true, devices: data.devices };
      } else {
        return { success: false, message: data.message || 'Failed to fetch devices' };
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      return { success: false, message: 'Error fetching devices' };
    }
  };
  
  // Function to revoke a specific device
  const revokeDevice = async (deviceId) => {
    try {
      // Use the current active token (either JWT or device token)
      const token = sessionStorage.getItem('token') || localStorage.getItem('deviceToken');
      if (!token) return { success: false, message: 'No authentication token available' };
      
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/revoke-device', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceId })
      });
      
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        // If the user revoked their current device token, log them out
        if (data.isCurrentDevice) {
          await logout({ keepDeviceToken: false });
        }
        return { success: true, message: 'Device revoked successfully', isCurrentDevice: data.isCurrentDevice };
      } else {
        return { success: false, message: data.message || 'Failed to revoke device' };
      }
    } catch (error) {
      console.error('Error revoking device:', error);
      return { success: false, message: 'Error revoking device' };
    }
  };
  
  // Provide auth data and functions to components
  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    getUserDevices,
    revokeDevice
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 