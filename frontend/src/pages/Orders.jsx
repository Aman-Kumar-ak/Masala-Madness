import React, { useState, useEffect } from "react";
import BackButton from "../components/BackButton";
import { useRefresh } from "../contexts/RefreshContext";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const navigate = useNavigate();

  const { refreshKey } = useRefresh();

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
    window.open(url, '_blank');
  };

  const resetToCurrentDate = () => {
    const today = getCurrentDate();
    setSelectedDate(today);
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
            <div className="flex gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={getCurrentDate()}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
              <button
                onClick={resetToCurrentDate}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                title="Reset to today"
              >
                Today
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={orders.length === 0}
                className={`relative group ${
                  orders.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
              >
                Download Excel
              </button>
            </div>
            {orders.length === 0 && (
              <div className="mt-2 text-center text-red-600 font-semibold">
                No orders available to download
              </div>
            )}
          </div>

          {/* Enhanced Stats Display */}
          {orders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.totalPaidOrders}
                </p>
              </div>

              <div
                role="button"
                tabIndex={0}
                className="bg-orange-50 p-4 rounded-lg shadow-sm"
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
              
              <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-700">Revenue</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  ₹{stats.totalRevenue.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-500 mt-1">From Paid Orders</p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
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
              <p className="text-gray-600 text-center">No orders found for this date</p>
            ) : (
              orders.map((order) => (
                <div key={order.orderId} className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                      <p className="text-sm text-gray-600">{formatDateIST(order.updatedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {order.discountAmount > 0 ? (
                          <>
                            <span className="text-gray-500 line-through mr-2">₹{order.subtotal}</span>
                            <span>₹{order.totalAmount}</span>
                          </>
                        ) : (
                          <span>₹{order.totalAmount}</span>
                        )}
                      </p>
                      <p className={`text-sm ${order.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                        {order.isPaid ? 'Paid' : 'Unpaid'} - {order.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h4 className="font-medium mb-1">Items:</h4>
                    <ul className="space-y-1">
                      {order.items.map((item, index) => (
                        <li key={index} className="text-sm">
                          {item.name} ({item.type}) - {item.quantity} x ₹{item.price} = ₹{item.totalPrice}
                        </li>
                      ))}
                    </ul>
                    {order.discountAmount > 0 && (
                      <div className="mt-2 text-sm text-green-600">
                        Discount Applied: {order.discountPercentage}% (-₹{order.discountAmount})
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
