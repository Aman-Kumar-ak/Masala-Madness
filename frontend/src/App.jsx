import React from 'react';
import { Route, Routes } from 'react-router-dom';  // Import Route and Routes for routing
import Home from './pages/Home';  // Import your Home component
import Cart from './pages/Cart';  // Import Cart component (add other pages similarly)
import Admin from './pages/Admin';  // Import Admin page
import Orders from './pages/Orders';  // Import Orders page
import PendingOrders from './pages/PendingOrders';  // Import Pending Orders page
import { NotificationProvider } from './components/NotificationContext';  // Import our notification context

const App = () => {
  return (
    <NotificationProvider>
      <Routes>  {/* Routes for handling different paths */}
        <Route path="/" element={<Home />} />  {/* Home page */}
        <Route path="/cart" element={<Cart />} />  {/* Cart page */}
        <Route path="/admin" element={<Admin />} />  {/* Admin page */}
        <Route path="/orders" element={<Orders />} />  {/* Orders page */}
        <Route path="/pending-orders" element={<PendingOrders />} />  {/* Pending Orders page */}
      </Routes>
    </NotificationProvider>
  );
};

export default App;
