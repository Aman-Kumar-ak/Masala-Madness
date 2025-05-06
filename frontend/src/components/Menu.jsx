import React, { useState, useEffect } from 'react';
import { fetchCategories } from '../utils/fetchCategories';
import MenuCard from './MenuCard';
import { Link } from 'react-router-dom';

const Menu = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [emptyMenu, setEmptyMenu] = useState(false);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionError(false);
      setEmptyMenu(false);
      
      const data = await fetchCategories();
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }
      if (data.length === 0) {
        setEmptyMenu(true);
      }
      setCategories(data);

      // Dispatch a custom event to notify parent components to refresh their data
      window.dispatchEvent(new CustomEvent('refreshData'));
    } catch (error) {
      console.error('Error loading categories:', error);
      
      // Determine if this is a connection error or something else
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('Network') || 
          error.name === 'TypeError') {
        setConnectionError(true);
        setError('Unable to connect to the database. Please check your connection.');
      } else {
        setError('Failed to load menu items. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Get all dishes across all categories
  const allDishes = React.useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.reduce((acc, category) => {
      if (Array.isArray(category?.dishes)) {
        return [...acc, ...category.dishes];
      }
      return acc;
    }, []);
  }, [categories]);

  // Filter dishes based on selected category
  const filteredDishes = React.useMemo(() => {
    if (selectedCategory === 'All') {
      return allDishes;
    }
    return categories.find(cat => cat?.categoryName === selectedCategory)?.dishes || [];
  }, [categories, selectedCategory, allDishes]);

  // Apply search term (always searching across ALL dishes if search term exists)
  const searchFilteredDishes = React.useMemo(() => {
    if (!searchTerm) return filteredDishes;
    
    // When search term exists, search across ALL dishes regardless of selected category
    const dishesToSearch = searchTerm ? allDishes : filteredDishes;
    
    // Trim and normalize search term - remove extra spaces and convert multiple spaces to single space
    const normalizedSearchTerm = searchTerm.trim().replace(/\s+/g, ' ').toLowerCase();
    
    if (!normalizedSearchTerm) return filteredDishes;
    
    return dishesToSearch.filter(dish => {
      if (!dish?.name) return false;
      // Normalize dish name the same way to ensure consistent matching
      const normalizedDishName = dish.name.toLowerCase().trim().replace(/\s+/g, ' ');
      return normalizedDishName.includes(normalizedSearchTerm);
    });
  }, [filteredDishes, searchTerm, allDishes]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg p-6 border border-red-200">
        <div className="mb-4 text-red-500 text-5xl">📡</div>
        <h3 className="text-xl font-bold text-red-600 mb-2">Database Connection Error</h3>
        <p className="text-red-500 mb-6">Unable to connect to the database. Please check your connection and try again.</p>
        <button 
          onClick={loadAllData}
          className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (emptyMenu) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg p-6 border border-yellow-200">
        <div className="mb-4 text-yellow-500 text-5xl">🍽️</div>
        <h3 className="text-xl font-bold text-yellow-600 mb-2">Menu is Empty</h3>
        <p className="text-gray-600 mb-6">There are no menu items available at the moment.</p>
        <Link 
          to="/admin"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 shadow-md"
        >
          <span>Go to Admin Panel</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder={searchTerm ? "Searching all dishes..." : "Search dishes..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {searchTerm ? (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <span className="absolute right-4 top-3.5 text-gray-400 text-xl">🔍</span>
        )}
      </div>

      {/* Category Tabs */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchTerm(''); // Clear search when selecting category
            }}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-200 border ${
              selectedCategory === 'All' && !searchTerm
                ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-100 border-gray-200'
            }`}
          >
            <span className="text-lg">All Items</span>
          </button>
          {categories.map((category) => (
            <button
              key={category._id}
              onClick={() => {
                setSelectedCategory(category.categoryName);
                setSearchTerm(''); // Clear search when selecting category
              }}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-200 border ${
                selectedCategory === category.categoryName && !searchTerm
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                  : 'bg-white text-gray-700 hover:bg-orange-100 border-gray-200'
              }`}
            >
              <span className="flex-shrink-0 text-xl">{getCategoryEmoji(category.categoryName)}</span>
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
        <div className="text-center py-8 bg-gray-50 rounded-lg p-6">
          <div className="text-gray-400 text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Dishes Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? `No dishes match across all categories.` : "No dishes available in this category."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {error && (
              <button 
                onClick={loadAllData}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
              >
                Try Again
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get emoji for category
const getCategoryEmoji = (category) => {
  const emojiMap = {
    'Chinese': '🥡',
    'Burger': '🍔',
    'Soup': '🥣',
    'Pav Bhaji': '🫓',
    'Noodles': '🍜',
    'Rice': '🍚',
    'Maggi': '🍲',
    'Rolls': '🌯',
    'Momos': '🥟',
    'Finger': '🍗',
    'Combos': '🍱',
    'Starters': '🍟',
    'Main Course': '🍛',
    'Breads': '🍞',
    'Desserts': '🍨',
    'Beverages': '🥤',
    'Water': '🧊',
    'Water Bottle': '💧',
    'Cold Drink': '🥤',
    'Soda': '🥫',
    'Cola': '🥤',
    'Soft Drink': '🧋',
  };
  
  // If category is found in the map, return its emoji
  if (emojiMap[category]) {
    return emojiMap[category];
  }
  
  // For categories not in the predefined list, assign a random food emoji
  const defaultEmojis = [
    '🍽️', '🍴', '🥄', '🍳', '🥘', '🍝', '🌮', 
    '🥗', '🥪', '🌭', '🍕', '🥓', '🧆', '🥙',
    '🧇', '🍖', '🍤', '🥞', '🍙', '🍘', '🥠'
  ];
  
  // Use a hash function based on the category name to ensure consistency
  // This way the same category will always get the same emoji
  const hashCode = str => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };
  
  const hash = Math.abs(hashCode(category));
  const index = hash % defaultEmojis.length;
  
  return defaultEmojis[index];
};

export default Menu;
