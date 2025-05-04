import React, { useEffect, useState } from "react";
import { useCart } from "../components/CartContext";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import Notification from "../components/Notification";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { useNotification } from "../components/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Cart() {
  const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [activeDiscount, setActiveDiscount] = useState(null);
  const navigate = useNavigate();
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPendingConfirm, setShowPendingConfirm] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const groupedItems = cartItems.reduce((acc, item) => {
    const existing = acc.find(i => i.name === item.name);
    if (existing) {
      existing.types.push({ type: item.type, quantity: item.quantity, price: item.price });
    } else {
      acc.push({ name: item.name, types: [{ type: item.type, quantity: item.quantity, price: item.price }] });
    }
    return acc;
  }, []);

  // Calculate discount if applicable
  const calculateDiscount = () => {
    if (!activeDiscount || subtotal < activeDiscount.minOrderAmount) {
      return 0;
    }
    return Math.round((subtotal * activeDiscount.percentage) / 100);
  };

  const discountAmount = calculateDiscount();
  const totalAmount = subtotal - discountAmount;

  // Fetch active discount on component mount
  useEffect(() => {
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

    fetchActiveDiscount();
  }, []);

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setShowPaymentConfirm(true);
    setShowPaymentOptions(false);
  };

  const handleShowPaymentOptions = () => {
    if (cartItems.length === 0) {
      showWarning("Your cart is empty. Add items before proceeding.");
      return;
    }
    
    if (isProcessing) return;
    
    setShowPaymentOptions(true);
  };

  const handleAddToPending = async () => {
    if (cartItems.length === 0) {
      showWarning("Your cart is empty. Add items before proceeding.");
      return;
    }
    
    if (isProcessing) return;
    
    // Show confirmation dialog instead of processing immediately
    setShowPendingConfirm(true);
  };

  const confirmAddToPending = async () => {
    setShowPendingConfirm(false);
    await processPayment(false);
  };

  const processPayment = async (isPaid) => {
    // Prevent multiple simultaneous submissions
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Immediately close all dialogs
    setShowPaymentConfirm(false);
    setShowPaymentOptions(false);
    
    // Remove the processing payment notification
    if (!isPaid) {
      showInfo("Adding to pending orders...");
    }

    const payload = {
      items: cartItems.map((item) => ({
        dishId: item.id || "custom",
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        type: item.type,
        totalPrice: item.quantity * item.price
      })),
      subtotal,
      totalAmount,
      discountAmount,
      discountPercentage: activeDiscount?.percentage || 0,
      paymentMethod: isPaid ? paymentMethod : "",
      isPaid,
    };

    try {
      if (isPaid) {
        // Confirm payment logic
        const res = await fetch(`${API_URL}/api/orders/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          // Handle successful payment
          showSuccess(`Payment successful! Order confirmed for ₹${totalAmount}`);
          clearCart();
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          throw new Error(data.message || "Failed to process order");
        }
      } else {
        // Add to pending logic
        const res = await fetch(`${API_URL}/api/pending-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          // Handle adding to pending
          showInfo(`Order added to pending. Amount: ₹${totalAmount}`);
          clearCart();
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          throw new Error(data.message || "Failed to add order to pending");
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      showError("Failed to process order: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmClearCart = () => {
    clearCart();
    setShowClearCartConfirm(false);
    showInfo("Cart cleared successfully");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <BackButton />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-yellow-300 text-white shadow-md">
        <div className="container mx-auto px-4 py-6 pt-16">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <span className="text-4xl mr-2">🛒</span> Your Cart
          </h1>
          {cartItems.length > 0 && (
            <div className="text-white/90 text-base">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6 text-lg">Add some delicious items from the menu!</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-lg rounded-lg shadow-md transition-colors duration-200"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-xl text-gray-800">Order Items</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {groupedItems.map((group, index) => (
                  <div key={`${group.name}-${index}`} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-lg text-gray-800 flex items-center">
                        <span className="w-6 h-6 inline-flex items-center justify-center bg-orange-100 text-orange-600 rounded-full text-sm mr-2">
                          {index + 1}
                        </span>
                        {group.name}
                      </h3>
                      <span className="text-right font-semibold text-lg text-gray-800">
                        ₹{group.types.reduce((sum, type) => sum + type.quantity * type.price, 0)}
                      </span>
                    </div>
                    
                    <div className="space-y-3 pl-8">
                      {group.types.map((type, idx) => (
                        <div key={`${type.type}-${idx}`} className="bg-amber-50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-base font-medium text-gray-700">
                              {type.type === 'H' ? 'Half' : type.type === 'F' ? 'Full' : type.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-base text-gray-500">₹{type.price} × {type.quantity}</span>
                              <button
                                onClick={() => removeFromCart({ name: group.name, type: type.type })}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"
                                aria-label="Remove item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between bg-white rounded-lg p-1 shadow-sm">
                            <button 
                              onClick={() => updateQuantity({ name: group.name, type: type.type }, type.quantity - 1)}
                              className="w-9 h-9 rounded-full bg-amber-50 hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200"
                              disabled={type.quantity <= 1}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                              </svg>
                            </button>
                            <span className="font-medium text-gray-700 w-12 text-center text-lg">{type.quantity}</span>
                            <button 
                              onClick={() => updateQuantity({ name: group.name, type: type.type }, type.quantity + 1)}
                              className="w-9 h-9 rounded-full bg-amber-50 hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="font-bold text-xl mb-4 text-gray-800">Order Summary</h3>
              <div className="space-y-3 text-lg">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotal}</span>
                </div>
              
                {activeDiscount && subtotal >= activeDiscount.minOrderAmount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({activeDiscount.percentage}%):</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-xl pt-3 border-t border-gray-100 text-gray-800">
                  <span>Amount:</span>
                  <span>₹{totalAmount}</span>
                </div>

                {activeDiscount && subtotal < activeDiscount.minOrderAmount && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-base text-orange-700">
                    <p className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Add items worth ₹{activeDiscount.minOrderAmount - subtotal} more to get {activeDiscount.percentage}% discount!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleShowPaymentOptions}
                  disabled={isProcessing}
                  className={`py-4 rounded-xl font-medium transition-all duration-200 text-white shadow-md flex items-center justify-center gap-2 text-lg ${
                    isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Confirm Payment</span>
                </button>
                <button
                  onClick={handleAddToPending}
                  disabled={isProcessing}
                  className={`py-4 rounded-xl font-medium transition-all duration-200 text-white shadow-md flex items-center justify-center gap-2 text-lg ${
                    isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Add to Pending</span>
                </button>
              </div>

              <button
                onClick={() => setShowClearCartConfirm(true)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3.5 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 text-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear Cart</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Options Dialog */}
      <ConfirmationDialog
        isOpen={showPaymentOptions}
        onClose={() => setShowPaymentOptions(false)}
        title="Select Payment Method"
        message="How would the customer like to pay?"
        customContent={
          <div className="flex flex-row gap-4 w-full">
            <button
              onClick={() => handlePaymentMethodSelect("Cash")}
              className="flex-1 py-3 px-3 rounded-lg font-medium bg-orange-500 hover:bg-orange-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Cash
            </button>
            <button
              onClick={() => handlePaymentMethodSelect("Online")}
              className="flex-1 py-3 px-3 rounded-lg font-medium bg-yellow-500 hover:bg-yellow-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Online
            </button>
          </div>
        }
        confirmText={null}
        cancelText="Cancel"
        type="info"
      />

      {/* Payment Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPaymentConfirm}
        onClose={() => setShowPaymentConfirm(false)}
        onConfirm={() => {
          setShowPaymentConfirm(false);
          setShowPaymentOptions(false);
          processPayment(true);
        }}
        title="Confirm Payment"
        message={`Confirm ${paymentMethod} payment of ₹${totalAmount}?`}
        confirmText="Yes, Payment Received"
        cancelText="Cancel"
        type="warning"
      />

      {/* Add to Pending Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPendingConfirm}
        onClose={() => setShowPendingConfirm(false)}
        onConfirm={confirmAddToPending}
        title="Add to Pending Orders"
        message={`Add this order (₹${totalAmount}) to pending orders?`}
        confirmText="Yes, Add to Pending"
        cancelText="Cancel"
        type="warning"
      />

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearCartConfirm}
        onClose={() => setShowClearCartConfirm(false)}
        onConfirm={handleConfirmClearCart}
        title="Clear Cart"
        message={`Are you sure you want to remove all ${cartItems.length} items from your cart?`}
        confirmText="Yes, Clear Cart"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
