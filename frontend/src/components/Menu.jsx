import React, { useState, useEffect, useRef } from 'react';
import { fetchCategories } from '../utils/fetchCategories';
import MenuCard from './MenuCard';
import { Link } from 'react-router-dom';
import { getCategoryEmoji } from '../utils/helpers';
import { useCart } from '../components/CartContext';
import ConfirmationDialog from './ConfirmationDialog';

const Menu = ({ cartItems, handleConfirmClearCart, setShowClearCartConfirm }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [emptyMenu, setEmptyMenu] = useState(false);

  const categoryRefs = useRef({});
  const categoryBarRef = useRef(null);
  const observer = useRef(null);
  const isClickScrolling = useRef(false);
  const menuContentRef = useRef(null);

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
      // Sort categories alphabetically by categoryName
      const sortedCategories = data.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      setCategories(sortedCategories);

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

  useEffect(() => {
    // Disconnect existing observer if it exists
    if (observer.current) {
      observer.current.disconnect();
    }

    // Create new IntersectionObserver
    observer.current = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) {
          return; // Ignore updates if user is click-scrolling
        }

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryName = entry.target.dataset.categoryName;
            if (categoryName) {
              setSelectedCategory(categoryName);
              // Scroll category bar to center the active category
              const activeCategoryButton = categoryBarRef.current.querySelector(`[data-category-name="${categoryName}"]`);
              if (activeCategoryButton) {
                const categoryBarWidth = categoryBarRef.current.offsetWidth;
                const buttonLeft = activeCategoryButton.offsetLeft;
                const buttonWidth = activeCategoryButton.offsetWidth;
                const scrollLeft = buttonLeft - (categoryBarWidth / 2) + (buttonWidth / 2);
                categoryBarRef.current.scrollTo({
                  left: scrollLeft,
                  behavior: 'smooth',
                });
              }
            }
          }
        });
      },
      { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    ); // Trigger when 50% of the element is visible

    // Observe each category section
    Object.values(categoryRefs.current).forEach((el) => {
      if (el) observer.current.observe(el);
    });

    // Clean up observer on component unmount
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [categories, searchTerm]); // Re-run when categories or search changes

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
    return categories.find(cat => cat?.categoryName === selectedCategory)?.dishes || [];
  }, [categories, selectedCategory]);

  // Apply search term (always searching across ALL dishes if search term exists)
  const searchFilteredDishes = React.useMemo(() => {
    if (!searchTerm) return filteredDishes;
    
    // When search term exists, search across ALL dishes regardless of selected category
    const dishesToSearch = allDishes;
    
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

  useEffect(() => {
    // Set initial selected category to the first category if categories are loaded and no category is selected
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].categoryName);
    }
  }, [categories, selectedCategory]);

  // Scroll to top of menu content when search term changes
  useEffect(() => {
    if (searchTerm && menuContentRef.current) {
      menuContentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [searchTerm]);

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
    <div className="h-full flex flex-col">
      {/* Main sticky header container */}
      <div className="sticky top-0 z-40 p-4 border-b transform translate3d(0, 0, 0) will-change-transform rounded-t-2xl bg-white" style={{ backfaceVisibility: 'hidden', outline: '1px solid transparent', filter: 'blur(0px)' }}>
        <div className="bg-white text-center">
          <h2 className="text-3xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
          </h2>
        </div>
        <div className="space-y-2">
          {/* Search Bar and Clear Cart Button */}
          <div className="flex items-center gap-2">
            <div className={`relative flex-grow ${cartItems.length > 0 ? 'max-w-[calc(100%-48px)]' : 'max-w-full'}`}>
              <input
                type="text"
                placeholder={searchTerm ? "Searching all dishes..." : "Search dishes..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 text-gray-800 placeholder-gray-400 shadow-sm text-sm"
              />
              {searchTerm ? (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              )}
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={() => setShowClearCartConfirm(true)}
                className="flex-shrink-0 w-10 h-10 rounded-md bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center border border-red-200 transition-all duration-200 shadow-sm hover:shadow"
                title="Clear Cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide hide-scrollbar" ref={categoryBarRef}>
              {categories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => {
                    setSelectedCategory(category.categoryName); // Set immediately on click
                    setSearchTerm(''); // Clear search when selecting category
                    isClickScrolling.current = true;
                    if (categoryRefs.current[category._id]) {
                      categoryRefs.current[category._id].scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }
                    // Reset isClickScrolling after a short delay to allow IntersectionObserver to take over
                    setTimeout(() => {
                      isClickScrolling.current = false;
                    }, 1000); // Adjust delay as needed based on scroll speed
                  }}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-md whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === category.categoryName && !searchTerm
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-700 hover:text-orange-600'
                  }`}
                  data-category-name={category.categoryName}
                >
                  <span className="flex-shrink-0 text-lg font-medium">{getCategoryEmoji(category.categoryName)}</span>
                  <span>{category.categoryName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections by Category (scrollable content) */}
      <div ref={menuContentRef} className="flex-1 overflow-y-auto pt-4 pb-4 px-4 bg-white rounded-b-xl">
        {categories.map(category => {
          const filteredCategoryDishes = category.dishes.filter(dish => {
            if (!searchTerm) return true;
            const normalizedSearchTerm = searchTerm.trim().replace(/\s+/g, ' ').toLowerCase();
            const normalizedDishName = dish.name.toLowerCase().trim().replace(/\s+/g, ' ');
            return normalizedDishName.includes(normalizedSearchTerm);
          }).sort((a, b) => a.name.localeCompare(b.name));

          if (searchTerm && filteredCategoryDishes.length === 0) {
            return null; // Don't render category if search term is active and no dishes match
          }

          return (
            <div key={category._id} ref={el => categoryRefs.current[category._id] = el} className="mb-8 last:mb-0 scroll-mt-[200px]" data-category-name={category.categoryName}>
              <h3 className="text-2xl font-bold text-gray-800 mb-4 pb-2 pt-4 border-b-2s">
                {getCategoryEmoji(category.categoryName)} {category.categoryName}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-visible">
                {filteredCategoryDishes.map(dish => (
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
              {filteredCategoryDishes.length === 0 && !searchTerm && (
                <p className="text-gray-500 text-center py-4">No dishes available in this category.</p>
              )}
            </div>
          );
        })}

        {/* No Results Message for entire menu if search yields nothing */}
        {searchTerm && searchFilteredDishes.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg p-6 px-4 mt-8">
            <div className="text-gray-400 text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Dishes Found</h3>
            <p className="text-gray-500 mb-4">
              No dishes match your search across all categories.
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
