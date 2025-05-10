// Change this version number whenever you make updates to force cache refresh
const VERSION = '7';
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
    LOGO: '/images/logo/logo.png',
    ICONS: [
      '/images/icons/icon-192X192.png',
      '/images/icons/icon-512X512.png'
    ],
    FALLBACKS: [
      '/images/fallbacks/image-placeholder.svg',
      '/images/fallbacks/logo-placeholder.svg',
      '/images/fallbacks/calendar-placeholder.svg',
      '/images/fallbacks/login-placeholder.svg',
      '/images/fallbacks/qr-placeholder.svg',
      '/images/fallbacks/order-placeholder.svg',
      '/images/fallbacks/receipt-placeholder.svg',
      '/images/fallbacks/admin-placeholder.svg',
      '/images/fallbacks/icon-placeholder-192X192.svg'
    ]
  }
};

// Flatten precache URLs for easier use
const FLAT_PRECACHE_URLS = [
  ...PRECACHE_URLS.ESSENTIAL,
  PRECACHE_URLS.IMAGES.LOGO,
  ...PRECACHE_URLS.IMAGES.ICONS,
  ...PRECACHE_URLS.IMAGES.FALLBACKS
];

// Optimize cache operations with better error handling
const cacheOperations = {
  async openCache(cacheName) {
    try {
      return await caches.open(cacheName);
    } catch (error) {
      console.error(`Failed to open cache ${cacheName}:`, error);
      return null;
    }
  },

  async addToCache(cache, request, response) {
    try {
      if (request.method === 'GET') {
        await cache.put(request, response.clone());
      }
    } catch (error) {
      console.error('Failed to add to cache:', error);
    }
  },

  async getFromCache(request) {
    try {
      const cache = await caches.open(CACHE_NAMES.STATIC);
      return await cache.match(request);
    } catch (error) {
      console.error('Failed to get from cache:', error);
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

// Optimize service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => !name.includes(`-${DEPLOYMENT_ID}`))
          .map(name => caches.delete(name))
      );

      // Take control of all clients
      await self.clients.claim();

      // Notify clients about update
      try {
        const response = await fetch('/version.json');
        const versionInfo = await response.json();
        
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
        console.error('Error fetching version info:', error);
      }
    })()
  );
});

// Optimize fetch handling with better caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests with optimized strategies
  if (request.destination === 'image' || url.pathname.includes('/images/')) {
    event.respondWith(handleImageRequest(request));
  } else if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Optimize image request handling
async function handleImageRequest(request) {
  const cachedResponse = await cacheOperations.getFromCache(request);
  if (cachedResponse) {
    // Start background update
    updateCacheInBackground(request);
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await cacheOperations.openCache(CACHE_NAMES.STATIC);
      if (cache) {
        await cacheOperations.addToCache(cache, request, response);
      }
    }
    return response;
  } catch (error) {
    // Return fallback image if available
    const fallbackUrl = getFallbackImageUrl(request.url);
    const fallbackResponse = await cacheOperations.getFromCache(new Request(fallbackUrl));
    return fallbackResponse || new Response('Image not available', { status: 404 });
  }
}

// Optimize navigation request handling
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await cacheOperations.openCache(CACHE_NAMES.DYNAMIC);
    if (cache) {
      await cacheOperations.addToCache(cache, request, response);
    }
    return response;
  } catch (error) {
    const cachedResponse = await cacheOperations.getFromCache(request);
    return cachedResponse || cacheOperations.getFromCache(new Request('/offline.html'));
  }
}

// Optimize default request handling
async function handleDefaultRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    return cacheOperations.getFromCache(request);
  }
}

// Helper function to update cache in background
async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await cacheOperations.openCache(CACHE_NAMES.STATIC);
      if (cache) {
        await cacheOperations.addToCache(cache, request, response);
      }
    }
  } catch (error) {
    console.error('Background cache update failed:', error);
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

// Optimize message handling
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_UPDATE') {
    self.skipWaiting();
    self.clients.claim();
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
    });
  }
}); 