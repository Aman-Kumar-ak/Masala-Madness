import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "../components/BackButton";
import Menu from "../components/Menu";
import MenuModal from "../components/MenuModal";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PendingOrders() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);

  useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        const response = await fetch(`${API_URL}/api/pending-orders`);
        if (!response.ok) throw new Error('Failed to fetch pending orders');
        const data = await response.json();
        setPendingOrders(data);
      } catch (error) {
        console.error('Error fetching pending orders:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailableItems = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dishes`);
        if (!response.ok) throw new Error('Failed to fetch items');
        const data = await response.json();
        const items = data.flatMap(category => category.dishes);
        setAvailableItems(items);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    fetchPendingOrders();
    fetchAvailableItems();
  }, []);

  const handleConfirmPayment = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/api/pending-orders/confirm/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethod: 'Cash', isPaid: true }),
      });
      if (!response.ok) throw new Error('Failed to confirm payment');
      const data = await response.json();
      alert(data.message);
      setPendingOrders(pendingOrders.filter(order => order.orderId !== orderId));
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  const handleQuantityChange = async (orderId, itemIndex, delta) => {
    try {
      const response = await fetch(`${API_URL}/api/pending-orders/${orderId}/item-quantity`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ itemIndex, delta })
      });
      if (!response.ok) throw new Error("Failed to update quantity");
      const data = await response.json();
      setPendingOrders(prevOrders =>
        prevOrders.map(order => order.orderId === orderId ? data.order : order)
      );
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("Failed to update quantity");
    }
  };

  const handleSaveItems = (updatedOrder) => {
    setPendingOrders(prevOrders => prevOrders.map(order => {
      if (order.orderId === updatedOrder.orderId) {
        return updatedOrder;
      }
      return order;
    }));
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 p-6 pt-20">
      <BackButton />
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900 dark:text-gray-800">Pending Orders</h1>
      {loading ? (
        <p className="text-center text-lg text-gray-500">Loading...</p>
      ) : (
        <div>
          {pendingOrders.length === 0 ? (
            <p className="text-center text-lg text-gray-600">No pending orders found.</p>
          ) : (
            <ul className="space-y-6">
              {pendingOrders.map(order => (
                <li key={order.orderId} className="bg-white dark:bg-gray-100 rounded-2xl shadow-lg p-6 max-w-4xl mx-auto">
                  <h2 className="font-semibold text-xl tracking-tight mb-2 text-gray-800 dark:text-gray-700">Order ID: <span className="text-blue-600 font-mono">{order.orderId}</span></h2>
                  <p className="text-md font-medium mb-4 text-gray-700 dark:text-gray-600">Subtotal: <span className="text-green-700 font-semibold">₹{order.subtotal.toFixed(2)}</span></p>
                  <ul className="divide-y divide-gray-300 dark:divide-gray-200 rounded-lg overflow-hidden shadow-inner">
                    {order.items.map((item, index) => (
                      <li key={index} className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-200 hover:bg-gray-100 dark:hover:bg-gray-300 transition rounded-lg">
                        <span className="text-gray-800 dark:text-gray-700 font-medium">{item.name} - <span className="italic lowercase">{item.type}</span> - ₹{item.price.toFixed(2)} x {item.quantity}</span>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(order.orderId, index, -1)}
                            className="px-3 py-1 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleQuantityChange(order.orderId, index, 1)}
                            className="px-3 py-1 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
                          >
                            +
                          </button>
                          <button
                            onClick={async () => {
                              const isLastItem = order.items.length === 1;
                              const confirmMsg = isLastItem
                                ? `Removing last item will delete entire order. Continue?`
                                : `Remove ${item.name} from order?`;
                              if (window.confirm(confirmMsg)) {
                                try {
                                  if (isLastItem) {
                                    const response = await fetch(`${API_URL}/api/pending-orders/${order.orderId}`, {
                                      method: 'DELETE',
                                    });
                                    if (!response.ok) throw new Error('Failed to delete order');
                                    setPendingOrders(prevOrders =>
                                      prevOrders.filter(o => o.orderId !== order.orderId)
                                    );
                                  } else {
                                    const response = await fetch(`${API_URL}/api/pending-orders/${order.orderId}/item/${index}`, {
                                      method: 'DELETE',
                                    });
                                    if (!response.ok) throw new Error('Failed to remove item');
                                    const data = await response.json();
                                    setPendingOrders(prevOrders =>
                                      prevOrders.map(o => o.orderId === order.orderId ? data.order : o)
                                    );
                                  }
                                } catch (error) {
                                  console.error('Error removing item/order:', error);
                                  alert('Failed to remove item/order');
                                }
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-600"
                            aria-label={`Remove ${item.name}`}
                            title={`Remove ${item.name}`}
                          >
                            &times;
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={() => handleConfirmPayment(order.orderId)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                    >
                      Confirm Payment
                    </button>
                    <button
                      onClick={() => { setShowMenu(true); setCurrentOrderId(order.orderId); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                    >
                      Add Items
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showMenu && <MenuModal onClose={() => setShowMenu(false)} onSave={handleSaveItems} items={availableItems} orderId={currentOrderId} />}
    </div>
  );
}
