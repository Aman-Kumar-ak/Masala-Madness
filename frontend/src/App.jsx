import React from 'react';
import { Route, Routes } from 'react-router-dom';  // Import Route and Routes for routing
import Home from './pages/Home';  // Import your Home component
import Cart from './pages/Cart';  // Import Cart component (add other pages similarly)
import Admin from './pages/Admin';  // Import Admin page
import Orders from './pages/Orders';  // Import Orders page
import PendingOrders from './pages/PendingOrders';  // Import Pending Orders page
import Qr from './pages/Qr';  // Import QR page
import Login from './pages/Login';
import Settings from './pages/Settings';  // Import Settings page
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './components/NotificationContext';

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="min-h-screen flex flex-col">
          <div className="flex-grow">
            <Routes>  {/* Routes for handling different paths */}
              {/* Public Routes */}
              <Route path="/" element={<Home />} />  {/* Home page */}
              <Route path="/cart" element={<Cart />} />  {/* Cart page */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
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
            </Routes>
          </div>
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
