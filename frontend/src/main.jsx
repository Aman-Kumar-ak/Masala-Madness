import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

import { CartProvider } from './components/CartContext'; // ✅ Import the CartProvider

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <CartProvider> {/* ✅ Wrap your entire app inside CartProvider */}
      <App />
    </CartProvider>
  </BrowserRouter>
);
