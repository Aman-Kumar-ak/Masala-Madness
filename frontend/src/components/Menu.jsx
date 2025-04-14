import React, { useState, useEffect } from 'react';
import { fetchCategories } from '../utils/fetchCategories';
import MenuCard from './MenuCard';

const Menu = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading categories:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredDishes = selectedCategory === 'All'
    ? categories.flatMap(category => category.dishes)
    : categories.find(cat => cat.categoryName === selectedCategory)?.dishes || [];

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-4 mb-8 overflow-x-auto py-2">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-2 rounded-full whitespace-nowrap ${
            selectedCategory === 'All'
              ? 'bg-orange-500 text-white'
              : 'bg-orange-100 text-orange-800'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category._id}
            onClick={() => setSelectedCategory(category.categoryName)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              selectedCategory === category.categoryName
                ? 'bg-orange-500 text-white'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {category.categoryName}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredDishes.map((dish) => (
          <MenuCard
            key={dish._id}
            name={dish.name}
            priceHalf={dish.priceHalf}
            priceFull={dish.priceFull}
            category={dish.category}
          />
        ))}
      </div>
    </div>
  );
};

export default Menu;
