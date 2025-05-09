import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

import { CartProvider } from './components/CartContext'; // ✅ Import the CartProvider
import { RefreshProvider } from './contexts/RefreshContext'; // ✅ Import the RefreshProvider
import { initializeFastImageLoading, preloadCommonImages, preloadPwaIcons } from './utils/imageOptimizations'; // Import image optimization

// Start preloading images immediately before any React rendering
preloadCommonImages();

// Preload PWA icons for better offline experience
preloadPwaIcons();

// Then initialize the rest of the image optimization
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

// Register the service worker for caching and offline support
// Enable in both prod and dev for testing
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Check for updates to the Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show notification to user
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
    
    // Handle communication between service worker and the page
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        // Handle cache update message if needed
        console.log('Content updated in cache');
      }
    });
  });
}
