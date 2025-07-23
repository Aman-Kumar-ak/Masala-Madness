import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import Menu from "../../components/Menu";
import MenuModal from "../../components/MenuModal";
import { useRefresh } from "../../contexts/RefreshContext";
import Notification from '../../components/Notification';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { api } from '../../utils/api';
import useKeyboardScrollAdjustment from "../../hooks/useKeyboardScrollAdjustment";
import AuthContext from '../../contexts/AuthContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function PendingOrders() {
  useKeyboardScrollAdjustment();
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
  const [defaultUpiAddress, setDefaultUpiAddress] = useState(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [currentOrderForQr, setCurrentOrderForQr] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // New state to hold the selected payment method

  const { refresh, triggerRefresh, socket, connected } = useRefresh();

  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // Refs for scroll position
  const scrollPositionRef = useRef(0);
  const ordersContainerRef = useRef(null);
  const paymentOptionsRefs = useRef({});

  const [pendingScrollOrderId, setPendingScrollOrderId] = useState(null);

  const [cashConfirmDialog, setCashConfirmDialog] = useState({ isOpen: false, orderId: null, isLoading: false });
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [manualPayment, setManualPayment] = useState({ cash: 0, online: 0 });
  const [showCustomPaymentDialog, setShowCustomPaymentDialog] = useState(false);

  // Add manual discount state for each order
  const [manualDiscounts, setManualDiscounts] = useState({});

  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(true);

  const { user } = useContext(AuthContext);

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
      const allOrders = await api.get('/orders');
      const pending = (allOrders || []).filter(order => order.isPaid === false);
      setPendingOrders(pending);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      setNotification({ 
        message: 'Failed to fetch pending orders. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
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
        const data = await api.get('/dishes');
        const items = data.flatMap(category => category.dishes);
        setAvailableItems(items);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    const fetchActiveDiscount = async () => {
      try {
        const data = await api.get('/discounts/active');
        setActiveDiscount(data);
      } catch (error) {
        console.error('Error fetching discount:', error);
      }
    };

    const fetchDefaultUpiAddress = async () => {
      try {
        const data = await api.get('/upi');
        const defaultAddress = data.find(addr => addr.isDefault);
        if (defaultAddress) {
          setDefaultUpiAddress(defaultAddress);
        } else if (data.length > 0) {
          setDefaultUpiAddress(data[0]);
        }
      } catch (error) {
        console.error('Error fetching UPI addresses:', error);
      }
    };

    fetchAvailableItems();
    fetchActiveDiscount();
    fetchDefaultUpiAddress();
  }, [refresh, fetchPendingOrders]);

  // Periodic refresh for data sync - backup for socket issues
  useEffect(() => {
    const interval = setInterval(() => {
      if (!connected && !document.hidden) { // Only refresh if socket not connected and tab is visible
        console.log("Socket not connected, using interval-based refresh");
        saveScrollPosition(); // Save position before refresh
        fetchPendingOrders();
      }
    }, 10000); // Refresh every 10 seconds if socket not connected and tab is visible

    const handleVisibilityChange = () => {
      if (!document.hidden && !connected) {
        console.log("Tab became visible and socket not connected, triggering immediate refresh.");
        saveScrollPosition();
        fetchPendingOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connected, fetchPendingOrders]);

  // Auto-scroll to payment options when opened (robust for last order)
  useEffect(() => {
    if (paymentOptionOrderId && paymentOptionsRefs.current[paymentOptionOrderId]) {
      setTimeout(() => {
        const dropdown = paymentOptionsRefs.current[paymentOptionOrderId];
        const container = ordersContainerRef.current;
        if (dropdown && container) {
          dropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const dropdownRect = dropdown.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            if (dropdownRect.bottom > containerRect.bottom) {
              const scrollDiff = dropdownRect.bottom - containerRect.bottom;
              container.scrollTop += scrollDiff + 8;
            } else if (dropdownRect.top < containerRect.top) {
              const scrollUp = containerRect.top - dropdownRect.top;
              container.scrollTop -= scrollUp + 8;
            }
          }, 80);
        }
      }, 60);
    }
  }, [paymentOptionOrderId, pendingOrders]);

  // After padding is applied, scroll last order into view
  useEffect(() => {
    if (pendingScrollOrderId && paymentOptionsRefs.current[pendingScrollOrderId]) {
      setTimeout(() => {
        paymentOptionsRefs.current[pendingScrollOrderId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
        setPendingScrollOrderId(null);
      }, 50); // allow DOM update
    }
  }, [pendingScrollOrderId]);

  // Helper to get manual discount for an order
  const getManualDiscount = (orderId) => manualDiscounts[orderId] || 0;

  // Helper to calculate total discount for an order
  const calculateOrderDiscount = (order) => {
    let percentageDiscount = 0;
    if (activeDiscount && order.subtotal >= activeDiscount.minOrderAmount) {
      percentageDiscount = Math.round((order.subtotal * activeDiscount.percentage) / 100);
    }
    const maxManual = Math.max(0, order.subtotal - percentageDiscount);
    const manual = Math.min(getManualDiscount(order.orderId), maxManual);
    return { percentageDiscount, manualDiscount: manual, totalDiscount: percentageDiscount + manual };
  };

  // Update handleConfirmPayment to include manual discount
  const handleConfirmPayment = async (orderId, paymentMethod, options = {}) => {
    if (!paymentMethod) {
      setNotification({ message: 'Payment method is not specified', type: 'error' });
      return;
    }
    // Get the order data
    const order = pendingOrders.find(order => order.orderId === orderId);
    if (!order) {
      setNotification({ message: 'Order not found', type: 'error' });
      return;
    }
    // Calculate discount if applicable
    const { percentageDiscount, manualDiscount, totalDiscount } = calculateOrderDiscount(order);
    const discountedTotal = order.subtotal - totalDiscount;
    // Immediately update UI to show payment confirmation
    setPaymentConfirmedOrderId(orderId);
    setPaymentOptionOrderId(null); 
    setPaymentMethodToConfirm(null);
    // Update local state immediately to remove the confirmed order
    const newPendingOrders = pendingOrders.filter(order => order.orderId !== orderId);
    setPendingOrders(newPendingOrders);
    let isOnline = paymentMethod === 'Online';
    // Determine custom payment amounts if applicable
    let customCashAmount = 0;
    let customOnlineAmount = 0;
    let finalPaymentMethod = paymentMethod;
    if (paymentMethod === "Custom") {
      customCashAmount = options.customCashAmount || 0;
      customOnlineAmount = options.customOnlineAmount || 0;
      finalPaymentMethod = `Custom (Cash: ₹${customCashAmount.toFixed(2)}, Online: ₹${customOnlineAmount.toFixed(2)})`;
    }
    if (isOnline || paymentMethod === "Custom") {
      setShowSplashScreen(true);
    }
    // Always send all required fields, even if zero
    const payload = {
      orderId,
      paymentMethod: finalPaymentMethod || '',
      isPaid: true,
      discountAmount: typeof totalDiscount === 'number' ? totalDiscount : 0,
      discountPercentage: typeof percentageDiscount === 'number' ? percentageDiscount : 0,
      totalAmount: typeof discountedTotal === 'number' ? discountedTotal : 0,
      customCashAmount: typeof customCashAmount === 'number' ? customCashAmount : 0,
      customOnlineAmount: typeof customOnlineAmount === 'number' ? customOnlineAmount : 0,
      items: order.items,
      confirmedBy: user?.name || user?.username || user?.mobileNumber,
    };
    try {
      const response = await api.post('/orders/confirm', payload);
      // Optimistically remove the order immediately
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
      setNotification({ message: response.message, type: 'success' });
      // Trigger refresh to ensure UI is in sync with backend
      triggerRefresh();
      if (newPendingOrders.length === 0) {
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (error) {
      console.error('Error confirming payment:', error, payload);
      setNotification({ message: "Error confirming payment. Please try again.", type: "error" });
      setPendingOrders([...pendingOrders]);
      setPaymentConfirmedOrderId(null);
    } finally {
      if (isOnline || paymentMethod === "Custom") {
        setShowSplashScreen(false);
      }
    }
  };

  const handleQuantityChange = async (orderId, itemIndex, delta) => {
    // Save scroll position before update
    saveScrollPosition();
    
    try {
      const order = pendingOrders.find(order => order.orderId === orderId);
      if (!order) return;
      const updatedItems = [...order.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity: updatedItems[itemIndex].quantity + delta,
        totalPrice: updatedItems[itemIndex].price * (updatedItems[itemIndex].quantity + delta),
      };
      // Recalculate totals
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountPercentage = order.discountPercentage || 0;
      const discountAmount = Math.round(subtotal * discountPercentage / 100);
      const totalAmount = subtotal - discountAmount;
      const updatePayload = {
        orderId,
        items: updatedItems,
        isPaid: false,
        subtotal,
        discountAmount,
        discountPercentage,
        totalAmount,
      };
      const data = await api.post('/orders/confirm', { ...updatePayload, confirmedBy: user?.name || user?.username || user?.mobileNumber });
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

  // Update handleSaveItems to preserve manual discount
  const handleSaveItems = (updatedOrder) => {
    const { percentageDiscount, manualDiscount, totalDiscount } = calculateOrderDiscount(updatedOrder);
    let totalAmount = updatedOrder.subtotal - totalDiscount;
    updatedOrder = {
      ...updatedOrder,
      discountAmount: totalDiscount,
      discountPercentage: percentageDiscount,
      manualDiscount,
      totalAmount
    };
    setPendingOrders(prevOrders => prevOrders.map(order => {
      if (order.orderId === updatedOrder.orderId) {
        return updatedOrder;
      }
      return order;
    }));
    setShowMenu(false);
    triggerRefresh(); // Ensure pending orders list is refreshed after saving
  };

  const handleRemoveManualDiscount = async (orderId) => {
    // Directly update the local state for manualDiscounts
    setManualDiscounts(prev => ({ ...prev, [orderId]: 0 }));

    // Also update the pendingOrders state to reflect the change in totalAmount and discountAmount
    setPendingOrders(prevOrders =>
        prevOrders.map(order => {
            if (order.orderId === orderId) {
                // Temporarily create an order object with 0 manual discount to recalculate
                const tempOrder = { ...order, manualDiscount: 0 };
                const { percentageDiscount, manualDiscount: updatedManualDiscount, totalDiscount } = calculateOrderDiscount(tempOrder);
                return {
                    ...order,
                    manualDiscount: 0, // Explicitly set to 0
                    totalAmount: order.subtotal - totalDiscount,
                    discountAmount: totalDiscount,
                };
            }
            return order;
        })
    );
    setNotification({ message: "Manual discount removed successfully", type: "success" });
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
            await api.delete(`/orders/${order.orderId}`);
            setPendingOrders(prevOrders =>
              prevOrders.filter(o => o.orderId !== order.orderId)
            );
          } else {
            const updatedItems = order.items.filter((_, idx) => idx !== index);
            const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const discountPercentage = order.discountPercentage || 0;
            const discountAmount = Math.round(subtotal * discountPercentage / 100);
            const totalAmount = subtotal - discountAmount;
            const updatePayload = {
              orderId: order.orderId,
              items: updatedItems,
              isPaid: false,
              subtotal,
              discountAmount,
              discountPercentage,
              totalAmount,
            };
            const data = await api.post('/orders/confirm', { ...updatePayload, confirmedBy: user?.name || user?.username || user?.mobileNumber });
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
      message: `Are you sure you want to delete the entire order #${order.orderNumber ?? (pendingOrders.length - pendingOrders.indexOf(order))}?`,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await api.delete(`/orders/${order.orderId}`);
          setPendingOrders(prevOrders =>
            prevOrders.filter(o => o.orderId !== order.orderId)
          );
          setNotification({ 
            message: "Order successfully deleted", 
            type: "success" 
          });
        } catch (error) {
          setNotification({ 
            message: "Failed to delete order", 
            type: "error" 
          });
        } finally {
          setIsDeleting(false);
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const generateQRCode = (order) => {
    if (!defaultUpiAddress) {
      setNotification({
        message: "No UPI address configured for QR payments",
        type: "error"
      });
      return;
    }
    
    try {
      // Calculate discount if applicable, including manual discount
      const { totalDiscount } = calculateOrderDiscount(order);
      const totalAmount = order.subtotal - totalDiscount;
      
      // Create UPI payment URL
      // Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&am=AMOUNT&cu=INR&tn=NOTE
      let upiUrl = `upi://pay?pa=${encodeURIComponent(defaultUpiAddress.upiId)}`;
      
      // Add merchant name
      upiUrl += `&pn=${encodeURIComponent("Masala Madness")}`;
      
      // Add amount
      upiUrl += `&am=${encodeURIComponent(totalAmount)}`;
      
      // Always add currency as INR
      upiUrl += `&cu=INR`;
      
      // Add payment note
      upiUrl += `&tn=${encodeURIComponent(`Payment for Order - Masala Madness`)}`;
      
      // Use a QR code generation service
      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}&margin=10`;
      
      setQrCodeUrl(qrCodeImageUrl);
      setCurrentOrderForQr(order);
      setShowQrCode(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      setNotification({
        message: "Failed to generate QR code",
        type: "error"
      });
    }
  };

  const handleQrConfirmPayment = () => {
    if (currentOrderForQr) {
      handleConfirmPayment(currentOrderForQr.orderId, 'Online');
      setShowQrCode(false);
      setCurrentOrderForQr(null);
    }
  };

  // Modified handleConfirmPayment for cash: show splash screen, no notification
  const handleCashConfirmPayment = async (orderId) => {
    setShowSplashScreen(true);
    try {
      await handleConfirmPayment(orderId, 'Cash', { skipNotification: true });
    } finally {
      setShowSplashScreen(false);
    }
  };

  const handleManualDiscountChange = (order, val) => {
    const { percentageDiscount } = calculateOrderDiscount(order);
    const maxManual = Math.max(0, order.subtotal - percentageDiscount);
    if (val > maxManual) {
      setNotification({
        message: `Manual discount cannot exceed ₹${maxManual.toFixed(2)} (total minus percentage discount)`,
        type: 'warning'
      });
      return;
    }
    setManualDiscounts(prev => ({ ...prev, [order.orderId]: val }));
  };

  const handlePaymentMethodSelect = (method, order) => {
    setPaymentMethod(method);
    setCurrentOrderForQr(order); // Set the current order when a method is selected
    setManualPayment({ cash: 0, online: 0 }); // Reset manual payment on method change

    if (method === "Online") {
      if (defaultUpiAddress) {
        generateQRCode(order);
      } else {
        setNotification({ message: "No UPI address configured for QR payments", type: "error" });
        // Fallback to direct confirmation if no UPI address but Online is chosen
        handleConfirmPayment(order.orderId, 'Online');
      }
    } else if (method === "Custom") {
      setShowCustomPaymentDialog(true);
    } else { // Cash
      setCashConfirmDialog({ isOpen: true, orderId: order.orderId, isLoading: false });
    }
    // Close the payment options dialog after selection
    setPaymentOptionOrderId(null);
  };

  // Add global handlers for handshake and print status
  if (typeof window !== 'undefined') {
    window.onKOTReceived = function() {
      console.log('[KOT] App acknowledged receipt of KOT data');
      // Optionally show a notification: Printing started...
    };
    window.onKOTPrinted = function() {
      console.log('[KOT] App reports KOT printed');
      // Optionally show a notification: Printing successful!
    };
    window.onKOTPrintFailed = function() {
      console.log('[KOT] App reports KOT print failed');
      // Optionally show a notification: Printing failed!
    };
  }

  // Function to check printer connection
  function checkPrinterConnection() {
    if (window.AndroidBridge && typeof window.AndroidBridge.isPrinterConnected === 'function') {
      try {
        const result = window.AndroidBridge.isPrinterConnected();
        return result === true || result === "true";
      } catch {
        return false;
      }
    }
    // On web, assume always connected (or set to false for testing)
    return true;
  }

  // Check printer connection when payment dialogs open
  useEffect(() => {
    setIsPrinterConnected(checkPrinterConnection());
  }, [showQrCode, showCustomPaymentDialog, cashConfirmDialog]);

  return (
    <div className="relative z-0">
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
            <div className="bg-white rounded-lg shadow-sm p-10 text-center border border-gray-200 flex flex-col items-center justify-center">
              <div className="w-50 h-50 mx-auto flex items-center justify-center">
                <DotLottieReact
                  src="https://lottie.host/9a942832-f4ef-42c2-be65-d6955d96c3e1/wuEXuiDlyw.lottie"
                  loop
                  autoplay
                />
              </div>
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
                  {pendingOrders.map(order => {
                    const { percentageDiscount, manualDiscount, totalDiscount } = calculateOrderDiscount(order);
                    const maxManual = Math.max(0, order.subtotal - percentageDiscount);
                    const totalAmount = order.subtotal - totalDiscount;
                    return (
                      <div key={order.orderId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
                        {/* Header Section */}
                        <div className="bg-gradient-to-r from-orange-50 to-blue-50 p-4 border-b border-gray-200 flex justify-between items-start">
                          <div>
                            <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                              <span>Order #{order.orderNumber}</span>
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
                            {order.confirmedBy && (
                              <p className="text-xs text-gray-500 mt-0.5">Added by: {order.confirmedBy}</p>
                            )}
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
                            {activeDiscount && order.subtotal >= activeDiscount.minOrderAmount && (
                              <div className="flex justify-between text-green-600 mb-2">
                                <span className="font-medium flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  Discount ({activeDiscount.percentage}%):
                                </span>
                                <span className="font-medium">-₹{percentageDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            {/* Manual Discount Input */}
                            <div className="flex justify-between items-center text-gray-600 mb-2">
                              <span className="font-medium">Discount:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={getManualDiscount(order.orderId) || ''}
                                  onChange={e => {
                                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                                    handleManualDiscountChange(order, val);
                                  }}
                                  className="w-24 text-right border rounded-md px-2 py-1 text-sm focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="0.00"
                                  min="0"
                                  max={maxManual}
                                  step="any"
                                />
                                {getManualDiscount(order.orderId) > 0 && (
                                  <button
                                    onClick={() => handleRemoveManualDiscount(order.orderId)}
                                    className="p-1 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                                    aria-label="Remove manual discount"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between font-bold text-green-700 pt-2 border-t border-gray-200">
                              <span>Total Discount:</span>
                              <span className="text-green-600">-₹{totalDiscount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-green-700 pt-2">
                              <span>Amount:</span>
                              <span>₹{totalAmount.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Items List */}
                          <h3 className="font-medium text-gray-700 mb-3">Order Items</h3>
                          <ul className="space-y-2 mb-4">
                            {order.items.map((item, index) => (
                              <li key={index} className="bg-gray-50 rounded-lg p-3 flex flex-wrap md:flex-nowrap justify-between items-center gap-2">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-800 break-words line-clamp-2 w-full sm:w-auto">{item.name}</span>
                                    {item.type !== 'Fixed' && item.type !== 'FIXED' && (
                                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
                                        {item.type === 'H' ? 'Half' : item.type === 'F' ? 'Full' : item.type}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] xxs:text-xs sm:text-sm text-gray-600 mt-1 overflow-hidden text-ellipsis">
                                    <span className="whitespace-nowrap">₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[60px]">
                                  {item.kotNumber && (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap mb-1">
                                      KOT #{item.kotNumber}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <button
                                      onClick={() => handleQuantityChange(order.orderId, index, -1)}
                                      disabled={item.quantity === 1}
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
                                        item.quantity === 1
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : 'bg-white text-orange-600 hover:bg-orange-50 border border-orange-200'
                                      }`}
                                      aria-label={`Decrease quantity of ${item.name}`}
                                    >
                                      <span style={{fontSize:'1.5rem',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%'}}>-</span>
                                    </button>
                                    <div className="inline-flex justify-center items-center bg-white border border-gray-200 rounded-md px-2 min-w-[1.75rem] sm:min-w-[2rem] h-7 sm:h-8 text-center">
                                      {item.quantity}
                                    </div>
                                    <button
                                      onClick={() => handleQuantityChange(order.orderId, index, 1)}
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-200 bg-white text-orange-600 hover:bg-orange-50 border border-orange-200`}
                                      aria-label={`Increase quantity of ${item.name}`}
                                    >
                                      <span style={{fontSize:'1.5rem',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%'}}>+</span>
                                    </button>
                                    <button
                                      onClick={() => handleRemoveItemOrOrder(order, item, index)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 p-0"
                                      aria-label={`Remove ${item.name}`}
                                    >
                                      <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',fontSize:'1.5rem',lineHeight:1,textAlign:'center'}}>×</span>
                                    </button>
                                  </div>
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
                              setPaymentOptionOrderId(order.orderId); // Open payment options dialog
                              setCurrentOrderForQr(order); // Ensure current order is set for dialogs
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
                            <span>Confirm</span>
                          </button>
                          </div>

                          {/* Payment Options Dialog */}
                          {paymentOptionOrderId && (
                            <ConfirmationDialog
                              isOpen={!!paymentOptionOrderId}
                              onClose={() => setPaymentOptionOrderId(null)}
                              title="Select Payment Method"
                              message="How would the customer like to pay?"
                              customContent={
                                <div className="flex flex-wrap justify-center gap-3 w-full">
                                  <button
                                    onClick={() => handlePaymentMethodSelect("Cash", pendingOrders.find(o => o.orderId === paymentOptionOrderId))}
                                    className="flex-1 min-w-[calc(50%-0.75rem)] py-3 px-3 rounded-lg font-medium bg-orange-500 hover:bg-orange-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                    Cash
                                  </button>
                                  <button
                                    onClick={() => handlePaymentMethodSelect("Online", pendingOrders.find(o => o.orderId === paymentOptionOrderId))}
                                    className="flex-1 min-w-[calc(50%-0.75rem)] py-3 px-3 rounded-lg font-medium bg-yellow-500 hover:bg-yellow-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Online
                                  </button>
                                  <button
                                    onClick={() => handlePaymentMethodSelect("Custom", pendingOrders.find(o => o.orderId === paymentOptionOrderId))}
                                    className="w-full py-3 px-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2 mt-2"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Custom
                                  </button>
                                </div>
                              }
                              confirmText={null}
                              cancelText="Cancel"
                              type="info"
                              isLoading={false}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
          isLoading={isDeleting}
        />
      )}

      {showQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <ConfirmationDialog
              isOpen={showQrCode}
              onClose={() => setShowQrCode(false)}
              title="Scan QR Code to Pay"
              message={`Total Amount: ₹${currentOrderForQr ? (currentOrderForQr.subtotal - calculateOrderDiscount(currentOrderForQr).totalDiscount).toFixed(2) : '0.00'}`}
              customContent={
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="bg-white p-4 rounded-lg border-2 border-orange-200 shadow-md mb-2 flex items-center justify-center">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="Payment QR Code"
                        className="w-64 h-64 object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/qr-code.png";
                          setNotification({
                            message: "QR code generation failed. Please try again.",
                            type: "error"
                          });
                        }}
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                        <div className="animate-spin h-12 w-12 border-4 border-orange-500 rounded-full border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 w-full text-center">
                    <p className="font-medium text-gray-700">Paying to:</p>
                    <p className="font-medium text-blue-600 text-lg">{defaultUpiAddress?.upiId}</p>
                    <p className="text-sm text-gray-600 mt-1">{defaultUpiAddress?.name}</p>
                  </div>
                  {activeDiscount && currentOrderForQr && currentOrderForQr.subtotal >= activeDiscount.minOrderAmount && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 w-full text-center">
                      <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>{activeDiscount.percentage}% discount applied</span>
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleQrConfirmPayment}
                    className="w-full py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2 mt-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Confirm Payment
                  </button>
                </div>
              }
              confirmText={null}
              cancelText="Cancel"
              type="info"
            />
          </div>
        </div>
      )}

      {cashConfirmDialog.isOpen && (
        <ConfirmationDialog
          isOpen={cashConfirmDialog.isOpen}
          onClose={() => setCashConfirmDialog({ isOpen: false, orderId: null, isLoading: false })}
          title="Confirm Cash Payment"
          message="Are you sure you received the cash payment for this order?"
          confirmText="Yes, Payment Received"
          cancelText="Cancel"
          type="warning"
          isLoading={false}
          onConfirm={async () => {
            setCashConfirmDialog({ isOpen: false, orderId: null, isLoading: false });
            await handleCashConfirmPayment(cashConfirmDialog.orderId);
          }}
        />
      )}

      {showSplashScreen && (
        <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm z-[100] flex items-center justify-center flex-col">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-gray-700 text-xl font-medium">Confirming Order Payment...</p>
        </div>
      )}

      {/* Custom Payment Dialog for Pending Orders */}
      {showCustomPaymentDialog && currentOrderForQr && ( // currentOrderForQr is a bit of a misnomer here, it's actually the current order being processed
        <ConfirmationDialog
          isOpen={showCustomPaymentDialog}
          onClose={() => setShowCustomPaymentDialog(false)}
          onConfirm={() => {
            const totalPaid = manualPayment.cash + manualPayment.online;
            const orderTotal = currentOrderForQr.subtotal - calculateOrderDiscount(currentOrderForQr).totalDiscount;
            if (Math.abs(totalPaid - orderTotal) > 0.01) { // Allow for minor floating point inaccuracies
              setNotification({
                message: `Total custom payment (₹${totalPaid.toFixed(2)}) does not match order total (₹${orderTotal.toFixed(2)})`,
                type: 'error'
              });
              return;
            }
            setShowCustomPaymentDialog(false);
            handleConfirmPayment(currentOrderForQr.orderId, "Custom", { customCashAmount: manualPayment.cash, customOnlineAmount: manualPayment.online });
          }}
          title="Enter Custom Payment Amounts"
          message={`Order Total: ₹${(currentOrderForQr.subtotal - calculateOrderDiscount(currentOrderForQr).totalDiscount).toFixed(2)}`}
          customContent={
            <div className="space-y-4 w-full">
              <div>
                <label htmlFor="cash-amount" className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                <input
                  type="number"
                  id="cash-amount"
                  value={manualPayment.cash === 0 && manualPayment.online === 0 ? '' : manualPayment.cash}
                  onChange={(e) => {
                    const cashValue = Math.max(0, parseFloat(e.target.value) || 0);
                    const orderTotal = currentOrderForQr.subtotal - calculateOrderDiscount(currentOrderForQr).totalDiscount;
                    const newCash = Math.min(cashValue, orderTotal);
                    const newOnline = Math.max(0, orderTotal - newCash);
                    setManualPayment({ cash: newCash, online: newOnline });
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      setManualPayment(prev => ({ ...prev, cash: 0 }));
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  step="any"
                  min="0"
                  max={currentOrderForQr ? (currentOrderForQr.subtotal - calculateOrderDiscount(currentOrderForQr).totalDiscount) : 0} // Set max to order total
                />
              </div>
              <div>
                <label htmlFor="online-amount" className="block text-sm font-medium text-gray-700 mb-1">Online Amount</label>
                <input
                  type="number"
                  id="online-amount"
                  value={manualPayment.online === 0 && manualPayment.cash === 0 ? '' : manualPayment.online}
                  onChange={(e) => {
                    const onlineValue = Math.max(0, parseFloat(e.target.value) || 0);
                    const orderTotal = currentOrderForQr.subtotal - calculateOrderDiscount(currentOrderForQr).totalDiscount;
                    const newOnline = Math.min(onlineValue, orderTotal);
                    const newCash = Math.max(0, orderTotal - newOnline);
                    setManualPayment({ cash: newCash, online: newOnline });
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      setManualPayment(prev => ({ ...prev, online: 0 }));
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  step="any"
                  min="0"
                  max={currentOrderForQr ? (currentOrderForQr.subtotal - calculateOrderDiscount(currentOrderForQr).totalDiscount) : 0} // Set max to order total
                />
              </div>
            </div>
          }
          confirmText="Confirm Custom Payment"
          cancelText="Cancel"
          type="info"
          isLoading={false} // Adjust based on your loading state
        />
      )}
    </div>
  );
}