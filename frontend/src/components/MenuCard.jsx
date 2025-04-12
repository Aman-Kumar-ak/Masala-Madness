import React, { useState } from 'react';

const MenuCard = ({ name, priceHalf, priceFull, category }) => {
  const [quantity, setQuantity] = useState(1);

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex justify-between items-center">
      <div className="flex-1">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className="text-gray-600">
          {priceHalf && <span>Half: ₹{priceHalf} </span>}
          {priceFull && <span>Full: ₹{priceFull}</span>}
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
        <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default MenuCard;
