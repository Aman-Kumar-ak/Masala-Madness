import React, { useEffect, useState, useCallback, useRef } from "react";
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
  
  // Refs for scroll position
  const scrollPositionRef = useRef(0);
  const ordersContainerRef = useRef(null);

  // Save the scroll position before updates
  const saveScrollPosition = () => {
    if (ordersContainerRef.current) {
      scrollPositionRef.current = ordersContainerRef.current.scrollTop;
    }
  };

  // Restore the scroll position after updates
  const restoreScrollPosition = useCallback(() => {
    if (ordersContainerRef.current && scrollPositionRef.current) {
      ordersContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

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
      // Restore scroll position after data loads
      setTimeout(restoreScrollPosition, 0);
    }
  }, [restoreScrollPosition]);

  // Listen for socket events
  useEffect(() => {
    if (socket) {
      const orderUpdateHandler = (data) => {
        console.log('Socket event received:', data.type);
        
        if (data.type === 'order-confirmed') {
          // Remove the order from pending orders if it was just confirmed
          setPendingOrders(prev => prev.filter(order => order.orderId !== data.pendingOrderId));
        } else {
          // For other update types, save scroll position before refresh
          saveScrollPosition();
          // Then refresh all data
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
        saveScrollPosition(); // Save position before refresh
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
    // Save scroll position before update
    saveScrollPosition();
    
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
      
      // Restore scroll position after state update
      setTimeout(restoreScrollPosition, 0);
    } catch (error) {
      console.error("Error updating quantity:", error);
      setNotification({
        message: "Failed to update quantity. Please try again.",
        type: "error"
      });
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

  const handleRemoveEntireOrder = async (order) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Order Deletion',
      message: `Are you sure you want to delete the entire order #${pendingOrders.length - pendingOrders.indexOf(order)}?`,
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_URL}/api/pending-orders/${order.orderId}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete order');
          setPendingOrders(prevOrders =>
            prevOrders.filter(o => o.orderId !== order.orderId)
          );
          setNotification({ 
            message: "Order successfully deleted", 
            type: "success" 
          });
        } catch (error) {
          console.error('Error removing order:', error);
          setNotification({ 
            message: "Failed to delete order", 
            type: "error" 
          });
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 pt-20 pb-12">
      <BackButton />
      
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <span>Pending Orders</span>
            {pendingOrders.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
          </h1>
        </div>
        
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-10 text-center border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading pending orders...</p>
          </div>
        ) : (
          <div 
            ref={ordersContainerRef} 
            className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]"
          >
            {pendingOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-10 text-center border border-gray-200">
                <div className="text-5xl mb-4">🍽️</div>
                <p className="text-xl text-gray-600 mb-2">No pending orders found</p>
                <p className="text-gray-500 mb-6">All orders have been processed</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  <span>Return to Menu</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingOrders.map(order => (
                  <div key={order.orderId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-orange-50 to-blue-50 p-4 border-b border-gray-200 flex justify-between items-start">
                      <div>
                        <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                          <span>Order #{pendingOrders.length - pendingOrders.indexOf(order)}</span>
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(order.createdAt).toLocaleString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveEntireOrder(order)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors duration-200 font-medium text-sm"
                        aria-label="Delete entire order"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Price Summary */}
                    <div className="p-4 bg-white">
                      <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-700 font-medium">Subtotal:</span>
                          <span className="font-semibold">₹{order.subtotal.toFixed(2)}</span>
                        </div>
                        
                        {activeDiscount && (
                          <>
                            {order.subtotal >= activeDiscount.minOrderAmount ? (
                              <div className="flex justify-between text-green-600 mb-2">
                                <span className="font-medium flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  Discount ({activeDiscount.percentage}%):
                                </span>
                                <span className="font-medium">-₹{(order.subtotal * activeDiscount.percentage / 100).toFixed(2)}</span>
                              </div>
                            ) : (
                              <div className="text-sm flex items-center gap-1 text-orange-600 mb-2 bg-orange-50 p-2 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Add ₹{(activeDiscount.minOrderAmount - order.subtotal).toFixed(2)} more to get {activeDiscount.percentage}% discount!
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex justify-between font-bold text-green-700 pt-2 border-t border-gray-200">
                          <span>Total:</span>
                          <span>₹{activeDiscount && order.subtotal >= activeDiscount.minOrderAmount
                            ? (order.subtotal - (order.subtotal * activeDiscount.percentage / 100)).toFixed(2)
                            : order.subtotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Items List */}
                      <h3 className="font-medium text-gray-700 mb-3">Order Items</h3>
                      <ul className="space-y-2 mb-4">
                        {order.items.map((item, index) => (
                          <li key={index} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{item.name}</span>
                                {item.type !== 'N/A' && (
                                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {item.type === 'H' ? 'Half' : item.type === 'F' ? 'Full' : item.type}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleQuantityChange(order.orderId, index, -1)}
                                disabled={item.quantity === 1}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
                                  item.quantity === 1
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-orange-600 hover:bg-orange-50 border border-orange-200'
                                }`}
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                -
                              </button>
                              
                              <div className="inline-flex justify-center items-center bg-white border border-gray-200 rounded-md px-2 py-1 min-w-[2rem] text-center">
                                {item.quantity}
                              </div>
                              
                              <button
                                onClick={() => handleQuantityChange(order.orderId, index, 1)}
                                className="w-8 h-8 rounded-full bg-white text-orange-600 border border-orange-200 flex items-center justify-center hover:bg-orange-50 transition-colors duration-200"
                                aria-label={`Increase quantity of ${item.name}`}
                              >
                                +
                              </button>
                              
                              <button
                                onClick={() => handleRemoveItemOrOrder(order, item, index)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
                                aria-label={`Remove ${item.name}`}
                              >
                                ×
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Action Buttons */}
                      <div className="flex gap-3 border-t border-gray-200 pt-4">
                        <button
                          onClick={() => { 
                            setShowMenu(true); 
                            setCurrentOrderId(order.orderId); 
                          }}
                          className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add Items</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            if (paymentOptionOrderId === order.orderId) {
                              setPaymentOptionOrderId(null);
                              setPaymentMethodToConfirm(null);
                            } else {
                              setPaymentOptionOrderId(order.orderId);
                            }
                          }}
                          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                            paymentConfirmedOrderId === order.orderId
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : paymentOptionOrderId === order.orderId
                              ? 'bg-gray-700 text-white'
                              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                          }`}
                          disabled={paymentConfirmedOrderId === order.orderId}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{paymentOptionOrderId === order.orderId ? 'Cancel' : 'Confirm Payment'}</span>
                        </button>
                      </div>

                      {/* Payment Options */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          paymentOptionOrderId === order.orderId
                            ? 'max-h-40 opacity-100 mt-4'
                            : 'max-h-0 opacity-0'
                        }`}
                      >
                        {paymentOptionOrderId === order.orderId && (
                          !paymentMethodToConfirm ? (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600 mb-3 text-center">Select payment method:</p>
                              <div className="flex justify-center space-x-4">
                                <button
                                  onClick={() => setPaymentMethodToConfirm('Cash')}
                                  className="bg-white border border-green-300 text-green-600 hover:bg-green-50 px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  </svg>
                                  Cash
                                </button>
                                <button
                                  onClick={() => setPaymentMethodToConfirm('Online')}
                                  className="bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  Online
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <p className="text-gray-800 font-medium mb-3 text-center">
                                Confirm that you received the payment via <span className="font-bold">{paymentMethodToConfirm}</span>?
                              </p>
                              <div className="flex justify-center gap-4">
                                <button
                                  onClick={() => handleConfirmPayment(order.orderId, paymentMethodToConfirm)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setPaymentMethodToConfirm(null)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {showMenu && (
        <MenuModal 
          onClose={() => setShowMenu(false)} 
          onSave={handleSaveItems} 
          orderId={currentOrderId} 
          existingItems={pendingOrders.find(order => order.orderId === currentOrderId)?.items || []}
        />
      )}
      
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
