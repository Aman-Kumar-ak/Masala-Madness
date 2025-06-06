import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';

const PasswordVerificationDialog = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  
  // Get the username from sessionStorage when component mounts or isOpen changes
  useEffect(() => {
    if (isOpen) { // Only fetch username when dialog is open
      try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (user && user.username) {
          setUsername(user.username);
        } else {
          // If user data is missing, maybe redirect or show an error
          console.error('User data missing in session storage. Cannot verify password.');
          setError('User data missing. Please log in again.');
          // Optionally navigate away or disable verification
        }
      } catch (error) {
        console.error('Error getting username from session storage:', error);
        setError('Error accessing user data. Please try again.');
      }
    } else {
      // Reset username and error when dialog is closed
      setUsername('');
      setError('');
      setPassword(''); // Also clear password on close
    }
  }, [isOpen]); // Depend on isOpen
  
  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    if (!username) {
      setError('User data missing. Cannot verify.');
      console.error('Username is not set. Cannot proceed with verification.');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    try {
      let token = sessionStorage.getItem('token');
      
      // Fallback: If no session token, attempt mini-login to get one
      if (!token) {
        console.log('No session token found, attempting mini-login for verification...');
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Pass rememberDevice: false to avoid creating new device tokens during verification
          body: JSON.stringify({ username: username, password: password, rememberDevice: false })
        });

        let loginData = {};
        try {
          loginData = await loginResponse.json();
        } catch (jsonErr) {
          console.error('Mini-login: Failed to parse JSON response', jsonErr);
          throw new Error('Server error during verification login. Please try again later.');
        }

        if (!loginResponse.ok || loginData.status !== 'success' || !loginData.token) {
          console.warn('Mini-login failed during verification', loginData.message);
          // If login fails, it means the password was likely incorrect
          setError(loginData.message || 'Incorrect password. Please try again.');
          setIsVerifying(false);
          return; // Stop here if mini-login fails
        }

        // Mini-login successful, use the new token for verification
        token = loginData.token;
        console.log('Mini-login successful, proceeding with verification using new token.');
        // Optionally store the new token in sessionStorage if you want to extend the session
        // sessionStorage.setItem('token', token);
      }
      
      // Proceed with password verification using the obtained token
      console.log('Attempting to verify password...');
      const response = await fetch(`${API_BASE_URL}/auth/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Use the token (session or new from mini-login)
        },
        body: JSON.stringify({ password: password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        console.log(`Password successfully verified for user ${username}`);
        
        // Set the verification timestamp in localStorage with 10-minute expiry
        const expiryTime = new Date().getTime() + (10 * 60 * 1000); // Current time + 10 minutes
        localStorage.setItem('qr_verification_expiry', expiryTime.toString());
        
        // Clear password and call success callback
        setPassword('');
        setError(''); // Clear any previous error
        onSuccess();
      } else {
        // If verify-password endpoint returns an error (e.g., token invalid somehow)
        console.error(`Password verification failed for user ${username}:`, data.message);
        // Show error but don't redirect to login page
        setError(data.message || 'Incorrect password. Please try again.');
        // Clear potentially bad token if verification failed after mini-login
        if (!sessionStorage.getItem('token')) { // Only remove if we didn't store the new token from mini-login
             // Consider adding logic here if you decide to store the mini-login token
        }
      }
    } catch (error) {
      console.error(`Password verification process failed for user ${username}:`, error);
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleCancel = () => {
    // Clear password field and error
    setPassword('');
    setError('');
    // Navigate away when cancel button is explicitly clicked
    console.log(`User ${username || 'Admin'} cancelled password verification`);
    // Use onClose to handle closing behavior defined in parent (Qr.jsx)
    onClose();
    // Optionally navigate home if needed, but Qr.jsx might handle this based on state
     navigate('/');
  };
  
  const handleOverlayClick = () => {
    // Clear password field and error
    setPassword('');
    setError('');
    // Use onClose to handle closing behavior defined in parent (Qr.jsx)
    console.log(`User ${username || 'Admin'} closed password verification dialog`);
    onClose();
    // Optionally navigate home if needed, but Qr.jsx might handle this based on state
    // navigate('/');
  };
  
  // Prevent dialog from rendering if not open
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-50" onClick={handleOverlayClick}></div>
      
      {/* Dialog */}
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10 overflow-hidden">
        <div className="bg-red-500 px-6 py-4">
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
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              placeholder="Enter your password"
              autoFocus
              disabled={isVerifying}
            />
          </div>
          
          <div className="mt-2 text-sm text-red-600">
            <p>Your verification will be valid for 10 minutes</p>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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