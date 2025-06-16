import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';

const PasswordVerificationDialog = ({ isOpen, onClose, onSuccess, verificationType = "personalPassword", usedWhere = "Unknown", currentUserId }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [username, setUsername] = useState(''); // For personal password verification
  const navigate = useNavigate();
  
  // Get the username from sessionStorage when component mounts or isOpen changes
  useEffect(() => {
    if (isOpen) { // Only fetch username when dialog is open
      if (verificationType === "personalPassword") {
        try {
          const user = JSON.parse(sessionStorage.getItem('user'));
          if (user && user.username) {
            setUsername(user.username);
          } else {
            console.error('User data missing in session storage for personal password verification.');
            setError('User data missing. Please log in again.');
          }
        } catch (error) {
          console.error('Error getting username from session storage:', error);
          setError('Error accessing user data. Please try again.');
        }
      }
    } else {
      // Reset states when dialog is closed
      setUsername('');
      setError('');
      setPassword('');
    }
  }, [isOpen, verificationType]);
  
  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    try {
      let token = sessionStorage.getItem('token');
      
      if (!token) {
        // Fallback: If no session token, attempt mini-login to get one
        // This part is primarily for personal password verification where a user might have a stale session.
        // For secret code, the user is already logged in, so a token should exist.
        if (verificationType === "personalPassword") {
          console.log('No session token found, attempting mini-login for verification...');
          if (!username) {
            setError('User data missing. Cannot proceed with verification.');
            setIsVerifying(false);
            return;
          }
          const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            setError(loginData.message || 'Incorrect password. Please try again.');
            setIsVerifying(false);
            return;
          }
          token = loginData.token;
          console.log('Mini-login successful, proceeding with verification using new token.');
        } else {
          setError('Authentication token missing. Please log in.');
          setIsVerifying(false);
          return;
        }
      }
      
      let apiUrl;
      let bodyData = {};

      if (verificationType === "secretCode") {
        apiUrl = `${API_BASE_URL}/auth/secret-code/verify`;
        bodyData = { secretCode: password, usedWhere: usedWhere };
        if (currentUserId) { // Add currentUserId to body for backend audit trail
          bodyData.currentUserId = currentUserId;
        }
      } else { // Default to personalPassword
        apiUrl = `${API_BASE_URL}/auth/verify-password`;
        bodyData = { password: password };
      }

      console.log(`Attempting to verify ${verificationType}...`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.message.includes('successfully')) {
        console.log(`${verificationType} successfully verified.`);
        
        // Set the verification timestamp in localStorage with 10-minute expiry for QR/Settings access
        if (verificationType === "secretCode") {
          const expiryTime = new Date().getTime() + (10 * 60 * 1000); // Current time + 10 minutes
          localStorage.setItem('qr_verification_expiry', expiryTime.toString()); // Reusing the same key for both QR and Settings secret access
        }
        
        setPassword('');
        setError('');
        onSuccess();
      } else {
        console.error(`${verificationType} verification failed:`, data.message);
        setError(data.message || `Incorrect ${verificationType === "secretCode" ? "secret code" : "password"}. Please try again.`);
      }
    } catch (error) {
      console.error(`${verificationType} verification process failed:`, error);
      setError(`Failed to verify ${verificationType === "secretCode" ? "secret code" : "password"}. Please try again.`);
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleCancel = () => {
    setPassword('');
    setError('');
    console.log(`User ${username || currentUserId || 'Admin'} cancelled verification for ${usedWhere}`);
    onClose();
    navigate('/'); // Navigate back to home if cancelled from QR/Settings
  };
  
  const handleOverlayClick = () => {
    setPassword('');
    setError('');
    console.log(`User ${username || currentUserId || 'Admin'} closed verification dialog for ${usedWhere}`);
    onClose();
    // Do not navigate on overlay click by default unless explicitly needed
    // navigate('/');
  };
  
  // Add/remove no-scroll class to body to prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll'); // Cleanup on unmount
    };
  }, [isOpen]);
  
  // Prevent dialog from rendering if not open
  if (!isOpen) return null;
  
  const dialogTitle = verificationType === "secretCode" ? "Admin Secret Access Required" : "Admin Verification Required";
  const dialogMessage = verificationType === "secretCode" 
    ? "Please enter the secret access code to proceed." 
    : "Please enter your admin password to access this section.";
  const passwordLabel = verificationType === "secretCode" ? "Secret Access Code" : "Admin Password";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-100 to-orange-200 opacity-90 pointer-events-auto" onClick={handleOverlayClick}></div>
      
      {/* Dialog */}
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10 overflow-hidden border border-orange-200">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center">
            <span className="mr-3 text-3xl">🔐</span>
            {dialogTitle}
          </h2>
        </div>
        
        <form onSubmit={handleVerify} className="p-6 space-y-5">
          <p className="text-gray-700 text-center text-base leading-relaxed">
            {dialogMessage}
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
              {passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
              placeholder={verificationType === "secretCode" ? "Enter secret code" : "Enter your password"}
              autoComplete={verificationType === "secretCode" ? "off" : "current-password"}
              autoFocus
              disabled={isVerifying}
            />
          </div>
          
          <div className="text-sm text-gray-500 text-center">
            <p>Your verification will be valid for 10 minutes</p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
              disabled={isVerifying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors duration-200"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </div>
              ) : (
                'Verify'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordVerificationDialog; 