import React, { useState, useEffect } from "react";
import BackButton from "../../components/BackButton";
import { useRefresh } from "../../contexts/RefreshContext";
import { useNavigate } from "react-router-dom";
import { api } from '../../utils/api';
// import DeleteOrderConfirmation from "../../components/DeleteOrderConfirmation"; // Removed
import Notification from "../../components/Notification";

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      const dateToQuery = selectedDate || getCurrentDate();
      const [ordersData, pendingOrdersData] = await Promise.all([
        api.get(`/orders/date/${dateToQuery}`),
        api.get('/pending-orders'),
      ]);
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
          
          {/* Current Date Display */}
          <div className="mb-6 text-lg font-semibold text-gray-700">
            Orders for: {getCurrentDate()}
          </div>

          {/* Enhanced Stats Display (Total Orders & Pending Orders) */}
          {orders.length > 0 && ( // Only show stats if there are orders
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                onClick={() => navigate("/worker-pending-orders")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate("/worker-pending-orders");
                  }
                }}
                aria-label={`Pending Orders: ${pendingOrdersCount}`}
              >
                <h3 className="text-lg font-semibold text-gray-700 select-none">Pending Orders</h3>
                <p className="text-3xl font-bold text-yellow-600 mt-2 select-none">{pendingOrdersCount}</p>
                <p className="text-sm text-gray-500 mt-1 select-none">Orders awaiting confirmation</p>
              </div>
            </div>
          )}

          {/* Orders List */}
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-gray-600 text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">No orders available for today.</p>
            ) : (
              orders.map((order) => (
                <div key={order.orderId} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold mr-2">Order #{order.orderNumber}</h3>
                        {/* Delete button removed as per worker requirements */}
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
