import React, { useState } from "react";
import { useCart } from "../components/CartContext";
import Notification from "./Notification";

const MenuCard = ({ name, priceHalf, priceFull, price, category }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const { addToCart } = useCart();
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
      addToCart({ name, quantity, type: "N/A", price });
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

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-orange-100">
      <div className="p-5">
        {/* Dish Name and Category */}
        <div className="mb-3">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-gray-800">{name}</h3>
            {category && (
              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                {category}
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            {price ? (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fixed Price
              </span>
            ) : (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Available in {priceHalf ? 'Half' : ''} {priceHalf && priceFull ? '&' : ''} {priceFull ? 'Full' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Price Display */}
        <div className="mb-4">
          {price ? (
            <div className="bg-orange-50 px-3 py-2 rounded-lg flex justify-between items-center">
              <span className="text-gray-700 text-sm">Price</span>
              <span className="text-lg font-bold text-orange-600">₹{price}</span>
            </div>
          ) : (
            <div className="bg-orange-50 px-3 py-2 rounded-lg">
              <div className="flex justify-between items-center gap-4">
                {priceHalf && (
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Half</span>
                    <span className="font-bold text-orange-600">₹{priceHalf}</span>
                  </div>
                )}
                {priceHalf && priceFull && (
                  <div className="h-8 border-r border-orange-200"></div>
                )}
                {priceFull && (
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Full</span>
                    <span className="font-bold text-orange-600">₹{priceFull}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-3">
          {/* Quantity Controls */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
            <button 
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors duration-200 ${
                quantity <= 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white shadow-sm hover:bg-orange-50 text-orange-500 font-bold'
              }`}
            >
              -
            </button>
            <div className="px-3 py-1 rounded-md bg-white shadow-sm">
              <span className="font-medium text-gray-700">{quantity}</span>
            </div>
            <button 
              onClick={increaseQuantity}
              className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200 font-bold text-lg"
            >
              +
            </button>
          </div>

          {/* Size Selection */}
          {hasHalfFull && (
            <div className="flex gap-2">
              {priceHalf && (
                <button 
                  onClick={() => handleTypeSelect("H")}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedType === "H"
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white border border-orange-300 text-orange-500 hover:bg-orange-50"
                  }`}
                >
                  Half
                </button>
              )}
              {priceFull && (
                <button 
                  onClick={() => handleTypeSelect("F")}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedType === "F"
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white border border-orange-300 text-orange-500 hover:bg-orange-50"
                  }`}
                >
                  Full
                </button>
              )}
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className={`w-full py-2.5 rounded-lg font-medium text-white transition-all duration-300 flex items-center justify-center gap-2 ${
              isAdding
                ? "bg-green-500 scale-95"
                : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow"
            }`}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
      
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
