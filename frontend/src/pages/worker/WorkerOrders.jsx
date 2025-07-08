import React, { useState, useEffect, useRef } from "react";
import BackButton from "../../components/BackButton";
import { useRefresh } from "../../contexts/RefreshContext";
import { useNavigate } from "react-router-dom";
import { api } from '../../utils/api';
// import DeleteOrderConfirmation from "../../components/DeleteOrderConfirmation"; // Removed
import Notification from "../../components/Notification";
// import { AnimatePresence, motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// WorkerOrderCard component for per-order animation
function WorkerOrderCard({ order, isUpdated, parseCustomPaymentAmounts, formatDateIST }) {
  // Animate totalAmount with Framer Motion
  const amountRef = useRef(null);
  const [displayAmount, setDisplayAmount] = useState(order.totalAmount);
  useEffect(() => {
    if (isUpdated) {
      // Animate number flip
      const start = displayAmount;
      const end = order.totalAmount;
      if (start !== end) {
        let frame;
        let startTime;
        const duration = 400;
        const animate = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          const value = start + (end - start) * progress;
          setDisplayAmount(value);
          if (progress < 1) {
            frame = requestAnimationFrame(animate);
          } else {
            setDisplayAmount(end);
          }
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
      }
    } else {
      setDisplayAmount(order.totalAmount);
    }
  }, [order.totalAmount, isUpdated]);

  return (
    <div
      className={order.isPaid ? "bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 relative" : "bg-red-50 p-5 rounded-lg shadow-sm border border-red-200 hover:shadow-md transition-all duration-300 relative"}
    >
      <div className="flex justify-between items-start mb-3 relative">
        <div className="relative">
          {!order.isPaid && (
            <span className="absolute -top-4 left-0 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm z-10 select-none" style={{lineHeight: '1.2', letterSpacing: '0.02em'}}>
              Pending
            </span>
          )}
          <div className="flex items-center">
            <h3 className="text-lg font-semibold mr-2 whitespace-nowrap">Order #{order.orderNumber}</h3>
            {/* Delete button removed as per worker requirements */}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {formatDateIST(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <div className="flex flex-col items-end">
            {order.isPaid ? (
              <span className="text-gray-500 text-sm">
                Paid
                {order.paymentMethod.startsWith('Custom') ? (
                  <span className="font-medium"> Custom</span>
                ) : (
                  <span className="font-medium"> {order.paymentMethod}</span>
                )}
              </span>
            ) : null}
            <span
              ref={amountRef}
              className="text-xl font-bold text-gray-800 mt-1 block"
              style={{ marginTop: 4 }}
            >
              ₹{displayAmount.toFixed(2)}
            </span>
            {order.discountAmount > 0 && (
              <p className="text-sm text-gray-500 line-through">
                ₹{order.subtotal.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium mb-2">Items:</h4>
        <ul className="space-y-1.5">
          {order.items.map((item, index) => (
            <li
              key={index}
              className="text-sm flex flex-col"
            >
              <span className="font-medium text-gray-800 mb-0.5">{item.name} ({item.type === 'H' ? 'Half' : item.type === 'F' ? 'Full' : item.type})</span>
              <span className="text-gray-600 italic text-xs">{item.quantity} x ₹{item.price.toFixed(2)} = <span className="font-bold">₹{item.totalPrice.toFixed(2)}</span></span>
            </li>
          ))}
        </ul>
        {order.discountAmount > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 text-sm font-medium text-green-600 flex justify-between">
            <span>Discount Applied: {order.discountPercentage}%</span>
            <span>-₹{order.discountAmount.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkerOrders() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalPaidOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
//   const [deleteLoading, setDeleteLoading] = useState(false); // Removed
//   const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false); // Removed
//   const [orderToDelete, setOrderToDelete] = useState(null); // Removed
  const [notification, setNotification] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const navigate = useNavigate();

  const { refreshKey, socket } = useRefresh();

  const [lastUpdatedOrderId, setLastUpdatedOrderId] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'confirmed', 'pending'

  // Helper to parse custom payment amounts from the paymentMethod string
  const parseCustomPaymentAmounts = (paymentMethodString) => {
    const cashMatch = paymentMethodString.match(/Cash: ₹([\d.]+)/);
    const onlineMatch = paymentMethodString.match(/Online: ₹([\d.]+)/);
    
    const cash = cashMatch ? parseFloat(cashMatch[1]) : 0;
    const online = onlineMatch ? parseFloat(onlineMatch[1]) : 0;
    
    return { cash, online };
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const dateToQuery = selectedDate || getCurrentDate();
      const ordersData = await api.get(`/orders/date/${dateToQuery}`);
      setOrders(ordersData.orders || []);
      setStats(ordersData.stats || {
        totalOrders: 0,
        totalPaidOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0
      });
      // For pending orders count, count isPaid: false in ordersData.orders
      const pendingCount = (ordersData.orders || []).filter(order => order.isPaid === false).length;
      setPendingOrdersCount(pendingCount);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load orders if we have a valid selectedDate
    if (selectedDate) {
      loadOrders();
    } else {
      // If somehow selectedDate becomes invalid, reset it to current date
      setSelectedDate(getCurrentDate());
    }
  }, [selectedDate, refreshKey]);

  useEffect(() => {
    if (!socket) return;
    const handleOrderUpdate = (data) => {
      if (data?.type === 'order-deleted' && data?.orderId) {
        // Refetch orders to update order numbers and details live for all users
        loadOrders();
      } else if (data?.order?.orderId) {
        setLastUpdatedOrderId(data.order.orderId);
        setOrders(prevOrders => {
          const filtered = prevOrders.filter(order => order.orderId !== data.order.orderId);
          const newOrders = [data.order, ...filtered];
          // Update stats live
          const paidOrders = newOrders.filter(o => o.isPaid);
          const totalPaidOrders = paidOrders.length;
          const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const avgOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0;
          setStats({
            totalOrders: newOrders.length,
            totalPaidOrders,
            totalRevenue,
            avgOrderValue
          });
          // Update pending orders count live
          setPendingOrdersCount(newOrders.filter(o => !o.isPaid).length);
          return newOrders;
        });
      }
    };
    socket.on('order-update', handleOrderUpdate);
    return () => {
      socket.off('order-update', handleOrderUpdate);
    };
  }, [socket, selectedDate, refreshKey]);

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateIST = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const resetToCurrentDate = () => {
    const today = getCurrentDate();
    setSelectedDate(today);
  };

//   const handleDeleteClick = (order) => { // Removed
//     setOrderToDelete(order);
//     setShowDeleteConfirmation(true);
//   };

//   const handleConfirmDelete = async () => { // Removed
//     if (!orderToDelete) return;
//     
//     try {
//       setDeleteLoading(true);
//       
//       const response = await fetch(`${API_URL}/api/orders/${orderToDelete.orderId}`, {
//         method: 'DELETE',
//       });
//       
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       
//       const result = await response.json();
//       
//       // Show success notification
//       setNotification({
//         message: `Order #${orderToDelete.orderNumber} has been deleted successfully`,
//         type: 'delete',
//         duration: 2000
//       });
//       
//       // Don't manually update stats, just reload orders to get the fresh data
//       loadOrders();
//       
//     } catch (error) {
//       console.error('Error deleting order:', error);
//       setNotification({
//         message: `Failed to delete order: ${error.message}`,
//         type: 'error',
//         duration: 2000
//       });
//     } finally {
//       setDeleteLoading(false);
//       setShowDeleteConfirmation(false);
//       setOrderToDelete(null);
//     }
//   };

//   const handleCancelDelete = () => { // Removed
//     setShowDeleteConfirmation(false);
//     setOrderToDelete(null);
//   };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-100 bg-opacity-80 select-none" style={{ pointerEvents: 'auto' }}>
        <div className="flex flex-col items-center justify-center">
          <DotLottieReact
            src="https://lottie.host/9a942832-f4ef-42c2-be65-d6955d96c3e1/wuEXuiDlyw.lottie"
            autoplay
            loop
            style={{ width: 240, height: 240}}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-orange-100">
        <BackButton />
        <div className="p-4 pt-16">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded mt-2"
              onClick={loadOrders}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Before rendering orders, sort by orderNumber descending (like admin Orders.jsx)
  const sortedOrders = [...orders].sort((a, b) => b.orderNumber - a.orderNumber);

  // Filter orders based on filter bar
  const filteredOrders = sortedOrders.filter(order => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'confirmed') return order.isPaid;
    if (orderFilter === 'pending') return !order.isPaid;
    return true;
  });

  return (
    <div className="min-h-screen bg-orange-100">
      <BackButton />
      <div className="p-4 pt-16">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Order Management</h1>
          
          {/* Current Date Display */}
          <div className="mb-6 text-lg font-semibold text-gray-700">
            Orders for: {getCurrentDate()}
          </div>

          {/* Enhanced Stats Display (Total Orders & Pending Orders) */}
          {orders.length > 0 && ( // Only show stats if there are orders
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg shadow-sm border border-orange-200 transition-all duration-300 hover:shadow-md">
                <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.totalPaidOrders}
                </p>
              </div>

              <div
                className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow-sm border border-yellow-200 transition-all duration-300 hover:shadow-md cursor-pointer"
                onClick={() => navigate("/worker-pending-orders")}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/worker-pending-orders'); }}
                aria-label="View Pending Orders"
              >
                <h3 className="text-lg font-semibold text-gray-700 select-none">Pending Orders</h3>
                <p className="text-3xl font-bold text-yellow-600 mt-2 select-none">{pendingOrdersCount}</p>
              </div>
            </div>
          )}

          {/* Divider above Filter Bar */}
          <div className="w-full border-t border-gray-200 mb-3"></div>
          {/* Filter Bar */}
          <div className="flex gap-1 mb-6 overflow-x-auto hide-scrollbar pb-2">
            <button
              className={`px-3 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${orderFilter === 'all' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'bg-transparent text-gray-700 hover:bg-orange-50'}`}
              onClick={() => setOrderFilter('all')}
            >
              All
            </button>
            <button
              className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${orderFilter === 'confirmed' ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-transparent text-gray-700 hover:bg-green-50'}`}
              onClick={() => setOrderFilter('confirmed')}
            >
              Confirmed
            </button>
            <button
              className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${orderFilter === 'pending' ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'bg-transparent text-gray-700 hover:bg-yellow-50'}`}
              onClick={() => setOrderFilter('pending')}
            >
              Pending
            </button>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <p className="text-gray-600 text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">No orders found for this filter</p>
            ) : (
              filteredOrders.map(order => (
                <div key={order.orderId}>
                  <WorkerOrderCard
                    order={order}
                    isUpdated={order.orderId === lastUpdatedOrderId}
                    parseCustomPaymentAmounts={parseCustomPaymentAmounts}
                    formatDateIST={formatDateIST}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog Removed for workers */}
      {/* 
      <DeleteOrderConfirmation
        isOpen={showDeleteConfirmation}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        orderNumber={orderToDelete?.orderNumber}
        isLoading={deleteLoading}
      />
      */}

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
