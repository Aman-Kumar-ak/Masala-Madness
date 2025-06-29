import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';  // Import Navigate for redirects
import Home from './pages/admin/Home';  // Import your Home component
import Cart from './pages/admin/Cart';  // Import Cart component (add other pages similarly)
import Admin from './pages/admin/Admin';  // Import Admin page
import Orders from './pages/admin/Orders';  // Import Orders page
import PendingOrders from './pages/admin/PendingOrders';  // Import Pending Orders page
import Qr from './pages/admin/Qr';  // Import QR page
import Login from './pages/Login';
import Settings from './pages/admin/Settings';  // Import Settings page
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './components/NotificationContext';
import OfflineDetector from './components/OfflineDetector';  // Import the OfflineDetector component
import WorkerHome from './pages/worker/WorkerHome';
import WorkerCart from './pages/worker/WorkerCart';
import WorkerSettings from './pages/worker/WorkerSettings';
import WorkerOrders from './pages/worker/WorkerOrders';
import WorkerPendingOrders from './pages/worker/WorkerPendingOrders';
import { Analytics } from '@vercel/analytics/react';

// Component to redirect based on authentication
const RedirectBasedOnAuth = () => {
  const { isAuthenticated, loading, user } = useAuth();
  
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
  
  // Redirect based on authentication and user role
  if (isAuthenticated) {
    if (user?.role === 'worker') {
      return <Navigate to="/worker-home" />;
    } else {
      return <Navigate to="/home" />;
    }
  } else {
    return <Navigate to="/login" />;
  }
};

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="min-h-screen flex flex-col select-none">
          <div className="flex-grow">
            <Routes>  {/* Routes for handling different paths */}
              {/* Root Route - Redirects based on auth state */}
              <Route path="/" element={<RedirectBasedOnAuth />} />
              
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/home" element={
                <ProtectedRoute requiredRole="admin">
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/cart" element={
                <ProtectedRoute requiredRole="admin">
                  <Cart />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute requiredRole="admin">
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/pending-orders" element={
                <ProtectedRoute requiredRole="admin">
                  <PendingOrders />
                </ProtectedRoute>
              } />
              <Route path="/qr" element={
                <ProtectedRoute requiredRole="admin">
                  <Qr />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requiredRole="admin">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              } />
              
              {/* Worker Protected Routes */}
              <Route path="/worker-home" element={
                <ProtectedRoute requiredRole="worker">
                  <WorkerHome />
                </ProtectedRoute>
              } />
              <Route path="/worker-cart" element={
                <ProtectedRoute requiredRole="worker">
                  <WorkerCart />
                </ProtectedRoute>
              } />
              <Route path="/worker-orders" element={
                <ProtectedRoute requiredRole="worker">
                  <WorkerOrders />
                </ProtectedRoute>
              } />
              <Route path="/worker-pending-orders" element={
                <ProtectedRoute requiredRole="worker">
                  <WorkerPendingOrders />
                </ProtectedRoute>
              } />
              <Route path="/worker-settings" element={
                <ProtectedRoute requiredRole="worker">
                  <WorkerSettings />
                </ProtectedRoute>
              } />
              
              {/* Catch-all redirect to root */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          
          {/* Offline detector will show a notification when user is offline */}
          <OfflineDetector />
        </div>
        <Analytics />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
