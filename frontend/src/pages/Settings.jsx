import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useNotification } from '../components/NotificationContext';
import api from '../utils/api';

const Settings = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  // Add version state
  const [versionInfo, setVersionInfo] = useState({
    version: 'Loading...',
    buildDate: 'Loading...',
    environment: process.env.NODE_ENV || 'development'
  });
  
  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = useState(false);
  const [showNewPasswordFields, setShowNewPasswordFields] = useState(false);
  
  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // State for confirmation dialogs
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Fetch version information
  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const response = await fetch('/version.json');
        const data = await response.json();
        setVersionInfo({
          ...data,
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (error) {
        console.error('Error fetching version info:', error);
        setVersionInfo({
          version: 'Unknown',
          buildDate: 'Unknown',
          environment: process.env.NODE_ENV || 'development'
        });
      }
    };

    fetchVersionInfo();
  }, []);
  
  // Verify current password
  const verifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }

    setIsVerifying(true);
    setPasswordError('');

    try {
      let token = sessionStorage.getItem('token');
      // If no token, try to log in with username and entered password
      if (!token) {
        if (!user || !user.username) {
          setPasswordError('User information missing. Please log in again.');
          setIsVerifying(false);
          return;
        }
        // Attempt login
        const loginResponse = await fetch('https://masala-madness-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, password: currentPassword, rememberDevice: true })
        });
        let loginData = {};
        try {
          loginData = await loginResponse.json();
        } catch (jsonErr) {
          setPasswordError('Server error during login. Please try again later.');
          console.error('Login: Failed to parse JSON response', jsonErr);
          setIsVerifying(false);
          return;
        }
        if (loginResponse.ok && loginData.status === 'success' && loginData.token) {
          // Set token and user in sessionStorage
          sessionStorage.setItem('token', loginData.token);
          sessionStorage.setItem('user', JSON.stringify(loginData.user));
          token = loginData.token;
          // Optionally update context if needed (if you have a setUser/setIsAuthenticated function)
          setPasswordError('');
          setIsCurrentPasswordValid(true);
          setShowNewPasswordFields(true);
          setIsVerifying(false);
          return;
        } else {
          setPasswordError('Incorrect password. Please try again.');
          setIsVerifying(false);
          return;
        }
      }
      // If token exists, proceed as before
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: currentPassword })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        setPasswordError('Server error. Please try again later.');
        console.error('Password verification: Failed to parse JSON response', jsonErr);
        setIsVerifying(false);
        return;
      }

      if (response.status === 401) {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError('Current password is incorrect.');
        console.warn('Password verification: Incorrect password.');
      } else if (response.status === 500) {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError('Server error. Please try again later.');
        console.error('Password verification: Server error.', data);
      } else if (!response.ok) {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError('Unexpected error. Please try again.');
        console.error('Password verification: Unexpected error.', data);
      } else if (response.ok && data.status === 'success') {
        setIsCurrentPasswordValid(true);
        setShowNewPasswordFields(true);
        setPasswordError('');
        console.log(`User ${user?.username || 'Admin'} successfully verified password`);
      } else {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError(data.message || 'Failed to verify current password.');
        console.error(`User ${user?.username || 'Admin'} entered incorrect password`, data);
      }
    } catch (error) {
      setIsCurrentPasswordValid(false);
      setShowNewPasswordFields(false);
      if (error.name === 'TypeError') {
        setPasswordError('Network error. Please check your connection.');
        console.error('Password verification: Network error.', error);
      } else {
        setPasswordError('Failed to verify current password. Please try again.');
        console.error('Password verification error:', error);
      }
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    try {
      // Use fetch directly instead of api utility to avoid automatic redirect on 401
      const token = sessionStorage.getItem('token');
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setPasswordSuccess('Password changed successfully');
        // Clear form and reset states
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        console.log(`User ${user?.username || 'Admin'} successfully changed password`);
      } else {
        setPasswordError(data.message || 'Failed to change password');
        console.error(`User ${user?.username || 'Admin'} failed to change password:`, data.message);
      }
    } catch (error) {
      setPasswordError('Error changing password. Please try again.');
      console.error('Password change error:', error);
    }
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return (
      isCurrentPasswordValid && 
      newPassword.length >= 8 && 
      newPassword === confirmPassword
    );
  };
  
  // Handle logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setShowSplashScreen(true);

    try {
      logout();
      sessionStorage.setItem('logoutSuccess', 'true');
    } catch (error) {
      console.error("Logout failed:", error);
      setShowSplashScreen(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = () => {
    setShowDeleteAccountConfirm(true);
  };
  
  const confirmDeleteAccount = async () => {
    setShowDeleteAccountConfirm(false);
    setShowSplashScreen(true);

    try {
      const response = await api.delete(`/auth/delete-account/${user.username}`);
      if (response.status === 200) {
        showSuccess("Account deleted successfully!");
        logout();
      } else {
        throw new Error(response.data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Account deletion failed:", error);
      showError("Failed to delete account: " + error.message);
    } finally {
      setShowSplashScreen(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      <BackButton />
      
      <div className="p-4 pt-16 max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6 border border-orange-200 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <img
                src="/images/login.png"
                alt="Settings"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          </div>
          
          {user && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Current User</h2>
              <p className="text-gray-700">
                Logged in as: <span className="font-medium">{user.username}</span>
              </p>
            </div>
          )}
          
          {/* Password Change Section */}
          <div className="border border-gray-200 rounded-lg p-5 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <span className="text-orange-600">🔐</span> Change Password
            </h2>
            
            {passwordError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{passwordError}</span>
              </div>
            )}
            
            {passwordSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{passwordSuccess}</span>
              </div>
            )}
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setIsCurrentPasswordValid(false);
                        setShowNewPasswordFields(false);
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      required
                      disabled={isVerifying}
                    />

                    <button 
                      type="button"
                      onClick={verifyCurrentPassword}
                      disabled={!currentPassword || isVerifying || isCurrentPasswordValid}
                      className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 
                        ${isCurrentPasswordValid 
                          ? 'bg-green-100 text-green-700 border border-green-300 cursor-default' 
                          : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'}`}
                    >
                      {isVerifying ? 'Verifying...' : isCurrentPasswordValid ? 'Verified' : 'Verify'}
                    </button>
                  </div>
                  {isCurrentPasswordValid && (
                    <p className="mt-1 text-sm text-green-600">Current password verified</p>
                  )}
                </div>
                {/* Show Password Checkbox */}
                <div className="flex items-center mt-1">
                  <input
                    id="showCurrentPassword"
                    type="checkbox"
                    checked={showCurrentPassword}
                    onChange={() => setShowCurrentPassword((prev) => !prev)}
                    className="mr-2"
                  />
                  <label htmlFor="showCurrentPassword" className="text-xs text-gray-600 select-none">Show Password</label>
                </div>
                
                {showNewPasswordFields && (
                  <>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        required
                        minLength={8}
                      />
                      {/* Show Password Checkbox */}
                      <div className="flex items-center mt-1">
                        <input
                          id="showNewPassword"
                          type="checkbox"
                          checked={showNewPassword}
                          onChange={() => setShowNewPassword((prev) => !prev)}
                          className="mr-2"
                        />
                        <label htmlFor="showNewPassword" className="text-xs text-gray-600 select-none">Show Password</label>
                      </div>
                      {newPassword && newPassword.length < 8 && (
                        <p className="mt-1 text-sm text-red-600">Password must be at least 8 characters</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        required
                      />
                      {/* Show Password Checkbox */}
                      <div className="flex items-center mt-1">
                        <input
                          id="showConfirmPassword"
                          type="checkbox"
                          checked={showConfirmPassword}
                          onChange={() => setShowConfirmPassword((prev) => !prev)}
                          className="mr-2"
                        />
                        <label htmlFor="showConfirmPassword" className="text-xs text-gray-600 select-none">Show Password</label>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                    ${isFormValid() 
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                      : 'bg-gray-400 cursor-not-allowed'} 
                    focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
          
          {/* Account Actions */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <span className="text-red-600">⚠️</span> Account Actions
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Version Information Section */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
            <span className="font-medium">Version: {versionInfo.version}</span>
            <span className="hidden sm:inline">|</span>
            <span className="font-medium">Build: {new Date(versionInfo.buildDate).toLocaleString()}</span>
            <span className="hidden sm:inline">|</span>
            <span className={`px-1 sm:px-2 py-0.5 rounded text-xs font-medium ${
              versionInfo.environment === 'production' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {versionInfo.environment}
            </span>
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Yes, Logout"
        isLoading={false}
      />
      
      <ConfirmationDialog
        isOpen={showDeleteAccountConfirm}
        onClose={() => setShowDeleteAccountConfirm(false)}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone."
        confirmText="Yes, Delete Account"
        cancelText="No, Keep Account"
        type="danger"
        isLoading={false}
      />
      
      {/* Full-screen Loading Splash Screen */}
      {showSplashScreen && (
        <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-[100] flex items-center justify-center flex-col">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-gray-700 text-xl font-medium">Logging you out...</p>
        </div>
      )}
    </div>
  );
};

export default Settings; 