import React, { useState } from 'react';
import BASE_URL from '../utils/api';

const MenuManager = ({ categories, onUpdate }) => {
  const [newCategory, setNewCategory] = useState('');
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

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const isDuplicate = categories.some(
      (cat) => cat.categoryName.toLowerCase() === newCategory.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert('Category already exists!');
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/dishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName: newCategory }),
      });
      if (response.ok) {
        setNewCategory('');
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleAddDish = async (e) => {
    e.preventDefault();
    const category = categories.find((cat) => cat._id === newDish.categoryId);
    if (!category) return;
    const isDuplicate = category.dishes.some(
      (dish) => dish.name.toLowerCase() === newDish.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert('Dish with this name already exists in this category!');
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
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding dish:', error);
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
      alert('Another dish with this name already exists in this category!');
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
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating dish:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const response = await fetch(`${BASE_URL}/dishes/${categoryId}`, {
        method: 'DELETE',
      });
      if (response.ok) onUpdate();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleDeleteDish = async (categoryId, dishId) => {
    if (!window.confirm('Are you sure you want to delete this dish?')) return;
    try {
      const response = await fetch(`${BASE_URL}/dishes/${categoryId}/dish/${dishId}`, {
        method: 'DELETE',
      });
      if (response.ok) onUpdate();
    } catch (error) {
      console.error('Error deleting dish:', error);
    }
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
    <div className="p-4 bg-white rounded-lg shadow-md mb-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Menu Management</h2>

        <form onSubmit={handleAddCategory} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New Category Name"
              className="flex-1 p-2 border rounded"
              required
            />
            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Add Category
            </button>
          </div>
        </form>

        <button
          onClick={() => setShowAddDish(!showAddDish)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        >
          {showAddDish ? 'Cancel' : 'Add New Dish'}
        </button>

        {showAddDish && (
          <form onSubmit={handleAddDish} className="mb-4 p-4 bg-gray-50 rounded">
            <div className="grid grid-cols-1 gap-4">
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
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Dish
              </button>
            </div>
          </form>
        )}

        <div className="mt-4">
          {categories.map((category) => (
            <div key={category._id} className="mb-4 p-4 bg-gray-50 rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{category.categoryName}</h3>
                <button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="bg-rose-500 text-white px-3 py-1 rounded hover:bg-rose-600 transition-colors duration-200"
                >
                  Delete Category
                </button>
              </div>
              <div className="pl-4">
                {category.dishes.map((dish) => (
                  <div key={dish._id} className="py-2">
                    {editingDish && editingDish.dishId === dish._id ? (
                      <form onSubmit={handleUpdateDish} className="space-y-2">
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
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editingDish.priceHalf}
                              onChange={(e) => setEditingDish({...editingDish, priceHalf: e.target.value})}
                              className="p-2 border rounded w-1/2"
                              placeholder="Half Price"
                              required
                            />
                            <input
                              type="number"
                              value={editingDish.priceFull}
                              onChange={(e) => setEditingDish({...editingDish, priceFull: e.target.value})}
                              className="p-2 border rounded w-1/2"
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
                        <div className="flex gap-2">
                          <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDish(null)}
                            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{dish.name}</span>
                          <span className="text-gray-600 ml-2">
                            {dish.price ? (
                              `(Price: ₹${dish.price})`
                            ) : dish.priceHalf || dish.priceFull ? (
                              `(Half: ₹${dish.priceHalf || 'N/A'}, Full: ₹${dish.priceFull || 'N/A'})`
                            ) : null}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditingDish(category._id, dish)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDish(category._id, dish._id)}
                            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 flex items-center gap-1"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuManager;
