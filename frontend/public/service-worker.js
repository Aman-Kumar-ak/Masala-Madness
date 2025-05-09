// Change this version number whenever you make updates to force cache refresh
const VERSION = '3';  // Increment this with each deployment
const STATIC_CACHE = `static-cache-v${VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-v${VERSION}`;
const IMAGE_CACHE = `image-cache-v${VERSION}`; // Separate cache for images
const LARGE_IMAGE_CACHE = `large-image-cache-v${VERSION}`; // Separate cache for large images (>100KB)

// Cache size limits
const MAX_DYNAMIC_CACHE_ITEMS = 50;
const MAX_LARGE_IMAGE_CACHE_ITEMS = 15;

// Critical assets that must be cached for offline functionality
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/images/logo/logo.png',
  '/images/icons/icon-192X192.png',
  '/images/icons/icon-512X512.png'
];

// Assets that are important but not critical - will be cached with lower priority
const IMPORTANT_ASSETS = [
  '/images/calendar.png',
  '/images/login.png',
  '/images/qr-code.png',
  '/images/order.png',
  '/images/receipt.png',
  '/images/admin.png',
  '/images/m_logo.png'
];

// Helper function to check if a response is an image
const isImage = (url, response) => {
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return true;
  
  const contentType = response.headers.get('content-type');
  return contentType && contentType.includes('image/');
};

// Helper function to check if a response is a large image (>100KB)
const isLargeImage = async (response) => {
  // Clone response to avoid consuming it
  const clone = response.clone();
  const blob = await clone.blob();
  return blob.size > 100 * 1024; // 100KB threshold
};

// Helper function to limit cache size
const trimCache = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Delete oldest items (beyond the maxItems limit)
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    return Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
};

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    // Cache critical assets first
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(CRITICAL_ASSETS))
      .then(() => {
        // Then cache important assets with lower priority
        return caches.open(IMAGE_CACHE)
          .then((cache) => Promise.all(
            IMPORTANT_ASSETS.map(url => 
              fetch(url, { priority: 'low' })
                .then(response => cache.put(url, response))
                .catch(() => console.warn(`Failed to cache: ${url}`))
            )
          ));
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache that doesn't match our current version
          if (!cacheName.includes(`-v${VERSION}`)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Special handling for API requests (no caching)
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Special handling for image requests
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    event.respondWith(
      // Try image cache first
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response immediately
            return cachedResponse;
          }
          
          // If not in cache, fetch from network
          return fetch(request)
            .then(async (networkResponse) => {
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }
              
              // Clone the response to cache it
              const responseToCache = networkResponse.clone();
              
              // Determine which cache to use based on image size
              const large = await isLargeImage(responseToCache);
              const cacheName = large ? LARGE_IMAGE_CACHE : IMAGE_CACHE;
              
              // Store in appropriate cache
              caches.open(cacheName).then(cache => {
                cache.put(request, responseToCache);
                
                // Trim cache if it's a large image cache
                if (large) {
                  trimCache(LARGE_IMAGE_CACHE, MAX_LARGE_IMAGE_CACHE_ITEMS);
                }
              });
              
              return networkResponse;
            })
            .catch(() => {
              // If offline and no cached version, return fallback image if available
              return caches.match('/images/logo/logo.png');
            });
        })
    );
    return;
  }
  
  // For HTML documents - Network first, fallback to cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the updated page for future use
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseToCache);
            // Limit dynamic cache size
            trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
          });
          return networkResponse;
        })
        .catch(() => {
          // If offline, try to serve from cache
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // For all other assets (JS, CSS) - Cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Return cached version or get from network
        return cachedResponse || 
          fetch(request)
            .then(networkResponse => {
              // Cache the new response
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, responseToCache);
              });
              return networkResponse;
            });
      })
  );
});

// Message event - handle communication from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.skipWaiting();
    self.clients.claim();
    // Notify all clients that we've updated
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ 
        type: 'UPDATE_AVAILABLE' 
      }));
    });
  }
  
  // Handle request to preload specific images
  if (event.data && event.data.type === 'PRELOAD_IMAGES' && event.data.urls) {
    const urls = event.data.urls;
    
    // Preload each image into cache
    Promise.all(
      urls.map(url => 
        fetch(url, { priority: 'low' })
          .then(async response => {
            if (!response || response.status !== 200) return;
            
            const responseToCache = response.clone();
            const large = await isLargeImage(responseToCache);
            const cacheName = large ? LARGE_IMAGE_CACHE : IMAGE_CACHE;
            
            return caches.open(cacheName).then(cache => {
              cache.put(url, responseToCache);
            });
          })
          .catch(() => {/* Ignore failures */})
      )
    ).then(() => {
      // Notify client that preloading is complete
      event.source.postMessage({
        type: 'PRELOAD_COMPLETE'
      });
    });
  }
}); 