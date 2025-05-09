/**
 * Image optimization utilities
 */

// Common images that appear across the app
const COMMON_IMAGES = [
  '/images/m_logo.png',
  '/images/login.png',
  '/images/receipt.png',
  '/images/order.png',
  '/images/calendar.png',
  '/images/qr-code.png',
  '/images/admin.png',
  '/images/logo/logo.png'
];

// These are the images needed for each route
const ROUTE_IMAGES = {
  '/login': [
    '/images/m_logo.png'
  ],
  '/home': [
    '/images/m_logo.png',
    '/images/qr-code.png',
    '/images/login.png',
    '/images/admin.png'
  ],
  '/admin': [
    '/images/admin.png',
    '/images/receipt.png'
  ],
  '/orders': [
    '/images/receipt.png',
    '/images/order.png'
  ],
  '/qr': [
    '/images/qr-code.png'
  ]
};

// Simple in-memory image cache
const imageCache = new Map();

/**
 * Preload common images to improve perceived performance
 */
export const preloadCommonImages = async () => {
  // Get current path to determine which images to preload
  const currentPath = window.location.pathname;
  
  // Default to preloading just the logo if on login page or path not found
  let imagesToPreload = ['/images/m_logo.png'];
  
  // For matched routes, preload route-specific images
  Object.keys(ROUTE_IMAGES).forEach(route => {
    if (currentPath.includes(route)) {
      imagesToPreload = ROUTE_IMAGES[route];
    }
  });
  
  // Add PWA icons for all routes (only critical ones)
  imagesToPreload.push('/images/icons/icon-192X192.png');
  
  // Remove duplicates
  imagesToPreload = [...new Set(imagesToPreload)];

  // First check if each image is already in cache
  for (const src of imagesToPreload) {
    try {
      // Check if image is already in cache
      const isCached = await checkImageInCache(src);
      
      if (isCached) {
        // Image already in cache, no need to download again
        imageCache.set(src, true);
        console.log(`Image already cached: ${src}`);
        continue;
      }
      
      // If not cached, load it
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.set(src, true);
        console.log(`Preloaded: ${src}`);
      };
      img.onerror = () => {
        console.error(`Failed to preload: ${src}`);
      };
      
      // Force image to be loaded with high priority
      img.fetchPriority = "high";
      
      // Ensure the browser knows this is important
      if (typeof img.importance !== 'undefined') {
        img.importance = "high";
      }
      
      // Add to document for better browser prioritization
      img.style.position = 'absolute';
      img.style.opacity = '0';
      img.style.width = '1px';
      img.style.height = '1px';
      img.style.top = '-1px';
      img.style.left = '-1px';
      document.body.appendChild(img);
      
      // Remove after a short delay
      setTimeout(() => {
        if (document.body.contains(img)) {
          document.body.removeChild(img);
        }
      }, 3000);
    } catch (error) {
      console.error(`Error preloading image ${src}:`, error);
    }
  }
};

/**
 * Check if an image is already in any cache (memory, browser, or service worker)
 */
const checkImageInCache = async (url) => {
  // Check in-memory cache first
  if (imageCache.has(url)) {
    return true;
  }
  
  // Then check service worker cache
  if ('caches' in window) {
    try {
      // Try all caches
      const cachesKeys = await caches.keys();
      for (const cacheName of cachesKeys) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          return true;
        }
      }
    } catch (error) {
      console.warn(`Cache check failed for ${url}:`, error);
    }
  }
  
  // Finally, check if browser has it cached using a HEAD request
  try {
    const headers = { method: 'HEAD', cache: 'only-if-cached', mode: 'same-origin' };
    const response = await fetch(url, headers);
    return response.ok;
  } catch (error) {
    // This may fail in Chrome when offline
    return false;
  }
};

/**
 * Get browser storage availability
 */
const storageAvailable = (type) => {
  let storage;
  try {
    storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Check if an image exists in the browser cache
 */
export const isImageCached = async (url) => {
  // First check our own cache
  if (imageCache.has(url)) {
    return true;
  }
  
  // Check if the browser cache has it
  try {
    const cache = await caches.open('image-cache');
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    return false;
  }
};

/**
 * Add image URL to browser cache
 */
export const addImageToCache = async (url) => {
  try {
    const cache = await caches.open('image-cache');
    const response = await fetch(url, { cache: 'force-cache' });
    await cache.put(url, response);
    imageCache.set(url, true);
    return true;
  } catch (error) {
    console.error('Failed to cache image:', error);
    return false;
  }
};

/**
 * Initialize image optimizations
 */
export const initImageOptimizations = () => {
  // Preload common images
  preloadCommonImages();
};

/**
 * Run image optimizations on initial load
 */
export const initializeFastImageLoading = () => {
  // Lazy load images that are not in the viewport
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading supported
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.src = img.dataset.src;
    });
  } else {
    // Fallback for browsers that don't support native lazy loading
    // Could implement a JS-based lazy loading solution here
  }
  
  // Preload PWA icons for offline use
  preloadPwaIcons();
};

// Preload all PWA icons for better offline experience
export const preloadPwaIcons = async () => {
  // Only preload the most important icon sizes that would be shown immediately
  // Other sizes will be loaded by the service worker in the background
  const criticalIconSizes = [192]; // For most displays and PWA manifests
  const nonCriticalIconSizes = [72, 96, 128, 144, 152, 384, 512]; // Load these with lower priority
  
  // Load critical icons with high priority
  for (const size of criticalIconSizes) {
    const iconUrl = `/images/icons/icon-${size}X${size}.png`;
    
    try {
      // Check if icon is already in cache
      const isCached = await checkImageInCache(iconUrl);
      
      if (isCached) {
        // Icon already in cache, no need to download again
        imageCache.set(iconUrl, true);
        console.log(`Icon already cached: ${iconUrl}`);
        continue;
      }
      
      // If not in cache, load it with high priority
      const img = new Image();
      img.fetchPriority = "high";
      img.src = iconUrl;
      img.onload = () => {
        imageCache.set(iconUrl, true);
        console.log(`Preloaded critical icon: ${iconUrl}`);
      };
    } catch (error) {
      console.error(`Error preloading critical icon ${iconUrl}:`, error);
    }
  }
  
  // For non-critical icons, use setTimeout to delay loading
  // This prevents them from competing with critical resources
  setTimeout(async () => {
    for (const size of nonCriticalIconSizes) {
      const iconUrl = `/images/icons/icon-${size}X${size}.png`;
      
      try {
        // Check if already cached before fetching
        const isCached = await checkImageInCache(iconUrl);
        
        if (isCached) {
          imageCache.set(iconUrl, true);
          console.log(`Non-critical icon already cached: ${iconUrl}`);
          continue;
        }
        
        // Use low priority for non-critical icons
        const img = new Image();
        img.fetchPriority = "low";
        if (typeof img.importance !== 'undefined') {
          img.importance = "low";
        }
        img.loading = "lazy"; // Use browser's lazy loading
        
        img.src = iconUrl;
        img.onload = () => {
          imageCache.set(iconUrl, true);
          console.log(`Loaded non-critical icon: ${iconUrl}`);
        };
      } catch (error) {
        console.error(`Error loading non-critical icon ${iconUrl}:`, error);
      }
    }
  }, 2000); // Delay non-critical icons by 2 seconds
};

export default {
  preloadCommonImages,
  isImageCached,
  addImageToCache,
  initImageOptimizations,
  initializeFastImageLoading
}; 