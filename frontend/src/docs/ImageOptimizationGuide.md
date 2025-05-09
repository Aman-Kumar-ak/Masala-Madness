# Image Optimization Guide for Masala Madness PWA

This guide explains how to optimize images for the Masala Madness PWA to improve loading performance, reduce bandwidth usage, and enhance user experience.

## Key Optimization Features

We've implemented several optimizations:

1. **Route-based preloading** - Only preload images needed for the current route
2. **Size-based caching** - Large images are cached separately with stricter limits
3. **Lazy loading** - Images load only when they're about to enter the viewport
4. **Responsive images** - Serve appropriate image sizes based on device viewport
5. **Optimized service worker** - Intelligent caching strategies for different asset types

## How to Use Optimized Images

### 1. Use the OptimizedImage Component

The simplest way to benefit from our optimizations is to use the `OptimizedImage` component:

```jsx
import OptimizedImage from '../components/OptimizedImage';

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <OptimizedImage 
        src={product.imageUrl} 
        alt={product.name}
        width={300}
        height={200}
        critical={false} // Set to true only for above-the-fold images
      />
      <h3>{product.name}</h3>
    </div>
  );
}
```

### 2. Add Images to Route Map

For route-specific preloading, add your images to the route map in `imageOptimizations.js`:

```javascript
// Add to ROUTE_IMAGE_MAP in utils/imageOptimizations.js
const ROUTE_IMAGE_MAP = {
  '/products': [
    '/images/product-header.png',
    '/images/featured-product.png'
  ],
  // Add more routes as needed
};
```

### 3. Prepare Responsive Images

For best performance, create multiple sizes of your important images:

- **Original**: e.g., `product.png` (800px width)
- **Small**: e.g., `product-small.png` (400px width) 
- **Large**: e.g., `product-large.png` (1200px width)

The `OptimizedImage` component will automatically generate the correct srcset.

## Best Practices

1. **Set dimensions** - Always specify width and height attributes on images to prevent layout shifts
2. **Mark critical images** - Set `critical={true}` only for important above-the-fold images
3. **Optimize image files** - Compress all images before adding them to the project
4. **Use WebP format** - Convert JPG/PNG to WebP for better compression when possible
5. **Lazy load below-the-fold** - Only eagerly load images that appear without scrolling

## Advanced Usage

### Preloading Images for a Specific Route

```javascript
import { preloadImagesForRoute } from '../utils/imageOptimizations';

// Call this when you know user is likely to navigate to a route
function prepareForCheckout() {
  preloadImagesForRoute('/checkout');
  // ... other preparation logic
}
```

### Forcing Image Caching for Offline Use

```javascript
// To make sure important images are available offline
function ensureOfflineAccess() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'PRELOAD_IMAGES',
      urls: [
        '/images/offline-menu.png',
        '/images/store-locator.png'
      ]
    });
  }
}
```

## Performance Monitoring

Monitor your image loading performance using:

1. Chrome DevTools Network tab - Check image loading times
2. Lighthouse - Run audits to get performance scores
3. Core Web Vitals - Pay special attention to LCP and CLS

## Troubleshooting

Common issues:

- **Images not appearing**: Check if the path is correct and the image exists
- **Layout shifts**: Make sure to set width and height attributes
- **High bandwidth usage**: Verify images are properly compressed and sized
- **Offline access issues**: Check if the service worker is registered correctly

## Further Optimization

To further optimize:

1. Consider using image CDNs for dynamic resizing
2. Implement blurred placeholders for large hero images
3. Limit the total number of images per page
4. Consider using CSS for simple graphics instead of images 