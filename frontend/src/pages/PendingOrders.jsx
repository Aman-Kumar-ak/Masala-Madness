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

  const handleQuantityChange = (orderId, itemIndex, delta) => {
    setPendingOrders(prevOrders => prevOrders.map(order => {
      if (order.orderId === orderId) {
        const updatedItems = [...order.items];
        updatedItems[itemIndex].quantity += delta;
        return { ...order, items: updatedItems };
      }
      return order;
    }));
  };

  const handleSaveItems = (selectedItems) => {
    setPendingOrders(prevOrders => prevOrders.map(order => {
      if (order.orderId === currentOrderId) {
        return { ...order, items: [...order.items, ...selectedItems] };
      }
      return order;
    }));
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 p-4 pt-16">
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">Pending Orders</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {pendingOrders.length === 0 ? (
            <p>No pending orders found.</p>
          ) : (
            <ul>
              {pendingOrders.map(order => (
                <li key={order.orderId} className="bg-white p-4 rounded shadow mb-2">
                  <h2 className="font-bold">Order ID: {order.orderId}</h2>
                  <p>Subtotal: ₹{order.subtotal}</p>
                  <ul className="list-disc pl-5">
                    {order.items.map((item, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <span>{item.name} - {item.type} - ₹{item.price} x {item.quantity}</span>
                        <div className="flex items-center">
                          <button onClick={() => handleQuantityChange(order.orderId, index, -1)} className="px-2">-</button>
                          <button onClick={() => handleQuantityChange(order.orderId, index, 1)} className="px-2">+</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleConfirmPayment(order.orderId)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mt-2"
                  >
                    Confirm Payment
                  </button>
                  <button
                    onClick={() => { setShowMenu(true); setCurrentOrderId(order.orderId); }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-2"
                  >
                    Add Items
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showMenu && <MenuModal onClose={() => setShowMenu(false)} onSave={handleSaveItems} items={availableItems} />}
    </div>
  );
}
