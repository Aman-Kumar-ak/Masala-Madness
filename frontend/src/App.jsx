import React, { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';  // Import Navigate for redirects
import Home from './pages/Home';  // Import your Home component
import Cart from './pages/Cart';  // Import Cart component (add other pages similarly)
import Admin from './pages/Admin';  // Import Admin page
import Orders from './pages/Orders';  // Import Orders page
import PendingOrders from './pages/PendingOrders';  // Import Pending Orders page
import Qr from './pages/Qr';  // Import QR page
import Login from './pages/Login';
import Settings from './pages/Settings';  // Import Settings page
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './components/NotificationContext';
import OfflineDetector from './components/OfflineDetector';  // Import the OfflineDetector component
import ScrollOptimizer from './components/ScrollOptimizer'; // Import ScrollOptimizer for performance

// Component to redirect based on authentication
const RedirectBasedOnAuth = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    // Show loading state while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Masala Madness...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />;
};

const App = () => {
  // Apply performance optimizations
  useEffect(() => {
    // Mark the page content as Largest Contentful Paint element to help browser optimize
    const mainContent = document.querySelector('.flex-grow');
    if (mainContent) {
      mainContent.setAttribute('elementtiming', 'main-content');
      mainContent.classList.add('hardware-accelerated');
    }

    // Optimize scrolling performance
    document.documentElement.classList.add('optimize-rendering');
    
    // Force redraw to ensure layer creation
    window.setTimeout(() => {
      const redraw = document.body.offsetHeight;
    }, 0);
    
    return () => {
      document.documentElement.classList.remove('optimize-rendering');
    };
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="min-h-screen flex flex-col">
          <div className="flex-grow">
            <Routes>  {/* Routes for handling different paths */}
              {/* Root Route - Redirects based on auth state */}
              <Route path="/" element={<RedirectBasedOnAuth />} />
              
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/home" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/cart" element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/pending-orders" element={
                <ProtectedRoute>
                  <PendingOrders />
                </ProtectedRoute>
              } />
              <Route path="/qr" element={
                <ProtectedRoute>
                  <Qr />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
              {/* Catch-all redirect to root */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          
          {/* Offline detector will show a notification when user is offline */}
          <OfflineDetector />
          
          {/* ScrollOptimizer for smoother scrolling performance */}
          <ScrollOptimizer />
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
