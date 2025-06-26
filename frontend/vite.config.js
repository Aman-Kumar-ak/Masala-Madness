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
    host: '0.0.0.0', // Allow connections from LAN/other devices
    port: 5173,
    hmr: {
      host: 'localhost', // Change to your LAN IP if accessing from another device
      port: 5173,
    },
  },
  preview: {
    port: 4173,        // <-- important!
    host: true,        // <-- important!
    allowedHosts: [
      'masala-madness.vercel.app'
    ],
  },
  base: './',
});
