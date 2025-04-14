import React, { useEffect } from "react";
import { Link } from 'react-router-dom';
import Menu from "../components/Menu";
import { useCart } from "../components/CartContext";

export default function Home() {
  const { cartItems, clearCart } = useCart();

  // Prompt to ask user if they want to keep or discard the cart
  useEffect(() => {
    if (cartItems.length > 0) {
      window.onbeforeunload = () => {
        return "You have items in your cart. Do you want to discard them?";
      };
    }
    return () => {
      window.onbeforeunload = null;
    };
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-orange-100">
      <div className="bg-white shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl text-center font-bold py-4">Masala Madness</h1>

          {/* Cart Controls */}
          <div className="text-center py-4 space-y-2">
            <div className="flex justify-center gap-4">
            <Link
                to="/admin"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Admin Panel
              </Link> <br />
              <Link
                to="/cart"
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              >
                Go to Cart ({cartItems.length} items)
              </Link>
            </div>
            {cartItems.length > 0 && (
              <div>
                <button
                  onClick={clearCart}
                  className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Menu />
    </div>
  );
}
