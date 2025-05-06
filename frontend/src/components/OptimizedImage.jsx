import React, { useState, useEffect } from 'react';

/**
 * OptimizedImage component for better image loading performance
 * 
 * Features:
 * - Lazy loading using Intersection Observer
 * - Placeholder while loading
 * - Error fallback
 * - Size attributes to prevent layout shifts
 */
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
    // Reset states when src changes
    setIsLoaded(false);
    setError(false);
    
    // Use Intersection Observer for lazy loading
    const imgElement = document.createElement('img');
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Start loading the actual image when it comes into view
        imgElement.src = src;
        imgElement.onload = () => {
          setImgSrc(src);
          setIsLoaded(true);
        };
        imgElement.onerror = () => {
          setError(true);
          console.error(`Failed to load image: ${src}`);
        };
        
        // Disconnect observer after loading starts
        observer.disconnect();
      }
    }, {
      rootMargin: '200px', // Start loading when image is 200px from viewport
      threshold: 0.01
    });
    
    // Create a temporary DOM element to observe
    const tempElement = document.createElement('div');
    observer.observe(tempElement);
    
    return () => {
      observer.disconnect();
      imgElement.onload = null;
      imgElement.onerror = null;
    };
  }, [src, placeholder]);

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width, height }}
    >
      <img
        src={error ? placeholder : imgSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        loading="lazy"
        onError={() => setError(true)}
        {...props}
      />
      
      {!isLoaded && !error && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse rounded"
          style={{ width, height }}
        />
      )}
    </div>
  );
};

export default OptimizedImage; 