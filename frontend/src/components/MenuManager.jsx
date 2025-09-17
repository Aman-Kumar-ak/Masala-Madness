import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { API_BASE_URL } from '../utils/api';
import Notification from './Notification';
import ConfirmationDialog from './ConfirmationDialog';
import DishModal from './DishModal';
import { fadeIn, fadeInUp, staggerChildren, listItem } from '../utils/animations';
import { getCategoryEmoji } from '../utils/helpers';

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
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isDeletingDish, setIsDeletingDish] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const markUpdatedNow = () => {
    setLastUpdatedAt(new Date());
  };

  const formatUpdatedAt = (date) => {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch (e) {
      return date.toLocaleString();
    }
  };

  
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

  useEffect(() => {
    if (showAddDishModal || showEditDishModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset'; // Ensure cleanup on unmount
    };
  }, [showAddDishModal, showEditDishModal]);

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

    setIsAddingCategory(true);
    try {
      await api.post('/dishes', { categoryName });
      setNewCategory('');
      setShowCategoryInput(false);
      await onUpdate();
      markUpdatedNow();
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
      setIsAddingCategory(false);
    }
  };

  const handleAddDish = async (newDishData) => {
    // No e.preventDefault() needed here as the event is handled in DishModal
    if (!newDishData.categoryId) {
      setNotification({
        message: 'Please select a category for the dish',
        type: 'warning'
      });
      return;
    }

    const category = categories.find((cat) => cat._id === newDishData.categoryId);
    if (!category) {
      setNotification({
        message: 'Selected category not found. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }

    const isDuplicate = category.dishes.some(
      (dish) => dish.name.toLowerCase() === newDishData.name.trim().toLowerCase()
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
      await api.put(`/dishes/${newDishData.categoryId}/dish`, {
        name: newDishData.name,
        priceHalf: newDishData.hasHalfFull ? (newDishData.priceHalf === '' ? null : Number(newDishData.priceHalf)) : null,
        priceFull: newDishData.hasHalfFull ? (newDishData.priceFull === '' ? null : Number(newDishData.priceFull)) : null,
        price: newDishData.hasHalfFull ? null : (newDishData.price === '' ? null : Number(newDishData.price))
      });
      
      setNewDish({ categoryId: '', name: '', priceHalf: '', priceFull: '', price: '', hasHalfFull: true });
      setShowAddDishModal(false);
      await onUpdate();
      markUpdatedNow();
      
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

  const handleUpdateDish = async (updatedDishData) => {
    // No e.preventDefault() needed here as the event is handled in DishModal

    const category = categories.find(cat => cat._id === updatedDishData.categoryId);
    if (!category) {
      setNotification({
        message: 'Category not found. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }

    const isDuplicate = category.dishes.some(
      (dish) =>
        dish._id !== updatedDishData.dishId &&
        dish.name.toLowerCase() === updatedDishData.name.trim().toLowerCase()
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
      await api.put(`/dishes/${updatedDishData.categoryId}/dish/${updatedDishData.dishId}`, {
        name: updatedDishData.name,
        priceHalf: updatedDishData.hasHalfFull ? (updatedDishData.priceHalf === '' ? null : Number(updatedDishData.priceHalf)) : null,
        priceFull: updatedDishData.hasHalfFull ? (updatedDishData.priceFull === '' ? null : Number(updatedDishData.priceFull)) : null,
        price: updatedDishData.hasHalfFull ? null : (updatedDishData.price === '' ? null : Number(updatedDishData.price))
      });
      
      setEditingDish(null);
      setShowEditDishModal(false);
      await onUpdate();
      markUpdatedNow();
      
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
        setConfirmDialog(null);
        setIsDeletingCategory(true);
        setShowSplashScreen(true);
        try {
          await api.delete(`/dishes/${categoryId}`);
          await onUpdate();
          markUpdatedNow();
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
          setIsDeletingCategory(false);
          setShowSplashScreen(false);
        }
      },
      isLoading: isDeletingCategory,
      loadingText: 'Deleting...'
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
        setConfirmDialog(null);
        setIsDeletingDish(true);
        setShowSplashScreen(true);
        try {
          await api.delete(`/dishes/${categoryId}/dish/${dishId}`);
          await onUpdate();
          markUpdatedNow();
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
          setIsDeletingDish(false);
          setShowSplashScreen(false);
        }
      },
      isLoading: isDeletingDish,
      loadingText: 'Deleting...'
    });
  };

  const startEditingDish = (categoryId, dish) => {
    setEditingDish({
      categoryId,
      dishId: dish._id,
      name: dish.name,
      priceHalf: dish.priceHalf ?? '',
      priceFull: dish.priceFull ?? '',
      price: dish.price ?? '',
      hasHalfFull: dish.price === null || dish.price === undefined
    });
    setShowEditDishModal(true);
  };

  const openAddDishModal = (categoryId) => {
    setNewDish({ 
      categoryId, 
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
        <motion.div
          className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between mb-6 border-b pb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-orange-700 text-center sm:text-left">Menu Management</h2>
          {lastUpdatedAt && (
            <div className="text-xs text-gray-500 whitespace-nowrap mt-2 sm:mt-0 text-center sm:text-right">
              Updated at - {formatUpdatedAt(lastUpdatedAt)}
            </div>
          )}
        </motion.div>

        <motion.div 
          className="flex flex-col gap-4 mb-6"
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
                      className="flex-1 bg-green-500 text-white px-3 sm:px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 text-sm sm:text-base"
                      disabled={isAddingCategory}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isAddingCategory ? (
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
                      className="flex-1 bg-gray-400 text-white px-3 sm:px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center text-sm sm:text-base"
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
                className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
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
            onClick={() => openAddDishModal(categories.length > 0 ? categories[0]._id : '')}
            className="w-full sm:w-auto bg-blue-500 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
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
          {categories.map((category) => (
            <motion.div key={category._id} variants={listItem} className="mb-6 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-xl">{getCategoryEmoji(category.categoryName)}</span>
                  <span>{category.categoryName}</span>
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openAddDishModal(category._id)}
                    className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors duration-200 shadow-sm"
                    title="Add new dish"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <button
                  onClick={() => handleDeleteCategory(category._id)}
                    className={`p-1.5 rounded-full transition-colors duration-200 shadow-sm ${
                      isDeletingCategory
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                    title="Delete category"
                    disabled={isDeletingDish || isDeletingCategory}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  </button>
                </div>
              </div>
              <div className="p-4">
                {category.dishes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No dishes in this category yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {category.dishes
                      .sort((a, b) => a.name.localeCompare(b.name)) // Sort dishes alphabetically
                      .map((dish) => (
                        <li key={dish._id} className="bg-gray-50 p-3 rounded-md flex flex-col justify-between shadow-sm border border-gray-100">
                          <span className="font-medium text-gray-800 text-base flex-1 pr-2 mb-2">{dish.name}</span>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {dish.priceHalf && dish.priceFull ? (
                                <span className="text-gray-600 text-sm">H: ₹{dish.priceHalf} / F: ₹{dish.priceFull}</span>
                              ) : (
                                <span className="text-gray-600 text-sm">₹{dish.price}</span>
                              )}
                          </div>
                            <div className="flex items-center space-x-2">
                              <button
                              onClick={() => startEditingDish(category._id, dish)}
                                className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-200"
                                title="Edit dish"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              </button>
                              <button
                              onClick={() => handleDeleteDish(category._id, dish._id)}
                                className={`p-1.5 rounded-full transition-colors duration-200 ${
                                  isDeletingDish
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                                title="Delete dish"
                                disabled={isDeletingDish || isDeletingCategory}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              </button>
                            </div>
                          </div>
                        </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && !showAddDishModal && !showEditDishModal && (
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
        onSubmit={handleAddDish}
        categories={categories}
        initialDishData={{ categoryId: newDish.categoryId, name: '', priceHalf: '', priceFull: '', price: '', hasHalfFull: true }}
        isLoading={isLoading}
        formType="add"
      />

      {/* Edit Dish Modal */}
      <DishModal
        isOpen={showEditDishModal}
        onClose={() => setShowEditDishModal(false)}
        onSubmit={handleUpdateDish}
        categories={categories}
        initialDishData={editingDish}
        isLoading={isLoading}
        formType="edit"
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
            isLoading={confirmDialog.isLoading}
            loadingText={confirmDialog.loadingText}
          />
        )}
      </AnimatePresence>

      {/* Full-screen Loading Splash Screen for Deletions */}
      <AnimatePresence>
        {showSplashScreen && (
          <motion.div 
            className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-[100] flex items-center justify-center flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
            <p className="text-gray-700 text-xl font-medium">Deleting...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MenuManager;
