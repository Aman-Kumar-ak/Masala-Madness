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
            // When the service worker is installed and waiting
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update UI
              showUpdateNotification();
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
        showUpdateNotification();
      }
    });
  });
}

// Function to show update notification
function showUpdateNotification() {
  // Create and add update notification to the DOM
  const updateBanner = document.createElement('div');
  updateBanner.style.position = 'fixed';
  updateBanner.style.bottom = '0';
  updateBanner.style.left = '0';
  updateBanner.style.right = '0';
  updateBanner.style.backgroundColor = '#ea580c';
  updateBanner.style.color = 'white';
  updateBanner.style.padding = '12px';
  updateBanner.style.textAlign = 'center';
  updateBanner.style.zIndex = '9999';
  updateBanner.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)';
  
  updateBanner.innerHTML = `
    <p style="margin: 0; font-weight: bold;">A new version is available!</p>
    <button 
      style="background: white; color: #ea580c; border: none; padding: 8px 16px; margin-top: 8px; border-radius: 4px; font-weight: bold; cursor: pointer;"
      id="update-button"
    >
      Update Now
    </button>
  `;
  
  document.body.appendChild(updateBanner);
  
  // Add event listener to the update button
  document.getElementById('update-button').addEventListener('click', () => {
    // Tell the service worker to skipWaiting through the message channel
    navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
    
    // Reload the page to activate the new service worker
    window.location.reload();
  });
}
