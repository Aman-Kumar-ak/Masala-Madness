import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { modalAnimation, buttonHoverAnimation } from '../utils/animations';

// Memoize the component to prevent unnecessary re-renders
const DishModal = memo(({ isOpen, onClose, title, formData, setFormData, onSubmit, categories, isEditing, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with CSS transition instead of framer-motion for better performance */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />
      
      {/* Dialog */}
      <motion.div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto will-change-transform"
        {...modalAnimation}
        style={{ 
          translateZ: 0, // Force GPU rendering
          willChange: 'transform, opacity'
        }}
      >
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{isEditing ? 'Edit Dish' : 'Add New Dish'}</h3>
          <button 
            onClick={onClose}
            className="text-white hover:text-orange-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Dish Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Dish Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            
            {/* Category Selection */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Price Type - Full or Half */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="hasHalfFull"
                  checked={formData.hasHalfFull}
                  onChange={(e) => setFormData({...formData, hasHalfFull: e.target.checked})}
                  className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="hasHalfFull" className="text-sm font-medium text-gray-700">
                  This dish has half and full sizes
                </label>
              </div>
              
              {formData.hasHalfFull ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="priceHalf" className="block text-sm font-medium text-gray-700 mb-1">
                      Half Price (₹)
                    </label>
                    <input
                      type="number"
                      id="priceHalf"
                      value={formData.priceHalf}
                      onChange={(e) => setFormData({...formData, priceHalf: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="priceFull" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Price (₹)
                    </label>
                    <input
                      type="number"
                      id="priceFull"
                      value={formData.priceFull}
                      onChange={(e) => setFormData({...formData, priceFull: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                      min="0"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                    min="0"
                    required={!formData.hasHalfFull}
                  />
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <motion.button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isLoading}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className={`px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                whileHover={!isLoading && buttonHoverAnimation}
                whileTap={!isLoading && { scale: 0.97 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <span>{isEditing ? 'Update Dish' : 'Add Dish'}</span>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
});

export default DishModal; 