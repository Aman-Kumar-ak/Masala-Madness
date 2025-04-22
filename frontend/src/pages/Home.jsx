import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import Menu from "../components/Menu";
import { useCart } from "../components/CartContext";

export default function Home() {
  const { cartItems, clearCart } = useCart();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const getCurrentDate = () => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    };
    return new Date().toLocaleString('en-IN', options);
  };

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        // Fetch revenue
        const revenueResponse = await fetch('http://localhost:5000/api/orders/today-revenue');
        const revenueData = await revenueResponse.json();
        setTotalRevenue(revenueData.totalRevenue || 0);

        // Fetch today's orders
        const ordersResponse = await fetch('http://localhost:5000/api/orders/today');
        const ordersData = await ordersResponse.json();
        setTodayOrders(ordersData || []);
      } catch (error) {
        console.error('Error fetching today\'s data:', error);
      }
    };

    fetchTodayData();
  }, []);

  useEffect(() => {
    if (cartItems.length > 0) {
      window.onbeforeunload = () => {
        return "You have items in your cart. Do you want to discard them?";
      };
    }
    return () => {
      window.onbeforeunload = null;
    };
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2">
              <span className="text-orange-500 text-3xl">🍛</span>
              <h1 className="text-2xl font-bold text-gray-800">Masala Madness</h1>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <Link
                to="/admin"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors duration-200 flex items-center space-x-2"
              >
                <span className="hidden md:inline">Admin Panel</span>
                <span className="md:hidden">👨‍💼</span>
              </Link>
              <Link
                to="/cart"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full transition-colors duration-200 flex items-center space-x-2"
              >
                <span>🛒</span>
                <span className="hidden md:inline">Cart</span>
                {cartItems.length > 0 && (
                  <span className="bg-white text-orange-500 px-2 py-1 rounded-full text-sm font-bold">
                    {cartItems.length}
                  </span>
                )}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Date and Stats Banner */}
      <div className="bg-white shadow-md mt-4 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Date */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📅</span>
              <p className="text-lg font-medium text-gray-700">
                {getCurrentDate()}
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6">
              {/* Orders Count */}
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-sm text-gray-600">Today's Orders</p>
                  <p className="text-lg font-bold text-blue-600">
                    {todayOrders.length}
                  </p>
                </div>
              </div>

              {/* Revenue */}
              <div className="flex items-center space-x-2">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm text-gray-600">Today's Revenue</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{totalRevenue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Cart Button (only shown when cart has items) */}
      {cartItems.length > 0 && (
        <div className="container mx-auto px-4 mt-4">
          <button
            onClick={clearCart}
            className="w-full md:w-auto bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
          >
            <span>🗑️</span>
            <span>Clear Cart</span>
          </button>
        </div>
      )}

      {/* Menu Component */}
      <div className="container mx-auto px-4 py-8">
        <Menu />
      </div>
    </div>
  );
}
