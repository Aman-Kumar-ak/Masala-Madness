import React, { useState, useEffect } from "react";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/orders/date/${selectedDate}`);
      const data = await response.json();
      setOrders(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading orders:', error);
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
    const istOffset = 5.5 * 60 * 60000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  };

  const formatDateIST = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false // 24-hour format
    });
  };

  const calculateTotalAmount = () => {
    return orders.reduce((total, order) => {
      return order.isPaid ? total + order.totalAmount : total;
    }, 0);
  };

  const handleDownloadExcel = () => {
    const url = `http://localhost:5000/api/orders/excel/${selectedDate}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-orange-100 p-4">
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
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Download Excel
            </button>
          </div>
        </div>

        {/* Totals */}
        {orders.length > 0 && (
          <div className="bg-orange-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold">Total Orders</h3>
                <p className="text-2xl font-bold text-orange-600">{orders.length}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Total Revenue</h3>
                <p className="text-2xl font-bold text-orange-600">₹{calculateTotalAmount()}</p>
              </div>
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
                    <p className="font-semibold">Total: ₹{order.totalAmount}</p>
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
