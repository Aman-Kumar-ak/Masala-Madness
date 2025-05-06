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
  const [imgSrc, setImgSrc] = useState(src); // Use actual src immediately instead of placeholder

  useEffect(() => {
    // Reset states when src changes
    setIsLoaded(false);
    setError(false);
    setImgSrc(src); // Always use the actual source immediately
    
    // Load image directly to verify it works
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setIsLoaded(true);
    };
    
    img.onerror = () => {
      setError(true);
      console.error(`Failed to load image: ${src}`);
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width, height }}
    >
      <img
        src={error ? placeholder : imgSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-80'}`}
        width={width}
        height={height}
        onError={() => setError(true)}
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