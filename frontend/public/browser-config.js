/**
 * Browser Configuration for Performance Optimization
 * This file sets up browser-level optimizations when loaded
 */

(function() {
  // Set up performance monitoring
  const perfEntries = [];
  let isCollectingPerf = false;
  
  // Start collecting performance metrics
  function startPerfCollection() {
    if (performance && performance.mark) {
      isCollectingPerf = true;
      performance.mark('app-start');
    }
  }
  
  // Add a performance mark
  function markPerf(name) {
    if (isCollectingPerf && performance && performance.mark) {
      performance.mark(name);
    }
  }
  
  // Measure between two marks
  function measurePerf(name, startMark, endMark) {
    if (isCollectingPerf && performance && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name, 'measure');
        if (entries.length > 0) {
          perfEntries.push({
            name,
            duration: entries[0].duration
          });
        }
      } catch (e) {
        console.warn('Error measuring performance:', e);
      }
    }
  }
  
  // Send performance data to analytics
  function reportPerformance() {
    if (perfEntries.length > 0) {
      try {
        // If you have analytics, you could send these metrics
        console.log('Performance metrics:', perfEntries);
        
        // Log slow operations (over 100ms)
        const slowOperations = perfEntries.filter(entry => entry.duration > 100);
        if (slowOperations.length > 0) {
          console.warn('Slow operations detected:', slowOperations);
        }
        
        // Clear entries after reporting
        perfEntries.length = 0;
      } catch (e) {
        console.error('Error reporting performance:', e);
      }
    }
  }
  
  // Add our performance monitoring to the window
  window.appPerf = {
    start: startPerfCollection,
    mark: markPerf,
    measure: measurePerf,
    report: reportPerformance
  };
  
  // Optimize rendering performance
  function optimizeBrowserRendering() {
    // If rendering optimization is not already applied
    if (!window.renderingOptimized) {
      // Add preconnect for API endpoint
      if (document.createElement) {
        const linkHints = [
          { rel: 'preconnect', href: 'https://masala-madness-main-production.up.railway.app' }
        ];
        
        linkHints.forEach(hint => {
          const link = document.createElement('link');
          link.rel = hint.rel;
          link.href = hint.href;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        });
      }
      
      // Set high-priority fetch hint for critical resources
      if (typeof window.fetch === 'function' && !window.fetchPatched) {
        const originalFetch = window.fetch;
        window.fetch = function(resource, options = {}) {
          // If resource is an important image (logo, etc.), set high priority
          if (typeof resource === 'string' && 
              (resource.includes('/images/m_logo.png') || 
               resource.includes('/images/logo/logo.png'))) {
            options.importance = 'high';
          }
          return originalFetch(resource, options);
        };
        window.fetchPatched = true;
      }
      
      // Mark rendering as optimized
      window.renderingOptimized = true;
    }
  }
  
  // Optimize scroll events
  function optimizeScrollEvents() {
    // Use passive listeners for scroll events
    const supportsPassive = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: function() {
          supportsPassive = true;
          return true;
        }
      });
      window.addEventListener('testPassive', null, opts);
      window.removeEventListener('testPassive', null, opts);
    } catch (e) {}
    
    // If passive is supported, make sure all scroll listeners are passive
    if (supportsPassive) {
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        let modifiedOptions = options;
        
        // Automatically make scroll and touch events passive
        if (type === 'scroll' || type === 'touchstart' || type === 'touchmove' || type === 'wheel') {
          if (typeof options === 'object') {
            modifiedOptions = { ...options, passive: options.passive !== false };
          } else {
            modifiedOptions = { passive: true };
          }
        }
        
        return originalAddEventListener.call(this, type, listener, modifiedOptions);
      };
    }
  }
  
  // Apply all optimizations
  function applyAllOptimizations() {
    startPerfCollection();
    optimizeBrowserRendering();
    optimizeScrollEvents();
    
    // Set timeout to report initial load performance
    setTimeout(() => {
      markPerf('app-loaded');
      measurePerf('total-load-time', 'app-start', 'app-loaded');
      reportPerformance();
    }, 5000);
  }
  
  // Apply optimizations when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllOptimizations);
  } else {
    applyAllOptimizations();
  }
})(); 