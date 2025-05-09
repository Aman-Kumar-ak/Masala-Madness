// Change this version number whenever you make updates to force cache refresh
const VERSION = '7';  // Increment this with each deployment
const DEPLOYMENT_ID = Date.now().toString(36); // Unique ID for this deployment
const STATIC_CACHE = `static-cache-v${VERSION}-${DEPLOYMENT_ID}`;
const DYNAMIC_CACHE = `dynamic-cache-v${VERSION}-${DEPLOYMENT_ID}`;

// List of files to precache (add more as needed)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/images/logo/logo.png',
  '/images/calendar.png',
  '/images/login.png',
  '/images/qr-code.png',
  '/images/order.png',
  '/images/receipt.png',
  '/images/admin.png',
  '/images/m_logo.svg',  // SVG logo
  
  // Only essential PWA icons (SVG versions)
  '/images/icons/icon-192X192.png',
  '/images/icons/icon-512X512.png',
  
  // Essential fallback images
  '/images/fallbacks/image-placeholder.svg',
  '/images/fallbacks/logo-placeholder.svg',
  '/images/fallbacks/calendar-placeholder.svg',
  '/images/fallbacks/login-placeholder.svg',
  '/images/fallbacks/qr-placeholder.svg',
  '/images/fallbacks/order-placeholder.svg',
  '/images/fallbacks/receipt-placeholder.svg',
  '/images/fallbacks/admin-placeholder.svg',
  '/images/fallbacks/icon-placeholder-192X192.svg'
  // Add more static assets if needed
];

// Utility function to ensure icons are fetched and cached
const precacheIcons = async () => {
  // We only need to precache the essential icon sizes that are still used
  const iconSizes = [192, 512];
  const cache = await caches.open(STATIC_CACHE);
  
  // Fetch essential icon sizes and add them to cache
  const iconPromises = iconSizes.map(size => {
    // Use SVG icons instead of PNG
    const iconUrl = `/images/icons/icon-${size}X${size}.svg`;
    return fetch(iconUrl)
      .then(response => {
        if (response.ok) {
          return cache.put(iconUrl, response);
        }
      })
      .catch(error => console.warn(`Could not cache icon: ${iconUrl}`, error));
  });
  
  return Promise.all(iconPromises);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => precacheIcons())
  );
  // Force immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete old caches immediately
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache that isn't the current version
          if (!cacheName.includes(`-${DEPLOYMENT_ID}`)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Ensure new service worker takes control immediately
      self.clients.claim();
      
      // Notify clients about the update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ 
            type: 'CACHE_UPDATED',
            message: 'New version available and active!'
          });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Special handling for icon requests
  if (url.pathname.includes('/images/icons/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response without triggering network request
            return cachedResponse;
          }
          
          // If requesting a PNG icon, try to serve the SVG version instead
          if (url.pathname.endsWith('.png')) {
            const svgUrl = url.pathname.replace('.png', '.svg');
            return caches.match(new Request(svgUrl))
              .then(svgResponse => {
                if (svgResponse) {
                  return svgResponse;
                }
                
                // If SVG not found, try network for original request
                return fetch(request);
              });
          }
          
          return fetch(request)
            .then((networkResponse) => {
              // Cache the icon for future use
              return caches.open(STATIC_CACHE).then((cache) => {
                // Only cache GET requests, not HEAD requests
                if (request.method === 'GET') {
                  cache.put(request, networkResponse.clone());
                }
                return networkResponse;
              });
            })
            .catch(() => {
              // If the specific icon isn't available, use the corresponding fallback
              if (url.pathname.includes('icon-')) {
                // Extract the size and find the appropriate fallback
                const sizeMatch = url.pathname.match(/icon-(\d+X\d+)\.(png|svg)/);
                if (sizeMatch && sizeMatch[1]) {
                  const size = sizeMatch[1];
                  const fallbackUrl = `/images/fallbacks/icon-placeholder-${size}.svg`;
                  return caches.match(fallbackUrl).then(fallbackResponse => {
                    if (fallbackResponse) {
                      return fallbackResponse;
                    }
                    // If size-specific fallback not found, use default size
                    return caches.match('/images/fallbacks/icon-placeholder-192X192.svg');
                  });
                }
                // If we can't extract size, use the default size
                return caches.match('/images/fallbacks/icon-placeholder-192X192.svg');
              }
              return null;
            });
        })
    );
    return;
  }

  // Enhanced cache-first for static assets (JS, CSS, images)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    url.pathname.includes('/images/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Return cached version immediately if available
          if (cachedResponse) {
            // For images, we don't need to re-validate on every request
            // Only revalidate if the cached response is older than 7 days
            const cachedDate = new Date(cachedResponse.headers.get('date') || 0);
            const now = new Date();
            const ageInDays = (now - cachedDate) / (1000 * 60 * 60 * 24);
            
            if (
              (request.destination === 'image' || url.pathname.includes('/images/')) && 
              ageInDays < 7
            ) {
              // Return the cached version without network request
              return cachedResponse;
            }
            
            // Start a background fetch to update the cache, but return cached immediately
            const updateCachePromise = fetch(request)
              .then(networkResponse => {
                if (networkResponse.ok && request.method === 'GET') {
                  caches.open(STATIC_CACHE)
                    .then(cache => cache.put(request, networkResponse));
                }
                return networkResponse;
              })
              .catch(() => cachedResponse);
            
            // Use background fetch pattern - return cached immediately
            return cachedResponse;
          }
          
          // If not in cache, get from network and cache
          return fetch(request)
            .then((networkResponse) => {
              if (!networkResponse || !networkResponse.ok) {
                return networkResponse;
              }
              
              return caches.open(STATIC_CACHE).then((cache) => {
                // Only cache GET requests, not HEAD requests
                if (request.method === 'GET') {
                  cache.put(request, networkResponse.clone());
                }
                return networkResponse;
              });
            });
        })
    );
    return;
  }

  // HTML pages should always go to network first to ensure fresh content
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the network response for offline use
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            // Only cache GET requests, not HEAD requests
            if (request.method === 'GET') {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return (
              cachedResponse ||
              caches.match('/offline.html') // Use offline.html as fallback when both network and cache fail
            );
          });
        })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

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
}); 