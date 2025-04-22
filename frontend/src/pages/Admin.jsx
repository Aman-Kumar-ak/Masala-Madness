import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MenuManager from "../components/MenuManager";
import { fetchCategories } from "../utils/fetchCategories";
import BackButton from "../components/BackButton";

const Admin = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="min-h-screen bg-orange-100">
      <BackButton />
      <div className="p-4 pt-16">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <Link
                to="/orders"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                View Orders
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-4">Loading categories...</div>
            ) : (
              <div className="bg-orange-50 p-4 rounded-lg">
                <MenuManager categories={categories} onUpdate={loadCategories} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
