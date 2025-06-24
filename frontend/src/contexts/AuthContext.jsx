import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Sessions will expire after 8 hours of inactivity
const SESSION_EXPIRY_TIME = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);
  const navigate = useNavigate();
  
  // Functions to manage auth operation in progress state
  const setAuthOperationInProgress = useCallback(() => {
    setIsAuthOperationInProgress(true);
  }, []);

  const clearAuthOperationInProgress = useCallback(() => {
    setIsAuthOperationInProgress(false);
  }, []);
  
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
      localStorage.removeItem('qr_verification_expiry'); // Invalidate QR/Settings secret code access on logout
      localStorage.removeItem('admin_unlock_expiry');
      localStorage.removeItem('qr_unlock_expiry');
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
    const deviceToken = localStorage.getItem('deviceToken');
    if (deviceToken) {
      try {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        // Use api utility for verification
        const response = await api.get('/auth/verify', true, false, deviceToken);
        clearTimeout(timeoutId);
        if (!response) {
          console.warn('restoreSession: Device token verification failed (response not ok).');
          logoutUser();
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch (error) {
        logoutUser();
        setLoading(false);
        navigate('/login');
        return;
      }
    }
  };
  
  // Check if user is already logged in (via token in sessionStorage or deviceToken in localStorage)
  useEffect(() => {
    const pageRefreshFlag = sessionStorage.getItem('pageRefreshFlag');
    if (!pageRefreshFlag) {
      sessionStorage.setItem('pageRefreshFlag', 'true');
      sessionStorage.removeItem('jwtVerified');
    }
    
    const verifyUser = async () => {
      if (isAuthOperationInProgress) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (!checkSessionExpiry()) {
          logoutUser();
          setLoading(false);
          navigate('/login');
          return;
        }

        const jwtVerified = sessionStorage.getItem('jwtVerified');
        if (jwtVerified === 'true') {
          const userData = sessionStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setIsAuthenticated(true);
            updateLastActivityTime();
          } else {
            logoutUser();
            setLoading(false);
            navigate('/login');
          }
          return;
        }

        const token = sessionStorage.getItem('token');
        if (token) {
          try {
            const data = await api.get('/auth/verify');
            if (data.user) {
              setUser(data.user);
              setIsAuthenticated(true);
              updateLastActivityTime();
              sessionStorage.setItem('jwtVerified', 'true');
              sessionStorage.setItem('user', JSON.stringify(data.user));
            } else {
              logoutUser();
              setLoading(false);
              navigate('/login');
            }
          } catch (jwtError) {
            logoutUser();
            setLoading(false);
            navigate('/login');
          }
        } else {
          await restoreSession();
        }
      } catch (error) {
        logoutUser();
        setLoading(false);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
    const sessionCheckInterval = setInterval(() => {
      if (isAuthenticated && !checkSessionExpiry()) {
        logoutUser();
        navigate('/login');
      }
    }, 60000);
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [navigate, isAuthenticated, isAuthOperationInProgress]);
  
  // Login function
  const login = async (username, password, rememberDevice = true, deviceToken = null) => {
    try {
      const body = { username, password, rememberDevice };
      if (deviceToken) body.deviceToken = deviceToken;
      // Use api utility for login
      const data = await api.post('/auth/login', body, false);
      if (data && data.token) {
        setUser(data.user);
        setIsAuthenticated(true);
        updateLastActivityTime();
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('jwtVerified', 'true');
        if (rememberDevice && data.deviceToken) {
          localStorage.setItem('deviceToken', data.deviceToken);
        }
        return { success: true, user: data.user, deviceToken: data.deviceToken };
      } else {
        const errorMessage = (data && data.message) || 'Login failed due to unknown error.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      return { success: false, message: error.message || 'An unexpected error occurred during login.' };
    } finally {
      clearAuthOperationInProgress();
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
    setAuthOperationInProgress,
    clearAuthOperationInProgress,
    restoreSession
  };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 