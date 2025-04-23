import React, { useState, useEffect } from "react";
import BackButton from "../components/BackButton";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalPaidOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/orders/date/${selectedDate}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOrders(data.orders || []);
      setStats(data.stats || {
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
    loadOrders();
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
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
              />
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
                {orders.length === 0 && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    No orders available to download
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Stats Display */}
          {orders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.totalPaidOrders}/{stats.totalOrders}
                </p>
                <p className="text-sm text-gray-500 mt-1">Paid/Total</p>
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

              <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-700">Payment Success</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.totalOrders > 0 
                    ? Math.round((stats.totalPaidOrders / stats.totalOrders) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Success Rate</p>
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
                      <p className="text-sm text-gray-600">{formatDateIST(order.createdAt)}</p>
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
