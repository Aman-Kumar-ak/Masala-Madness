// src/utils/fetchCategories.js
import BASE_URL from "./api";

export const fetchCategories = async () => {
  try {
    const res = await fetch(`${BASE_URL}/dishes`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};
