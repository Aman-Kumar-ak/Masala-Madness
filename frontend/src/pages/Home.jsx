import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import Menu from "../components/Menu";
import { useCart } from "../components/CartContext";

export default function Home() {
  const { cartItems, clearCart } = useCart();
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Get current date in Indian format
  const getCurrentDate = () => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    };
    return new Date().toLocaleString('en-IN', options);
  };

  // Fetch today's revenue from backend (calculated in IST)
  useEffect(() => {
    const fetchTodayRevenue = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/orders/today-revenue');
        const data = await response.json();
        setTotalRevenue(data.totalRevenue || 0);
      } catch (error) {
        console.error('Error fetching today\'s revenue:', error);
      }
    };

    fetchTodayRevenue();
  }, []);

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

          {/* Date and Revenue Display */}
          <div className="text-center py-2 bg-orange-50">
            <p className="text-lg font-semibold text-gray-700">
              {getCurrentDate()}
            </p>
            <p className="text-lg font-semibold text-green-600">
              Today's Revenue: ₹{totalRevenue.toFixed(2)}
            </p>
          </div>

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

      {/* Menu Component */}
      <Menu />
    </div>
  );
}
