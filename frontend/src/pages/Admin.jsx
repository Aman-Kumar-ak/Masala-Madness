import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import MenuManager from "../components/MenuManager";
import { fetchCategories } from "../utils/fetchCategories";
import BackButton from "../components/BackButton";
import Notification from "../components/Notification";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { useNotification } from "../components/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "../contexts/RefreshContext";
import { API_URL } from "../utils/config";

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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  const discountFormRef = useRef(null);

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

  useEffect(() => {
    // Handle clicks outside the discount form
    const handleClickOutside = (event) => {
      if (discountFormRef.current && !discountFormRef.current.contains(event.target) && showDiscountForm) {
        // Check if the click was on the discount toggle button
        const isDiscountButton = event.target.closest('button')?.getAttribute('data-discount-toggle') === 'true';
        
        if (!isDiscountButton) {
          setShowDiscountForm(false);
        }
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDiscountForm]);

  const toggleDiscountForm = () => {
    setShowDiscountForm(!showDiscountForm);
  };

  const closeDiscountForm = () => {
    setShowDiscountForm(false);
  };

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

  const handleRemoveDiscount = () => {
    if (!activeDiscount?._id) return;
    setShowDeleteConfirmation(true);
  };

  const confirmRemoveDiscount = async () => {
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
    } finally {
      setShowDeleteConfirmation(false);
    }
  };

  // Handler to notify after MenuManager updates (categories or dishes)
  const handleMenuUpdate = async () => {
    await loadCategories();
    setNotification({ message: "Categories/Dishes updated successfully", type: "success" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      <BackButton />
      <div className="p-4 pt-16">
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        <div className="bg-white shadow-md rounded-lg p-3 border border-orange-200">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Panel</h1>
          <div className="space-y-6">
            {/* Navigation Links - Larger buttons */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-3 sm:p-5 rounded-lg border border-orange-200 shadow-sm text-center">
              <div className="flex flex-wrap justify-center items-center gap-4">
                <Link
                  to="/orders"
                  className="inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-base font-medium transition-all duration-200 shadow-md focus:ring-2 focus:ring-blue-300 focus:outline-none whitespace-nowrap min-w-[120px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Orders</span>
                </Link>
                {showDiscountForm ? (
                  <button
                    data-discount-toggle="true"
                    onClick={closeDiscountForm}
                    className="inline-flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-base font-medium transition-all duration-200 shadow-md focus:ring-2 focus:ring-gray-300 focus:outline-none whitespace-nowrap min-w-[120px]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel</span>
                  </button>
                ) : (
                  <button
                    data-discount-toggle="true"
                    onClick={toggleDiscountForm}
                    className="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-base font-medium transition-all duration-200 shadow-md focus:ring-2 focus:ring-green-300 focus:outline-none whitespace-nowrap min-w-[120px]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Discount</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Discount Display */}
            {activeDiscount && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-lg border border-yellow-200 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl bg-yellow-100 h-10 w-10 rounded-full flex items-center justify-center shadow-sm">🏷️</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Active Discount</h3>
                        <p className="text-gray-700">
                          <span className="font-medium text-green-600">{activeDiscount.percentage}% off</span> on orders above <span className="font-medium">₹{activeDiscount.minOrderAmount}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveDiscount}
                    className="p-2.5 bg-red-50 hover:bg-red-100 active:bg-red-100 rounded-lg transition-colors duration-200 group focus:outline-none focus:ring-2 focus:ring-red-300 border border-red-200"
                    title="Remove Discount"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 text-red-500 group-hover:text-red-600 group-active:text-red-600 transition-colors duration-200" 
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
              <div 
                ref={discountFormRef}
                className="bg-gradient-to-r from-green-50 to-blue-50 p-5 rounded-lg border border-green-200 shadow-sm"
              >
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Discount</h3>
                <form onSubmit={handleDiscountSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="block w-full rounded-lg border-gray-300 shadow-sm py-2.5 px-4 bg-white focus:ring-2 focus:ring-green-300 focus:border-green-300 transition-all duration-200"
                      placeholder="Enter percentage (0-100)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="block w-full rounded-lg border-gray-300 shadow-sm py-2.5 px-4 bg-white focus:ring-2 focus:ring-green-300 focus:border-green-300 transition-all duration-200"
                      placeholder="Enter minimum amount"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-green-300 focus:outline-none shadow-sm flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Discount
                  </button>
                </form>
              </div>
            )}

            {/* Menu Manager */}
            {loading ? (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading categories...</p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-orange-50 to-blue-50 p-2 rounded-lg border border-blue-200 shadow-sm">
                <MenuManager categories={categories} onUpdate={handleMenuUpdate} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Discount Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmRemoveDiscount}
        title="Remove Discount"
        message="Are you sure you want to remove the active discount? This action cannot be undone."
        confirmText="Remove Discount"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Admin;
