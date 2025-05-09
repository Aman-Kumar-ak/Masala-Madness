import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { throttle } from '../utils/performance';

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
  const updateLastActivityTime = useCallback(() => {
    sessionStorage.setItem('lastActivityTime', new Date().getTime().toString());
  }, []);
  
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
  
  // Update activity time on any user interaction - optimized with throttle
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Throttle the update function to improve performance
    // Only update once every 30 seconds at most, which is reasonable for session tracking
    const throttledUpdateActivity = throttle(() => {
      if (isAuthenticated) {
        updateLastActivityTime();
      }
    }, 30000);
    
    // Use passive event listeners where possible for better performance
    const options = { passive: true };
    
    // Listen for user activity events
    window.addEventListener('mousemove', throttledUpdateActivity, options);
    window.addEventListener('keydown', throttledUpdateActivity, options);
    window.addEventListener('click', throttledUpdateActivity, options);
    window.addEventListener('scroll', throttledUpdateActivity, options);
    
    return () => {
      // Cleanup event listeners
      window.removeEventListener('mousemove', throttledUpdateActivity);
      window.removeEventListener('keydown', throttledUpdateActivity);
      window.removeEventListener('click', throttledUpdateActivity);
      window.removeEventListener('scroll', throttledUpdateActivity);
    };
  }, [isAuthenticated, updateLastActivityTime]);
  
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
    
    // Set up periodic checks for session expiry - reduced frequency for better performance
    const sessionCheckInterval = setInterval(() => {
      if (isAuthenticated && !checkSessionExpiry()) {
        // Force navigation to login if session expired
        navigate('/login');
      }
    }, 120000); // Check every 2 minutes instead of every minute
    
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [navigate, isAuthenticated, updateLastActivityTime]);
  
  // Login function
  const login = async (username, password) => {
    try {
      const data = await api.post('/auth/login', { username, password });
      
      if (data.status === 'success' && data.token) {
        // Store token
        sessionStorage.setItem('token', data.token);
        
        // Store user data
        if (data.user) {
          sessionStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
        
        // Set authenticated and update last activity time
        setIsAuthenticated(true);
        updateLastActivityTime();
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: data.message || 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'An unexpected error occurred' 
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