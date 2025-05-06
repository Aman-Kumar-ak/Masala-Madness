// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
  },
  preview: {
    port: 4173,        // <-- important!
    host: true,        // <-- important!
    allowedHosts: [
      'masala-madness-main-production.up.railway.app',
      '.up.railway.app'
    ],
  },
  base: './',
});
