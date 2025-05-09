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

// Simple in-memory image cache
const imageCache = new Map();

/**
 * Preload common images to improve perceived performance
 */
export const preloadCommonImages = async () => {
  // Existing preloaded images (if any)
  const commonImages = [
    '/images/m_logo.png',
    '/images/login.png',
    '/images/receipt.png',
    '/images/order.png',
    '/images/calendar.png',
    '/images/qr-code.png',
    '/images/admin.png',
    // Add PWA icons
    '/images/icons/icon-192X192.png',
    '/images/icons/icon-512X512.png'
  ];

  // First check if each image is already in cache
  for (const src of commonImages) {
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
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  for (const size of iconSizes) {
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
      
      // If not in cache, load it
      const img = new Image();
      img.src = iconUrl;
      img.onload = () => {
        imageCache.set(iconUrl, true);
        console.log(`Preloaded icon: ${iconUrl}`);
      };
    } catch (error) {
      console.error(`Error preloading icon ${iconUrl}:`, error);
    }
  }
};

export default {
  preloadCommonImages,
  isImageCached,
  addImageToCache,
  initImageOptimizations,
  initializeFastImageLoading
}; 