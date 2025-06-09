import { useEffect, useRef } from 'react';

const useKeyboardScrollAdjustment = () => {
  const initialViewportHeight = useRef(window.visualViewport.height);
  const scrollTimeout = useRef(null);

  useEffect(() => {
    if (!window.visualViewport) {
      console.warn("visualViewport API not supported. Keyboard scroll adjustment will not work.");
      return;
    }

    const handleResize = () => {
      // Clear any existing timeout to prevent rapid firing
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Defer the scroll adjustment to allow the DOM to settle after keyboard appears/disappears
      scrollTimeout.current = setTimeout(() => {
        const viewport = window.visualViewport;
        const isKeyboardOpen = viewport.height < initialViewportHeight.current * 0.9; // Threshold for keyboard open

        if (isKeyboardOpen) {
          const focusedElement = document.activeElement;
          if (focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA')) {
            const elementRect = focusedElement.getBoundingClientRect();
            const keyboardTop = viewport.height;

            // If the element is covered by the keyboard, scroll up
            if (elementRect.bottom > keyboardTop) {
              window.scrollTo({
                top: window.scrollY + (elementRect.bottom - keyboardTop) + 10, // +10 for a little padding
                behavior: 'smooth'
              });
            }
          }
        } else {
          // If keyboard is closed, scroll back to the top of the content area if necessary
          // This might be tricky to get precisely right without saving original scroll position per element
          // A simpler approach for general return is to just let the browser handle it, or scroll to top
          // For now, let's just ensure it doesn't stay scrolled up unnecessarily.
          // This part can be refined based on specific UX needs.
          // For now, we'll rely on the browser's natural scroll behavior on keyboard close.
        }
      }, 150); // Adjust delay as needed
    };

    window.visualViewport.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);
};

export default useKeyboardScrollAdjustment; 