import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/BackButton';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { useNotification } from '../../components/NotificationContext';
// import api from '../../utils/api'; // Not needed if password change is removed
// import useKeyboardScrollAdjustment from '../../hooks/useKeyboardScrollAdjustment'; // Only if needed by logout

export default function WorkerSettings() {
//   useKeyboardScrollAdjustment(); // Only if needed by logout
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  // State for confirmation dialogs
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  // const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false); // Not needed
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Handle logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = async () => {
    setIsLoggingOut(true);
    setShowSplashScreen(true); // Show splash screen during logout
    try {
      await logout({ redirectToLogin: true }); // Ensure redirection happens after logout
      showSuccess('Logged out successfully!');
    } catch (error) {
      showError('Logout failed. Please try again.');
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setShowSplashScreen(false);
      setShowLogoutConfirm(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      <BackButton />
      <div className="p-4 pt-16">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
              <div className="space-y-4">

            {/* Logout Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Actions</h2>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {isLoggingOut ? (
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                )}
                Logout
              </button>
      </div>
      
          </div>
        </div>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        type="warning"
        isLoading={isLoggingOut}
      />
      
      {/* Full-screen Loading Splash Screen */}
      {showSplashScreen && (
        <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-[100] flex items-center justify-center flex-col">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-gray-700 text-xl font-medium">Logging Out...</p>
        </div>
      )}
    </div>
  );
} 