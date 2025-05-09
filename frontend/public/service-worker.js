const STATIC_CACHE = 'static-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

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
              // If the specific icon isn't available, try to serve a different size
              if (url.pathname.includes('icon-')) {
                // Try to find any cached icon as a fallback
                return caches.open(STATIC_CACHE).then((cache) => {
                  return cache.keys().then((keys) => {
                    const iconKey = keys.find((key) => key.url.includes('/images/icons/icon-'));
                    return iconKey ? cache.match(iconKey) : null;
                  });
                });
              }
              return null;
            });
        })
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request).then((networkResponse) => {
            return caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          })
        );
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