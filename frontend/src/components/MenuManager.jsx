import React, { useState } from 'react';
import BASE_URL from '../utils/api';
import Notification from './Notification';
import ConfirmationDialog from './ConfirmationDialog';

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
  const [showAddDish, setShowAddDish] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const categoryName = newCategory.trim();
    if (!categoryName) {
      setNotification({
        message: 'Category name cannot be empty',
        type: 'error'
      });
      return;
    }

    const isDuplicate = categories.some(
      (cat) => cat.categoryName.toLowerCase() === categoryName.toLowerCase()
    );
    if (isDuplicate) {
      setNotification({
        message: 'Category already exists!',
        type: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/dishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName }),
      });
      
      if (response.ok) {
        setNewCategory('');
        setShowCategoryInput(false); // Hide the input after successful addition
        await onUpdate();
        setNotification({
          message: 'Category added successfully!',
          type: 'success'
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      setNotification({
        message: error.message || 'Failed to add category',
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
        message: 'Please select a category',
        type: 'warning'
      });
      return;
    }

    const category = categories.find((cat) => cat._id === newDish.categoryId);
    if (!category) {
      setNotification({
        message: 'Selected category not found',
        type: 'error'
      });
      return;
    }

    const isDuplicate = category.dishes.some(
      (dish) => dish.name.toLowerCase() === newDish.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      setNotification({
        message: 'Dish with this name already exists in this category!',
        type: 'warning'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/dishes/${newDish.categoryId}/dish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDish.name,
          priceHalf: newDish.hasHalfFull ? Number(newDish.priceHalf) : null,
          priceFull: newDish.hasHalfFull ? Number(newDish.priceFull) : null,
          price: newDish.hasHalfFull ? null : Number(newDish.price)
        }),
      });
      if (response.ok) {
        setNewDish({ categoryId: '', name: '', priceHalf: '', priceFull: '', price: '', hasHalfFull: true });
        setShowAddDish(false);
        await onUpdate();
        setNotification({
          message: 'Dish added successfully!',
          type: 'success'
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add dish');
      }
    } catch (error) {
      console.error('Error adding dish:', error);
      setNotification({
        message: error.message || 'Failed to add dish',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDish = async (e) => {
    e.preventDefault();

    const category = categories.find(cat => cat._id === editingDish.categoryId);
    if (!category) return;

    const isDuplicate = category.dishes.some(
      (dish) =>
        dish._id !== editingDish.dishId &&
        dish.name.toLowerCase() === editingDish.name.trim().toLowerCase()
    );

    if (isDuplicate) {
      setNotification({
        message: 'Another dish with this name already exists in this category!',
        type: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/dishes/${editingDish.categoryId}/dish/${editingDish.dishId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingDish.name,
          priceHalf: editingDish.hasHalfFull ? Number(editingDish.priceHalf) : null,
          priceFull: editingDish.hasHalfFull ? Number(editingDish.priceFull) : null,
          price: editingDish.hasHalfFull ? null : Number(editingDish.price)
        }),
      });
      if (response.ok) {
        setEditingDish(null);
        await onUpdate();
        setNotification({
          message: 'Dish updated successfully!',
          type: 'success'
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update dish');
      }
    } catch (error) {
      console.error('Error updating dish:', error);
      setNotification({
        message: error.message || 'Failed to update dish',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (!category) return;
    
    setConfirmDialog({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${category.categoryName}"? This will also delete all dishes in this category.`,
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${BASE_URL}/dishes/${categoryId}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            await onUpdate();
            setNotification({
              message: 'Category deleted successfully!',
              type: 'success'
            });
          } else {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete category');
          }
        } catch (error) {
          console.error('Error deleting category:', error);
          setNotification({
            message: error.message || 'Failed to delete category',
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
    if (!category) return;
    
    const dish = category.dishes.find(d => d._id === dishId);
    if (!dish) return;
    
    setConfirmDialog({
      title: 'Delete Dish',
      message: `Are you sure you want to delete "${dish.name}" from ${category.categoryName}?`,
      confirmText: 'Delete Dish',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${BASE_URL}/dishes/${categoryId}/dish/${dishId}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            await onUpdate();
            setNotification({
              message: 'Dish deleted successfully!',
              type: 'success'
            });
          } else {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete dish');
          }
        } catch (error) {
          console.error('Error deleting dish:', error);
          setNotification({
            message: error.message || 'Failed to delete dish',
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
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md mb-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-6 text-orange-700 border-b pb-3">Menu Management</h2>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {showCategoryInput ? (
            <form onSubmit={handleAddCategory} className="w-full">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New Category Name"
                  className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Adding...' : 'Add Category'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowCategoryInput(false);
                      setNewCategory('');
                    }}
                    className="w-full sm:w-auto bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 whitespace-nowrap transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCategoryInput(true)}
              className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Category</span>
            </button>
          )}

          <button
            onClick={() => setShowAddDish(!showAddDish)}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${showAddDish ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'} text-white whitespace-nowrap`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showAddDish ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              )}
            </svg>
            <span>{showAddDish ? 'Cancel' : 'Add Dish'}</span>
          </button>
        </div>

        {showAddDish && (
          <form onSubmit={handleAddDish} className="mb-6 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">Add New Dish</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="form-group">
                <label className="block text-base font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  <select
                    value={newDish.categoryId}
                    onChange={(e) => setNewDish({...newDish, categoryId: e.target.value})}
                    className="w-full p-3 pr-10 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-none focus:border-transparent text-gray-700 cursor-pointer text-base"
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
              </div>
              
              <div className="form-group">
                <label className="block text-base font-medium text-gray-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  value={newDish.name}
                  onChange={(e) => setNewDish({...newDish, name: e.target.value})}
                  placeholder="Enter dish name"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="form-group">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="hasHalfFull"
                    checked={newDish.hasHalfFull}
                    onChange={(e) => setNewDish({...newDish, hasHalfFull: e.target.checked})}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <label htmlFor="hasHalfFull" className="text-sm font-medium text-gray-700">Has Half/Full options</label>
                </div>
                
                {newDish.hasHalfFull ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Half Price (₹)</label>
                      <input
                        type="number"
                        value={newDish.priceHalf}
                        onChange={(e) => setNewDish({...newDish, priceHalf: e.target.value})}
                        placeholder="Enter half price"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Price (₹)</label>
                      <input
                        type="number"
                        value={newDish.priceFull}
                        onChange={(e) => setNewDish({...newDish, priceFull: e.target.value})}
                        placeholder="Enter full price"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={newDish.price}
                      onChange={(e) => setNewDish({...newDish, price: e.target.value})}
                      placeholder="Enter price"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                )}
              </div>
              
              <div className="mt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Dish</span>
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="mt-8 space-y-6">
          {categories.map((category) => (
            <div key={category._id} className="mb-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-100 to-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-orange-200">
                <h3 className="text-2xl font-bold text-orange-700">{category.categoryName}</h3>
                <button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="text-sm px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all duration-200 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Category</span>
                </button>
              </div>
              
              <div className="p-4">
                {category.dishes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 italic">
                    No dishes in this category. Add your first dish!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {category.dishes.map((dish) => (
                      <div key={dish._id} className="py-4 px-2 border-b last:border-b-0 hover:bg-gray-100 transition-colors duration-150 rounded">
                        {editingDish && editingDish.dishId === dish._id ? (
                          <form onSubmit={handleUpdateDish} className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
                            <h4 className="font-medium text-blue-600">Edit Dish</h4>
                            <div className="form-group">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Dish Name</label>
                              <input
                                type="text"
                                value={editingDish.name}
                                onChange={(e) => setEditingDish({...editingDish, name: e.target.value})}
                                className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              />
                            </div>
                            
                            <div className="form-group">
                              <div className="flex items-center gap-2 mb-4">
                                <input
                                  type="checkbox"
                                  id="editHasHalfFull"
                                  checked={editingDish.hasHalfFull}
                                  onChange={(e) => setEditingDish({...editingDish, hasHalfFull: e.target.checked})}
                                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                                />
                                <label htmlFor="editHasHalfFull" className="text-sm font-medium text-gray-700">Has Half/Full options</label>
                              </div>
                              
                              {editingDish.hasHalfFull ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Half Price (₹)</label>
                                    <input
                                      type="number"
                                      value={editingDish.priceHalf}
                                      onChange={(e) => setEditingDish({...editingDish, priceHalf: e.target.value})}
                                      className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Half Price"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Price (₹)</label>
                                    <input
                                      type="number"
                                      value={editingDish.priceFull}
                                      onChange={(e) => setEditingDish({...editingDish, priceFull: e.target.value})}
                                      className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Full Price"
                                      required
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                  <input
                                    type="number"
                                    value={editingDish.price}
                                    onChange={(e) => setEditingDish({...editingDish, price: e.target.value})}
                                    className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Price"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-row gap-2 pt-2">
                              <button 
                                type="submit" 
                                className="w-1/2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap text-sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDish(null)}
                                className="w-1/2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap text-sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Cancel</span>
                              </button>
                            </div>
                          </form>
                        ) : (
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
                              <button
                                onClick={() => startEditingDish(category._id, dish)}
                                className="w-1/2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap text-sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteDish(category._id, dish._id)}
                                className="w-1/2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap text-sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-700"></div>
            <span className="text-lg font-medium">Processing...</span>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Confirmation Dialog */}
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
    </div>
  );
};

export default MenuManager;
