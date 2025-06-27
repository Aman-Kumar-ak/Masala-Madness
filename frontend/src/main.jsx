import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

import { CartProvider } from './components/CartContext'; // ✅ Import the CartProvider
import { RefreshProvider } from './contexts/RefreshContext'; // ✅ Import the RefreshProvider
import { AuthProvider } from './contexts/AuthContext'; // ✅ Import the AuthProvider
import { initializeFastImageLoading, preloadImages, preloadPwaIcons } from './utils/imageOptimizations'; // Import image optimization

// Initialize image loading with async functions
(async () => {
  try {
    // Start preloading universal images immediately before any React rendering
    // (e.g., logo that appears on all pages)
    await preloadImages(['/images/m_logo.svg', '/images/logo/logo.png']);
    
    // Preload PWA icons for better offline experience, as they are universal
    await preloadPwaIcons();
    
    // Then initialize the rest of the image optimization
    initializeFastImageLoading();
  } catch (error) {
    // console.error('Error during image preloading:', error);
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <RefreshProvider> {/* ✅ Wrap your entire app inside RefreshProvider */}
        <CartProvider> {/* ✅ Wrap your entire app inside CartProvider */}
          <App />
        </CartProvider>
      </RefreshProvider>
    </AuthProvider>
  </BrowserRouter>
);

// Register the service worker for caching and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Clear any existing caches before registering the service worker
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('dynamic-cache')) {
            // console.log('Clearing dynamic cache:', cacheName);
            caches.delete(cacheName);
          }
        });
      });
    }
    
    navigator.serviceWorker.register('/service-worker.js', {
      // Use updateViaCache: 'none' to ensure the browser always goes to the network for the service worker
      updateViaCache: 'none',
      scope: '/'
    })
      .then(registration => {
        // console.log('Service Worker registered with scope:', registration.scope);
        
        // Remove interval checking - only check for updates when page loads/refreshes
        
        // Always update on page refresh with cache validation
        const checkForUpdates = async () => {
          try {
            // Force a fresh check of the service worker
            await registration.update();
            
            // Clear application cache for critical resources
            if ('caches' in window) {
              const cache = await caches.open('app-runtime-cache');
              await cache.delete('/version.json');
              await cache.delete('/index.html');
              
              // Fetch fresh version info
              const response = await fetch('/version.json', { 
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, must-revalidate' }
              });
              // console.log('Fresh version check completed');
            }
          } catch (error) {
            // console.error('Error checking for updates:', error);
          }
        };
        
        // Run the update check
        checkForUpdates();
        
        // Handle service worker updates - automatically apply updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            // When the service worker is installed
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // console.log('New content is available; automatically updating...');
              // Skip waiting to apply updates immediately
              if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
              // Reload the page to apply the update immediately
              window.location.reload();
            }
          });
        });
      })
      .catch(error => {
        // console.error('Service Worker registration failed:', error);
      });
    
    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data) {
        // Handle UPDATE_AVAILABLE message (for backward compatibility)
        if (event.data.type === 'UPDATE_AVAILABLE') {
          // console.log('Update available and applied automatically:', event.data.message || '');
          
          // Clear application cache before reload
          if ('caches' in window) {
            caches.keys().then(cacheNames => {
              return Promise.all(
                cacheNames.filter(name => name.includes('dynamic')).map(name => {
                  // console.log('Clearing cache before reload:', name);
                  return caches.delete(name);
                })
              );
            }).finally(() => {
              // Reload the page to apply updates immediately
              window.location.reload();
            });
          } else {
            // Reload the page to apply updates immediately
            window.location.reload();
          }
        }
        
        // Handle new CACHE_UPDATED message
        if (event.data.type === 'CACHE_UPDATED') {
          // console.log('Cache updated:', event.data.message);
          
          // Clear browser cache for main resources
          if ('caches' in window) {
            caches.open('app-runtime-cache').then(cache => {
              // Delete critical resources from cache
              return Promise.all([
                cache.delete('/'),
                cache.delete('/index.html'),
                cache.delete('/version.json'),
                cache.delete('/manifest.json')
              ]);
            }).finally(() => {
              // Reload the page to apply updates immediately
              window.location.reload();
            });
          } else {
            // Reload the page to apply updates immediately
            window.location.reload();
          }
        }
      }
    });
  });
}

// Function to periodically check for updates
setInterval(() => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update();
    });
  }
}, 60 * 60 * 1000); // Check every hour
