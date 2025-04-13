import React from "react";
import { useCart } from "../components/CartContext";

const Cart = () => {
  const { cartItems, removeFromCart, clearCart } = useCart();

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  return (
    <div className="min-h-screen bg-orange-100">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl text-center font-bold">Your Cart</h1>
        {cartItems.length === 0 ? (
          <p className="text-center text-lg">Your cart is empty.</p>
        ) : (
          <div>
            {cartItems.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <div className="text-gray-600">
                    {item.selectedType === "H" ? "Half" : "Full"}: ₹{item.price}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700">Quantity: {item.quantity}</span> <br />
                  <span className="text-gray-700">Total: ₹{item.quantity * item.price}</span> <br />
                  <button
                    onClick={() => removeFromCart(item)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Total: ₹{calculateTotal()}</h2>
              <button
                onClick={clearCart}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
