import React, { useEffect, useState } from "react";
import { useCart } from "../components/CartContext";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";

export default function Cart() {
  const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("");
  const navigate = useNavigate();

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(paymentMethod === method ? "" : method);
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method before confirming.");
      return;
    }

    const confirmed = window.confirm("Is the payment successful?");
    const isPaid = confirmed;

    const payload = {
      items: cartItems.map((item) => ({
        dishId: item.id || "custom",
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        type: item.type,
      })),
      totalAmount,
      paymentMethod,
      isPaid,
    };

    try {
      // Dispatch pre-update event
      window.dispatchEvent(new CustomEvent('orderUpdating'));
      
      const res = await fetch("http://localhost:5000/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        // Clear cart first
        clearCart();
        
        // Dispatch success event
        window.dispatchEvent(new CustomEvent('orderUpdated', { 
          detail: { 
            success: isPaid,
            orderId: data.orderId,
            amount: totalAmount
          } 
        }));

        // Navigate after event dispatch
        navigate("/");
        alert(`Order ${isPaid ? "confirmed" : "added to pending"}`);
      } else {
        throw new Error(data.message || "Failed to process order");
      }
    } catch (error) {
      console.error("Payment error:", error);
      // Dispatch failure event
      window.dispatchEvent(new CustomEvent('orderUpdated', { 
        detail: { 
          success: false,
          error: error.message
        } 
      }));
      alert("Failed to confirm order: " + error.message);
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
            {cartItems.map((item, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded shadow space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-md">#{index + 1} {item.name} ({item.type})</p>
                    <p className="text-gray-600">Price: ₹{item.price}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item)}
                    className="text-red-500 hover:text-red-700 font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                  <button 
                    onClick={() => updateQuantity(item, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200 font-bold text-lg"
                  >
                    -
                  </button>
                  <span className="font-medium text-gray-700">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200 font-bold text-lg"
                  >
                    +
                  </button>
                </div>

                <p className="text-right font-semibold">Total: ₹{item.quantity * item.price}</p>
              </div>
            ))}

            <div className="text-right font-bold text-xl mt-2">
              Total: ₹{totalAmount}
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
    </div>
  );
}
