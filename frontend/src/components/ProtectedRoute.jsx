import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from './NotificationContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { showError } = useNotification();

  // If still checking auth status, show a spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Masala Madness...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If requiredRole is specified, check user's role
  if (requiredRole && user && user.role !== requiredRole) {
    showError(`Access denied. You need ${requiredRole} privileges to view this page.`);
    // Redirect to login page or a general unauthorized page
    return <Navigate to="/login" />;
  }

  // If authenticated and authorized, render the protected component
  return children;
};

export default ProtectedRoute; 