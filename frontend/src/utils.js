// frontend/src/utils.js
export const fetchDishes = async () => {
    const response = await fetch('http://localhost:5000/api/dishes');
    const data = await response.json();
    return data;
  };
  