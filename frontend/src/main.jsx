import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

import { CartProvider } from './components/CartContext'; // ✅ Import the CartProvider
import { RefreshProvider } from './contexts/RefreshContext'; // ✅ Import the RefreshProvider
import { initializeFastImageLoading, preloadCommonImages, preloadPwaIcons } from './utils/imageOptimizations'; // Import image optimization

// Initialize image loading with async functions
(async () => {
  try {
    // Start preloading images immediately before any React rendering
    await preloadCommonImages();
    
    // Preload PWA icons for better offline experience
    await preloadPwaIcons();
    
    // Then initialize the rest of the image optimization
    initializeFastImageLoading();
  } catch (error) {
    console.error('Error during image preloading:', error);
  }
})();

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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check for updates every hour
        
        // Check for updates when page loads
        registration.update();
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            // When the service worker is installed
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, automatically apply the update
              console.log('New content is available; automatically updating...');
              // Skip waiting and reload to apply updates immediately
              if (registration.waiting) {
                registration.waiting.postMessage({ type: 'CHECK_UPDATE' });
              }
              // Reload the page to activate the new service worker
              window.location.reload();
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
    
    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        // Automatically reload the page to apply the update
        window.location.reload();
      }
    });
  });
}

// Function to show update notification
// Removed in favor of automatic updates
