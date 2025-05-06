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
  const { showSuccess } = useNotification();
  
  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = useState(false);
  const [showNewPasswordFields, setShowNewPasswordFields] = useState(false);
  
  // State for confirmation dialogs
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Verify current password
  const verifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }
    
    setIsVerifying(true);
    setPasswordError('');
    
    try {
      // Use fetch directly instead of api utility to avoid automatic redirect on 401
      const token = sessionStorage.getItem('token');
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: currentPassword })
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setIsCurrentPasswordValid(true);
        setShowNewPasswordFields(true);
        setPasswordError('');
        console.log(`User ${user?.username || 'Admin'} successfully verified password`);
      } else {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError('Current password is incorrect');
        console.error(`User ${user?.username || 'Admin'} entered incorrect password`);
      }
    } catch (error) {
      console.error('Password verification error:', error);
      setIsCurrentPasswordValid(false);
      setShowNewPasswordFields(false);
      setPasswordError('Failed to verify current password. Please try again.');
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
  
  const confirmLogout = () => {
    // Display logout notification first
    showSuccess('Logging out successfully...', 3000);
    
    // Short delay before actual logout to allow notification to be seen
    setTimeout(() => {
      logout();
      setShowLogoutConfirm(false);
    }, 1000);
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
            <h1 className="text-2xl font-bold text-gray-800">Masala Madness Settings</h1>
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
                      type="password"
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
                
                {showNewPasswordFields && (
                  <>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        required
                        minLength={8}
                      />
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
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        required
                      />
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
      
      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Settings; 