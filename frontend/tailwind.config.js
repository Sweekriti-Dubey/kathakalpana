/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: false, // Disable Tailwind's default dark mode - we use CSS variables instead
  theme: {
    extend: {
      fontFamily: {
        playfair: ["'Playfair Display'", 'serif'],
        dm: ["'DM Sans'", 'sans-serif'],
        sans: ["'DM Sans'", 'sans-serif'],
      },
      colors: {
        brand: {
          dark: "#0a0a0a",
          card: "#171717",
          purple: "#7c3aed",
          pink: "#db2777",
          accent: "#4f46e5",
        },
        // App colors using CSS variables - automatically respond to data-theme attribute
        app: {
          bg: "rgb(var(--app-bg) / <alpha-value>)",
          surface: "rgb(var(--app-surface) / <alpha-value>)",
          surface2: "rgb(var(--app-surface-2) / <alpha-value>)",
          border: "var(--app-border)",
          text: "rgb(var(--app-text) / <alpha-value>)",
          muted: "rgb(var(--app-muted) / <alpha-value>)",
          pink: "rgb(var(--app-pink) / <alpha-value>)",
          violet: "rgb(var(--app-violet) / <alpha-value>)",
          cyan: "rgb(var(--app-cyan) / <alpha-value>)",
          gold: "rgb(var(--app-gold) / <alpha-value>)",
          green: "rgb(var(--app-green) / <alpha-value>)",
        }
      },
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
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-pink': '0 0 20px rgba(219, 39, 119, 0.3)',
      }
    },
  },
  plugins: [
    function({ addComponents, e }) {
      addComponents({
        '.card-base': {
          '@apply relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl': {},
          
          // Dark mode (default)
          background: 'rgba(19, 17, 32, 0.7)',
          borderColor: 'rgba(139, 92, 246, 0.2)',
          '@apply border-violet-900 border-opacity-20': {},
          
          // Light mode - apply when html[data-theme="light"]
          'html[data-theme="light"] &': {
            background: 'rgba(243, 244, 248, 0.8)',
            '@apply border-violet-400 border-opacity-30': {},
            boxShadow: '0 0 0 1px rgba(124, 58, 237, 0.15)',
          },
          
          // Hover shine effect base
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.5), rgba(255, 95, 160, 0.5), transparent)',
            opacity: '0',
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
            zIndex: '10',
          },
          
          '&:hover::before': {
            opacity: '1',
          },
          
          // Light mode shine effect
          'html[data-theme="light"] &::before': {
            background: 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), rgba(236, 72, 153, 0.4), transparent)',
          },
        },
      });
    },
  ],
  
}