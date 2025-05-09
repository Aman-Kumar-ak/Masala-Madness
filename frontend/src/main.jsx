import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

import { CartProvider } from './components/CartContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { initializeFastImageLoading, preloadEssentialPwaIcons } from './utils/imageOptimizations';

// Initialize only essential image optimizations before React rendering
preloadEssentialPwaIcons();

// Then mount the React app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <RefreshProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </RefreshProvider>
  </BrowserRouter>
);

// Once the app is mounted, initialize full image optimization
// This ensures the critical UI is rendered before handling non-critical assets
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    initializeFastImageLoading();
  });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(() => {
    initializeFastImageLoading();
  }, 200);
}

// Register the service worker for caching and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Check for updates less frequently to reduce network calls
        setInterval(() => {
          registration.update();
        }, 3 * 60 * 60 * 1000); // Check for updates every 3 hours instead of 1
        
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
