import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Menu from "../../components/Menu";
import { useCart } from "../../components/CartContext";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { useNotification } from "../../components/NotificationContext";
import { API_URL } from "../../utils/config";
import OptimizedImage from "../../components/OptimizedImage";
import { api } from '../../utils/api';

export default function WorkerHome() {
  const { cartItems, clearCart } = useCart();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalPaidOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const { showInfo } = useNotification();
  const [showHeader, setShowHeader] = useState(true);
  const headerRef = useRef(null);
  const menuSectionRef = useRef(null);

  // Calculate cart total
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  // Calculate discount if applicable
  const calculateDiscount = () => {
    if (!activeDiscount || subtotal < activeDiscount.minOrderAmount) {
      return 0;
    }
    return Math.round((subtotal * activeDiscount.percentage) / 100);
  };

  const discountAmount = calculateDiscount();
  const totalAmount = subtotal - discountAmount;

  // Fetch active discount
  useEffect(() => {
    const fetchActiveDiscount = async () => {
      try {
        const data = await api.get('/discounts/active');
        setActiveDiscount(data);
      } catch (error) {
        console.error('Error fetching discount:', error);
      }
    };

    fetchActiveDiscount();

    const fetchPendingOrdersCount = async () => {
      try {
        const data = await api.get('/pending-orders');
        setPendingOrdersCount(data.length || 0);
      } catch (error) {
        console.error('Error fetching pending orders count:', error);
      }
    };

    fetchPendingOrdersCount();
  }, []);

  const getCurrentDate = () => {
    const date = new Date();
    const optionsDay = { day: 'numeric', timeZone: 'Asia/Kolkata' };
    const optionsMonth = { month: 'short', timeZone: 'Asia/Kolkata' };
    const optionsYear = { year: 'numeric', timeZone: 'Asia/Kolkata' };

    const day = date.toLocaleString('en-IN', optionsDay);
    const month = date.toLocaleString('en-IN', optionsMonth);
    const year = date.toLocaleString('en-IN', optionsYear);

    return `${day} ${month}, ${year}`;
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
  useEffect(() => {
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

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current && menuSectionRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        const menuSectionTop = menuSectionRef.current.getBoundingClientRect().top;

        if (menuSectionTop <= headerHeight) {
          setShowHeader(false);
        } else {
          setShowHeader(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleConfirmClearCart = () => {
    clearCart();
    setShowClearCartConfirm(false);
    showInfo("Cart cleared successfully");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      {/* Header */}
      <header ref={headerRef} className={`bg-white shadow-md sticky top-0 z-50 border-b border-orange-200 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2">
              <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full p-0.5 shadow-sm flex items-center justify-center">
                <OptimizedImage 
                  src="/images/m_logo.png" 
                  alt="Masala Madness Logo" 
                  className="w-9 h-9 object-contain"
                  width={36}
                  height={36}
                />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-orange-600 to-yellow-500 bg-clip-text text-transparent whitespace-nowrap max-[380px]:text-xl max-[320px]:text-lg">Masala Madness</h1>
                <p className="text-xs text-gray-500 -mt-1">Authentic Chinese Cuisine</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-5">
              <Link
                to="/worker-cart"
                className="p-0 m-0 flex items-center justify-center relative bg-transparent hover:bg-transparent group"
                aria-label={`Cart with ${cartItems.reduce((total, item) => total + item.quantity, 0)} items`}
              >
                <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-orange-200">
                  <OptimizedImage
                    src="/images/receipt.png"
                    alt="Cart"
                    className="w-7 h-7 object-contain"
                    width={28}
                    height={28}
                  />
                </div>
                {cartItems.reduce((total, item) => total + item.quantity, 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center shadow-sm">
                    {cartItems.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </Link>

              <Link
                to="/worker-pending-orders"
                className="p-0 m-0 flex items-center justify-center relative bg-transparent hover:bg-transparent group"
                aria-label={`Pending Orders: ${pendingOrdersCount}`}
              >
                <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-blue-200">
                  <OptimizedImage
                    src="/images/order.png"
                    alt="Pending Orders"
                    className="w-7 h-7 object-contain"
                    width={28}
                    height={28}
                  />
                </div>
                {pendingOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center shadow-sm">
                    {pendingOrdersCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Date Banner */}
      <div className="bg-white shadow-sm rounded-xl mx-4 mt-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50">
            {/* Date and Refresh Button */}
            <div className="flex items-center gap-2">
            <button
                onClick={fetchStats}
                disabled={loading}
                className={`w-10 h-10 rounded-full ${loading ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors duration-200 flex items-center justify-center shadow-sm`}
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
              <div>
                <p className="text-lg font-semibold text-gray-800 whitespace-nowrap">
                  {getCurrentDate()}
                </p>
              </div>
            </div>

            {/* Settings and Orders Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/worker-settings"
                className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors duration-200 flex items-center justify-center shadow-sm"
                title="Settings"
              >
                <OptimizedImage
                  src="/images/login.png"
                  alt="Settings"
                  className="w-10 h-10 object-contain"
                  width={40}
                  height={40}
                />
              </Link>
              <Link
                to="/worker-orders"
                className="rounded-full bg-green-50 hover:bg-green-100 transition-colors duration-200 flex items-center justify-center shadow-sm px-3 py-1.5"
                title="Orders"
              >
                <span className="text-lg font-bold text-green-700">Orders</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Cart */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-4 right-4 left-4 z-50 flex justify-center">
          <div className="bg-white shadow-lg rounded-full border border-orange-200 flex items-center justify-between gap-1 sm:gap-2 md:gap-3 max-w-md w-full overflow-hidden">
            {/* Cart Info */}
            <div className="flex items-center gap-1 min-[400px]:gap-2 sm:gap-3 flex-1 min-w-0 pl-2 min-[400px]:pl-3 sm:pl-4 py-2 min-[400px]:py-2.5 sm:py-3">
              <div className="w-7 h-7 min-[400px]:w-8 min-[400px]:h-8 sm:w-9 sm:h-9 bg-orange-100 rounded-full flex items-center justify-center text-base min-[400px]:text-lg sm:text-xl flex-shrink-0">
                🛒
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1 overflow-hidden">
                  {discountAmount > 0 ? (
                    <div className="flex flex-col xs:flex-row xs:items-baseline gap-0 xs:gap-1 min-[400px]:gap-2 text-sm min-[400px]:text-base sm:text-lg overflow-hidden">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-green-600 whitespace-nowrap">₹{totalAmount}</span>
                        <span className="bg-green-100 text-green-600 px-1 py-0.5 rounded-full text-xs min-[400px]:text-sm font-medium whitespace-nowrap">
                          {activeDiscount.percentage}% off
                        </span>
                      </div>
                      <span className="text-gray-400 text-xs min-[400px]:text-sm line-through flex-shrink-0 hidden sm:inline">₹{subtotal}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-sm min-[400px]:text-base sm:text-lg text-gray-800">₹{totalAmount}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 overflow-hidden">
                  <span className="text-xs min-[400px]:text-sm text-gray-500 whitespace-nowrap">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
                  {activeDiscount && subtotal < activeDiscount.minOrderAmount && (
                    <span className="text-xs min-[400px]:text-sm text-orange-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] min-[400px]:max-w-[180px] sm:max-w-full">
                      ₹{activeDiscount.minOrderAmount - subtotal} more for {activeDiscount.percentage}% off
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* View Cart Button */}
            <Link
              to="/worker-cart"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-full px-2 min-[400px]:px-3 sm:px-4 py-2 min-[400px]:py-2.5 sm:py-3 flex items-center justify-center gap-1 min-[400px]:gap-1.5 sm:gap-2 whitespace-nowrap transition-all duration-200 font-medium text-sm min-[400px]:text-base sm:text-lg"
            >
              <span>Cart</span>
              <span className="bg-orange-700/30 text-white rounded-full w-5 h-5 min-[400px]:w-5.5 min-[400px]:h-5.5 sm:w-6 sm:h-6 flex items-center justify-center text-xs">
                {cartItems.length}
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Menu Section */}
      <div ref={menuSectionRef} className="container mx-auto px-4 py-8 pb-28">
        <Menu 
          cartItems={cartItems}
          handleConfirmClearCart={handleConfirmClearCart}
          setShowClearCartConfirm={setShowClearCartConfirm}
        />
      </div>

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearCartConfirm}
        onClose={() => setShowClearCartConfirm(false)}
        onConfirm={handleConfirmClearCart}
        title="Clear Cart"
        message={`Are you sure you want to remove all ${cartItems.length} items from your cart?`}
        confirmText="Yes, Clear Cart"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

