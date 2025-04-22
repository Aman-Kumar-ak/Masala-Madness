// frontend/src/components/CartContext.jsx
import { createContext, useState, useContext, useEffect } from "react";
import React from "react";

const CartContext = createContext();

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

function CartProvider({ children }) {
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

  const updateQuantity = (dish, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.name === dish.name
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (dish) => {
    if (window.confirm(`Are you sure you want to remove ${dish.name} from the cart?`)) {
      setCartItems((prev) => prev.filter((item) => item.name !== dish.name));
    }
  };

  const clearCart = () => {
    setCartItems([]);
    sessionStorage.removeItem("cartItems");
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export { CartProvider, useCart };
