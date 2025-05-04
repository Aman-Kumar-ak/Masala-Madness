import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';

const PasswordVerificationDialog = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  
  // Get the username when component mounts
  useEffect(() => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'));
      if (user && user.username) {
        setUsername(user.username);
      }
    } catch (error) {
      console.error('Error getting username from session storage:', error);
    }
  }, []);
  
  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    try {
      // Use fetch directly instead of api utility to avoid automatic redirect on 401
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        console.log(`User ${username || 'Admin'} successfully verified password`);
        setPassword('');
        onSuccess();
      } else {
        // Show error but don't redirect to login page
        console.error(`User: ${username || 'Admin'} entered incorrect password`);
        setError('Incorrect password. Please try again.');
      }
    } catch (error) {
      console.error(`Password verification error for user ${username || 'Admin'}:`, error);
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleCancel = () => {
    // Clear password field
    setPassword('');
    // Clear any error messages
    setError('');
    // Only redirect to home page when cancel button is explicitly clicked
    console.log(`User ${username || 'Admin'} cancelled password verification`);
    navigate('/');
  };
  
  const handleOverlayClick = () => {
    // Clear password field
    setPassword('');
    // Clear error
    setError('');
    // Simply close the dialog without redirecting
    console.log(`User ${username || 'Admin'} closed password verification dialog`);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-50" onClick={handleOverlayClick}></div>
      
      {/* Dialog */}
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10 overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <span className="mr-2">🔐</span>
            Admin Verification Required
          </h2>
        </div>
        
        <form onSubmit={handleVerify} className="p-6">
          <p className="text-gray-600 mb-4">
            Please enter your admin password to access the QR settings.
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your password"
              autoFocus
              disabled={isVerifying}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordVerificationDialog; 