import React, { useState, useEffect } from 'react';
import Notification from './Notification';
import { api } from '../utils/api';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getISTISOString(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }).replace(',', '');
}

const MenuModal = ({ onClose, onSave, orderId, existingItems = [], discountPercentage: propsDiscountPercentage, discountAmount: propsDiscountAmount }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [notification, setNotification] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);

  function checkPrinterConnection() {
    if (window.AndroidBridge && typeof window.AndroidBridge.isPrinterConnected === 'function') {
      try {
        const result = window.AndroidBridge.isPrinterConnected();
        return result === true || result === "true";
      } catch {
        return false;
      }
    }
    return false;
  }

  useEffect(() => {
    setIsPrinterConnected(checkPrinterConnection());
    const interval = setInterval(() => {
      setIsPrinterConnected(checkPrinterConnection());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const categoriesData = await api.get('/dishes');
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
    setSelectedItems([]); // Reset selected items every time modal opens
  }, []);

  useEffect(() => {
    // Ensure AndroidBridge is available (mock if not present)
    if (!window.AndroidBridge) {
      window.AndroidBridge = {
        sendOrderDetails: (details) => {
          console.log('[MOCK AndroidBridge] sendOrderDetails called with:', details);
        }
      };
    }
  }, []);

  // Helper to deduplicate items by id, portion, and index
  function deduplicateItems(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = `${item.id || item._id}-${item.portion || item.type}-${item.index ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

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

    // Only send new items (not already in existingItems)
    const newItems = selectedItems.filter(sel => {
      return !existingItems.some(
        (ex) =>
          (ex.id === sel.id || ex._id === sel.id) &&
          (ex.type === (sel.portion === 'half' ? 'H' : sel.portion === 'full' ? 'F' : sel.portion === 'fixed' ? 'Fixed' : sel.portion))
      );
    });

    if (newItems.length === 0) {
      setNotification({ message: 'No new items to add.', type: 'info' });
      setLoading(false);
      return;
    }

    // Build the full updated items array
    const updatedItems = [
      ...existingItems,
      ...newItems.map(item => ({
        name: item.name,
        type: item.portion === 'half' ? 'H' : item.portion === 'full' ? 'F' : item.portion === 'fixed' ? 'Fixed' : item.portion,
        price: item.price,
        quantity: item.quantity || 1,
        totalPrice: item.price * (item.quantity || 1),
        id: item.id || item._id,
        index: item.index
      }))
    ];

    // Recalculate totals
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Use discountPercentage and discountAmount from props if available
    const discountPercentage = typeof propsDiscountPercentage === 'number' ? propsDiscountPercentage : 0;
    const discountAmount = Math.round(subtotal * discountPercentage / 100);
    const totalAmount = subtotal - discountAmount;

    try {
      const data = await api.post(`/orders/confirm`, {
        orderId,
        items: updatedItems,
        append: false, // We are sending the full array now
        isPaid: false,
        subtotal,
        totalAmount,
        discountAmount,
        discountPercentage
      });
      onSave(data.order);  // Pass updated order object
      setNotification({ message: 'Items added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating order:', error);
      setNotification({ message: 'Failed to update order. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Add the handler for Save with/without KOT
  const handleSaveKOT = async (printKOT) => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    // Only send new items (not already in existingItems)
    const newItems = selectedItems.filter(sel => {
      return !existingItems.some(
        (ex) =>
          (ex.id === sel.id || ex._id === sel.id) &&
          (ex.type === (sel.portion === 'half' ? 'H' : sel.portion === 'full' ? 'F' : sel.portion === 'fixed' ? 'Fixed' : sel.portion))
      );
    });
    if (newItems.length === 0) {
      setNotification({ message: 'No new items to add.', type: 'info' });
      setLoading(false);
      return;
    }
    // Prepare newItems for backend
    const itemsToSend = newItems.map(item => ({
      name: item.name,
      type: item.portion === 'half' ? 'H' : item.portion === 'full' ? 'F' : item.portion === 'fixed' ? 'Fixed' : item.portion,
      price: item.price,
      quantity: item.quantity || 1,
      totalPrice: item.price * (item.quantity || 1),
      id: item.id || item._id,
      index: item.index
    }));
    try {
      const res = await api.post(`/orders/${orderId}/add-items`, {
        newItems: itemsToSend,
        printKOT
      });
      if (printKOT && res.kotNumber && res.newItems && window.AndroidBridge && window.AndroidBridge.sendOrderDetails) {
        const kotData = {
          orderNumber: res.order.orderNumber, // Use the actual order number
          kotNumber: res.kotNumber,
          createdAt: getISTISOString(res.order.createdAt),
          items: res.newItems.map(item => ({
            name: item.name,
            type: item.type,
            quantity: item.quantity
          }))
        };
        window.AndroidBridge.sendOrderDetails(JSON.stringify(kotData));
      }
      onSave(res.order); // Pass updated order object
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
            <div className="flex flex-row justify-between items-center flex-wrap gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap shadow-sm"
                disabled={loading}
                style={{ minWidth: 70 }}
              >
                Cancel
              </button>
              <div className="flex flex-row gap-2 flex-shrink-0">
                <button
                  onClick={async () => {
                    if (selectedItems.length === 0 || loading) return;
                    if (!isPrinterConnected) {
                      setNotification({ message: 'Printer is not connected.', type: 'error' });
                      return;
                    }
                    await handleSaveKOT(true);
                  }}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap shadow-sm ${
                    selectedItems.length === 0 || loading || !isPrinterConnected
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-200 text-orange-800 hover:bg-orange-300'
                  }`}
                  style={{ minWidth: 90 }}
                >
                  {loading ? 'Saving...' : 'Save (KOT)'}
                </button>
                <button
                  onClick={() => handleSaveKOT(false)}
                  disabled={selectedItems.length === 0 || loading}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap shadow-sm ${
                    selectedItems.length === 0 || loading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-200 text-green-800 hover:bg-green-300'
                  }`}
                  style={{ minWidth: 70 }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
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