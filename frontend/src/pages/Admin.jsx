import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MenuManager from "../components/MenuManager";
import { fetchCategories } from "../utils/fetchCategories";
import BackButton from "../components/BackButton";
import Notification from "../components/Notification";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Admin = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState(null);
  const [newDiscount, setNewDiscount] = useState({
    percentage: '',
    minOrderAmount: '',
    isActive: true
  });
  const [notification, setNotification] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      setNotification({ message: 'Failed to load categories', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveDiscount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/discounts/active`);
      if (response.ok) {
        const data = await response.json();
        setActiveDiscount(data);
      }
    } catch (error) {
      console.error('Error loading active discount:', error);
      setNotification({ message: 'Failed to load active discount', type: 'error' });
    }
  };

  useEffect(() => {
    loadCategories();
    loadActiveDiscount();
  }, []);

  const handleDiscountSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/discounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newDiscount,
          percentage: Number(newDiscount.percentage),
          minOrderAmount: Number(newDiscount.minOrderAmount)
        }),
      });

      if (response.ok) {
        setShowDiscountForm(false);
        setNewDiscount({ percentage: '', minOrderAmount: '', isActive: true });
        await loadActiveDiscount();
        setNotification({ message: "Discount saved successfully", type: "success" });
      } else {
        const errorData = await response.json();
        setNotification({ message: errorData.message || "Failed to save discount", type: "error" });
      }
    } catch (error) {
      console.error('Error creating discount:', error);
      setNotification({ message: "Error creating discount: " + error.message, type: 'error' });
    }
  };

  const handleRemoveDiscount = async () => {
    if (!activeDiscount?._id) return;

    if (window.confirm('Are you sure you want to remove this discount?')) {
      try {
        const response = await fetch(`${API_URL}/api/discounts/${activeDiscount._id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete discount');
        }

        // Clear the active discount from local state
        setActiveDiscount(null);
        setNotification({ message: "Discount removed successfully", type: "success" });

        // Trigger a refresh of the active discount
        loadActiveDiscount();
      } catch (error) {
        console.error('Error removing discount:', error);
        setNotification({ message: "Failed to remove discount. Please try again.", type: "error" });
      }
    }
  };

  // Handler to notify after MenuManager updates (categories or dishes)
  const handleMenuUpdate = async () => {
    await loadCategories();
    setNotification({ message: "Categories/Dishes updated successfully", type: "success" });
  };

  return (
    <div className="min-h-screen bg-orange-100">
      <BackButton />
      <div className="p-4 pt-16">
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
          <div className="space-y-4">
            {/* Navigation Links */}
            <div className="bg-orange-50 p-4 rounded-lg flex flex-wrap gap-4">
              <Link
                to="/orders"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                View Orders
              </Link>
              <button
                onClick={() => setShowDiscountForm(!showDiscountForm)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {showDiscountForm ? 'Cancel' : 'Add Discount'}
              </button>
            </div>

            {/* Active Discount Display */}
            {activeDiscount && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🏷️</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Active Discount</h3>
                        <p className="text-gray-600">
                          {activeDiscount.percentage}% off on orders above ₹{activeDiscount.minOrderAmount}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveDiscount}
                    className="p-2 hover:bg-red-100 active:bg-red-100 rounded-full transition-colors duration-200 group focus:outline-none focus:ring-2 focus:ring-red-300"
                    title="Remove Discount"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-6 w-6 text-red-500 group-hover:text-red-600 group-active:text-red-600 transition-colors duration-200" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Discount Form */}
            {showDiscountForm && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Add New Discount</h3>
                <form onSubmit={handleDiscountSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Discount Percentage
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={newDiscount.percentage}
                      onChange={(e) => setNewDiscount({
                        ...newDiscount,
                        percentage: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                      placeholder="Enter percentage (0-100)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Minimum Order Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newDiscount.minOrderAmount}
                      onChange={(e) => setNewDiscount({
                        ...newDiscount,
                        minOrderAmount: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                      placeholder="Enter minimum amount"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
                  >
                    Save Discount
                  </button>
                </form>
              </div>
            )}

            {/* Menu Manager */}
            {loading ? (
              <div className="text-center py-4">Loading categories...</div>
            ) : (
              <div className="bg-orange-50 p-4 rounded-lg">
                <MenuManager categories={categories} onUpdate={handleMenuUpdate} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
