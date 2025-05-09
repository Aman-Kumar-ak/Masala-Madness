import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalAnimation, buttonHoverAnimation } from '../utils/animations';

const DishModal = ({ isOpen, onClose, title, formData, setFormData, onSubmit, categories, isEditing, isLoading }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            {...modalAnimation}
          >
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 flex justify-between items-center rounded-t-lg">
              <h3 className="text-xl font-semibold">{title}</h3>
              <motion.button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
            
            <form onSubmit={onSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-6">
                {!isEditing && (
                  <motion.div 
                    className="form-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="block text-base font-medium text-gray-700 mb-1">Category</label>
                    <div className="relative">
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                        className="w-full p-3 pr-10 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700 cursor-pointer text-base"
                        required
                      >
                        <option value="" disabled>Select a category</option>
                        {categories.map((category) => (
                          <option 
                            key={category._id} 
                            value={category._id}
                            className="truncate"
                            title={category.categoryName}
                          >
                            {category.categoryName}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <motion.div 
                  className="form-group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block text-base font-medium text-gray-700 mb-1">Dish Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter dish name"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </motion.div>
                
                <motion.div 
                  className="form-group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id={isEditing ? "editHasHalfFull" : "hasHalfFull"}
                      checked={formData.hasHalfFull}
                      onChange={(e) => setFormData({...formData, hasHalfFull: e.target.checked})}
                      className="h-5 w-5 text-orange-600 focus:ring-orange-500 rounded"
                    />
                    <label htmlFor={isEditing ? "editHasHalfFull" : "hasHalfFull"} className="text-sm font-medium text-gray-700">Has Half/Full options</label>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {formData.hasHalfFull ? (
                      <motion.div 
                        key="half-full"
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Half Price (₹)</label>
                          <input
                            type="number"
                            value={formData.priceHalf}
                            onChange={(e) => setFormData({...formData, priceHalf: e.target.value})}
                            placeholder="Enter half price"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Price (₹)</label>
                          <input
                            type="number"
                            value={formData.priceFull}
                            onChange={(e) => setFormData({...formData, priceFull: e.target.value})}
                            placeholder="Enter full price"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="single-price"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label className="block text-base font-medium text-gray-700 mb-1">Price (₹)</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          placeholder="Enter price"
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
              
              <motion.div 
                className="mt-6 flex gap-3 justify-end"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
                  whileHover={buttonHoverAnimation}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2"
                  whileHover={buttonHoverAnimation}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{isEditing ? 'Update Dish' : 'Add Dish'}</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DishModal; 