import { useEffect } from 'react';
import { optimizedScrollListener, throttle } from '../utils/performance';

/**
 * ScrollOptimizer is a global component that improves scrolling performance
 * This component doesn't render anything visible but applies performance
 * optimizations to improve the smoothness of scrolling
 */
const ScrollOptimizer = () => {
  useEffect(() => {
    // Apply optimizations when the component mounts

    // 1. Force GPU rendering on scrollable elements
    const scrollableElements = document.querySelectorAll('.scrollable, .overflow-y-auto, .overflow-x-auto');
    scrollableElements.forEach(element => {
      // Apply hardware acceleration
      element.style.transform = 'translateZ(0)';
      element.style.backfaceVisibility = 'hidden';
      element.style.willChange = 'transform';
    });

    // 2. Add passive and throttled scroll handler
    const handleScroll = throttle(() => {
      // This empty handler ensures passive mode is used
      // No need to do anything in the handler itself
    }, 100);

    const scrollListener = optimizedScrollListener(handleScroll, 100);

    // 3. Optimize elements that appear during scroll to render on GPU
    const optimizeVisibleElements = throttle(() => {
      const elements = document.querySelectorAll('.card, .modal-container, .menu-item, img');
      
      elements.forEach(element => {
        // Skip already optimized elements
        if (element.dataset.optimized === 'true') return;
        
        const rect = element.getBoundingClientRect();
        const isVisible = 
          rect.top < window.innerHeight && 
          rect.bottom > 0 && 
          rect.left < window.innerWidth && 
          rect.right > 0;
        
        if (isVisible) {
          // Apply hardware acceleration
          element.style.transform = 'translateZ(0)';
          element.style.willChange = 'transform, opacity';
          
          // Mark as optimized to avoid reprocessing
          element.dataset.optimized = 'true';
        }
      });
    }, 200);

    // Run initial optimization
    optimizeVisibleElements();
    
    // Add scroll listener for visibility-based optimizations
    window.addEventListener('scroll', optimizeVisibleElements, { passive: true });
    
    // 4. Disable expensive CSS effects during scroll
    let scrollTimer = null;
    let isScrolling = false;
    
    const handleScrollStart = throttle(() => {
      if (!isScrolling) {
        isScrolling = true;
        document.body.classList.add('is-scrolling');
      }
      
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        document.body.classList.remove('is-scrolling');
      }, 100);
    }, 100);
    
    window.addEventListener('scroll', handleScrollStart, { passive: true });
    
    // Add corresponding CSS to optimize during scroll
    const style = document.createElement('style');
    style.innerHTML = `
      .is-scrolling .animate-hover {
        transition: none !important;
      }
      .is-scrolling * {
        animation-play-state: paused !important;
      }
      .is-scrolling .hardware-accelerated {
        will-change: transform;
        transform: translateZ(0);
      }
    `;
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      scrollListener.remove();
      window.removeEventListener('scroll', optimizeVisibleElements);
      window.removeEventListener('scroll', handleScrollStart);
      document.head.removeChild(style);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default ScrollOptimizer; 