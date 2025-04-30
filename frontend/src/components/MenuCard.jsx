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
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="p-6">
        {/* Dish Name and Type */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{name}</h3>
          <div className="text-sm text-gray-500">
            {price ? (
              <span>Fixed Price</span>
            ) : (
              <span>Available in {priceHalf ? 'Half' : ''} {priceHalf && priceFull ? '&' : ''} {priceFull ? 'Full' : ''}</span>
            )}
          </div>
        </div>

        {/* Price Display */}
        <div className="mb-4">
          {price ? (
            <div className="text-lg font-semibold text-orange-600">₹{price}</div>
          ) : (
            <div className="space-y-1">
              {priceHalf && (
                <div className="text-sm">
                  <span className="text-gray-600">Half:</span>
                  <span className="font-semibold text-orange-600 ml-2">₹{priceHalf}</span>
                </div>
              )}
              {priceFull && (
                <div className="text-sm">
                  <span className="text-gray-600">Full:</span>
                  <span className="font-semibold text-orange-600 ml-2">₹{priceFull}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-3">
          {/* Quantity Controls */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
            <button 
              onClick={decreaseQuantity}
              className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200 font-bold text-lg"
            >
              -
            </button>
            <span className="font-medium text-gray-700">{quantity}</span>
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
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
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
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
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
            className={`w-full py-2 rounded-lg font-medium text-white transition-all duration-300 ${
              isAdding
                ? "bg-green-500 scale-95"
                : "bg-orange-500 hover:bg-orange-600 hover:shadow-md"
            }`}
          >
            {isAdding ? "Added! ✓" : "Add to Cart"}
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
