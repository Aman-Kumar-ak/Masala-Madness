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
  
  // Function to check if session has expired
  const checkSessionExpiry = () => {
    const lastActivityTime = sessionStorage.getItem('lastActivityTime');
    if (!lastActivityTime) {
      return false; // No activity time recorded, session is expired
    }
    
    const currentTime = Date.now();
    const lastActivity = parseInt(lastActivityTime, 10);
    const timeDifference = currentTime - lastActivity;
    
    if (timeDifference > SESSION_EXPIRY_TIME) {
      // Session expired - but don't call logoutUser() here to avoid circular dependencies
      // Just return false and let the caller handle it
      return false;
    }
    return true;
  };
  
  // Update the last activity time
  const updateLastActivityTime = () => {
    sessionStorage.setItem('lastActivityTime', Date.now().toString());
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
    // First, immediately set auth state based on stored data to prevent UI flicker
    const preloadAuthState = () => {
      const storedUser = sessionStorage.getItem('user');
      const token = sessionStorage.getItem('token');
      const deviceToken = localStorage.getItem('deviceToken');
      
      // If we have a stored user and either token, preload the auth state
      if (storedUser && (token || deviceToken)) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          updateLastActivityTime(); // Make sure to update activity time when preloading state
        } catch (e) {
          // Invalid stored user, will be handled by verification
          console.error('Failed to parse stored user:', e);
        }
      }
    };
    
    // Run this synchronously before any async operations
    preloadAuthState();
    
    // Then verify the tokens asynchronously
    const verifyUser = async () => {
      try {
        // Check if session expired
        if (!checkSessionExpiry()) {
          console.log('Session expired during verification');
          logoutUser();
          setLoading(false);
          return;
        }
        
        // First try JWT token from session storage (higher priority)
        const token = sessionStorage.getItem('token');
        if (token) {
          try {
            // Use the api utility to verify the token
            const data = await api.get('/auth/verify');
            if (data.status === 'success') {
              setUser(data.user);
              setIsAuthenticated(true);
              updateLastActivityTime();
              sessionStorage.setItem('user', JSON.stringify(data.user)); // Update stored user data
              setLoading(false);
              return;
            } else {
              // Token invalid/expired, remove it
              console.log('JWT token verification failed, trying device token');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              // Continue to try device token
            }
          } catch (jwtError) {
            console.error('JWT verification error:', jwtError);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            // Continue to try device token
          }
        }
        
        // If no valid session token, check for deviceToken in localStorage
        const deviceToken = localStorage.getItem('deviceToken');
        if (deviceToken) {
          try {
            // Use a shorter timeout for faster response
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/verify', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${deviceToken}`,
                'Cache-Control': 'no-cache, no-store'
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const data = await response.json();
            if (response.ok && data.status === 'success') {
              // Store the JWT token from the response
              if (data.token) {
                sessionStorage.setItem('token', data.token);
              }
              
              // Update user data
              setUser(data.user);
              setIsAuthenticated(true);
              updateLastActivityTime();
              
              // Store the user data in session storage for future use
              sessionStorage.setItem('user', JSON.stringify(data.user));
              
              // Don't navigate if we're already on a valid route
              const currentPath = window.location.pathname;
              if (currentPath === '/login' || currentPath === '/') {
                navigate('/home');
              }
            } else {
              // Device token invalid/expired, remove it
              console.log('Device token verification failed:', data.message);
              localStorage.removeItem('deviceToken');
              // If we preloaded auth state, we need to clear it
              if (isAuthenticated) {
                setUser(null);
                setIsAuthenticated(false);
              }
            }
          } catch (err) {
            if (err.name === 'AbortError') {
              // Just log a warning, don't remove token on timeout
              console.warn('Device token verification timed out');
            } else {
              console.error('Device token verification error:', err);
              localStorage.removeItem('deviceToken');
              // If we preloaded auth state, we need to clear it
              if (isAuthenticated) {
                setUser(null);
                setIsAuthenticated(false);
              }
            }
          }
        } else if (isAuthenticated) {
          // If we preloaded auth state but have no valid tokens, clear it
          console.log('No valid tokens found but auth state was preloaded, clearing state');
          setUser(null);
          setIsAuthenticated(false);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Authentication verification failed:', error);
        logoutUser();
        setLoading(false);
      }
    };
    
    // Start verification process
    verifyUser();
    
    // Set up periodic checks for session expiry (less frequent to reduce overhead)
    const sessionCheckInterval = setInterval(() => {
      if (isAuthenticated && !checkSessionExpiry()) {
        // Force navigation to login if session expired
        console.log('Session expired during periodic check');
        logoutUser();
        navigate('/login');
      }
    }, 300000); // Check every 5 minutes instead of every minute
    
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [navigate]);
  
  // Login function
  const login = async (username, password, rememberDevice = true, deviceToken = null) => {
    try {
      // Set loading state immediately
      setLoading(true);
      
      // Prepare request body
      const body = { username, password, rememberDevice };
      if (deviceToken) body.deviceToken = deviceToken;
      
      // Set up timeout for faster response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Use response.json() directly instead of text parsing
      let data;
      try {
        data = await response.json();
      } catch (e) {
        setLoading(false);
        return { 
          success: false, 
          message: 'Invalid response from server. Please try again.' 
        };
      }
      
      if (response.ok && data.status === 'success') {
        // Set auth state before storage operations for faster UI update
        setUser(data.user);
        setIsAuthenticated(true);
        updateLastActivityTime();
        
        // Store tokens after state is updated
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        // Always store the JWT token regardless of remember device setting
        // This ensures the current session works properly
        if (data.deviceToken && rememberDevice) {
          localStorage.setItem('deviceToken', data.deviceToken);
        } else if (!rememberDevice) {
          // If not remembering device, make sure to remove any existing device token
          localStorage.removeItem('deviceToken');
        }
        
        setLoading(false);
        return { success: true, deviceToken: data.deviceToken };
      } else {
        setLoading(false);
        return { 
          success: false, 
          message: data.message || 'Login failed. Please check your credentials.' 
        };
      }
    } catch (error) {
      setLoading(false);
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Login request timed out. Please try again.'
        };
      }
      return { 
        success: false, 
        message: 'Network error. Please check your connection and try again.' 
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