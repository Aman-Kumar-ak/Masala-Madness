import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Check if user is already logged in (via token in localStorage)
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Use the api utility to verify the token
        const data = await api.get('/auth/verify');
        
        if (data.status === 'success') {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          // Token invalid/expired, remove it
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Authentication verification failed:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    
    verifyUser();
  }, []);
  
  // Login function
  const login = async (username, password) => {
    console.log('Attempting login with:', { username });
    
    try {
      // Use direct fetch for troubleshooting
      const response = await fetch('http://localhost:5000/api/auth/login', {
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
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        
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
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    // Redirect to home page
    navigate('/');
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