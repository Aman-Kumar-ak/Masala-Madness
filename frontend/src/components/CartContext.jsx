// frontend/src/components/CartContext.jsx
import { createContext, useState, useContext, useEffect } from "react";
import React from "react";
import ConfirmationDialog from "./ConfirmationDialog";

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
  const [itemToRemove, setItemToRemove] = useState(null);

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
    // Normalize type to uppercase for consistency
    const dishWithNormalizedType = { ...dish, type: dish.type?.toUpperCase() };
    setCartItems((prev) => {
      const existing = prev.find((item) => item.name === dishWithNormalizedType.name && item.type === dishWithNormalizedType.type);
      if (existing) {
        return prev.map((item) =>
          item.name === dishWithNormalizedType.name && item.type === dishWithNormalizedType.type
            ? { ...item, quantity: item.quantity + dishWithNormalizedType.quantity }
            : item
        );
      } else {
        return [...prev, dishWithNormalizedType];
      }
    });
  };

  const updateQuantity = (dish, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.name === dish.name && item.type === dish.type
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (dish) => {
    setItemToRemove(dish);
  };

  const handleConfirmRemove = () => {
    setCartItems((prev) => prev.filter((item) => !(item.name === itemToRemove.name && item.type === itemToRemove.type)));
    setItemToRemove(null);
  };

  const clearCart = () => {
    setCartItems([]);
    sessionStorage.removeItem("cartItems");
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, updateQuantity }}>
      {children}
      <ConfirmationDialog
        isOpen={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Item"
        message={`Are you sure you want to remove ${itemToRemove?.name} from the cart?`}
        confirmText="Remove"
        type="danger"
      />
    </CartContext.Provider>
  );
}

export { CartProvider, useCart };
