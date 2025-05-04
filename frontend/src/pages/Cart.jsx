import React, { useEffect, useState } from "react";
import { useCart } from "../components/CartContext";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import Notification from "../components/Notification";
import ConfirmationDialog from "../components/ConfirmationDialog";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Cart() {
  const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [activeDiscount, setActiveDiscount] = useState(null);
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPendingConfirm, setShowPendingConfirm] = useState(false);

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
      setNotification({
        message: "Your cart is empty. Add items before proceeding.",
        type: "warning"
      });
      return;
    }
    
    if (isProcessing) return;
    
    setShowPaymentOptions(true);
  };

  const handleAddToPending = async () => {
    if (cartItems.length === 0) {
      setNotification({
        message: "Your cart is empty. Add items before proceeding.",
        type: "warning"
      });
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
    
    // Immediately close all dialogs and show notification
    setShowPaymentConfirm(false);
    setShowPaymentOptions(false);
    
    if (isPaid) {
      setNotification({
        message: "Processing payment...",
        type: "info"
      });
    } else {
      setNotification({
        message: "Adding to pending orders...",
        type: "info"
      });
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
          setNotification({
            message: `Payment successful! Order confirmed for ₹${totalAmount}`,
            type: "success"
          });
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
          setNotification({
            message: `Order added to pending. Amount: ₹${totalAmount}`,
            type: "info"
          });
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
      setNotification({
        message: "Failed to process order: " + error.message,
        type: "error"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <BackButton />
      <div className="p-4 pt-16">
        <h2 className="text-2xl font-bold mb-4">Your Cart</h2>
        {cartItems.length === 0 ? (
          <p className="text-gray-600">Cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {groupedItems.map((group, index) => (
              <div key={`${group.name}-${index}`} className="bg-white p-4 rounded shadow space-y-3">
                <div className="justify-between items-start">
                  <div>
                    <p className="font-bold text-md">#{index + 1} {group.name}</p>
                    {group.types.map((type, idx) => (
                      <div key={`${type.type}-${idx}`} className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center w-full">
                          <p className="text-gray-600 font-medium">{type.type === 'H' ? 'Half' : 'Full'}: ₹{type.price} x {type.quantity}</p>
                          <button
                            onClick={() => removeFromCart({ name: group.name, type: type.type })}
                            className="text-red-500 hover:text-red-700 font-bold p-1"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2 w-full">
                          <div className="flex-1 flex items-center justify-between">
                            <button 
                              onClick={() => updateQuantity({ name: group.name, type: type.type }, type.quantity - 1)}
                              className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200 font-bold text-lg"
                            >
                              -
                            </button>
                            <span className="font-medium text-gray-700">{type.quantity}</span>
                            <button 
                              onClick={() => updateQuantity({ name: group.name, type: type.type }, type.quantity + 1)}
                              className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200 font-bold text-lg"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {idx < group.types.length - 1 && <hr className="my-2" />}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-right font-semibold">Total: ₹{group.types.reduce((sum, type) => sum + type.quantity * type.price, 0)}</p>
              </div>
            ))}

            {/* Order Summary */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="font-bold text-lg mb-2">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  
                </div>
                <div className="flex justify-between">
                
                 
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Subtotal:</span>
                  <span>₹{subtotal}</span>
                </div>
              
                
                {activeDiscount && subtotal >= activeDiscount.minOrderAmount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({activeDiscount.percentage}%):</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{totalAmount}</span>
                </div>

                {activeDiscount && subtotal < activeDiscount.minOrderAmount && (
                  <p className="text-sm text-orange-600 mt-2">
                    Add items worth ₹{activeDiscount.minOrderAmount - subtotal} more to get {activeDiscount.percentage}% discount!
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={handleShowPaymentOptions}
                  disabled={isProcessing}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 text-white shadow-md ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  Confirm Payment
                </button>
                <button
                  onClick={handleAddToPending}
                  disabled={isProcessing}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 text-white shadow-md ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
                >
                  Add to Pending
                </button>
              </div>

              <button
                onClick={() => {
                  clearCart();
                  setNotification({ message: "Cart cleared successfully", type: "info" });
                }}
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

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
              className="flex-1 py-3 px-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-colors text-base"
            >
              Cash
            </button>
            <button
              onClick={() => handlePaymentMethodSelect("Online")}
              className="flex-1 py-3 px-3 rounded-lg font-medium bg-purple-500 hover:bg-purple-600 text-white shadow-md transition-colors text-base"
            >
              QR / Online
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
    </div>
  );
}
