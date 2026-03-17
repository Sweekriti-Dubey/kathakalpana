import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-core': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', '@lottiefiles/dotlottie-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-axios': ['axios'],
          'vendor-other': ['canvas-confetti'],
        },
      },
    },
  },
})
