// src/pages/Home.jsx
import React from 'react';

const Home = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-yellow-200 to-red-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-red-700 mb-4">🍛 Masala Madness</h1>
      <p className="text-gray-800 text-center">
        If you're seeing this, your mobile-first setup is working!
      </p>
    </div>
  );
};

export default Home;
