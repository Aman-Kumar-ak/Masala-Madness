import React from "react";
import { Link } from 'react-router-dom'; // Make sure this exists
import Menu from "../components/Menu";

export default function Home() {
  return (
    <div className="min-h-screen bg-orange-100">
      <div className="bg-white shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl text-center font-bold py-4">Masala Madness</h1>
          {/* Add Cart Link here */}
          <div className="text-center py-4">
            <Link
              to="/cart" // Link to the Cart page
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Go to Cart
            </Link>
          </div>
        </div>
      </div>
      <Menu />
    </div>
  );
}
