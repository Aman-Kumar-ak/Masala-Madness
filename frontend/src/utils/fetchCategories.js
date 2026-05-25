// src/utils/fetchCategories.js
import { api } from './api';
import { appendQueryParams } from './location';

export const fetchCategories = async (locationId = '') => {
  try {
    const endpoint = appendQueryParams('/dishes', { locationId });
    const data = await api.get(endpoint);
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from server');
    }
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};
