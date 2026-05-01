import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/');

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  if (normalizedId.includes('/react-resizable-panels/') || normalizedId.includes('/zustand/')) {
    return 'ui-vendor';
  }

  if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/')) {
    return 'react-vendor';
  }

  if (normalizedId.includes('/@tauri-apps/')) {
    return 'tauri-vendor';
  }

  if (normalizedId.includes('/pdfjs-dist/')) {
    return 'pdfjs';
  }

  if (normalizedId.includes('/@lezer/') || normalizedId.includes('/@codemirror/lang-') || normalizedId.includes('/@codemirror/language')) {
    return 'codemirror-language';
  }

  if (normalizedId.includes('/@codemirror/search/') || normalizedId.includes('/@codemirror/autocomplete/')) {
    return 'codemirror-search';
  }

  if (normalizedId.includes('/codemirror/') || normalizedId.includes('/@codemirror/')) {
    return 'codemirror-core';
  }

  return undefined;
}

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
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
