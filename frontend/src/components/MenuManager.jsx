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
        throw new Error('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      setNotification({
        message: 'Failed to add category',
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
        throw new Error('Failed to add dish');
      }
    } catch (error) {
      console.error('Error adding dish:', error);
      setNotification({
        message: 'Failed to add dish: ' + error.message,
        type: 'error'
      });
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
      }
    } catch (error) {
      console.error('Error updating dish:', error);
      setNotification({
        message: 'Failed to update dish',
        type: 'error'
      });
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    setConfirmDialog({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category?',
      type: 'danger',
      onConfirm: async () => {
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
          }
          setConfirmDialog(null);
        } catch (error) {
          console.error('Error deleting category:', error);
          setNotification({
            message: 'Failed to delete category',
            type: 'error'
          });
        }
      }
    });
  };

  const handleDeleteDish = async (categoryId, dishId) => {
    setConfirmDialog({
      title: 'Delete Dish',
      message: 'Are you sure you want to delete this dish?',
      type: 'danger',
      onConfirm: async () => {
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
          }
          setConfirmDialog(null);
        } catch (error) {
          console.error('Error deleting dish:', error);
          setNotification({
            message: 'Failed to delete dish',
            type: 'error'
          });
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
        <h2 className="text-2xl font-bold mb-4">Menu Management</h2>

        <div className="mb-3">  {/* Increased bottom margin for desktop */}
          {showCategoryInput ? (
            <form onSubmit={handleAddCategory} className="mb-6">
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
                    className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 whitespace-nowrap transition-all duration-200"
                  >
                    Add Category
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
              className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all duration-200"
            >
              Add Category
            </button>
          )}
        </div>

        <button
          onClick={() => setShowAddDish(!showAddDish)}
          className="w-full sm:w-auto bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 mb-6 transition-all duration-200"
        >
          {showAddDish ? 'Cancel' : 'Add New Dish'}
        </button>

        {showAddDish && (
          <form onSubmit={handleAddDish} className="mb-6 p-6 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 gap-6">
              <select
                value={newDish.categoryId}
                onChange={(e) => setNewDish({...newDish, categoryId: e.target.value})}
                className="p-2 border rounded"
                required
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.categoryName}</option>
                ))}
              </select>
              <input
                type="text"
                value={newDish.name}
                onChange={(e) => setNewDish({...newDish, name: e.target.value})}
                placeholder="Dish Name"
                className="p-2 border rounded"
                required
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasHalfFull"
                  checked={newDish.hasHalfFull}
                  onChange={(e) => setNewDish({...newDish, hasHalfFull: e.target.checked})}
                  className="h-4 w-4"
                />
                <label htmlFor="hasHalfFull">Has Half/Full options</label>
              </div>
              {newDish.hasHalfFull ? (
                <>
                  <input
                    type="number"
                    value={newDish.priceHalf}
                    onChange={(e) => setNewDish({...newDish, priceHalf: e.target.value})}
                    placeholder="Half Price"
                    className="p-2 border rounded"
                    required
                  />
                  <input
                    type="number"
                    value={newDish.priceFull}
                    onChange={(e) => setNewDish({...newDish, priceFull: e.target.value})}
                    placeholder="Full Price"
                    className="p-2 border rounded"
                    required
                  />
                </>
              ) : (
                <input
                  type="number"
                  value={newDish.price}
                  onChange={(e) => setNewDish({...newDish, price: e.target.value})}
                  placeholder="Price"
                  className="p-2 border rounded"
                  required
                />
              )}
              <button
                type="submit"
                className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Dish
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-6">
          {categories.map((category) => (
            <div key={category._id} className="mb-6 p-6 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-2xl font-bold text-orange-700">{category.categoryName}</h3>
                <button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="text-sm px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all duration-200"
                >
                  Delete Category
                </button>
              </div>
              <hr className="my-4 border-gray-300" />
              <div className="pl-0 sm:pl-6 space-y-4">
                {category.dishes.map((dish) => (
                  <div key={dish._id} className="py-4 border-b last:border-b-0">
                    {editingDish && editingDish.dishId === dish._id ? (
                      <form onSubmit={handleUpdateDish} className="space-y-4">
                        <input
                          type="text"
                          value={editingDish.name}
                          onChange={(e) => setEditingDish({...editingDish, name: e.target.value})}
                          className="p-2 border rounded w-full"
                          required
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="editHasHalfFull"
                            checked={editingDish.hasHalfFull}
                            onChange={(e) => setEditingDish({...editingDish, hasHalfFull: e.target.checked})}
                            className="h-4 w-4"
                          />
                          <label htmlFor="editHasHalfFull">Has Half/Full options</label>
                        </div>
                        {editingDish.hasHalfFull ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="number"
                              value={editingDish.priceHalf}
                              onChange={(e) => setEditingDish({...editingDish, priceHalf: e.target.value})}
                              className="p-2 border rounded w-full sm:w-1/2"
                              placeholder="Half Price"
                              required
                            />
                            <input
                              type="number"
                              value={editingDish.priceFull}
                              onChange={(e) => setEditingDish({...editingDish, priceFull: e.target.value})}
                              className="p-2 border rounded w-full sm:w-1/2"
                              placeholder="Full Price"
                              required
                            />
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={editingDish.price}
                            onChange={(e) => setEditingDish({...editingDish, price: e.target.value})}
                            className="p-2 border rounded w-full"
                            placeholder="Price"
                            required
                          />
                        )}
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button type="submit" className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all duration-200">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDish(null)}
                            className="w-full sm:w-auto bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <span className="text-lg font-medium">{dish.name}</span>
                          <span className="text-gray-600 block sm:inline sm:ml-4">
                            {dish.price ? (
                              `₹${dish.price}`
                            ) : dish.priceHalf || dish.priceFull ? (
                              `Half: ₹${dish.priceHalf || 'N/A'} • Full: ₹${dish.priceFull || 'N/A'}`
                            ) : null}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                          <button
                            onClick={() => startEditingDish(category._id, dish)}
                            className="w-full sm:w-auto px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDish(category._id, dish._id)}
                            className="w-full sm:w-auto px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            </div>
          ))}
        </div>
      </div>

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
          type={confirmDialog.type}
        />
      )}
    </div>
  );
};

export default MenuManager;
