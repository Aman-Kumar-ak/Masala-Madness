import React, { useState } from "react";
import { useCart } from "../components/CartContext";

const MenuCard = ({ name, priceHalf, priceFull, price, category }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedType, setSelectedType] = useState(""); // "H" or "F"
  
  const { addToCart } = useCart();

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  const handleAddToCart = () => {
    if (price) {
      // Single price dish
      addToCart({ name, quantity, type: "N/A", price });
    } else if (selectedType) {
      // Half/Full dish
      const price = selectedType === "H" ? priceHalf : priceFull;
      addToCart({ name, quantity, type: selectedType, price });
    } else {
      alert("Please select Half (H) or Full (F) size.");
    }
  };

  const hasHalfFull = !price && (priceHalf || priceFull);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center mb-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className="text-gray-600">
          {price ? (
            <span>Price: ₹{price}</span>
          ) : hasHalfFull ? (
            <>
              {priceHalf && <span>Half: ₹{priceHalf} </span>}
              {priceFull && <span>Full: ₹{priceFull}</span>}
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={decreaseQuantity}
          className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center"
        >
          -
        </button>
        <span className="w-8 text-center">{quantity}</span>
        <button 
          onClick={increaseQuantity}
          className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center"
        >
          +
        </button>
        {hasHalfFull && (
          <div className="space-x-2">
            {priceHalf && (
              <button 
                onClick={() => setSelectedType("H")}
                className={`w-16 py-2 rounded ${selectedType === "H" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Half
              </button>
            )}
            {priceFull && (
              <button 
                onClick={() => setSelectedType("F")}
                className={`w-16 py-2 rounded ${selectedType === "F" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
              >
                Full
              </button>
            )}
          </div>
        )}
        <button
          onClick={handleAddToCart}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default MenuCard;
