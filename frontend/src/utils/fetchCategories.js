// src/utils/fetchCategories.js
import { api } from './api';

export const fetchCategories = async () => {
  try {
    const data = await api.get('/dishes');
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
