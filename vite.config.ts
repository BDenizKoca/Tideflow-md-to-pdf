import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzer } from 'vite-bundle-analyzer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Add bundle analyzer in development
    process.env.ANALYZE === 'true' && analyzer({
      analyzerMode: 'server',
      openAnalyzer: true,
    }),
  ].filter(Boolean),
  
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
    target: ["es2021", "chrome100", "safari14"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          // React and related libraries
          'react-vendor': ['react', 'react-dom'],
          // PDF.js worker is already separate, main lib goes here
          'pdfjs': ['pdfjs-dist'],
          // CodeMirror and related
          'codemirror': [
            'codemirror',
            '@codemirror/lang-markdown',
            '@codemirror/search',
            '@codemirror/view',
            '@codemirror/state',
            '@codemirror/commands',
          ],
          // UI libraries
          'ui-vendor': ['react-resizable-panels', 'zustand'],
          // Tauri plugins
          'tauri-vendor': ['@tauri-apps/api', '@tauri-apps/plugin-dialog'],
        },
      },
    },
  },
})
