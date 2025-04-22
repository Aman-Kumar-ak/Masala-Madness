// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import './style.css';
import { CartProvider } from './components/CartContext';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import Orders from './pages/Orders';

// Create router with future flags enabled
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/cart", element: <Cart /> },
        { path: "/admin", element: <Admin /> },
        { path: "/orders", element: <Orders /> }
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    },
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <CartProvider>
    <RouterProvider router={router} />
  </CartProvider>
);
