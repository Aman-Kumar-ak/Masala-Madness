import React, { useState, useEffect } from "react";
import BackButton from "../components/BackButton";
import { useRefresh } from "../contexts/RefreshContext";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/config";
import DeleteOrderConfirmation from "../components/DeleteOrderConfirmation";
import Notification from "../components/Notification";

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Orders = () => {
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const navigate = useNavigate();

  const { refreshKey } = useRefresh();

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
      
      // Ensure we have a valid date to query
      const dateToQuery = selectedDate || getCurrentDate();
      
      const [ordersResponse, pendingOrdersResponse] = await Promise.all([
        fetch(`${API_URL}/api/orders/date/${dateToQuery}`),
        fetch(`${API_URL}/api/pending-orders`),
      ]);

      if (!ordersResponse.ok) {
        throw new Error(`HTTP error! status: ${ordersResponse.status}`);
      }

      if (!pendingOrdersResponse.ok) {
        throw new Error(`HTTP error! status: ${pendingOrdersResponse.status}`);
      }

      const ordersData = await ordersResponse.json();
      const pendingOrdersData = await pendingOrdersResponse.json();

      setOrders(ordersData.orders || []);
      setStats(ordersData.stats || {
        totalOrders: 0,
        totalPaidOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0
      });

      setPendingOrdersCount(pendingOrdersData.length || 0);
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

  const handleDownloadExcel = () => {
    if (orders.length === 0) {
      return;
    }
    const url = `${API_URL}/api/orders/excel/${selectedDate}`;
    // Use a method more compatible with WebViews for triggering downloads
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders-${selectedDate}.xlsx`); // Optional: suggest a filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      
      const response = await fetch(`${API_URL}/api/orders/${orderToDelete.orderId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Show success notification
      setNotification({
        message: `Order #${orderToDelete.orderNumber} has been deleted successfully`,
        type: 'delete',
        duration: 2000
      });
      
      // Don't manually update stats, just reload orders to get the fresh data
      loadOrders();
      
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
                  disabled={orders.length === 0}
                  className={`relative group flex items-center flex-shrink-0 whitespace-nowrap text-xs sm:text-sm ${
                    orders.length === 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } font-medium py-2.5 px-2 sm:px-3 md:px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 transition-all duration-200`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg shadow-sm border border-orange-200 transition-all duration-300 hover:shadow-md">
                <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.totalPaidOrders}
                </p>
              </div>

              <div
                role="button"
                tabIndex={0}
                className="bg-gradient-to-br from-orange-50 to-yellow-100 p-4 rounded-lg shadow-sm border border-yellow-200 transition-all duration-300 hover:shadow-md cursor-pointer"
                onClick={() => navigate("/pending-orders")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate("/pending-orders");
                  }
                }}
                aria-label={`Pending Orders: ${pendingOrdersCount}`}
              >
                <h3 className="text-lg font-semibold text-gray-700 select-none">Pending Orders</h3>
                <p className="text-3xl font-bold text-yellow-600 mt-2 select-none">{pendingOrdersCount}</p>
                <p className="text-sm text-gray-500 mt-1 select-none">Orders awaiting confirmation</p>
              </div>
              
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
          )}

          {/* Orders List */}
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-gray-600 text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">No orders found for this date</p>
            ) : (
              orders.map((order) => (
                <div key={order.orderId} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold mr-2">Order #{order.orderNumber}</h3>
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
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 text-sm">
                        {order.isPaid ? 'Paid' : 'Pending'} -
                        {order.paymentMethod.startsWith('Custom') ? (() => {
                          const { cash, online } = parseCustomPaymentAmounts(order.paymentMethod);
                          return (
                            <span className="font-medium">
                              {' '}
                              Custom
                            </span>
                          );
                        })() : (
                          <span className="font-medium"> {order.paymentMethod}</span>
                        )}
                      </span>

                      <p className="text-xl font-bold text-gray-800 mt-1">₹{order.totalAmount.toFixed(2)}</p>
                      {order.discountAmount > 0 && (
                        <p className="text-sm text-gray-500 line-through">
                          ₹{order.subtotal.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium mb-2">Items:</h4>
                    <ul className="space-y-1.5">
                      {order.items.map((item, index) => (
                        <li key={index} className="text-sm flex flex-col">
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
