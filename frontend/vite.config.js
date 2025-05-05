// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Default: where built files go
  },
  server: {
    open: true, // Only affects local dev
  },
  preview: {
    port: 8080, // Optional: specify preview port if needed
  },
  base: './', // <--- IMPORTANT for Render or any static hosting
});
