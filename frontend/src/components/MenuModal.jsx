import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MenuModal = ({ onClose, onSave, items, orderId }) => {
  const [selectedItems, setSelectedItems] = useState([]);

  const handleSelectItem = (item, portion, price, index) => {
    const existingIndex = selectedItems.findIndex(
      (i) => i.id === item.id && i.portion === portion && i.index === index
    );
    if (existingIndex === -1) {
      setSelectedItems((prev) => [
        ...prev,
        { id: item.id, name: item.name, portion, price, index }
      ]);
    }
  };

  const handleRemoveItem = (item) => {
    setSelectedItems((prev) =>
      prev.filter((i) => !(i.id === item.id && i.portion === item.portion && i.index === item.index))
    );
  };

  const handleSave = async () => {
    if (selectedItems.length === 0) return;

    const requestBody = {
      items: selectedItems.map(item => ({
        name: item.name,
        type: item.portion, // map portion to type
        price: item.price,
        quantity: item.quantity || 1,
        totalPrice: item.price * (item.quantity || 1),
      })),
      subtotal: selectedItems.reduce((total, item) => total + item.price * (item.quantity || 1), 0),
      isPaid: false, // Assuming the order is not paid yet
    };

    console.log('Request URL:', `${API_URL}/api/pending-orders/${orderId}`);
    console.log('Request Body:', requestBody);

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
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-xl w-full p-8 mx-4 ring-1 ring-gray-200 dark:ring-gray-700">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h2
            id="menu-modal-title"
            className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-4 sm:mb-0"
          >
            Select Items
          </h2>
          {selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {selectedItems.map((item) => (
                <span
                  key={`${item.id}-${item.portion}-${item.index}`}
                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold px-4 py-1.5 rounded-full flex items-center space-x-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <span>
                    {item.name} ({item.portion})
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item)}
                    aria-label={`Remove ${item.name}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-full transition"
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
                </span>
              ))}
            </div>
          )}
        </header>

        <ul
          id="menu-modal-description"
          className="max-h-72 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 rounded-lg scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50 dark:scrollbar-thumb-blue-700 dark:scrollbar-track-blue-900"
        >
          {items.map((item, index) => {
            const isSelectedHalf = selectedItems.some(
              (i) => i.id === item.id && i.portion === 'half' && i.index === index
            );
            const isSelectedFull = selectedItems.some(
              (i) => i.id === item.id && i.portion === 'full' && i.index === index
            );
            const isSelectedFixed = selectedItems.some(
              (i) => i.id === item.id && i.portion === 'fixed' && i.index === index
            );
            return (
              <li
                key={`${item.id}-${index}`}
                className="py-4 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between"
              >
                <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2 sm:mb-0">{item.name}</p>
                {typeof item.priceHalf === 'number' && typeof item.priceFull === 'number' ? (
                  <div className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                        Half - ₹{item.priceHalf.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleSelectItem(item, 'half', item.priceHalf, index)}
                        disabled={isSelectedHalf}
                        className={`px-5 py-1.5 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition-shadow ${
                          isSelectedHalf
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-inner'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        }`}
                      >
                        {isSelectedHalf ? 'Added' : 'Add Half'}
                      </button>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                        Full - ₹{item.priceFull.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleSelectItem(item, 'full', item.priceFull, index)}
                        disabled={isSelectedFull}
                        className={`px-5 py-1.5 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition-shadow ${
                          isSelectedFull
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-inner'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        }`}
                      >
                        {isSelectedFull ? 'Added' : 'Add Full'}
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
                      disabled={isSelectedFixed}
                      className={`px-6 py-1.5 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition-shadow ${
                        isSelectedFixed
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-inner'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      }`}
                    >
                      {isSelectedFixed ? 'Added' : 'Add'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={handleSave}
            disabled={selectedItems.length === 0}
            className={`px-8 py-3 rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-shadow ${
              selectedItems.length === 0
                ? 'bg-green-300 text-green-700 cursor-not-allowed shadow-inner'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
            }`}
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-shadow shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuModal;
