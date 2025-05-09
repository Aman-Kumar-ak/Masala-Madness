// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.logs in production
        drop_console: true,
        // Optimize for performance
        passes: 2
      }
    },
    // Better chunk splitting for improved caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          animations: ['./src/utils/animations.js'],
          utils: ['./src/utils/performance.js', './src/utils/calculationWorker.js']
        }
      }
    }
  },
  server: {
    open: true,
    // Configure proper MIME types
    fs: {
      strict: false,
    },
    // Ensure correct MIME types
    headers: {
      'Content-Type': 'application/javascript'
    }
  },
  preview: {
    port: 4173,        // <-- important!
    host: true,        // <-- important!
    allowedHosts: [
      'masala-madness-main-production.up.railway.app',
      '.up.railway.app'
    ],
    // Fix MIME type issues in preview mode too
    headers: {
      'Content-Type': 'application/javascript',
      // Add performance-related headers
      'Cache-Control': 'max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  },
  base: './',
  // Ensure JSX files are treated as JavaScript modules
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  // Optimize CSS
  css: {
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('cssnano')({
          preset: 'default',
        })
      ]
    }
  },
  // Define custom constants
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.VITE_APP_OPTIMIZE': JSON.stringify(true)
  }
});
