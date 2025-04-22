import React, { useState } from "react";
import { Link } from 'react-router-dom';
import Menu from "../components/Menu";
import { useCart } from "../components/CartContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Home() {
  const { cartItems, clearCart } = useCart();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalPaidOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(false);

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

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/api/orders/date/${today}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats({
        totalOrders: data.stats.totalOrders || 0,
        totalPaidOrders: data.stats.totalPaidOrders || 0,
        totalRevenue: data.stats.totalRevenue || 0,
        avgOrderValue: data.stats.avgOrderValue || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Call fetchStats when order is placed/updated
  React.useEffect(() => {
    const handleOrderUpdate = () => {
      fetchStats();
    };

    window.addEventListener('orderUpdated', handleOrderUpdate);
    // Initial fetch
    fetchStats();

    return () => {
      window.removeEventListener('orderUpdated', handleOrderUpdate);
    };
  }, []);

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
            {/* Date and Refresh Button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📅</span>
                <p className="text-lg font-medium text-gray-700">
                  {getCurrentDate()}
                </p>
              </div>
              <button 
                onClick={fetchStats}
                disabled={loading}
                className={`p-2 rounded-full ${loading ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors duration-200`}
                title="Refresh Stats"
              >
                <svg 
                  className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6">
              {/* Orders Count */}
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-sm text-gray-600">Today's Orders</p>
                  <p className="text-lg font-bold text-blue-600">
                    {stats.totalPaidOrders}/{stats.totalOrders}
                  </p>
                </div>
              </div>

              {/* Revenue */}
              <div className="flex items-center space-x-2">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm text-gray-600">Today's Revenue</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{stats.totalRevenue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="text-sm text-gray-600">Avg. Order</p>
                  <p className="text-lg font-bold text-purple-600">
                    ₹{Math.round(stats.avgOrderValue).toLocaleString('en-IN')}
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
