import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const PasswordVerificationDialog = ({ isOpen, onClose, onSuccess, verificationType = "personalPassword", usedWhere = "Unknown", currentUserId, infoText }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [username, setUsername] = useState(''); // For personal password verification
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
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
        // Try device token if session token is not available
        token = localStorage.getItem('deviceToken');
        if (!token && verificationType === "personalPassword") {
          console.log('No session token found, attempting mini-login for verification...');
          if (!username) {
            setError('User data missing. Cannot proceed with verification.');
            setIsVerifying(false);
            return;
          }
          // Use api utility for login
          const loginData = await api.post('/auth/login', { username, password, rememberDevice: false });
          if (!loginData || !loginData.token) {
            setError('Incorrect password. Please try again.');
            setIsVerifying(false);
            return;
          }
          token = loginData.token;
          console.log('Mini-login successful, proceeding with verification using new token.');
        }
      }
      
      let apiUrl, bodyData;
      if (verificationType === "secretCode") {
        apiUrl = '/auth/secret-code/verify';
        bodyData = { 
          secretCode: password, 
          usedWhere: usedWhere,
          deviceToken: localStorage.getItem('deviceToken')
        };
        if (currentUserId) {
          bodyData.currentUserId = currentUserId;
        }
      } else {
        apiUrl = '/auth/verify-password';
        bodyData = { password: password };
      }

      console.log(`Attempting to verify ${verificationType}...`);
      // Use api utility for verification
      const data = await api.post(apiUrl, bodyData, true, false, token);
      
      if (data.message.includes('successfully')) {
        // Store new session token if present
        if (data.token) {
          sessionStorage.setItem('token', data.token);
        }
        // If device token is present in response, update it
        if (data.deviceToken) {
          localStorage.setItem('deviceToken', data.deviceToken);
        }
        console.log(`${verificationType} successfully verified.`);
        
        // Set the verification timestamp in localStorage with 10-minute expiry for QR/Settings access
        if (verificationType === "secretCode") {
          const expiryTime = new Date().getTime() + (10 * 60 * 1000); // Current time + 10 minutes
          localStorage.setItem('qr_verification_expiry', expiryTime.toString());
          if (usedWhere === 'QR Access') {
            localStorage.setItem('qr_unlock_expiry', expiryTime.toString());
          } else if (usedWhere === 'Settings' || usedWhere === 'Devices') {
            localStorage.setItem('admin_unlock_expiry', expiryTime.toString());
          }
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
  
  const dialogTitle = verificationType === "secretCode" ? "Admin Controls Locked" : "Admin Verification Required";
  const dialogMessage = verificationType === "secretCode" 
    ? "A secret access code is required to manage devices and user roles."
    : "Please enter your admin password to access this section.";
  const passwordLabel = verificationType === "secretCode" ? "Secret Access Code" : "Admin Password";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-100 to-orange-200 opacity-90"></div>
      
      {/* Dialog */}
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10 overflow-hidden border border-orange-200 pointer-events-auto">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 flex flex-col items-center justify-center">
          <img src="/images/login.png" alt="Lock Icon" className="w-16 h-16 mb-2" />
          <h2 className="text-2xl font-bold text-white text-center">
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base pr-10"
                placeholder={verificationType === "secretCode" ? "Enter secret access code" : "Enter your password"}
                autoComplete={verificationType === "secretCode" ? "off" : "current-password"}
                autoFocus
                disabled={isVerifying}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z' : 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z'} />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 text-center">
            <p>{infoText ? infoText : "Once verified, you'll have access for 15 minutes without re-entering the code."}</p>
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
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 flex items-center justify-center space-x-2"
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
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 11V9a3 3 0 00-3-3V4a1 1 0 011-1h6a1 1 0 011 1v2a3 3 0 00-3 3v2z" />
                  </svg>
                  <span className="whitespace-nowrap">Unlock Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordVerificationDialog; 