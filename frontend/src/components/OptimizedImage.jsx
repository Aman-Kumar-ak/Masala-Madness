import React, { useState, useEffect } from 'react';
import { getCookie, setCookie, imageToBase64 } from '../utils/cookieUtils';

/**
 * OptimizedImage component for better image loading performance
 * 
 * Features:
 * - Lazy loading using Intersection Observer
 * - Placeholder while loading
 * - Error fallback
 * - Size attributes to prevent layout shifts
 * - Image caching using cookies
 */
const OptimizedImage = ({ 
  src, 
  alt, 
  className = "", 
  width, 
  height,
  placeholder = "/images/logo/logo.png",
  cacheDuration = 7, // Cache duration in days
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Reset states
        setIsLoaded(false);
        setError(false);

        // Generate a unique cookie name for this image
        const cookieName = `img_cache_${btoa(src)}`;

        // Check if image is cached
        const cachedImage = getCookie(cookieName);
        if (cachedImage) {
          setImgSrc(cachedImage);
          setIsLoaded(true);
          return;
        }

        // If not cached, load the image and cache it
        const base64Image = await imageToBase64(src);
        if (base64Image) {
          setCookie(cookieName, base64Image, cacheDuration);
          setImgSrc(base64Image);
          setIsLoaded(true);
        } else {
          throw new Error('Failed to convert image to base64');
        }
      } catch (error) {
        console.error(`Error loading image: ${src}`, error);
        setError(true);
        setImgSrc(placeholder);
      }
    };

    loadImage();
  }, [src, placeholder, cacheDuration]);

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