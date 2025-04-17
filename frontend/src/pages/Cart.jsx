import React, { useEffect, useState } from "react";
import { useCart } from "../components/CartContext";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("");
  const navigate = useNavigate();

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

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
      const res = await fetch("http://localhost:5000/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Order ${isPaid ? "confirmed" : "failed"}. Redirecting to Home.`);
        clearCart();
        navigate("/");
      } else {
        alert("Something went wrong. Try again.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to confirm order.");
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h2 className="text-2xl font-bold mb-4">Your Cart</h2>
      {cartItems.length === 0 ? (
        <p className="text-gray-600">Cart is empty.</p>
      ) : (
        <div className="space-y-4">
          {cartItems.map((item, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded shadow flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-md">#{index + 1} {item.name} - {item.quantity} ({item.type})</p>
                <p>Original Price: ₹{item.price}</p>
                <p>Qty: {item.quantity}</p>
                <p>Total: ₹{item.quantity * item.price}</p>
              </div>
              <button
                onClick={() => removeFromCart(item)}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="text-right font-bold text-xl mt-2">
            Total: ₹{totalAmount}
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2">Select Payment Method:</h3>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setPaymentMethod("Cash")}
                className={`px-4 py-2 rounded ${
                  paymentMethod === "Cash"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod("Online")}
                className={`px-4 py-2 rounded ${
                  paymentMethod === "Online"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200"
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
  );
}
