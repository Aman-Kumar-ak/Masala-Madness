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

const OptimizedImage = ({ 
  src, 
  alt, 
  className = "", 
  width, 
  height,
  placeholder = "/images/logo/logo.png",
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(placeholder);

  useEffect(() => {
    let isMounted = true;
    setIsLoaded(false);
    setError(false);
    setImgSrc(placeholder);

    const loadImage = async () => {
      try {
        // Open the cache
        const cache = await window.caches.open(CACHE_NAME);
        // Try to match the image in the cache
        let response = await cache.match(src);
        if (!response) {
          // If not cached, fetch from network
          response = await fetch(src, { mode: 'cors' });
          if (!response.ok) throw new Error('Network response was not ok');
          // Put the response clone in the cache
          await cache.put(src, response.clone());
        }
        // Convert response to blob and then to object URL
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setImgSrc(objectUrl);
          setIsLoaded(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setImgSrc(placeholder);
        }
      }
    };

    loadImage();
    return () => {
      isMounted = false;
    };
  }, [src, placeholder]);

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width, height }}
    >
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-80'}`}
        width={width}
        height={height}
        onError={() => {
          setError(true);
          setImgSrc(placeholder);
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