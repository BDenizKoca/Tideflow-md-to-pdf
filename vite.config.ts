import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],

  // Strip console.debug in production
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    pure: process.env.NODE_ENV === 'production' ? ['console.debug'] : [],
  },

  // Tauri expects a fixed port, fallback to 5173 if already in use
  server: {
    port: 3000,
    strictPort: true,
  },

  // Optimize build for production
  build: {
    target: ["es2022", "chrome120"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
