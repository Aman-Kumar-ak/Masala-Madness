import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { API_BASE_URL } from '../utils/api';
import Notification from './Notification';
import ConfirmationDialog from './ConfirmationDialog';
import DishModal from './DishModal';
import { fadeIn, fadeInUp, staggerChildren, listItem, buttonHoverAnimation } from '../utils/animations';

const MenuManager = ({ categories, onUpdate }) => {
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newDish, setNewDish] = useState({
    categoryId: '',
    name: '',
    priceHalf: '',
    priceFull: '',
    price: '',
    hasHalfFull: true
  });
  const [editingDish, setEditingDish] = useState(null);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [showEditDishModal, setShowEditDishModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  const categoryFormRef = useRef(null);

  useEffect(() => {
    // Handle clicks outside the category form
    const handleClickOutside = (event) => {
      if (categoryFormRef.current && !categoryFormRef.current.contains(event.target) && showCategoryInput) {
        setShowCategoryInput(false);
        setNewCategory('');
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryInput]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const categoryName = newCategory.trim();
    if (!categoryName) {
      setNotification({
        message: 'Please enter a category name',
        type: 'warning'
      });
      return;
    }

    const isDuplicate = categories.some(
      (cat) => cat.categoryName.toLowerCase() === categoryName.toLowerCase()
    );
    if (isDuplicate) {
      setNotification({
        message: 'This category already exists. Please choose a different name.',
        type: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/dishes', { categoryName });
      setNewCategory('');
      setShowCategoryInput(false);
      await onUpdate();
      setNotification({
        message: 'Category added successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding category:', error);
      setNotification({
        message: error.status === 401 
          ? 'Your session has expired. Please log in again.'
          : error.status === 403
          ? 'You do not have permission to add categories.'
          : 'Failed to add category. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDish = async (e) => {
    e.preventDefault();
    if (!newDish.categoryId) {
      setNotification({
        message: 'Please select a category for the dish',
        type: 'warning'
      });
      return;
    }

    const category = categories.find((cat) => cat._id === newDish.categoryId);
    if (!category) {
      setNotification({
        message: 'Selected category not found. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }

    const isDuplicate = category.dishes.some(
      (dish) => dish.name.toLowerCase() === newDish.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      setNotification({
        message: 'A dish with this name already exists in this category. Please choose a different name.',
        type: 'warning'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await api.put(`/dishes/${newDish.categoryId}/dish`, {
        name: newDish.name,
        priceHalf: newDish.hasHalfFull ? Number(newDish.priceHalf) : null,
        priceFull: newDish.hasHalfFull ? Number(newDish.priceFull) : null,
        price: newDish.hasHalfFull ? null : Number(newDish.price)
      });
      
      setNewDish({ categoryId: '', name: '', priceHalf: '', priceFull: '', price: '', hasHalfFull: true });
      setShowAddDishModal(false);
      await onUpdate();
      
      setNotification({
        message: 'Dish added successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding dish:', error);
      setNotification({
        message: error.status === 401 
          ? 'Your session has expired. Please log in again.'
          : error.status === 403
          ? 'You do not have permission to add dishes.'
          : 'Failed to add dish. Please check the details and try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDish = async (e) => {
    e.preventDefault();

    const category = categories.find(cat => cat._id === editingDish.categoryId);
    if (!category) {
      setNotification({
        message: 'Category not found. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }

    const isDuplicate = category.dishes.some(
      (dish) =>
        dish._id !== editingDish.dishId &&
        dish.name.toLowerCase() === editingDish.name.trim().toLowerCase()
    );

    if (isDuplicate) {
      setNotification({
        message: 'Another dish with this name already exists in this category. Please choose a different name.',
        type: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.put(`/dishes/${editingDish.categoryId}/dish/${editingDish.dishId}`, {
        name: editingDish.name,
        priceHalf: editingDish.hasHalfFull ? Number(editingDish.priceHalf) : null,
        priceFull: editingDish.hasHalfFull ? Number(editingDish.priceFull) : null,
        price: editingDish.hasHalfFull ? null : Number(editingDish.price)
      });
      
      setEditingDish(null);
      setShowEditDishModal(false);
      await onUpdate();
      
      setNotification({
        message: 'Dish updated successfully!',
        type: 'update'
      });
    } catch (error) {
      console.error('Error updating dish:', error);
      setNotification({
        message: error.status === 401 
          ? 'Your session has expired. Please log in again.'
          : error.status === 403
          ? 'You do not have permission to update dishes.'
          : 'Failed to update dish. Please check the details and try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (!category) {
      setNotification({
        message: 'Category not found. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }
    
    setConfirmDialog({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${category.categoryName}"? This will also delete all dishes in this category.`,
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await api.delete(`/dishes/${categoryId}`);
          await onUpdate();
          setNotification({
            message: `Category "${category.categoryName}" deleted successfully!`,
            type: 'delete'
          });
        } catch (error) {
          console.error('Error deleting category:', error);
          setNotification({
            message: error.status === 401 
              ? 'Your session has expired. Please log in again.'
              : error.status === 403
              ? 'You do not have permission to delete categories.'
              : 'Failed to delete category. Please try again.',
            type: 'error'
          });
        } finally {
          setIsLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleDeleteDish = (categoryId, dishId) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (!category) {
      setNotification({
        message: 'Category not found. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }
    
    const dish = category.dishes.find(d => d._id === dishId);
    if (!dish) {
      setNotification({
        message: 'Dish not found. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }
    
    setConfirmDialog({
      title: 'Delete Dish',
      message: `Are you sure you want to delete "${dish.name}" from ${category.categoryName}?`,
      confirmText: 'Delete Dish',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await api.delete(`/dishes/${categoryId}/dish/${dishId}`);
          await onUpdate();
          setNotification({
            message: `Dish "${dish.name}" deleted successfully!`,
            type: 'delete'
          });
        } catch (error) {
          console.error('Error deleting dish:', error);
          setNotification({
            message: error.status === 401 
              ? 'Your session has expired. Please log in again.'
              : error.status === 403
              ? 'You do not have permission to delete dishes.'
              : 'Failed to delete dish. Please try again.',
            type: 'error'
          });
        } finally {
          setIsLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const startEditingDish = (categoryId, dish) => {
    setEditingDish({
      categoryId,
      dishId: dish._id,
      name: dish.name,
      priceHalf: dish.priceHalf || '',
      priceFull: dish.priceFull || '',
      price: dish.price || '',
      hasHalfFull: !dish.price
    });
    setShowEditDishModal(true);
  };

  const openAddDishModal = () => {
    setNewDish({ 
      categoryId: categories.length > 0 ? categories[0]._id : '', 
      name: '', 
      priceHalf: '', 
      priceFull: '', 
      price: '', 
      hasHalfFull: true 
    });
    setShowAddDishModal(true);
  };

  return (
    <motion.div 
      className="p-6 bg-white rounded-lg shadow-md mb-6"
      {...fadeIn}
    >
      <div className="mb-6">
        <motion.h2 
          className="text-2xl font-bold mb-6 text-orange-700 border-b pb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Menu Management
        </motion.h2>

        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mb-6"
          {...fadeInUp}
          transition={{ delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {showCategoryInput ? (
              <motion.form 
                key="category-form"
                ref={categoryFormRef}
                onSubmit={handleAddCategory} 
                className="w-full"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New Category Name"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                    autoFocus
                  />
                  <div className="flex flex-row gap-2">
                    <motion.button 
                      type="submit" 
                      className="flex-1 bg-green-500 text-white px-3 sm:px-6 py-3 rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-1 text-sm sm:text-base"
                      disabled={isLoading}
                      whileHover={buttonHoverAnimation}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isLoading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></div>
                          <span className="ml-1">Adding...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button 
                      type="button" 
                      onClick={() => {
                        setShowCategoryInput(false);
                        setNewCategory('');
                      }}
                      className="flex-1 bg-gray-400 text-white px-3 sm:px-6 py-3 rounded-lg hover:bg-gray-500 transition-all duration-200 flex items-center justify-center text-sm sm:text-base"
                      whileHover={buttonHoverAnimation}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel</span>
                    </motion.button>
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.button
                key="add-category-button"
                onClick={() => setShowCategoryInput(true)}
                className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2"
                whileHover={buttonHoverAnimation}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Category</span>
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            onClick={openAddDishModal}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            whileHover={buttonHoverAnimation}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Dish</span>
          </motion.button>
        </motion.div>

        <motion.div 
          className="mt-8 space-y-6"
          variants={staggerChildren}
          initial="initial"
          animate="animate"
        >
          {categories.map((category, index) => (
            <motion.div 
              key={category._id} 
              className="mb-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              variants={listItem}
              custom={index}
              transition={{ delay: index * 0.05 }}
            >
              <div className="bg-gradient-to-r from-orange-100 to-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-orange-200">
                <h3 className="text-2xl font-bold text-orange-700">{category.categoryName}</h3>
                <motion.button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="text-sm px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all duration-200 flex items-center gap-2"
                  whileHover={buttonHoverAnimation}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Category</span>
                </motion.button>
              </div>
              
              <div className="p-4">
                {category.dishes.length === 0 ? (
                  <motion.div 
                    className="text-center py-8 text-gray-500 italic"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    No dishes in this category. Add your first dish!
                  </motion.div>
                ) : (
                  <motion.div 
                    className="space-y-4"
                    variants={staggerChildren}
                    initial="initial"
                    animate="animate"
                  >
                    {category.dishes.map((dish, dishIndex) => (
                      <motion.div 
                        key={dish._id} 
                        className="py-4 px-2 border-b last:border-b-0 hover:bg-gray-100 transition-colors duration-150 rounded"
                        variants={listItem}
                        custom={dishIndex}
                        whileHover={{ scale: 1.01, x: 5 }}
                        transition={{ delay: dishIndex * 0.05, duration: 0.2 }}
                      >
                        <div className="flex flex-col gap-3">
                          <div>
                            <span className="text-lg font-medium">{dish.name}</span>
                            <span className="text-gray-600 block sm:inline sm:ml-4">
                              {dish.price ? (
                                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">₹{dish.price}</span>
                              ) : dish.priceHalf || dish.priceFull ? (
                                <span>
                                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm mr-2">Half: ₹{dish.priceHalf || 'N/A'}</span>
                                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">Full: ₹{dish.priceFull || 'N/A'}</span>
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="flex flex-row gap-2">
                            <motion.button
                              onClick={() => startEditingDish(category._id, dish)}
                              className="w-1/2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap text-sm"
                              whileHover={buttonHoverAnimation}
                              whileTap={{ scale: 0.95 }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteDish(category._id, dish._id)}
                              className="w-1/2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap text-sm"
                              whileHover={buttonHoverAnimation}
                              whileTap={{ scale: 0.95 }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-700"></div>
              <span className="text-lg font-medium">Processing...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Dish Modal */}
      <DishModal
        isOpen={showAddDishModal}
        onClose={() => setShowAddDishModal(false)}
        title="Add New Dish"
        formData={newDish}
        setFormData={setNewDish}
        onSubmit={handleAddDish}
        categories={categories}
        isEditing={false}
        isLoading={isLoading}
      />

      {/* Edit Dish Modal */}
      <DishModal
        isOpen={showEditDishModal && editingDish !== null}
        onClose={() => {
          setShowEditDishModal(false);
          setEditingDish(null);
        }}
        title={`Edit Dish: ${editingDish?.name || ''}`}
        formData={editingDish || {}}
        setFormData={setEditingDish}
        onSubmit={handleUpdateDish}
        categories={categories}
        isEditing={true}
        isLoading={isLoading}
      />

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <ConfirmationDialog
            isOpen={true}
            onClose={() => setConfirmDialog(null)}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText || 'Confirm'}
            cancelText={confirmDialog.cancelText || 'Cancel'}
            type={confirmDialog.type}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MenuManager;
