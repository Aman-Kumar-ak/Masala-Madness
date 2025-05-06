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
export const preloadCommonImages = () => {
  COMMON_IMAGES.forEach(src => {
    // Force load immediately with high priority
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
  });
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
  // Run immediately without waiting for window load
  initImageOptimizations();
  
  // Retry loading any failed images on window load
  window.addEventListener('load', () => {
    // Check which images are not yet cached
    COMMON_IMAGES.forEach(src => {
      if (!imageCache.has(src)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          imageCache.set(src, true);
          console.log(`Loaded on retry: ${src}`);
        };
      }
    });
  });
};

export default {
  preloadCommonImages,
  isImageCached,
  addImageToCache,
  initImageOptimizations,
  initializeFastImageLoading
}; 