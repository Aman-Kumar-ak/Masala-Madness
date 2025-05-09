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
    navigator.serviceWorker.register('/service-worker.js', {
      // Use updateViaCache: 'none' to ensure the browser always goes to the network for the service worker
      updateViaCache: 'none'
    })
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Remove interval checking - only check for updates when page loads/refreshes
        
        // Always update on page refresh
        registration.update();
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            // When the service worker is installed
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content is available; automatically updating...');
              // Skip waiting to apply updates immediately
              if (registration.waiting) {
                registration.waiting.postMessage({ type: 'CHECK_UPDATE' });
              }
              // If page was just loaded, no need to reload again
              // Update will be reflected on next refresh
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
    
    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data) {
        // Handle UPDATE_AVAILABLE message (for backward compatibility)
        if (event.data.type === 'UPDATE_AVAILABLE') {
          console.log('Update available and will be used on next page load');
          // No automatic reload - updates will be active on next refresh
        }
        
        // Handle new CACHE_UPDATED message
        if (event.data.type === 'CACHE_UPDATED') {
          console.log('Cache updated:', event.data.message);
          // No automatic reload - updates will be active on next refresh
        }
      }
    });
  });
}

// Function to show update notification
// Removed in favor of updates on refresh
