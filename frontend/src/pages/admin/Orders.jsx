import React, { useState, useEffect, useRef } from "react";
import BackButton from "../../components/BackButton";
import { useRefresh } from "../../contexts/RefreshContext";
import { useNavigate, Link } from "react-router-dom";
import { api } from '../../utils/api';
import DeleteOrderConfirmation from "../../components/DeleteOrderConfirmation";
import Notification from "../../components/Notification";
import { AnimatePresence, motion } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// OrderCard component for per-order animation
function OrderCard({ order, isUpdated, parseCustomPaymentAmounts, formatDateIST, handleDeleteClick, deleteLoading }) {
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
      className={order.isPaid ? "bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 relative" : "bg-red-50 p-5 rounded-lg shadow-sm border border-red-200 hover:shadow-md transition-all duration-300 relative cursor-pointer"}
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
            <button 
              onClick={() => handleDeleteClick(order)} 
              disabled={deleteLoading}
              className="group p-1.5 rounded-full hover:bg-red-100 focus:bg-red-100 focus:outline-none transition-colors duration-200"
              aria-label="Delete order"
              title="Delete order"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-red-500 group-hover:text-red-600 group-active:text-red-600 transition-colors duration-200" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {formatDateIST(order.createdAt)}
          </p>
          {order.confirmedBy && (
            <p className="text-xs text-black mt-1">Confirmed by: {order.confirmedBy}</p>
          )}
        </div>
        <div className="text-right">
          <div className="flex flex-col items-end sm:items-end md:items-end lg:items-end">
            <span className="text-gray-500 text-sm">
              {order.isPaid ? 'Paid' : ''}
              {order.isPaid ? (
                order.paymentMethod.startsWith('Custom') ? (
                  <span className="font-medium"> Custom</span>
                ) : (
                  <span className="font-medium"> {order.paymentMethod}</span>
                )
              ) : null}
            </span>
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
        {order.paymentMethod.startsWith('Custom') && (() => {
          const { cash, online } = parseCustomPaymentAmounts(order.paymentMethod);
          return (
            <div className="mt-3 pt-2 border-t border-gray-200 text-sm font-medium text-gray-700">
              <span className="block mb-1">Custom Payment Details:</span>
              <div className="flex flex-wrap gap-2 text-gray-800">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md flex-grow flex-shrink-0 text-center whitespace-nowrap text-xs">
                  Cash: ₹{cash.toFixed(2)}
                </span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md flex-grow flex-shrink-0 text-center whitespace-nowrap text-xs">
                  Online: ₹{online.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalPaidOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false); // Only used to disable delete button, not for global loading
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const navigate = useNavigate();

  const { refreshKey, socket } = useRefresh();

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const isMounted = useRef(false);

  // Track the last updated orderId for per-order animation
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
      const [ordersData] = await Promise.all([
        api.get(`/orders/date/${dateToQuery}`),
      ]);
      setOrders(ordersData.orders || []);
      setStats(ordersData.stats || {
        totalOrders: 0,
        totalPaidOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0
      });
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    setShouldAnimate(false); // Disable animation on initial mount or navigation
    return () => {
      isMounted.current = false;
    };
  }, [selectedDate, refreshKey]);

  useEffect(() => {
    if (!socket) return;
    const handleOrderUpdate = (data) => {
      if (!isMounted.current) return;
      if (data?.type === 'order-deleted' && data?.orderId) {
        setOrders(prevOrders => {
          const newOrders = prevOrders.filter(order => order.orderId !== data.orderId);
          // Recalculate stats
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
          return newOrders;
        });
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
          return newOrders;
        });
      }
    };
    socket.on('order-update', handleOrderUpdate);
    return () => {
      socket.off('order-update', handleOrderUpdate);
    };
  }, [socket, selectedDate, refreshKey]);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line
  }, [selectedDate, refreshKey]);

  const handleDateChange = (e) => {
    if (!e.target.value) {
      const today = getCurrentDate();
      setSelectedDate(today);
    } else {
      setSelectedDate(e.target.value);
    }
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const formatDateUTC = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
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

  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/orders/${orderToDelete.orderId}`);
      setNotification({
        message: `Order #${orderToDelete.orderNumber} has been deleted successfully`,
        type: 'delete',
        duration: 2000
      });
      // No need to call loadOrders() or setSelectedDate here; socket will update the list
    } catch (error) {
      console.error('Error deleting order:', error);
      setNotification({
        message: `Failed to delete order: ${error.message}`,
        type: 'error',
        duration: 2000
      });
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirmation(false);
      setOrderToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setOrderToDelete(null);
  };

  // Excel download handler
  const handleDownloadExcel = async () => {
    try {
      const blob = await api.downloadExcel(`/orders/excel/${selectedDate}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotification({
        message: 'Excel file downloaded!',
        type: 'success',
        duration: 2000
      });
    } catch (error) {
      setNotification({
        message: 'Failed to download Excel file',
        type: 'error',
        duration: 2000
      });
    }
  };

  // Before rendering orders, sort by orderNumber descending
  const sortedOrders = [...orders].sort((a, b) => b.orderNumber - a.orderNumber);

  // Filter orders based on filter bar
  const filteredOrders = sortedOrders.filter(order => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'confirmed') return order.isPaid;
    if (orderFilter === 'pending') return !order.isPaid;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-100 flex items-center justify-center">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2">Loading orders...</p>
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

  return (
    <div className="min-h-screen bg-orange-100">
      <BackButton />
      <div className="p-4 pt-16">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Order Management</h1>
          
          {/* Date Picker + Excel Download */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Date:
            </label>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  max={getCurrentDate()}
                  className="shadow-sm border border-orange-200 rounded-lg w-full py-2.5 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all duration-200"
                  required
                  style={{
                    colorScheme: 'light'
                  }}
                />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={resetToCurrentDate}
                  className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium py-2.5 px-2 sm:px-3 md:px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all duration-200 flex-shrink-0 flex items-center whitespace-nowrap text-xs sm:text-sm"
                  title="Reset to today"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Today</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-2 sm:px-3 md:px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 transition-all duration-200 flex-shrink-0 flex items-center whitespace-nowrap text-xs sm:text-sm"
                  title="Download Excel"
                  disabled={orders.length === 0}
                  style={{ opacity: orders.length === 0 ? 0.5 : 1 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v12" />
                  </svg>
                  <span>Download Excel</span>
                </button>
              </div>
            </div>
            {orders.length === 0 && (
              <div className="mt-2 text-center text-red-600 font-medium">
                No orders available to download
              </div>
            )}
          </div>

          {/* Enhanced Stats Display */}
          {orders.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg shadow-sm border border-orange-200 transition-all duration-300 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {stats.totalPaidOrders}
                  </p>
                </div>
                <div
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow-sm border border-yellow-200 transition-all duration-300 hover:shadow-md cursor-pointer"
                  onClick={() => navigate('/pending-orders')}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/pending-orders'); }}
                  aria-label="View Pending Orders"
                >
                  <h3 className="text-lg font-semibold text-gray-700">Pending Orders</h3>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {orders.filter(o => !o.isPaid).length}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-green-100 p-4 rounded-lg shadow-sm border border-green-200 transition-all duration-300 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700">Revenue</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    ₹{stats.totalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">From Paid Orders</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-purple-100 p-4 rounded-lg shadow-sm border border-purple-200 transition-all duration-300 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700">Avg. Order Value</h3>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    ₹{Math.round(stats.avgOrderValue).toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Per Paid Order</p>
                </div>
              </div>
            </>
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
                  <OrderCard
                    order={order}
                    isUpdated={order.orderId === lastUpdatedOrderId}
                    parseCustomPaymentAmounts={parseCustomPaymentAmounts}
                    formatDateIST={formatDateIST}
                    handleDeleteClick={handleDeleteClick}
                    deleteLoading={deleteLoading && orderToDelete?.orderId === order.orderId}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <DeleteOrderConfirmation
        isOpen={showDeleteConfirmation}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        orderNumber={orderToDelete?.orderNumber}
        isLoading={deleteLoading}
      />

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
};

export default Orders;
