import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';  // Import Navigate for redirects

import Home from './pages/admin/Home';
import Cart from './pages/admin/Cart';
import Admin from './pages/admin/Admin';
import Orders from './pages/admin/Orders';
import PendingOrders from './pages/admin/PendingOrders';
import Qr from './pages/admin/Qr';
import Login from './pages/Login';
import Settings from './pages/admin/Settings';
import Calendar from './pages/admin/Calendar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './components/NotificationContext';
import OfflineDetector from './components/OfflineDetector';
import WorkerHome from './pages/worker/WorkerHome';
import WorkerCart from './pages/worker/WorkerCart';
import WorkerSettings from './pages/worker/WorkerSettings';
import WorkerOrders from './pages/worker/WorkerOrders';
import WorkerPendingOrders from './pages/worker/WorkerPendingOrders';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

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
              <Route path="/calendar" element={
                <ProtectedRoute requiredRole="admin">
                  <Calendar />
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
        <SpeedInsights />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
