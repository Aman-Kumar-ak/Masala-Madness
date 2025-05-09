import React, { useState, useEffect } from 'react';

/**
 * OptimizedImage component for better image loading performance
 * 
 * Features:
 * - Lazy loading using Intersection Observer
 * - Placeholder while loading
 * - Error fallback
 * - Size attributes to prevent layout shifts
 * - Image caching using Cache API
 */
const CACHE_NAME = 'image-cache-v1';

// Type-specific fallback images based on path patterns
const getFallbackImage = (originalSrc) => {
  const path = originalSrc.toLowerCase();
  
  // For PWA icons - use a generic icon placeholder instead of the logo
  if (path.includes('/icons/icon-')) {
    const defaultIconSize = '192X192';
    // If we can extract the size from the path, use a more appropriate fallback
    const sizeMatch = path.match(/icon-(\d+X\d+)\.png/);
    const size = sizeMatch ? sizeMatch[1] : defaultIconSize;
    return `/images/fallbacks/icon-placeholder-${size}.svg`;
  }
  
  // For specific image types
  if (path.includes('/logo/')) {
    return '/images/fallbacks/logo-placeholder.svg';
  }
  if (path.includes('calendar')) {
    return '/images/fallbacks/calendar-placeholder.svg';
  }
  if (path.includes('login')) {
    return '/images/fallbacks/login-placeholder.svg';
  }
  if (path.includes('qr-code')) {
    return '/images/fallbacks/qr-placeholder.svg';
  }
  if (path.includes('order')) {
    return '/images/fallbacks/order-placeholder.svg';
  }
  if (path.includes('receipt')) {
    return '/images/fallbacks/receipt-placeholder.svg';
  }
  if (path.includes('admin')) {
    return '/images/fallbacks/admin-placeholder.svg';
  }
  
  // Default fallback (not showing the logo anymore)
  return '/images/fallbacks/image-placeholder.svg';
};

const OptimizedImage = ({ 
  src, 
  alt, 
  className = "", 
  width, 
  height,
  placeholder, // Optional custom placeholder
  ...props 
}) => {
  // If no custom placeholder is provided, determine the most appropriate fallback
  const defaultPlaceholder = placeholder || getFallbackImage(src);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(defaultPlaceholder);

  useEffect(() => {
    let isMounted = true;
    setIsLoaded(false);
    setError(false);
    setImgSrc(defaultPlaceholder);

    const loadImage = async () => {
      try {
        // First check if the original src URL path is for a fallback placeholder
        // If it is, we don't need to try fetch/cache operations on it
        if (src.includes('/fallbacks/')) {
          setImgSrc(src);
          setIsLoaded(true);
          return;
        }

        // Open the cache
        const cache = await window.caches.open(CACHE_NAME);
        // Try to match the image in the cache
        let response = await cache.match(src);
        
        if (!response) {
          // If not cached, fetch from network
          try {
            response = await fetch(src, { 
              mode: 'cors',
              cache: 'no-cache', // Force verification with server
              headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            // Put the response clone in the cache
            await cache.put(src, response.clone());
          } catch (fetchError) {
            console.warn(`Failed to fetch image: ${src}`, fetchError);
            throw fetchError; // Re-throw to be caught by outer try/catch
          }
        }
        
        // Convert response to blob and then to object URL
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setImgSrc(objectUrl);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error(`Error loading image ${src}:`, err);
        if (isMounted) {
          setError(true);
          setImgSrc(defaultPlaceholder);
        }
      }
    };

    loadImage();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
    };
  }, [src, defaultPlaceholder]);

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width, height }}
    >
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-80'} ${error ? 'fallback-image' : ''}`}
        width={width}
        height={height}
        onError={(e) => {
          console.warn(`Image load error for ${src}, using fallback`);
          setError(true);
          setImgSrc(defaultPlaceholder);
        }}
        {...props}
      />
      {!isLoaded && !error && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse rounded"
          style={{ width, height, opacity: 0.5 }}
        />
      )}
    </div>
  );
};

export default OptimizedImage; 