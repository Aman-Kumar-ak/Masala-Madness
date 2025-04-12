const addTestData = async () => {
  try {
    // Add category
    const categoryResponse = await fetch('http://localhost:5000/api/dishes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categoryName: 'Momos',
      }),
    });

    const categoryData = await categoryResponse.json();
    console.log('Category created:', categoryData);

    // Add dish to category
    const dishResponse = await fetch(`http://localhost:5000/api/dishes/${categoryData.category._id}/dish`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Veg Momos',
        priceHalf: 25,
        priceFull: 45,
      }),
    });

    const dishData = await dishResponse.json();
    console.log('Dish added:', dishData);
  } catch (error) {
    console.error('Error:', error);
  }
};

addTestData();
