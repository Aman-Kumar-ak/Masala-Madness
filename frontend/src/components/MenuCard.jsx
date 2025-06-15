import React, { useState } from "react";
import { useCart } from "../components/CartContext";
import Notification from "./Notification";

const MenuCard = ({ name, priceHalf, priceFull, price, category }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const { addToCart, removeFromCart, cartItems } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [notification, setNotification] = useState(null);

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(selectedType === type ? "" : type);
  };

  const handleAddToCart = () => {
    if (price) {
      addToCart({ name, quantity, type: "Fixed", price });
    } else if (selectedType) {
      const selectedPrice = selectedType === "H" ? priceHalf : priceFull;
      addToCart({ name, quantity, type: selectedType.toUpperCase(), price: selectedPrice });
    } else {
      setNotification({
        message: "Please select Half or Full size.",
        type: "warning"
      });
      return;
    }
    
    // Show animation
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 500);
    
    // Reset quantity and selection
    setQuantity(1);
    setSelectedType("");
  };

  const hasHalfFull = !price && (priceHalf || priceFull);

  // Check if this item is in the cart
  let isInCart = false;
  let removeType = "";
  if (price) {
    isInCart = cartItems.some(item => item.name === name && item.type === "Fixed");
    removeType = "Fixed";
  } else {
    // If any type of this item is in the cart, show X
    const found = cartItems.find(item => item.name === name && (item.type === "H" || item.type === "F"));
    if (found) {
      isInCart = true;
      removeType = found.type;
    }
  }

  return (
    <div className={`relative rounded-xl shadow-md transition-all duration-300 border border-orange-200 p-2 ${isInCart ? 'bg-gradient-to-br from-orange-50 to-white' : 'bg-white'}`}>
      {/* X Button */}
      {isInCart && (
        <button
          className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 focus:outline-none"
          onClick={() => removeFromCart({ name, type: removeType })}
          aria-label="Remove from cart"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeLinecap="round"/>
            <line x1="6" y1="18" x2="18" y2="6" stroke="white" strokeLinecap="round"/>
          </svg>
        </button>
      )}
      {/* First Row: Name (and Price if fixed) */}
      {price ? (
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <h3
              className="text-lg sm:text-xl font-bold text-gray-800 leading-tight whitespace-normal break-words"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {name}
            </h3>
          </div>
          <span className="text-base font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg whitespace-nowrap ml-2" style={{ alignSelf: 'flex-start', marginRight: '2px' }}>₹{price}</span>
        </div>
      ) : (
        <div className="mb-2">
          <h3
            className="text-lg sm:text-xl font-bold text-gray-800 leading-tight line-clamp-2 whitespace-normal break-words"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {name}
          </h3>
        </div>
      )}
      {/* Second Row: Toggle/Price for variable price */}
      {!price && (
        <div className="mb-3 w-full px-2 flex justify-center mt-4">
          <div className="flex items-center bg-orange-50 rounded-lg overflow-hidden border border-orange-200 w-full max-w-full">
            {priceHalf && (
              <button
                onClick={() => handleTypeSelect('H')}
                className={`flex-1 px-3 py-2 text-sm font-semibold focus:outline-none transition-all duration-200 ${
                  selectedType === 'H'
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-orange-600 hover:bg-orange-100'
                }`}
                style={{ borderRight: priceFull ? '1px solid #fdba74' : 'none' }}
              >
                Half <span className="ml-1 font-bold">₹{priceHalf}</span>
              </button>
            )}
            {priceFull && (
              <button
                onClick={() => handleTypeSelect('F')}
                className={`flex-1 px-3 py-2 text-sm font-semibold focus:outline-none transition-all duration-200 ${
                  selectedType === 'F'
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-orange-600 hover:bg-orange-100'
                }`}
              >
                Full <span className="ml-1 font-bold">₹{priceFull}</span>
              </button>
            )}
          </div>
        </div>
      )}
      {/* Third Row: Quantity + Add to Cart */}
      <div className="flex items-center justify-between gap-3 px-2">
        {/* Quantity Bar */}
        <div className="flex items-center bg-gray-50 rounded-full py-1 shadow-sm flex-1 min-w-0 justify-between">
          <button
            onClick={decreaseQuantity}
            disabled={quantity <= 1}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-lg transition-colors duration-200 ml-1 ${
              quantity <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-orange-50 text-orange-500 font-bold shadow'
            }`}
          >
            -
          </button>
          <span className="text-center font-medium text-gray-700 select-none" style={{ minWidth: '1.5rem' }}>{quantity}</span>
          <button
            onClick={increaseQuantity}
            className="w-7 h-7 rounded-full bg-white hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200 font-bold text-lg shadow mr-1"
          >
            +
          </button>
        </div>
        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className={`flex-1 py-2 rounded-full font-medium text-white transition-all duration-300 flex items-center justify-center gap-2 shadow ${
            isAdding
              ? 'bg-green-500 scale-95'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg'
          }`}
          style={{ maxWidth: '100%' }}
        >
          {isAdding ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Added!</span>
            </>
          ) : (
            <>
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default MenuCard;
  