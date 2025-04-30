import React, { useState } from 'react';

const MenuModal = ({ onClose, onSave, items }) => {
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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="menu-modal-title"
      aria-describedby="menu-modal-description"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 mx-4">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2
            id="menu-modal-title"
            className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-0"
          >
            Select Items
          </h2>
          {selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedItems.map((item) => (
                <span
                  key={`${item.id}-${item.portion}-${item.index}`}
                  className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full flex items-center space-x-2"
                >
                  <span>
                    {item.name} ({item.portion})
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item)}
                    aria-label={`Remove ${item.name}`}
                    className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-700 rounded"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </header>

        <ul
          id="menu-modal-description"
          className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700"
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
                className="py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">{item.name}</p>
                {typeof item.priceHalf === 'number' && typeof item.priceFull === 'number' ? (
                  <div className="flex justify-between items-center space-x-3">
                    <div className="flex-1 flex flex-col">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Half - ₹{item.priceHalf.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleSelectItem(item, 'half', item.priceHalf, index)}
                        disabled={isSelectedHalf}
                        className={`mt-1 px-3 py-1 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition ${
                          isSelectedHalf
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isSelectedHalf ? 'Added' : 'Add Half'}
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Full - ₹{item.priceFull.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleSelectItem(item, 'full', item.priceFull, index)}
                        disabled={isSelectedFull}
                        className={`mt-1 px-3 py-1 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition ${
                          isSelectedFull
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isSelectedFull ? 'Added' : 'Add Full'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      ₹{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
                    </span>
                    <button
                      onClick={() => handleSelectItem(item, 'fixed', item.price, index)}
                      disabled={isSelectedFixed}
                      className={`px-3 py-1 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition ${
                        isSelectedFixed
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
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

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => onSave(selectedItems)}
            disabled={selectedItems.length === 0}
            className={`px-5 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-600 transition ${
              selectedItems.length === 0
                ? 'bg-green-300 text-green-700 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuModal;
