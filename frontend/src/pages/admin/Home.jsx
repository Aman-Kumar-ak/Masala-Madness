import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Menu from "../../components/Menu";
import { useCart } from "../../components/CartContext";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { useNotification } from "../../components/NotificationContext";
import { api } from '../../utils/api';
import OptimizedImage from "../../components/OptimizedImage";
import { useRefresh } from "../../contexts/RefreshContext";

export default function Home() {
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
  const [printerStatus, setPrinterStatus] = useState("Not connected");
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [displayOrders, setDisplayOrders] = useState(0);
  const [displayRevenue, setDisplayRevenue] = useState(0);
  const [displayAvgOrder, setDisplayAvgOrder] = useState(0);
  const { socket } = useRefresh();
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);

  // Function to check printer connection
  function checkPrinterConnection() {
    if (window.AndroidBridge && typeof window.AndroidBridge.isPrinterConnected === 'function') {
      try {
        const result = window.AndroidBridge.isPrinterConnected();
        return result === true || result === "true";
      } catch {
        return false;
      }
    }
    // On web, assume not connected by default for safety
    return false;
  }

  // Check printer connection on mount and poll every 2s for real-time updates
  useEffect(() => {
    setIsPrinterConnected(checkPrinterConnection());
    const interval = setInterval(() => {
      setIsPrinterConnected(checkPrinterConnection());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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
  }, []);

  // Fetch pending orders count (make it reusable)
  const fetchPendingOrdersCount = useCallback(async () => {
    try {
      const allOrders = await api.get('/orders');
      const pending = (allOrders || []).filter(order => order.isPaid === false);
      setPendingOrdersCount(pending.length || 0);
    } catch (error) {
      console.error('Error fetching pending orders count:', error);
    }
  }, []);

  // Initial fetch for pending orders count
  useEffect(() => {
    fetchPendingOrdersCount();
  }, [fetchPendingOrdersCount]);

  const getCurrentDate = () => {
    const width = window.innerWidth;
    let options;
    if (width < 380) {
      // Short format for very small screens
      options = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        timeZone: 'Asia/Kolkata',
      };
    } else {
      // Full format for normal screens
      options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      };
    }
    return new Date().toLocaleString('en-IN', options);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await api.get(`/orders/date/${today}`);
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

  // Call fetchStats and fetchPendingOrdersCount when order is placed/updated
  useEffect(() => {
    const handleOrderUpdate = () => {
      fetchStats();
      fetchPendingOrdersCount();
    };

    window.addEventListener('orderUpdated', handleOrderUpdate);
    // Initial fetch
    fetchStats();

    return () => {
      window.removeEventListener('orderUpdated', handleOrderUpdate);
    };
  }, [fetchPendingOrdersCount]);

  // Live update stats and pending orders on order-update socket event
  useEffect(() => {
    if (!socket) return;
    const handleOrderUpdate = () => {
      fetchStats();
      fetchPendingOrdersCount();
    };
    socket.on('order-update', handleOrderUpdate);
    return () => {
      socket.off('order-update', handleOrderUpdate);
    };
  }, [socket, fetchPendingOrdersCount]);

  // Animate Orders
  useEffect(() => {
    let frame;
    let start;
    const duration = 400;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const value = displayOrders + (stats.totalPaidOrders - displayOrders) * progress;
      setDisplayOrders(progress < 1 ? value : stats.totalPaidOrders);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    if (displayOrders !== stats.totalPaidOrders) {
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line
  }, [stats.totalPaidOrders]);

  // Animate Revenue
  useEffect(() => {
    let frame;
    let start;
    const duration = 400;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const value = displayRevenue + (stats.totalRevenue - displayRevenue) * progress;
      setDisplayRevenue(progress < 1 ? value : stats.totalRevenue);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    if (displayRevenue !== stats.totalRevenue) {
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line
  }, [stats.totalRevenue]);

  // Animate Avg Order
  useEffect(() => {
    let frame;
    let start;
    const duration = 400;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const value = displayAvgOrder + (stats.avgOrderValue - displayAvgOrder) * progress;
      setDisplayAvgOrder(progress < 1 ? value : stats.avgOrderValue);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    if (displayAvgOrder !== stats.avgOrderValue) {
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line
  }, [stats.avgOrderValue]);

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

  // Add global handlers for handshake and print status
  if (typeof window !== 'undefined') {
    window.onKOTReceived = function() {
      console.log('[KOT] App acknowledged receipt of KOT data');
      // Optionally show a notification: Printing started...
    };
    window.onKOTPrinted = function() {
      console.log('[KOT] App reports KOT printed');
      // Optionally show a notification: Printing successful!
    };
    window.onKOTPrintFailed = function() {
      console.log('[KOT] App reports KOT print failed');
      // Optionally show a notification: Printing failed!
    };
  }

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
              <div>
                <h1 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-orange-600 to-yellow-500 bg-clip-text text-transparent whitespace-nowrap max-[380px]:text-xl max-[320px]:text-lg">Masala Madness</h1>
                <p className="text-xs text-gray-500 -mt-1">Authentic Chinese Cuisine</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-5">
              <Link
                to="/cart"
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
                to="/pending-orders"
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
      <div className="bg-white shadow-sm rounded-lg mx-4 mt-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-blue-50">
            <div className="flex-1 flex items-center gap-3">
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
              <Link
                to="/calendar"
                className="w-12 h-12 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-2xl shadow-sm transition-colors duration-200"
                title="Calendar View"
              >
                <OptimizedImage src="/images/calendar.png" alt="Calendar" className="w-8 h-8" width={32} height={32} />
              </Link>
              <div>
                <p className="text-lg font-semibold text-gray-800">
                  {getCurrentDate()}
                </p>
              </div>
              {/* Printer Button - now in date banner */}
              <button
                onClick={() => {
                  if (window.AndroidBridge && window.AndroidBridge.openPrinterSettings) {
                    window.AndroidBridge.openPrinterSettings();
                  } else {
                    setShowPrinterDialog(true);
                  }
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ml-2"
                title="Printer Settings"
                style={{
                  minWidth: 40,
                  minHeight: 40,
                  backgroundColor: isPrinterConnected ? '#e6fff2' : '#ffd6d6', // more saturated red
                  border: isPrinterConnected ? '1.5px solid #b2f2d7' : '1.5px solid #ff8a8a', // stronger red border
                }}
              >
                <img src="/images/printer.png" alt="Printer Settings" className="w-6 h-6 object-contain" width={24} height={24} />
              </button>
            </div>
            {/* Icons row: QR, settings, admin panel */}
            <div className="flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
              <Link
                to="/qr"
                className="w-10 h-10 rounded-full bg-yellow-100 hover:bg-yellow-200 transition-colors duration-200 flex items-center justify-center shadow-sm"
                title="QR Code"
              >
                <OptimizedImage
                  src="/images/qr-code.png"
                  alt="QR Code"
                  className="w-10 h-10 object-contain"
                  width={40}
                  height={40}
                />
              </Link>
              <Link
                to="/settings"
                className="w-9 h-10 rounded-full flex items-center justify-center"
                title="Settings"
              >
                <OptimizedImage
                  src="/images/settings.png"
                  alt="Settings"
                  className="w-10 h-10 object-contain"
                  width={40}
                  height={40}
                />
              </Link>
              <Link
                to="/admin"
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-full transition-all duration-200 shadow-sm hover:shadow focus:ring-2 focus:ring-yellow-300 focus:outline-none"
                aria-label="Admin Panel"
              >
                <OptimizedImage
                  src="/images/admin.png"
                  alt="Admin"
                  className="w-5 h-5 object-contain"
                  width={20}
                  height={20}
                />
                <span className="font-medium">Admin Panel</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Banner */}
      <div className="bg-white shadow-sm rounded-lg mx-4 mt-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="grid grid-cols-3 gap-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
            {/* Orders Count - Now Clickable */}
            <Link 
              to="/orders" 
              className="bg-white p-3 rounded-lg shadow-sm border border-blue-100 flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md hover:border-blue-300 group"
            >
              <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-2xl mb-2 group-hover:bg-blue-200 transition-colors duration-200">
                📋
              </div>
              <p className="text-sm text-gray-600 text-center">Orders</p>
              <p className="text-xl font-bold text-blue-600">
                {Math.round(displayOrders)}
                {pendingOrdersCount > 0 && (
                  <span className="text-red-500 ml-1 text-xl font-bold">+ {pendingOrdersCount}</span>
                )}
              </p>
            </Link>

            {/* Revenue */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-green-100 flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md">
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-2xl mb-2">
                💰
              </div>
              <p className="text-sm text-gray-600 text-center">Revenue</p>
              <p className="text-xl font-bold text-green-600">
                ₹{Math.round(displayRevenue).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Average Order Value */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-purple-100 flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md">
              <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-2xl mb-2">
                📊
              </div>
              <p className="text-sm text-gray-600 text-center">Avg. Order</p>
              <p className="text-xl font-bold text-purple-600">
                ₹{Math.round(displayAvgOrder).toLocaleString('en-IN')}
              </p>
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
              to="/cart"
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

      <ConfirmationDialog
        isOpen={showPrinterDialog}
        onClose={() => setShowPrinterDialog(false)}
        onConfirm={() => setShowPrinterDialog(false)}
        title="Printer settings"
        message="Printer settings not available on this platform."
        confirmText="Close"
        cancelText={null}
        type="info"
      />
    </div>
  );
}

