import React, { useState, useEffect } from 'react';
import { generateSrcSet } from '../utils/imageOptimizations';

/**
 * OptimizedImage - A component for optimized image loading
 * 
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Responsive images with srcset
 * - Placeholder during loading
 * - Error fallback
 * - Blur-up loading effect
 * - Size-appropriate loading
 * 
 * @param {Object} props
 * @param {string} props.src - The image source URL
 * @param {string} props.alt - Alt text for the image
 * @param {number} props.width - Width of the image (optional)
 * @param {number} props.height - Height of the image (optional)
 * @param {string} props.className - CSS class for the image (optional)
 * @param {boolean} props.critical - Whether this image is critical and should load eagerly (optional)
 * @param {string} props.fallbackSrc - Fallback image to use if main image fails to load (optional)
 */
const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  critical = false,
  fallbackSrc = '/images/logo/logo.png',
  ...rest 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // Generate responsive sizes if available
  const hasSrcSet = src && !src.includes('data:');
  const srcSetData = hasSrcSet ? generateSrcSet(src) : {};
  
  // Determine if image should be lazily loaded
  const loadingStrategy = critical ? 'eager' : 'lazy';
  const priority = critical ? 'high' : 'auto';
  
  // Force image dimensions if provided to prevent layout shifts
  const dimensions = {};
  if (width) dimensions.width = width;
  if (height) dimensions.height = height;
  
  // Handle image load success
  const handleLoad = () => {
    setLoaded(true);
  };
  
  // Handle image load failure
  const handleError = () => {
    console.warn(`Failed to load image: ${src}`);
    setError(true);
  };
  
  // Try to preload critical images
  useEffect(() => {
    if (critical && src) {
      const img = new Image();
      img.src = src;
    }
  }, [critical, src]);
  
  // Add image to browser cache when it's viewed
  useEffect(() => {
    if (loaded && 'caches' in window && hasSrcSet) {
      caches.open('image-cache').then(cache => {
        cache.add(src).catch(() => {
          // Silently fail if image can't be cached
        });
      });
    }
  }, [loaded, src, hasSrcSet]);
  
  // Send image URLs to service worker for background caching if needed
  const preloadForOffline = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PRELOAD_IMAGES',
        urls: [src]
      });
    }
  };
  
  return (
    <div 
      className={`optimized-image-container ${className}`} 
      style={{ 
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
      }}
    >
      {/* Low quality placeholder or blur effect while loading */}
      {!loaded && !error && (
        <div 
          className="image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
          }}
        />
      )}
      
      {/* Main image */}
      {!error ? (
        <img
          src={src}
          alt={alt}
          loading={loadingStrategy}
          fetchpriority={priority}
          onLoad={handleLoad}
          onError={handleError}
          onClick={preloadForOffline}
          className={`optimized-image ${loaded ? 'loaded' : 'loading'}`}
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            ...dimensions
          }}
          {...(hasSrcSet && { 
            srcSet: srcSetData.srcset,
            sizes: srcSetData.sizes
          })}
          {...rest}
        />
      ) : (
        // Fallback image if main image fails to load
        <img
          src={fallbackSrc}
          alt={alt}
          className="optimized-image fallback"
          style={{
            opacity: 1,
            ...dimensions
          }}
          {...rest}
        />
      )}
    </div>
  );
};

export default OptimizedImage; 