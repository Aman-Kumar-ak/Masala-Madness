// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';
import { CartProvider } from './components/CartContext'; // ✅ IMPORT

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider> {/* ✅ WRAP HERE */}
        <App />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
);
