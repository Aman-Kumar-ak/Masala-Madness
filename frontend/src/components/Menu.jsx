import React, { useState, useEffect } from 'react';
import { fetchCategories } from '../utils/fetchCategories';
import MenuCard from './MenuCard';

const Menu = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const searchFilteredDishes = searchTerm
    ? filteredDishes.filter(dish => 
        dish.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredDishes;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search dishes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <span className="absolute right-4 top-2.5 text-gray-400">🔍</span>
      </div>

      {/* Category Tabs */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-colors duration-200 ${
              selectedCategory === 'All'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-orange-100'
            }`}
          >
            <span>🍽️</span>
            <span>All Items</span>
          </button>
          {categories.map((category) => (
            <button
              key={category._id}
              onClick={() => setSelectedCategory(category.categoryName)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-colors duration-200 ${
                selectedCategory === category.categoryName
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-orange-100'
              }`}
            >
              <span>{getCategoryEmoji(category.categoryName)}</span>
              <span>{category.categoryName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {searchFilteredDishes.map((dish) => (
          <MenuCard
            key={dish._id}
            name={dish.name}
            priceHalf={dish.priceHalf || null}
            priceFull={dish.priceFull || null}
            price={dish.price || null}
            category={dish.category}
          />
        ))}
      </div>

      {/* No Results Message */}
      {searchFilteredDishes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No dishes found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-orange-500 hover:text-orange-600"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to get emoji for category
const getCategoryEmoji = (category) => {
  const emojiMap = {
    'Starters': '🥟',
    'Main Course': '🍛',
    'Breads': '🫓',
    'Rice': '🍚',
    'Desserts': '🍨',
    'Beverages': '🥤',
    'Chinese': '🥢',
    'Soups': '🥣',
    'Thali': '🍱',
    'Momos': '🥟',
  };
  return emojiMap[category] || '🍽️';
};

export default Menu;
