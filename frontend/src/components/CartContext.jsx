// frontend/src/components/CartContext.jsx
import { createContext, useState, useContext, useEffect } from "react";
import React from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart data from sessionStorage when the component mounts
  useEffect(() => {
    try {
      const savedCart = JSON.parse(sessionStorage.getItem("cartItems"));
      if (savedCart && savedCart.length > 0) {
        setCartItems(savedCart);
      }
      setIsInitialized(true);
    } catch (error) {
      console.error("Error loading cart from sessionStorage:", error);
      setIsInitialized(true);
    }
  }, []);

  // Save cart data to sessionStorage whenever cartItems change
  useEffect(() => {
    // Only save to sessionStorage if the initial load has happened
    if (isInitialized) {
      sessionStorage.setItem("cartItems", JSON.stringify(cartItems));
    }
  }, [cartItems, isInitialized]);

  const addToCart = (dish) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.name === dish.name);
      if (existing) {
        return prev.map((item) =>
          item.name === dish.name
            ? { ...item, quantity: item.quantity + dish.quantity }
            : item
        );
      } else {
        return [...prev, dish];
      }
    });
  };

  const removeFromCart = (dish) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.name === dish.name
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
    sessionStorage.removeItem("cartItems"); // Clear cart data from sessionStorage
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
