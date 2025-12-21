import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (allows access from other devices)
    port: 5174,
    strictPort: false,
    // Proxy API requests to backend during development
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8290',
    //     changeOrigin: true,
    //     secure: false,
    //     ws: true, // Enable WebSocket proxying
    //   },
    // },
  },
  preview: {
    host: '0.0.0.0',
    port: 5174, // Use same port as dev server
    strictPort: false,
  },
})
