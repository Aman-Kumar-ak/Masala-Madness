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
  const logoutUser = async (keepDeviceToken = false, isSilentLogout = false) => {
    try {
      if (!keepDeviceToken) {
          localStorage.removeItem('deviceToken');
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error in logout process:', error);
    } finally {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('lastActivityTime');
      sessionStorage.removeItem('jwtVerified');
      setUser(null);
      setIsAuthenticated(false);
      if (!isSilentLogout) {
        sessionStorage.setItem('logoutSuccess', 'true');
      }
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
  
  // Expose a function to restore session from device token
  const restoreSession = async () => {
    // Try JWT first
    const token = sessionStorage.getItem('token');
    if (token) {
      // Already handled by useEffect, nothing to do
      return;
    }
    // Try device token
    const deviceToken = localStorage.getItem('deviceToken');
    if (deviceToken) {
      try {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${deviceToken}`
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        // Check only response.ok as backend no longer sends status: 'success'
        if (response.ok) {
          setUser(data.user); // data.user will contain role
          setIsAuthenticated(true);
          updateLastActivityTime();
          sessionStorage.setItem('user', JSON.stringify(data.user));
          sessionStorage.setItem('jwtVerified', 'true');
          // Optionally, you could request a new JWT here if your backend supports it
        } else {
          localStorage.removeItem('deviceToken');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        localStorage.removeItem('deviceToken');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  };
  
  // Check if user is already logged in (via token in sessionStorage or deviceToken in localStorage)
  useEffect(() => {
    // Create a refresh token flag to track page refreshes
    const pageRefreshFlag = sessionStorage.getItem('pageRefreshFlag');
    if (!pageRefreshFlag) {
      // This is a page refresh or initial load, set the flag
      sessionStorage.setItem('pageRefreshFlag', 'true');
      // Clear the jwtVerified flag to force re-verification after refresh
      sessionStorage.removeItem('jwtVerified');
    }
    
    const verifyUser = async () => {
      try {
        setLoading(true);
        if (!checkSessionExpiry()) {
          setLoading(false);
          return;
        }
        const jwtVerified = sessionStorage.getItem('jwtVerified');
        if (jwtVerified === 'true') {
          const userData = sessionStorage.getItem('user');
          if (userData) {
            setUser(JSON.parse(userData)); // user will contain role
            setIsAuthenticated(true);
            updateLastActivityTime();
          }
          setLoading(false);
          return;
        }
        const token = sessionStorage.getItem('token');
        if (token) {
          try {
            const data = await api.get('/auth/verify');
            // Check only for successful response as backend no longer sends status: 'success'
            if (data.user) { // Backend returns data.user directly on success
              setUser(data.user); // user will contain role
              setIsAuthenticated(true);
              updateLastActivityTime();
              sessionStorage.setItem('jwtVerified', 'true');
              sessionStorage.setItem('user', JSON.stringify(data.user));
              setLoading(false);
              return;
            } else {
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
            }
          } catch (jwtError) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
          }
        }
        // If no valid JWT, try to restore session from device token
        await restoreSession();
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
  }, [navigate]);
  
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
      if (response.ok) {
        console.log('Login successful');
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        if (rememberDevice) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        updateLastActivityTime();
        setIsAuthenticated(true);
        setUser(data.user);
        return {
          success: true,
          deviceToken: data.deviceToken,
          user: data.user
        };
      } else {
        return { 
          success: false, 
          message: data.message || 'Login failed. Please check your credentials.' 
        };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { 
        success: false, 
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  };
  
  // Logout function
  const logout = async (options = {}) => {
    await logoutUser(options.keepDeviceToken, options.isSilentLogout);
  };
  
  // Device management functions (assuming they interact with backend)
  const getUserDevices = async () => {
    try {
      const res = await api.get('/auth/devices');
      return res.devices;
    } catch (error) {
      console.error('Error fetching user devices:', error);
      return [];
    }
  };
  
  const revokeDevice = async (deviceId) => {
    try {
      await api.post(`/auth/devices/revoke/${deviceId}`);
      // Remove the device from local storage if it was the current one
      if (localStorage.getItem('deviceToken') === deviceId) {
        localStorage.removeItem('deviceToken');
      }
      return { success: true };
    } catch (error) {
      console.error('Error revoking device:', error);
      return { success: false, message: error.message || 'Failed to revoke device.' };
    }
  };
  
  // On app load, restore JWT and user from localStorage if not in sessionStorage
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');
    if (!token && localStorage.getItem('token')) {
      sessionStorage.setItem('token', localStorage.getItem('token'));
      sessionStorage.setItem('user', localStorage.getItem('user'));
    }
  }, []);
  
  // Provide auth data and functions to components
  const authContextValue = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    getUserDevices,
    revokeDevice,
    restoreSession // Expose restoreSession for external use if needed
  };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 