import React, { useState } from 'react';
import Notification from './Notification';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MenuModal = ({ onClose, onSave, orderId, existingItems = [] }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [notification, setNotification] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API_URL}/api/dishes`);
        if (!res.ok) {
          throw new Error('Failed to fetch categories');
        }
        const categoriesData = await res.json();
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].categoryName);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setNotification({ message: 'Failed to load menu data', type: 'error' });
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
        type: item.portion === 'half' ? 'H' : item.portion === 'full' ? 'F' : item.portion, // Use H and F abbreviations
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
      // Removed alert for save success to avoid popup after saving modifications
      onSave(data.order);  // Pass updated order object instead of just selectedItems
      setNotification({ message: 'Items added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-md flex justify-center items-center z-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="menu-modal-title"
      aria-describedby="menu-modal-description"
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-[95%] p-4 mx-auto ring-1 ring-gray-200 dark:ring-gray-700 flex flex-col h-[80vh] max-h-[650px] md:max-h-[80vh]">
        <div className="flex flex-col h-full">
          {/* Categories list at the top */}
          <nav className="overflow-x-auto overflow-y-hidden whitespace-nowrap p-2 mb-4 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-lg">
            <ul className="flex space-x-3">
              {categories.map((category) => (
                <li key={category._id} className="inline-block">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 ${
                      category.categoryName === selectedCategory
                        ? 'bg-blue-600 text-white shadow'
                        : 'border-2 border-blue-600 hover:bg-blue-100 dark:hover:bg-gray-800 text-blue-600 dark:text-gray-200'
                    }`}
                    onClick={() => setSelectedCategory(category.categoryName)}
                  >
                    {category.categoryName}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Selected items preview between category and menu */}
          {selectedItems.length > 0 && (
            <div className="mb-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shadow-inner">
              <div className="px-3">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Selected Items:</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {selectedItems.map((item, idx) => (
                    <div
                  key={`${item.id}-${item.portion}-${item.index}`}
                      className="flex items-center bg-blue-100 dark:bg-blue-800 rounded-full px-3 py-1 shadow-sm overflow-hidden"
                >
                      <span className="text-blue-800 dark:text-blue-200 text-sm font-medium truncate flex-1 min-w-0">
                        {item.name} ({item.portion === 'half' ? 'H' : item.portion === 'full' ? 'F' : item.portion})
                  </span>
                  <button
                        onClick={() => {
                          setSelectedItems((prev) => prev.filter((_, i) => i !== idx));
                        }}
                    aria-label={`Remove ${item.name}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-full p-0.5 ml-2 flex-shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                    </div>
              ))}
                </div>
              </div>
            </div>
          )}

          {/* Menu items container */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
            <section
          id="menu-modal-description"
              className="h-full overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50 dark:scrollbar-thumb-blue-700 dark:scrollbar-track-blue-900 p-4"
              aria-label="Items of the selected category"
        >
              <h3 className="text-xl font-semibold mb-4 text-orange-600">{selectedCategory} Menu</h3>
              <ul>
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
                      (i) => i.name === item.name && i.type === 'fixed'
                    );
                    
            return (
              <li
                        key={item._id}
                        className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-between mb-4"
              >
                        <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2 text-center">{item.name}</p>
                {typeof item.priceHalf === 'number' && typeof item.priceFull === 'number' ? (
                  <div className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                                Half (H) - ₹{item.priceHalf.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleSelectItem(item, 'half', item.priceHalf, index)}
                                disabled={isExistingHalf}
                                className={`px-5 py-1.5 rounded-lg text-sm font-semibold focus:outline-none ${
                                  isSelectedHalf || isExistingHalf
                                    ? 'bg-gray-400 text-white cursor-not-allowed shadow-inner'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        }`}
                      >
                                {isSelectedHalf ? 'Added' : isExistingHalf ? 'In Order' : 'Add H'}
                      </button>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                                Full (F) - ₹{item.priceFull.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleSelectItem(item, 'full', item.priceFull, index)}
                                disabled={isExistingFull}
                                className={`px-5 py-1.5 rounded-lg text-sm font-semibold focus:outline-none ${
                                  isSelectedFull || isExistingFull
                                    ? 'bg-gray-400 text-white cursor-not-allowed shadow-inner'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        }`}
                      >
                                {isSelectedFull ? 'Added' : isExistingFull ? 'In Order' : 'Add F'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      ₹{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
                    </span>
                    <button
                      onClick={() => handleSelectItem(item, 'fixed', item.price, index)}
                              disabled={isExistingFixed}
                              className={`px-6 py-1.5 rounded-lg text-sm font-semibold focus:outline-none ${
                                isSelectedFixed || isExistingFixed
                                  ? 'bg-gray-400 text-white cursor-not-allowed shadow-inner'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      }`}
                    >
                              {isSelectedFixed ? 'Added' : isExistingFixed ? 'In Order' : 'Add'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
            </section>
          </div>

          {/* Buttons at the bottom */}
          <div className="flex justify-center space-x-4 mt-3">
          <button
            onClick={handleSave}
            disabled={selectedItems.length === 0}
              className={`px-8 py-3 rounded-2xl font-semibold focus:outline-none ${
              selectedItems.length === 0
                ? 'bg-green-300 text-green-700 cursor-not-allowed shadow-inner'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
            }`}
          >
            Save
          </button>
          <button
            onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-semibold focus:outline-none"
          >
            Close
          </button>
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
