/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This tells Tailwind to look at all your reinvented TSX files
  ],
  theme: {
    extend: {
      colors: {
        // We define custom "Kathakalpana" colors to match your dark theme
        brand: {
          dark: "#0a0a0a",      // Deepest black for background
          card: "#171717",      // Slightly lighter for cards
          purple: "#7c3aed",    // Primary purple for Chotuu
          pink: "#db2777",      // Secondary pink for highlights
          accent: "#4f46e5",    // Blue accent for "Next" buttons
        },
      },
      // Adding custom animations for that "Magical" feel
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      // Custom shadows for that glowing "Pixar" effect
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-pink': '0 0 20px rgba(219, 39, 119, 0.3)',
      }
    },
  },
  plugins: [],
}