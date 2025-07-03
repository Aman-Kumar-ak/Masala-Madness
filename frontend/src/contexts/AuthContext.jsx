import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import OfflinePage from '../components/OfflinePage';
import { io } from 'socket.io-client';
import { useNotification } from '../components/NotificationContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Sessions will expire after 8 hours of inactivity
const SESSION_EXPIRY_TIME = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [socket, setSocket] = useState(null);
  
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
      if (socket) socket.disconnect();
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
    // Try to restore from localStorage if sessionStorage is empty and rememberMeExpiry is valid
    const expiry = localStorage.getItem('rememberMeExpiry');
    if (!sessionStorage.getItem('token') && localStorage.getItem('token')) {
      if (expiry && Date.now() > parseInt(expiry, 10)) {
        // Expired, clear localStorage and require login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('jwtVerified');
        localStorage.removeItem('deviceToken');
        localStorage.removeItem('rememberMeExpiry');
        logoutUser();
        setLoading(false);
        navigate('/login');
        return;
      } else {
        sessionStorage.setItem('token', localStorage.getItem('token'));
        sessionStorage.setItem('user', localStorage.getItem('user'));
        sessionStorage.setItem('jwtVerified', localStorage.getItem('jwtVerified'));
      }
    }
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
  
  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Retry handler for OfflinePage
  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOffline(false);
      setLoading(true);
      setAuthOperationInProgress(false); // Triggers auth check
    }
  };

  // Fast optimistic auth check for instant redirect
  useEffect(() => {
    if (isOffline) return;
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('deviceToken');
    if (token) {
      setIsAuthenticated(true);
      setLoading(false);
    }
  }, [isOffline]);

  // Check if user is already logged in (via token in sessionStorage or deviceToken in localStorage)
  useEffect(() => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    // If offline, skip backend verification and do not redirect to login
    if (!navigator.onLine) {
      setLoading(false);
      // Optionally, show an offline notification here
      return;
    }
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
          if (!window.__isPasswordDialogOpen) {
            logoutUser();
            setIsAuthenticated(false);
            setLoading(false);
            navigate('/login');
          }
          return;
        }
        const jwtVerified = sessionStorage.getItem('jwtVerified');
        if (jwtVerified === 'true') {
          const userData = sessionStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.isActive === false) {
              // User is disabled, force logout and notify
              logoutUser();
              setIsAuthenticated(false);
              setLoading(false);
              if (window.showError) {
                window.showError('Your account has been disabled by the administrator.');
              } else if (typeof window !== 'undefined') {
                alert('Your account has been disabled by the administrator.');
              }
              navigate('/login');
              return;
            }
            setUser(parsedUser);
            setIsAuthenticated(true);
            updateLastActivityTime();
          } else {
            if (!window.__isPasswordDialogOpen) {
              logoutUser();
              setIsAuthenticated(false);
              setLoading(false);
              navigate('/login');
            }
          }
          return;
        }
        const token = sessionStorage.getItem('token');
        if (token) {
          try {
            const data = await api.get('/auth/verify');
            if (data.user) {
              if (data.user.isActive === false) {
                // User is disabled, force logout and notify
                logoutUser();
                setIsAuthenticated(false);
                setLoading(false);
                if (window.showError) {
                  window.showError('Your account has been disabled by the administrator.');
                } else if (typeof window !== 'undefined') {
                  alert('Your account has been disabled by the administrator.');
                }
                navigate('/login');
                return;
              }
              setUser(data.user);
              setIsAuthenticated(true);
              updateLastActivityTime();
              sessionStorage.setItem('jwtVerified', 'true');
              sessionStorage.setItem('user', JSON.stringify(data.user));
            } else {
              if (!window.__isPasswordDialogOpen) {
                logoutUser();
                setIsAuthenticated(false);
                setLoading(false);
                navigate('/login');
              }
            }
          } catch (jwtError) {
            if (!window.__isPasswordDialogOpen) {
              logoutUser();
              setIsAuthenticated(false);
              setLoading(false);
              navigate('/login');
            }
          }
        } else {
          await restoreSession();
        }
      } catch (error) {
        if (!window.__isPasswordDialogOpen) {
          logoutUser();
          setIsAuthenticated(false);
          setLoading(false);
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    // Only run verifyUser in background if token exists
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('deviceToken');
    if (token) {
      verifyUser();
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
    const sessionCheckInterval = setInterval(() => {
      if (isAuthenticated && !checkSessionExpiry()) {
        if (!window.__isPasswordDialogOpen) {
          logoutUser();
          navigate('/login');
        }
      }
    }, 60000);
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [navigate, isAuthenticated, isAuthOperationInProgress, isOffline]);
  
  // Login function
  const login = async (username, password, rememberDevice = true, deviceToken = null) => {
    try {
      const body = { username, password, rememberDevice };
      if (deviceToken) body.deviceToken = deviceToken;
      // Use api utility for login
      const data = await api.post('/auth/login', body, false, true);
      if (data && data.token) {
        setUser(data.user);
        setIsAuthenticated(true);
        updateLastActivityTime();
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('jwtVerified', 'true');
        if (rememberDevice && data.deviceToken) {
          localStorage.setItem('deviceToken', data.deviceToken);
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('jwtVerified', 'true');
          // Store expiry timestamp (30 days from now)
          const expiry = Date.now() + THIRTY_DAYS_MS;
          localStorage.setItem('rememberMeExpiry', expiry.toString());
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('jwtVerified');
          localStorage.removeItem('rememberMeExpiry');
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
  
  // On app load, restore JWT and user from localStorage if not in sessionStorage and rememberMeExpiry is valid
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');
    const expiry = localStorage.getItem('rememberMeExpiry');
    if (!token && localStorage.getItem('token')) {
      if (expiry && Date.now() > parseInt(expiry, 10)) {
        // Expired, clear localStorage and do not restore session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('jwtVerified');
        localStorage.removeItem('deviceToken');
        localStorage.removeItem('rememberMeExpiry');
      } else {
        sessionStorage.setItem('token', localStorage.getItem('token'));
        sessionStorage.setItem('user', localStorage.getItem('user'));
        sessionStorage.setItem('jwtVerified', localStorage.getItem('jwtVerified'));
      }
    }
  }, []);
  
  // Setup socket.io connection after login
  useEffect(() => {
    if (user && user._id) {
      // Use backend base URL (remove /api)
      const backendUrl = 'https://masala-madness.onrender.com';
      const sock = io(backendUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        auth: { userId: user._id }
      });
      setSocket(sock);
      sock.emit('register', user._id);
      sock.on('user-disabled', (data) => {
        showError(data?.reason || 'Your account has been disabled.');
        logoutUser();
        navigate('/login');
      });
      // Log connection errors
      sock.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err);
      });
      // Heartbeat: emit user-active every 10s
      const heartbeat = setInterval(() => {
        console.log('Sending heartbeat', user._id);
        sock.emit('user-active', user._id);
      }, 10000);
      return () => {
        sock.disconnect();
        clearInterval(heartbeat);
      };
    }
  }, [user, showError, navigate]);
  
  // Add a fast, robust session restoration and user active check logic
  useEffect(() => {
    console.log('Session restoration: Checking session or database on page load.');
    let intervalId;
    let attempts = 0;
    const maxAttempts = 3; // Try for 3 seconds
    if (!isAuthenticated && !loading) {
      intervalId = setInterval(async () => {
        attempts++;
        // Try to restore session as usual
        let restored = false;
        try {
          await restoreSession();
          if (sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('deviceToken')) {
            setIsAuthenticated(true);
            setLoading(false);
            restored = true;
            console.log('Session restoration: Session restored from token/session.');
          }
        } catch {}
        if (!restored) {
          // If not restored, check if user is still active
          let identifier = null;
          try {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userStr) {
              const userObj = JSON.parse(userStr);
              identifier = userObj.username || userObj.mobileNumber;
            }
          } catch {}
          if (identifier) {
            try {
              const res = await api.post('/auth/check-active', { username: identifier });
              if (res.active) {
                setIsAuthenticated(false);
                setLoading(false);
                console.log('Session restoration: Connection established with database (user is active).');
              } else {
                logoutUser();
                setIsAuthenticated(false);
                setLoading(false);
                showError('Your account has been disabled by the administrator.');
                navigate('/login');
                console.log('Session restoration: User is not active, forced logout.');
              }
            } catch {}
          } else {
            console.log('Session restoration: No identifier found for database check.');
          }
        }
        if (restored || attempts >= maxAttempts) {
          clearInterval(intervalId);
        }
      }, 1000); // 1 second interval for fast check
    } else if (isAuthenticated) {
      console.log('Session restoration: User is already authenticated.');
    }
    return () => clearInterval(intervalId);
  }, [isAuthenticated, loading]);
  
  // Update lastClosed on window/tab close
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isAuthenticated && user && user._id) {
          // Use the full backend URL for the API endpoint
        const url = 'https://masala-madness.onrender.com/api/auth/last-closed';
        const payload = JSON.stringify({ userId: user._id });
        console.log('Sending lastClosed update', user._id);
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        } else {
          // Fallback to fetch (may not always complete)
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          });
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, user]);
  
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
    restoreSession,
    setUser,
    setIsAuthenticated
  };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      {isOffline ? <OfflinePage onRetry={handleRetry} /> : children}
    </AuthContext.Provider>
  );
};

export default AuthContext;