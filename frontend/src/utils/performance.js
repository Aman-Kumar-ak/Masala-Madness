/**
 * Performance optimization utilities
 */

/**
 * Debounces a function call, ensuring it's only executed after a certain
 * amount of time has passed since it was last invoked.
 * Useful for expensive operations like API calls on input changes.
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @param {boolean} immediate - Whether to run the function immediately on the leading edge
 * @returns {Function} - The debounced function
 */
export const debounce = (func, wait = 300, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
};

/**
 * Throttles a function call, ensuring it's executed at most once in a specified time period.
 * Useful for scroll or resize events that can fire hundreds of times per second.
 * 
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - The throttled function
 */
export const throttle = (func, limit = 100) => {
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function throttledFunction(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

/**
 * Creates a passive event listener that won't block the main thread
 * Useful for scroll, touch, and wheel events
 * 
 * @param {Element} element - The DOM element to attach the listener to
 * @param {string} eventType - The event type to listen for
 * @param {Function} callback - The callback function
 * @param {Object} options - Additional options
 * @returns {Object} - Object with remove method to clean up the listener
 */
export const addPassiveEventListener = (element, eventType, callback, options = {}) => {
  // Add passive flag for supported browsers
  const passiveOptions = { passive: true, ...options };
  
  element.addEventListener(eventType, callback, passiveOptions);
  
  return {
    remove: () => {
      element.removeEventListener(eventType, callback, passiveOptions);
    }
  };
};

/**
 * Creates a throttled and passive scroll event listener
 * Optimal for scroll handlers
 * 
 * @param {Element} element - The DOM element to attach the listener to (defaults to window)
 * @param {Function} callback - The callback function
 * @param {number} limit - Throttle limit in ms
 * @returns {Object} - Object with remove method to clean up the listener
 */
export const optimizedScrollListener = (callback, limit = 100, element = window) => {
  const throttledCallback = throttle(callback, limit);
  return addPassiveEventListener(element, 'scroll', throttledCallback);
};

/**
 * Request animation frame based throttling for smooth animations
 * 
 * @param {Function} callback - The callback function to execute
 * @returns {Function} - Function that can be called repeatedly but executes optimally
 */
export const rafThrottle = (callback) => {
  let requestId = null;
  
  return function rafThrottled(...args) {
    const context = this;
    
    if (requestId === null) {
      requestId = requestAnimationFrame(() => {
        callback.apply(context, args);
        requestId = null;
      });
    }
  };
};

/**
 * Monitors and reports component rendering performance
 * Only works in development mode
 * 
 * @param {string} componentName - Name of the component to monitor
 * @param {Function} callback - Optional callback when render is slow
 * @returns {Object} - Object with start and end methods
 */
export const renderPerformance = (componentName, callback) => {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') {
    return { start: () => {}, end: () => {} };
  }
  
  let startTime;
  
  return {
    start: () => {
      startTime = performance.now();
    },
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log if render takes more than 16ms (60fps frame budget)
      if (duration > 16) {
        console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms to render`);
        if (callback) callback(duration);
      }
    }
  };
}; 