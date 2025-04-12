// frontend/src/components/CartContext.jsx
import { createContext, useState, useContext } from "react";
import React from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (dish) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.name === dish.name);
      if (existing) {
        return prev.map((item) =>
          item.name === dish.name
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...dish, quantity: 1 }];
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

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
