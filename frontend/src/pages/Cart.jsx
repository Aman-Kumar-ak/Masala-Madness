import React, { useState } from "react";

export default function Cart() {
  const [cartItems, setCartItems] = useState([
    // Example cart items
    { name: "Momos", priceHalf: 150, priceFull: 300, quantity: 2 },
    { name: "Maggi", priceHalf: 100, priceFull: 200, quantity: 1 },
  ]);

  const totalAmount = cartItems.reduce(
    (total, item) => total + (item.priceFull * item.quantity),
    0
  );

  return (
    <div className="min-h-screen bg-orange-100">
      <div className="bg-white shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl text-center font-bold py-4">Your Cart</h1>
          {cartItems.length === 0 ? (
            <div className="text-center text-lg py-4">Your cart is empty!</div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-white shadow-md rounded">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p>Price: ₹{item.priceFull}</p>
                    <p>Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p>Total: ₹{item.priceFull * item.quantity}</p>
                  </div>
                </div>
              ))}
              <div className="text-right py-4">
                <h2 className="font-bold">Total: ₹{totalAmount}</h2>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
