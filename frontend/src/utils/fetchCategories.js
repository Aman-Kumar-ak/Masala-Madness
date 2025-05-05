// src/utils/fetchCategories.js
import { API_BASE_URL } from "./api";

export const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/dishes`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from server');
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    // Re-throw the error to be handled by the component
    throw error;
  }
};
