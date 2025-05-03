import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import Menu from "../components/Menu";
import MenuModal from "../components/MenuModal";
import { useRefresh } from "../contexts/RefreshContext";
import Notification from '../components/Notification';
import ConfirmationDialog from '../components/ConfirmationDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PendingOrders() {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);

  const [paymentOptionOrderId, setPaymentOptionOrderId] = useState(null); // track order awaiting payment option
  const [paymentMethodToConfirm, setPaymentMethodToConfirm] = useState(null); // payment method pending admin confirmation
  const [paymentConfirmedOrderId, setPaymentConfirmedOrderId] = useState(null); // track payment confirmed for UI changes
  const [activeDiscount, setActiveDiscount] = useState(null);

  const { refresh, triggerRefresh, socket, connected } = useRefresh();

  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Create a memoized fetchPendingOrders function that we can call from multiple places
  const fetchPendingOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/pending-orders`);
      if (!response.ok) throw new Error('Failed to fetch pending orders');
      const data = await response.json();
      setPendingOrders(data);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      setNotification({ 
        message: 'Failed to fetch pending orders. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (socket) {
      const orderUpdateHandler = (data) => {
        console.log('Socket event received:', data.type);
        
        if (data.type === 'order-confirmed') {
          // Remove the order from pending orders if it was just confirmed
          setPendingOrders(prev => prev.filter(order => order.orderId !== data.pendingOrderId));
        } else {
          // For other update types, refresh all data
          fetchPendingOrders();
        }
      };
      
      // Register socket event handler
      socket.on('order-update', orderUpdateHandler);
      
      // Clean up event listener
      return () => {
        socket.off('order-update', orderUpdateHandler);
      };
    }
  }, [socket, fetchPendingOrders]);

  // Effect for initial data fetching
  useEffect(() => {
    fetchPendingOrders();
    
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

    const fetchActiveDiscount = async () => {
      try {
        const response = await fetch(`${API_URL}/api/discounts/active`);
        if (response.ok) {
          const data = await response.json();
          setActiveDiscount(data);
        }
      } catch (error) {
        console.error('Error fetching discount:', error);
      }
    };

    fetchAvailableItems();
    fetchActiveDiscount();
  }, [refresh, fetchPendingOrders]);

  // Periodic refresh for data sync - backup for socket issues
  useEffect(() => {
    const interval = setInterval(() => {
      if (!connected) {
        console.log("Socket not connected, using interval-based refresh");
        fetchPendingOrders();
      }
    }, 10000); // Refresh every 10 seconds if socket not connected
    
    return () => clearInterval(interval);
  }, [connected, fetchPendingOrders]);

  const handleConfirmPayment = async (orderId, paymentMethod) => {
    if (!paymentMethod) {
      console.error('Payment method is not specified');
      return;
    }
    
    // Get the order data
    const order = pendingOrders.find(order => order.orderId === orderId);
    
    // Calculate discount if applicable
    let discountAmount = 0;
    let discountPercentage = 0;
    let discountedTotal = order.subtotal;
    
    if (activeDiscount && order.subtotal >= activeDiscount.minOrderAmount) {
      discountAmount = Math.round((order.subtotal * activeDiscount.percentage) / 100);
      discountedTotal = order.subtotal - discountAmount;
      discountPercentage = activeDiscount.percentage;
    }
    
    // Immediately update UI to show payment confirmation
    setPaymentConfirmedOrderId(orderId);
    setPaymentOptionOrderId(null); 
    setPaymentMethodToConfirm(null);
    
    // Update local state immediately to remove the confirmed order
    const newPendingOrders = pendingOrders.filter(order => order.orderId !== orderId);
    setPendingOrders(newPendingOrders);
    
    setNotification({ 
      message: "Processing payment...", 
      type: "success" 
    });
    
    console.log('Confirming payment for order', orderId, 'with method', paymentMethod);
    try {
      const response = await fetch(`${API_URL}/api/pending-orders/confirm/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          paymentMethod, 
          isPaid: true,
          discountAmount,
          discountPercentage,
          totalAmount: discountedTotal
        }),
      });
      
      if (!response.ok) throw new Error('Failed to confirm payment');
      
      const data = await response.json();
      setNotification({ 
        message: data.message, 
        type: 'success' 
      });
      
      // Trigger manual refresh to ensure all components update
      triggerRefresh();
      
      if (newPendingOrders.length === 0) {
        setTimeout(() => navigate('/'), 1500); // Delay navigation to allow notification to be displayed
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      
      // If there was an error, revert the UI changes
      setNotification({ 
        message: "Error confirming payment. Please try again.", 
        type: "error" 
      });
      
      // Put the order back in the list
      const revertedOrders = [...pendingOrders];
      setPendingOrders(revertedOrders);
      setPaymentConfirmedOrderId(null);
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
    // Calculate discount if applicable
    let discountAmount = 0;
    let discountPercentage = 0;
    let totalAmount = updatedOrder.subtotal;
    
    if (activeDiscount && updatedOrder.subtotal >= activeDiscount.minOrderAmount) {
      discountPercentage = activeDiscount.percentage;
      discountAmount = Math.round((updatedOrder.subtotal * discountPercentage) / 100);
      totalAmount = updatedOrder.subtotal - discountAmount;
    }
    
    // Add discount information to the order
    updatedOrder = {
      ...updatedOrder,
      discountAmount,
      discountPercentage,
      totalAmount
    };
    
    setPendingOrders(prevOrders => prevOrders.map(order => {
      if (order.orderId === updatedOrder.orderId) {
        return updatedOrder;
      }
      return order;
    }));
    setShowMenu(false);
  };

  const handleRemoveItemOrOrder = async (order, item, index) => {
    const isLastItem = order.items.length === 1;
    const confirmMsg = isLastItem
      ? `Removing last item will delete entire order. Continue?`
      : `Remove ${item.name} from order?`;

    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Removal',
      message: confirmMsg,
      onConfirm: async () => {
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
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
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
                <li key={order.orderId} className="bg-white dark:bg-gray-100 rounded-md shadow-md p-6 max-w-6xl mx-auto border-t border-gray-300 dark:border-gray-600 first:border-t-0">
                  <h2 className="font-semibold text-xl tracking-tight mb-1 text-gray-800 dark:text-gray-700">
                    Order #{pendingOrders.length - pendingOrders.indexOf(order)} {/* Show order number counting down */}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-500 mb-3">
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                  <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-md font-medium text-gray-700">Subtotal:</span>
                      <span className="text-md font-medium">₹{order.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {activeDiscount && (
                      <>
                        {order.subtotal >= activeDiscount.minOrderAmount ? (
                          <div className="flex justify-between text-green-600 mb-1">
                            <span className="font-medium">Discount ({activeDiscount.percentage}%):</span>
                            <span className="font-medium">-₹{(order.subtotal * activeDiscount.percentage / 100).toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-orange-600 mb-1">
                            Add ₹{(activeDiscount.minOrderAmount - order.subtotal).toFixed(2)} more to get {activeDiscount.percentage}% discount!
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between font-semibold text-green-700 pt-1 border-t border-gray-200">
                      <span>Total:</span>
                      <span>₹{activeDiscount && order.subtotal >= activeDiscount.minOrderAmount
                        ? (order.subtotal - (order.subtotal * activeDiscount.percentage / 100)).toFixed(2)
                        : order.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-300 dark:divide-gray-200 rounded-lg overflow-hidden shadow-inner">
                    {order.items.map((item, index) => (
                      <li key={index} className="flex justify-between py-3 px-4 bg-gray-50 dark:bg-gray-200 hover:bg-gray-100 dark:hover:bg-gray-300 transition rounded-lg">
                        <div>
                          <span className="text-gray-800 dark:text-gray-700 font-medium">{item.name} - <span className="italic lowercase">{item.type}</span></span>
                          <div className="text-gray-800 dark:text-gray-700 font-semibold mt-1">₹{item.price.toFixed(2)} x {item.quantity}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(order.orderId, index, -1)}
                            disabled={item.quantity === 1}
                            className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                              item.quantity === 1
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-orange-600 hover:bg-orange-50 focus:ring-orange-600'
                            }`}
                            aria-label={`Decrease quantity of ${item.name}`}
                            title={item.quantity === 1 ? 'Minimum quantity reached' : `Decrease quantity of ${item.name}`}
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleQuantityChange(order.orderId, index, 1)}
                            className="w-8 h-8 rounded-full bg-white text-orange-600 font-bold flex items-center justify-center shadow-md hover:bg-orange-50 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-600"
                            aria-label={`Increase quantity of ${item.name}`}
                            title={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveItemOrOrder(order, item, index)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition font-bold text-xl uppercase focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-600"
                            aria-label={`Remove ${item.name}`}
                            title={`Remove ${item.name}`}
                          >
                            &times;
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col space-y-3 mt-6">
                    <button
                      onClick={() => {
                        if (paymentOptionOrderId === order.orderId) {
                          setPaymentOptionOrderId(null);
                          setPaymentMethodToConfirm(null);
                        } else {
                          setPaymentOptionOrderId(order.orderId);
                        }
                      }}
                      className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-colors duration-300 focus:outline-none ${
                        paymentConfirmedOrderId === order.orderId
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : paymentOptionOrderId === order.orderId
                          ? 'bg-gray-500 text-white'
                          : 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-600'
                      }`}
                      disabled={paymentConfirmedOrderId === order.orderId}
                    >
                      {paymentOptionOrderId === order.orderId ? 'Cancel' : 'Confirm Payment'}
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out transform-gpu origin-top ${
                        paymentOptionOrderId === order.orderId
                          ? 'max-h-40 opacity-100 translate-y-0'
                          : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none'
                      }`}
                      style={{ transitionProperty: 'max-height, opacity, transform' }}
                    >
                      {paymentOptionOrderId === order.orderId && (
                        !paymentMethodToConfirm ? (
                          <div className="flex justify-center space-x-4 mt-3">
                            <button
                              onClick={() => setPaymentMethodToConfirm('Cash')}
                              className="bg-white border-2 border-orange-600 text-orange-600 px-6 py-3 rounded-lg font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600"
                            >
                              Cash
                            </button>
                            <button
                              onClick={() => setPaymentMethodToConfirm('Online')}
                              className="bg-white border-2 border-orange-600 text-orange-600 px-6 py-3 rounded-lg font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600"
                            >
                              Online
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-3">
                            <p className="text-gray-800 font-semibold">Admin confirm that you received the payment?</p>
                            <div className="flex space-x-4 mt-1">
                              <button
                                onClick={() => handleConfirmPayment(order.orderId, paymentMethodToConfirm)}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                              >
                                Confirm Received
                              </button>
                              <button
                                onClick={() => setPaymentMethodToConfirm(null)}
                                className="bg-gray-500 text-white px-6 py-3 rounded-full font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <button
                      onClick={() => { setShowMenu(true); setCurrentOrderId(order.orderId); }}
                      className="bg-[#F6BD60] hover:bg-[#F6BD60] text-white px-6 py-3 rounded-lg font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F6BD60]"
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
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}
