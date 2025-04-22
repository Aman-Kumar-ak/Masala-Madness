// src/components/CategoryCard.jsx
import React from 'react';

const CategoryCard = ({ categoryName, imageUrl }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 m-2 flex flex-col items-center text-center">
      <img src={imageUrl} alt={categoryName} className="w-32 h-32 object-cover rounded-lg mb-4" />
      <h3 className="text-3xl font-bold text-gray-800">{categoryName}</h3>
    </div>
  );
};

export default CategoryCard;
