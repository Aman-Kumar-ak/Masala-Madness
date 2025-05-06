import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

import { CartProvider } from './components/CartContext'; // ✅ Import the CartProvider
import { RefreshProvider } from './contexts/RefreshContext'; // ✅ Import the RefreshProvider
import { initializeFastImageLoading } from './utils/imageOptimizations'; // Import image optimization

// Initialize image optimizations
initializeFastImageLoading();

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <RefreshProvider> {/* ✅ Wrap your entire app inside RefreshProvider */}
      <CartProvider> {/* ✅ Wrap your entire app inside CartProvider */}
        <App />
      </CartProvider>
    </RefreshProvider>
  </BrowserRouter>
);
