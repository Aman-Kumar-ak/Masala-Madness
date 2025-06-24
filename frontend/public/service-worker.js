// Change this version number whenever you make updates to force cache refresh
const VERSION = '8';
const DEPLOYMENT_ID = Date.now().toString(36);
const STATIC_CACHE = `static-cache-v${VERSION}-${DEPLOYMENT_ID}`;
const DYNAMIC_CACHE = `dynamic-cache-v${VERSION}-${DEPLOYMENT_ID}`;

// Optimize cache names for better management
const CACHE_NAMES = {
  STATIC: STATIC_CACHE,
  DYNAMIC: DYNAMIC_CACHE
};

// Optimize precache URLs with better organization
const PRECACHE_URLS = {
  ESSENTIAL: [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/version.json'
  ],
  IMAGES: {
    LOGO: '', // Removing direct precache of logo.png here, will be cached on demand or by main.jsx
    ICONS: [
      '/images/icons/icon-192X192.svg',
      '/images/icons/icon-512X512.svg'
    ],
    FALLBACKS: [] // Removing aggressive precaching of all fallbacks
  }
};

// Flatten precache URLs for easier use
const FLAT_PRECACHE_URLS = [
  ...PRECACHE_URLS.ESSENTIAL,
  // Only add LOGO if it's not empty
  ...(PRECACHE_URLS.IMAGES.LOGO ? [PRECACHE_URLS.IMAGES.LOGO] : []),
  ...PRECACHE_URLS.IMAGES.ICONS,
  ...PRECACHE_URLS.IMAGES.FALLBACKS
];

// Optimize cache operations with better error handling
const cacheOperations = {
  async openCache(cacheName) {
    try {
      return await caches.open(cacheName);
    } catch (error) {
      // console.error(`Failed to open cache ${cacheName}:`, error);
      return null;
    }
  },

  async addToCache(cache, request, response) {
    try {
      if (request.method === 'GET') {
        await cache.put(request, response.clone());
      }
    } catch (error) {
      // console.error('Failed to add to cache:', error);
    }
  },

  async getFromCache(request) {
    try {
      const cache = await caches.open(CACHE_NAMES.STATIC);
      return await cache.match(request);
    } catch (error) {
      // console.error('Failed to get from cache:', error);
      return null;
    }
  }
};

// Optimize service worker installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await cacheOperations.openCache(CACHE_NAMES.STATIC);
      if (cache) {
        await cache.addAll(FLAT_PRECACHE_URLS);
      }
      await self.skipWaiting();
    })()
  );
});

// Optimize service worker activation with improved cache cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches more aggressively
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => !name.includes(`-${DEPLOYMENT_ID}`))
          .map(name => {
            // console.log(`Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );

      // Take control of all clients immediately
      await self.clients.claim();

      // Force a network request to check for new assets
      try {
        const response = await fetch('/version.json', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const versionInfo = await response.json();
        
        // Update the cache with the latest version info
        const cache = await cacheOperations.openCache(CACHE_NAMES.STATIC);
        if (cache) {
          await cache.put(new Request('/version.json'), new Response(JSON.stringify(versionInfo), {
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        // Notify all clients about the update
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            message: 'New version available and active!',
            version: versionInfo.version,
            buildDate: versionInfo.buildDate
          });
        });
      } catch (error) {
        // console.error('Error fetching version info:', error);
      }
    })()
  );
});

// Optimize fetch handling with better caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API requests
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(res => res)
        .catch(() => {
          return caches.match(request).then(cached =>
            cached || new Response(null, { status: 503, statusText: 'Offline' })
          );
        })
    );
    return;
  }

  // For navigation/documents: try network, fallback to cache, then offline.html
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(res => {
          // Only cache if response is ok and not already used
          if (res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAMES.DYNAMIC).then(cache => cache.put(request, resClone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(request).then(cached =>
            cached || caches.match('/offline.html')
          );
        })
    );
    return;
  }

  // For images: cache-first, fallback to placeholder
  if (request.destination === 'image' || url.pathname.includes('/images/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          updateCacheInBackground(request);
          return cached;
        }
        return fetch(request)
          .then(res => {
            if (res.ok) {
              const resClone = res.clone();
              caches.open(CACHE_NAMES.STATIC).then(cache => cache.put(request, resClone));
            }
            return res;
          })
          .catch(() => {
            const fallbackUrl = getFallbackImageUrl(request.url);
            return caches.match(fallbackUrl).then(fallback =>
              fallback || new Response('Image not available', { status: 404 })
            );
          });
      })
    );
    return;
  }

  // Default: try cache, then network, fallback to 503
  event.respondWith(
    caches.match(request).then(cached => {
      return (
        cached ||
        fetch(request)
          .then(res => {
            if (res.ok) {
              const resClone = res.clone();
              caches.open(CACHE_NAMES.STATIC).then(cache => cache.put(request, resClone));
            }
            return res;
          })
          .catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }))
      );
    })
  );
});

// Helper function to update cache in background with improved validation
async function updateCacheInBackground(request) {
  try {
    // Add cache-busting parameter to force fresh content
    const url = new URL(request.url);
    url.searchParams.set('_cache', Date.now());
    
    // console.log('Attempting to update cache for URL:', url.toString());
    
    const response = await fetch(url.toString());
    if (response.ok) {
      const cache = await cacheOperations.openCache(CACHE_NAMES.STATIC);
      if (cache) {
        // Store with the original request (without cache-busting)
        await cacheOperations.addToCache(cache, request, response);
        // console.log(`Updated cache for: ${request.url}`);
      }
    }
  } catch (error) {
    // console.error('Background cache update failed:', error);
  }
}

// Helper function to get fallback image URL
function getFallbackImageUrl(url) {
  const path = new URL(url).pathname;
  if (path.includes('icon-')) {
    const sizeMatch = path.match(/icon-(\d+X\d+)\.(png|svg)/);
    if (sizeMatch) {
      return `/images/fallbacks/icon-placeholder-${sizeMatch[1]}.svg`;
    }
  }
  return '/images/fallbacks/image-placeholder.svg';
}

// Optimize message handling with improved cache validation
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    self.clients.claim();
    
    // Force cache revalidation for critical resources
    Promise.all([
      fetch('/index.html', { cache: 'no-store' }),
      fetch('/version.json', { cache: 'no-store' }),
      fetch('/manifest.json', { cache: 'no-store' })
    ])
    .then(responses => {
      return Promise.all(responses.map(response => {
        if (response.ok) {
          const url = new URL(response.url);
          const request = new Request(url.pathname);
          return cacheOperations.openCache(CACHE_NAMES.STATIC)
            .then(cache => {
              if (cache) return cacheOperations.addToCache(cache, request, response.clone());
            });
        }
        return Promise.resolve();
      }));
    })
    .catch(error => console.error('Failed to revalidate caches:', error))
    .finally(() => {
      // Notify all clients that update is ready
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ 
          type: 'UPDATE_AVAILABLE',
          message: 'New version is ready with fresh cache!'
        }));
      });
    });
  }
});