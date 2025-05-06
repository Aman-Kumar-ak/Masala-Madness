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
  '/images/admin.png'
];

// Simple in-memory image cache
const imageCache = new Map();

/**
 * Preload common images to improve perceived performance
 */
export const preloadCommonImages = () => {
  COMMON_IMAGES.forEach(src => {
    // Only preload if not in cache already
    if (!imageCache.has(src)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.set(src, true);
        console.log(`Preloaded: ${src}`);
      };
    }
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
  
  // Add support for image observer
  if ('IntersectionObserver' in window) {
    const lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const lazyImage = entry.target;
          
          // Only load if data-src is present
          if (lazyImage.dataset.src) {
            lazyImage.src = lazyImage.dataset.src;
            
            // Add to cache
            addImageToCache(lazyImage.dataset.src).catch(console.error);
            
            // Remove from observer
            lazyImageObserver.unobserve(lazyImage);
          }
        }
      });
    });
    
    // Find all lazy images with data-src and observe them
    document.querySelectorAll('img[data-src]').forEach(img => {
      lazyImageObserver.observe(img);
    });
  }
};

/**
 * Run image optimizations on initial load
 */
export const initializeFastImageLoading = () => {
  // Run on window load when other critical resources are loaded
  window.addEventListener('load', () => {
    setTimeout(() => {
      initImageOptimizations();
    }, 100); // Small delay to prioritize more critical tasks
  });
};

export default {
  preloadCommonImages,
  isImageCached,
  addImageToCache,
  initImageOptimizations,
  initializeFastImageLoading
}; 