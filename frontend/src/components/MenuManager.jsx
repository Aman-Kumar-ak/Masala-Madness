import React, { useState } from 'react';
import BASE_URL from '../utils/api';

const MenuManager = ({ categories, onUpdate }) => {
  const [newCategory, setNewCategory] = useState('');
  const [newDish, setNewDish] = useState({
    categoryId: '',
    name: '',
    priceHalf: '',
    priceFull: ''
  });
  const [editingDish, setEditingDish] = useState(null);
  const [showAddDish, setShowAddDish] = useState(false);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/dishes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    try {
      const response = await fetch(`${BASE_URL}/dishes/${newDish.categoryId}/dish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDish.name,
          priceHalf: Number(newDish.priceHalf),
          priceFull: Number(newDish.priceFull),
        }),
      });
      if (response.ok) {
        setNewDish({
          categoryId: '',
          name: '',
          priceHalf: '',
          priceFull: ''
        });
        setShowAddDish(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding dish:', error);
    }
  };

  const handleUpdateDish = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/dishes/${editingDish.categoryId}/dish/${editingDish.dishId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingDish.name,
          priceHalf: Number(editingDish.priceHalf),
          priceFull: Number(editingDish.priceFull),
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
      if (response.ok) {
        onUpdate();
      }
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
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting dish:', error);
    }
  };

  const startEditingDish = (categoryId, dish) => {
    setEditingDish({
      categoryId,
      dishId: dish._id,
      name: dish.name,
      priceHalf: dish.priceHalf,
      priceFull: dish.priceFull
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Menu Management</h2>
        
        {/* Add Category Form */}
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
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Category
            </button>
          </div>
        </form>

        {/* Add Dish Button */}
        <button
          onClick={() => setShowAddDish(!showAddDish)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        >
          {showAddDish ? 'Cancel' : 'Add New Dish'}
        </button>

        {/* Add Dish Form */}
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
                  <option key={category._id} value={category._id}>
                    {category.categoryName}
                  </option>
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
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Dish
              </button>
            </div>
          </form>
        )}

        {/* Categories and Dishes List */}
        <div className="mt-4">
          {categories.map((category) => (
            <div key={category._id} className="mb-4 p-4 bg-gray-50 rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{category.categoryName}</h3>
                <button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
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
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                          >
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
                            (Half: ₹{dish.priceHalf}, Full: ₹{dish.priceFull})
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditingDish(category._id, dish)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDish(category._id, dish._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
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
