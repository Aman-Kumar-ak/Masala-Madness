import React, { useState, useEffect } from 'react';
import Notification from './Notification';
import { API_URL } from "../utils/config";

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MenuModal = ({ onClose, onSave, orderId, existingItems = [] }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [notification, setNotification] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/dishes`);
        if (!res.ok) {
          throw new Error('Failed to fetch categories');
        }
        const categoriesData = await res.json();
        // Sort categories alphabetically by categoryName
        const sortedCategories = categoriesData.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
        
        // Create an "All Items" category
        const allDishes = sortedCategories.flatMap(category => category.dishes.map(dish => ({
          ...dish,
          // Add category name to the dish for identification if needed, or modify as per backend structure
          categoryName: category.categoryName // Useful for debugging/display
        }))).sort((a, b) => a.name.localeCompare(b.name)); // Sort all dishes alphabetically

        const allItemsCategory = {
          _id: "all-items", // Unique ID for this virtual category
          categoryName: "All Items",
          dishes: allDishes
        };

        setCategories([allItemsCategory, ...sortedCategories]);
        setSelectedCategory(allItemsCategory.categoryName);
      } catch (error) {
        console.error('Error fetching data:', error);
        setNotification({ message: 'Failed to load menu data', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectItem = (item, portion, price, index) => {
    const existingIndex = selectedItems.findIndex(
      (i) => i.id === item._id && i.portion === portion && i.index === index
    );
    if (existingIndex === -1) {
      setSelectedItems((prev) => [
        ...prev,
        { id: item._id, name: item.name, portion, price, index }
      ]);
      // Show a temporary success notification
      setNotification({ 
        message: `Added: ${item.name} (${portion === 'half' ? 'Half' : portion === 'full' ? 'Full' : 'Regular'})`, 
        type: 'success' 
      });
      setTimeout(() => setNotification(null), 1500);
    } else {
      // Remove item if it's already selected
      handleRemoveItem({ id: item._id, portion, index });
    }
  };

  const handleRemoveItem = (item) => {
    setSelectedItems((prev) =>
      prev.filter((i) => !(i.id === item.id && i.portion === item.portion && i.index === item.index))
    );
  };

  const handleSave = async () => {
    if (selectedItems.length === 0) return;
    
    setLoading(true);

    // Calculate the subtotal
    const subtotal = selectedItems.reduce((total, item) => total + item.price * (item.quantity || 1), 0);
    
    // Fetch active discount
    let discountAmount = 0;
    let discountPercentage = 0;
    let totalAmount = subtotal;
    
    try {
      const discountResponse = await fetch(`${API_URL}/api/discounts/active`);
      if (discountResponse.ok) {
        const activeDiscount = await discountResponse.json();
        if (activeDiscount && subtotal >= activeDiscount.minOrderAmount) {
          discountPercentage = activeDiscount.percentage;
          discountAmount = Math.round((subtotal * discountPercentage) / 100);
          totalAmount = subtotal - discountAmount;
        }
      }
    } catch (error) {
      console.error('Error fetching discount:', error);
    }

    // Prepare the request body
    const requestBody = {
      items: selectedItems.map(item => ({
        name: item.name,
        type: item.portion === 'half' ? 'H' : item.portion === 'full' ? 'F' : item.portion === 'fixed' ? 'Fixed' : item.portion,
        price: item.price,
        quantity: item.quantity || 1,
        totalPrice: item.price * (item.quantity || 1),
      })),
      subtotal,
      discountAmount,
      discountPercentage,
      totalAmount,
      isPaid: false, // Assuming the order is not paid yet
    };

    try {
      const response = await fetch(`${API_URL}/api/pending-orders/${orderId}`, {
        method: 'PUT', // Use PUT to update the existing order
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to update order');

      const data = await response.json();
      onSave(data.order);  // Pass updated order object instead of just selectedItems
      setNotification({ message: 'Items added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating order:', error);
      setNotification({ message: 'Failed to update order. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="menu-modal-title"
      aria-describedby="menu-modal-description"
      onClick={(e) => {
        // Close when clicking outside the modal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-lg w-full flex flex-col h-[90vh] max-h-[700px] overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex justify-between items-center">
            <h2 id="menu-modal-title" className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span>Add Menu Items</span>
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {selectedItems.length > 0 && (
            <div className="mt-3 text-sm">
              <span className="text-gray-600">Selected: </span>
              <span className="font-medium text-orange-600">{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-grow h-full overflow-hidden">
          {/* Categories list at the top */}
          <nav className="px-4 py-3 sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-2">
                {categories.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                      category.categoryName === selectedCategory
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedCategory(category.categoryName)}
                  >
                    {category.categoryName}
                  </button>
                ))}
              </div>
            </div>
          </nav>
          
          {/* Selected items preview */}
          {selectedItems.length > 0 && (
            <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedItems.map((item, idx) => {
                  // Check if this is the last item and there's an odd number of items
                  const isLastItemInOddCount = idx === selectedItems.length - 1 && selectedItems.length % 2 === 1;
                  
                  return (
                    <div
                      key={`${item.id}-${item.portion}-${item.index}`}
                      className={`flex items-center justify-between bg-white border border-yellow-200 rounded-lg px-3 py-2 text-sm overflow-hidden ${
                        isLastItemInOddCount ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-grow">
                        <span className="font-medium text-gray-800 truncate">
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.portion === 'half' ? 'Half Portion' : item.portion === 'full' ? 'Full Portion' : 'Regular'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="text-orange-600 font-medium whitespace-nowrap">
                          ₹{item.price}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          aria-label={`Remove ${item.name}`}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu items container */}
          <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                <p className="text-gray-600">Loading menu items...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories
                  .find(cat => cat.categoryName === selectedCategory)
                  ?.dishes.map((item, index) => {
                    const isSelectedHalf = selectedItems.some(
                      (i) => i.id === item._id && i.portion === 'half' && i.index === index
                    );
                    const isSelectedFull = selectedItems.some(
                      (i) => i.id === item._id && i.portion === 'full' && i.index === index
                    );
                    const isSelectedFixed = selectedItems.some(
                      (i) => i.id === item._id && i.portion === 'fixed' && i.index === index
                    );
                    
                    // Check if item already exists in the current order
                    const isExistingHalf = existingItems.some(
                      (i) => i.name === item.name && i.type === 'H'
                    );
                    const isExistingFull = existingItems.some(
                      (i) => i.name === item.name && i.type === 'F'
                    );
                    const isExistingFixed = existingItems.some(
                      (i) => i.name === item.name && (i.type === 'N/A' || i.type === 'Fixed' || i.type === 'FIXED')
                    );
                    
                    return (
                      <div
                        key={item._id}
                        className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <h3 className="font-medium text-gray-800 mb-2 text-center">{item.name}</h3>
                        {typeof item.priceHalf === 'number' && typeof item.priceFull === 'number' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col items-center">
                              <div className="text-sm text-gray-600 mb-1.5 bg-gray-100 px-2 py-1 rounded-full w-full text-center">
                                Half • ₹{item.priceHalf}
                              </div>
                              <button
                                onClick={() => handleSelectItem(item, 'half', item.priceHalf, index)}
                                disabled={isExistingHalf}
                                className={`w-full py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  isSelectedHalf 
                                    ? 'bg-green-600 text-white' 
                                    : isExistingHalf 
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                      : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                              >
                                {isSelectedHalf ? 'Added ✓' : isExistingHalf ? 'In Order' : 'Add Half'}
                              </button>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="text-sm text-gray-600 mb-1.5 bg-gray-100 px-2 py-1 rounded-full w-full text-center">
                                Full • ₹{item.priceFull}
                              </div>
                              <button
                                onClick={() => handleSelectItem(item, 'full', item.priceFull, index)}
                                disabled={isExistingFull}
                                className={`w-full py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  isSelectedFull 
                                    ? 'bg-green-600 text-white' 
                                    : isExistingFull 
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                      : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                              >
                                {isSelectedFull ? 'Added ✓' : isExistingFull ? 'In Order' : 'Add Full'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="text-sm text-gray-600 mb-1.5 bg-gray-100 px-3 py-1 rounded-full">
                              Price • ₹{typeof item.price === 'number' ? item.price : '0.00'}
                            </div>
                            <button
                              onClick={() => handleSelectItem(item, 'fixed', item.price, index)}
                              disabled={isExistingFixed}
                              className={`w-full py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isSelectedFixed 
                                  ? 'bg-green-600 text-white' 
                                  : isExistingFixed 
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                              }`}
                            >
                              {isSelectedFixed ? 'Added ✓' : isExistingFixed ? 'In Order' : 'Add to Order'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>

          {/* Footer with action buttons */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={selectedItems.length === 0 || loading}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap ${
                  selectedItems.length === 0 || loading
                    ? 'bg-green-300 text-green-700 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
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

export default MenuModal;