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
    setPaymentMethod(paymentMethod === method ? "" : method);
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      setNotification({
        message: "Please select a payment method before confirming.",
        type: "warning"
      });
      return;
    }

    setShowPaymentConfirm(true);
  };

  const processPayment = async (isPaid) => {
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
      paymentMethod,
      isPaid,
    };

    try {
      // Dispatch pre-update event
      window.dispatchEvent(new CustomEvent('orderUpdating'));
      
      const res = await fetch(`${API_URL}/api/orders/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        // Show notification with different types for paid vs pending
        setNotification({
          message: isPaid 
            ? `Payment successful! Order confirmed for ₹${totalAmount}`
            : `Order added to pending. Amount: ₹${totalAmount}`,
          type: isPaid ? "success" : "error" // Use error type for pending orders to show red color
        });

        // Clear cart and dispatch events
        clearCart();
        window.dispatchEvent(new CustomEvent('orderUpdated', { 
          detail: { 
            success: true,
            orderId: data.orderId,
            amount: totalAmount,
            isPaid: isPaid
          } 
        }));

        // Redirect after a short delay to show notification
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to process order");
      }
    } catch (error) {
      console.error("Payment error:", error);
      window.dispatchEvent(new CustomEvent('orderUpdated', { 
        detail: { 
          success: false,
          error: error.message
        } 
      }));
      setNotification({
        message: "Failed to confirm order: " + error.message,
        type: "error"
      });
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
              <h3 className="text-lg font-bold mb-2">Select Payment Method:</h3>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => handlePaymentMethodSelect("Cash")}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all duration-200 ${
                    paymentMethod === "Cash"
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => handlePaymentMethodSelect("Online")}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all duration-200 ${
                    paymentMethod === "Online"
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
                  }`}
                >
                  QR
                </button>
              </div>

              <button
                onClick={handlePayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg"
              >
                Confirm Payment
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

      {/* Payment Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPaymentConfirm}
        onClose={() => setShowPaymentConfirm(false)}
        onConfirm={() => {
          setShowPaymentConfirm(false);
          processPayment(true);
        }}
        onCancel={() => {
          setShowPaymentConfirm(false);
          processPayment(false); // Process as unpaid/pending order
        }}
        title="Confirm Payment"
        message="Is the payment successful?"
        confirmText="Yes, Payment Successful"
        cancelText="No, Add to Pending"
        type="warning"
      />
    </div>
  );
}
