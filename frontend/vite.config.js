import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-core';
            }
            if (id.includes('lucide-react') || id.includes('dotlottie-react')) {
              return 'vendor-ui';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            if (id.includes('canvas-confetti')) {
              return 'vendor-other';
            }
            return 'vendor-other';
          }
        },
      },
    },
  },
})
