/**
 * Image optimization utilities
 */

// Common images that appear across the app
// NOTE: This list is now deprecated. Use preloadImages with specific URLs per page.
const COMMON_IMAGES = [
  '/images/m_logo.svg',  // Use SVG version
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
 * Preload a list of image URLs to improve perceived performance.
 * Only use for images critical for the initial render of a specific page.
 * @param {string[]} urlsToPreload - An array of image URLs to preload.
 */
export const preloadImages = async (urlsToPreload) => {
  for (const src of urlsToPreload) {
    try {
      // Check if image is already in cache
      const isCached = await checkImageInCache(src);
      
      if (isCached) {
        // Image already in cache, no need to download again
        imageCache.set(src, true);
        // console.log(`Image already cached: ${src}`);
        continue;
      }
      
      // If not cached, load it
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.set(src, true);
        // console.log(`Preloaded: ${src}`);
      };
      img.onerror = () => {
        // console.error(`Failed to preload: ${src}`);
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
      // console.error(`Error preloading image ${src}:`, error);
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
      // console.warn(`Cache check failed for ${url}:`, error);
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
    // console.error('Failed to cache image:', error);
    return false;
  }
};

/**
 * Initialize image optimizations
 */
export const initImageOptimizations = () => {
  // Preload common images (now handled by specific pages)
  // preloadCommonImages(); // Deprecated call
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
  
  // Preload PWA icons for offline use (consider moving to App.jsx or main.jsx based on usage)
  // preloadPwaIcons(); // Deprecated call, moved to main.jsx for universal icons
};

// Preload all PWA icons for better offline experience
export const preloadPwaIcons = async () => {
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const urlsToPreload = [];
  
  for (const size of iconSizes) {
    // Use SVG icons instead of PNG files (much smaller)
    const iconUrl = `/images/icons/icon-${size}X${size}.svg`;
    urlsToPreload.push(iconUrl);
  }
  
  // Use the generic preloadImages function for PWA icons
  await preloadImages(urlsToPreload);
};

export default {
  preloadImages, // Renamed and modified
  isImageCached,
  addImageToCache,
  initImageOptimizations,
  initializeFastImageLoading,
  preloadPwaIcons
}; 