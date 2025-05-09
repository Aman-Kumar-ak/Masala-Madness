// Change this version number whenever you make updates to force cache refresh
const VERSION = '3';  // Increment this with each deployment
const STATIC_CACHE = `static-cache-v${VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-v${VERSION}`;

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
  '/images/m_logo.png',
  // PWA Icons - all sizes
  '/images/icons/icon-72X72.png',
  '/images/icons/icon-96X96.png',
  '/images/icons/icon-128X128.png',
  '/images/icons/icon-144X144.png',
  '/images/icons/icon-152X152.png',
  '/images/icons/icon-192X192.png',
  '/images/icons/icon-384X384.png',
  '/images/icons/icon-512X512.png',
  // Fallback images for error states
  '/images/fallbacks/image-placeholder.svg',
  '/images/fallbacks/logo-placeholder.svg',
  '/images/fallbacks/calendar-placeholder.svg',
  '/images/fallbacks/login-placeholder.svg',
  '/images/fallbacks/qr-placeholder.svg',
  '/images/fallbacks/order-placeholder.svg',
  '/images/fallbacks/receipt-placeholder.svg',
  '/images/fallbacks/admin-placeholder.svg',
  '/images/fallbacks/icon-placeholder-72X72.svg',
  '/images/fallbacks/icon-placeholder-96X96.svg',
  '/images/fallbacks/icon-placeholder-128X128.svg',
  '/images/fallbacks/icon-placeholder-144X144.svg',
  '/images/fallbacks/icon-placeholder-152X152.svg',
  '/images/fallbacks/icon-placeholder-192X192.svg',
  '/images/fallbacks/icon-placeholder-384X384.svg',
  '/images/fallbacks/icon-placeholder-512X512.svg',
  // Add more static assets if needed
];

// Utility function to ensure icons are fetched and cached
const precacheIcons = async () => {
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const cache = await caches.open(STATIC_CACHE);
  
  // Fetch all icon sizes and add them to cache
  const iconPromises = iconSizes.map(size => {
    const iconUrl = `/images/icons/icon-${size}X${size}.png`;
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
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
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
          return fetch(request)
            .then((networkResponse) => {
              // Cache the icon for future use
              return caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, networkResponse.clone());
                return networkResponse;
              });
            })
            .catch(() => {
              // If the specific icon isn't available, use the corresponding fallback
              if (url.pathname.includes('icon-')) {
                // Extract the size and find the appropriate fallback
                const sizeMatch = url.pathname.match(/icon-(\d+X\d+)\.png/);
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
                if (networkResponse.ok) {
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
                cache.put(request, networkResponse.clone());
                return networkResponse;
              });
            });
        })
    );
    return;
  }

  // Network-first for HTML pages
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
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