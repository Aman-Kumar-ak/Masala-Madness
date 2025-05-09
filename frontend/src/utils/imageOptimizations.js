/**
 * Image optimization utilities for PWA performance
 */

// Use a limited-size LRU cache to avoid memory issues
// This will store references to the most recently accessed images
const IMAGE_CACHE_SIZE = 50;
const inMemoryCache = new Map();

// Track which routes need which images for intelligent preloading
const ROUTE_IMAGE_MAP = {
  '/': [
    '/images/m_logo.png',
    '/images/logo/logo.png'
  ],
  '/login': [
    '/images/login.png'
  ],
  '/orders': [
    '/images/order.png',
    '/images/receipt.png'
  ],
  '/admin': [
    '/images/admin.png',
    '/images/calendar.png'
  ],
  '/scan': [
    '/images/qr-code.png'
  ]
};

// Small images that should always be preloaded (icons, UI elements)
const CRITICAL_IMAGES = [
  '/images/logo/logo.png',
  '/images/icons/icon-192X192.png'
];

/**
 * Preload images based on current route and upcoming likely routes
 */
export const preloadImagesForRoute = (currentRoute) => {
  if (!currentRoute) return;
  
  // Get images for current route
  const imagesToPreload = [...(ROUTE_IMAGE_MAP[currentRoute] || [])];
  
  // Always preload critical images
  imagesToPreload.push(...CRITICAL_IMAGES);
  
  // Remove duplicates
  const uniqueImages = [...new Set(imagesToPreload)];
  
  // Preload with decreasing priority
  uniqueImages.forEach((src, index) => {
    // Skip if already cached
    if (inMemoryCache.has(src)) return;
    
    // Create new image and set priority
    const img = new Image();
    
    // Set priority based on index (first items are highest priority)
    if (index < 2) {
      img.fetchPriority = "high";
      img.loading = "eager";
    } else {
      img.fetchPriority = "low";
      img.loading = "lazy";
    }
    
    img.onload = () => {
      // Add to in-memory cache and maintain max size
      inMemoryCache.set(src, true);
      if (inMemoryCache.size > IMAGE_CACHE_SIZE) {
        // Remove oldest entry if cache exceeds max size
        const firstKey = inMemoryCache.keys().next().value;
        inMemoryCache.delete(firstKey);
      }
    };
    
    // Start loading
    img.src = src;
  });
};

/**
 * Check if browser supports various features
 */
const checkBrowserSupport = () => {
  const support = {
    intersectionObserver: 'IntersectionObserver' in window,
    serviceWorker: 'serviceWorker' in navigator,
    caches: 'caches' in window,
    fetchPriority: 'fetchPriority' in HTMLImageElement.prototype,
    lazyLoading: 'loading' in HTMLImageElement.prototype
  };
  
  return support;
};

/**
 * Initialize image optimizations based on browser support
 */
export const initializeFastImageLoading = () => {
  const support = checkBrowserSupport();
  
  // Setup intersection observer for images if supported
  if (support.intersectionObserver) {
    setupLazyLoading();
  }
  
  // Preload PWA icons for offline use (only the essential ones)
  preloadEssentialPwaIcons();
  
  // Start preloading for current route
  const currentPath = window.location.pathname;
  preloadImagesForRoute(currentPath);
  
  // Listen for route changes to preload route-specific images
  window.addEventListener('popstate', () => {
    const newPath = window.location.pathname;
    preloadImagesForRoute(newPath);
  });
};

/**
 * Set up lazy loading for images using Intersection Observer
 */
const setupLazyLoading = () => {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          // Only load if image has a src to load
          img.src = img.dataset.src;
          
          // Store in cache for faster reloads
          if ('caches' in window) {
            caches.open('image-cache').then(cache => {
              cache.add(img.dataset.src).catch(() => {
                // Silently fail if image can't be cached
              });
            });
          }
          
          // Stop observing once loaded
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '200px', // Start loading when image is 200px from viewport
    threshold: 0.01 // Trigger when just 1% of the image is visible
  });
  
  // Observe all images with data-src attribute
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
};

/**
 * Preload only essential PWA icons for faster initial load
 */
export const preloadEssentialPwaIcons = () => {
  // Only preload the most common sizes
  const essentialSizes = [192, 512];
  
  essentialSizes.forEach(size => {
    const img = new Image();
    img.src = `/images/icons/icon-${size}X${size}.png`;
    img.fetchPriority = size === 192 ? "high" : "low";
  });
};

/**
 * Preload all PWA icons (should be called only when network is idle)
 */
export const preloadAllPwaIcons = () => {
  // When network is idle, load all remaining icons
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const allSizes = [72, 96, 128, 144, 152, 192, 384, 512];
      const essentialSizes = [192, 512]; // Skip these as they're loaded already
      
      allSizes
        .filter(size => !essentialSizes.includes(size))
        .forEach(size => {
          const iconUrl = `/images/icons/icon-${size}X${size}.png`;
          fetch(iconUrl, { cache: 'force-cache' })
            .catch(() => { /* Silently fail */ });
        });
    });
  }
};

/**
 * Generate appropriate srcset for responsive images
 */
export const generateSrcSet = (imagePath) => {
  // Extract base path and extension
  const lastDot = imagePath.lastIndexOf('.');
  const basePath = imagePath.substring(0, lastDot);
  const extension = imagePath.substring(lastDot);
  
  // Generate srcset for different viewport sizes
  return {
    srcset: `${basePath}-small${extension} 400w, ${imagePath} 800w, ${basePath}-large${extension} 1200w`,
    sizes: '(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px'
  };
};

export default {
  preloadImagesForRoute,
  initializeFastImageLoading,
  preloadEssentialPwaIcons,
  preloadAllPwaIcons,
  generateSrcSet
}; 