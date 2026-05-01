/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: false, 
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
        'scroll-slide-from-right': 'scrollSlideFromRight 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'scroll-slide-from-left': 'scrollSlideFromLeft 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'scroll-slide-out-right': 'scrollSlideOutRight 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'scroll-slide-out-left': 'scrollSlideOutLeft 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'hero-text-in': 'heroTextIn 0.8s ease-out forwards',
        'slide-in-down': 'slideInDown 0.5s ease-out forwards',
        'slide-in-up': 'slideInUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'slide-from-left': 'slideFromLeft 0.6s ease-out forwards',
        'slide-from-right': 'slideFromRight 0.6s ease-out forwards',
        'bg-shift': 'bgShift 20s ease infinite',
        'orb-float': 'orbFloat 3s ease-in-out infinite',
        'spin-slow': 'spin 0.8s linear infinite',
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
        scrollSlideFromRight: {
          'from': { opacity: '0', transform: 'translateX(100px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        scrollSlideFromLeft: {
          'from': { opacity: '0', transform: 'translateX(-100px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        scrollSlideOutRight: {
          'from': { opacity: '1', transform: 'translateX(0)' },
          'to': { opacity: '0', transform: 'translateX(100px)' },
        },
        scrollSlideOutLeft: {
          'from': { opacity: '1', transform: 'translateX(0)' },
          'to': { opacity: '0', transform: 'translateX(-100px)' },
        },
        fadeUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        heroTextIn: {
          'from': { opacity: '0', transform: 'translateY(24px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          'from': { opacity: '0', transform: 'translateY(-30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          'from': { opacity: '0', transform: 'translateY(30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.8)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        slideFromLeft: {
          'from': { opacity: '0', transform: 'translateX(-70px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        slideFromRight: {
          'from': { opacity: '0', transform: 'translateX(70px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        bgShift: {
          '0%': { backgroundPosition: '0% 0%' },
          '25%': { backgroundPosition: '100% 100%' },
          '50%': { backgroundPosition: '0% 100%' },
          '75%': { backgroundPosition: '100% 0%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        orbFloat: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-20px, 20px)' },
        },
        spin: {
          'to': { transform: 'rotate(360deg)' },
        },
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-pink': '0 0 20px rgba(219, 39, 119, 0.3)',
      }
    },
  },
  plugins: [
    // Reusable component abstractions with theme support
    function({ addComponents, e }) {
      addComponents({
       
        '.card-base': {
          '@apply relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl': {},
          background: 'rgba(19, 17, 32, 0.7)',
          borderColor: 'rgba(139, 92, 246, 0.2)',
          '@apply border-violet-900 border-opacity-20': {},
          
          'html[data-theme="light"] &': {
            background: 'rgba(243, 244, 248, 0.8)',
            '@apply border-violet-400 border-opacity-30': {},
            boxShadow: '0 0 0 1px rgba(124, 58, 237, 0.15)',
          },
          
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
          
          'html[data-theme="light"] &::before': {
            background: 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), rgba(236, 72, 153, 0.4), transparent)',
          },
        },

        '.stat-card': {
          '@apply relative overflow-hidden rounded-lg border transition-all duration-300': {},
          background: 'rgba(19, 17, 32, 0.7)',
          borderColor: 'rgba(139, 92, 246, 0.2)',
          '@apply border-violet-900/20': {},
          
          '&:hover': {
            '@apply border-violet-400/60 shadow-2xl -translate-y-2.5': {},
            borderColor: 'rgba(167, 139, 250, 0.6)',
          },
          
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
          
          'html[data-theme="light"] &': {
            background: 'rgba(243, 244, 248, 0.8)',
            borderColor: 'rgba(124, 58, 237, 0.3)',
          },
          
          'html[data-theme="light"] &:hover': {
            borderColor: 'rgba(124, 58, 237, 0.7)',
          },
          
          'html[data-theme="light"] &::before': {
            background: 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), rgba(236, 72, 153, 0.4), transparent)',
          },
        },

        // ───────────────────────────────────────────────────────
        // FORM COMPONENTS
        // ───────────────────────────────────────────────────────

        '.input-auth': {
          '@apply w-full px-3 py-2.5 rounded-lg border transition-all duration-200': {},
          backgroundColor: 'white',
          color: '#000000',
          borderColor: '#cccccc',
          
          '&:focus': {
            '@apply outline-none ring-2 ring-blue-400 border-blue-400': {},
          },
          
          '&::placeholder': {
            color: '#999999',
          },
        },

        '.input-base': {
          '@apply w-full px-3 py-2.5 rounded-lg border transition-all duration-200': {},
          backgroundColor: 'rgb(var(--app-surface))',
          color: 'rgb(var(--app-text))',
          borderColor: 'rgb(var(--app-border))',
          
          '&:focus': {
            '@apply outline-none ring-2 ring-app-violet/50': {},
            borderColor: 'rgb(var(--app-violet))',
          },
          
          '&::placeholder': {
            color: 'rgb(var(--app-muted))',
          },
          
          'html[data-theme="light"] &': {
            backgroundColor: 'rgba(243, 244, 248, 0.5)',
          },
        },

        // ───────────────────────────────────────────────────────
        // BUTTON COMPONENTS
        // ───────────────────────────────────────────────────────

        '.button': {
          '@apply bg-gradient-to-br from-app-violet to-app-pink text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-app-violet/30 hover:-translate-y-1 hover:scale-105 hover:shadow-xl hover:shadow-app-violet/40 active:scale-95 transition-all duration-300 border-none inline-flex items-center gap-2.5': {},
        },

        '.button-secondary': {
          '@apply px-8 py-3 rounded-full font-semibold transition-all duration-300 border inline-flex items-center gap-2.5': {},
          backgroundColor: 'transparent',
          color: 'rgb(var(--app-text))',
          borderColor: 'rgb(var(--app-border))',
          
          '&:hover': {
            '@apply bg-app-surface scale-105': {},
          },
          
          '&:active': {
            '@apply scale-95': {},
          },
        },

        '.button-ghost': {
          '@apply px-4 py-2 rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2': {},
          backgroundColor: 'transparent',
          color: 'rgb(var(--app-text))',
          
          '&:hover': {
            backgroundColor: 'rgba(var(--app-surface), 0.5)',
          },
          
          '&:active': {
            '@apply scale-95': {},
          },
        },

        // ───────────────────────────────────────────────────────
        // THEME COMPONENTS
        // ───────────────────────────────────────────────────────

        '.theme-toggle': {
          '@apply px-3.5 py-2.5 rounded-xl border transition-all duration-300 inline-flex items-center gap-2 font-semibold text-sm': {},
          
          'html[data-theme="dark"] &': {
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(255,95,160,0.15))',
            borderColor: 'rgba(167, 139, 250, 0.4)',
            color: '#a78bfa',
            
            '&:hover': {
              '@apply scale-110 shadow-lg': {},
              boxShadow: '0 0 12px rgba(167, 139, 250, 0.3)',
            },
          },
          
          'html[data-theme="light"] &': {
            background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(59,130,246,0.15))',
            borderColor: 'rgba(251, 191, 36, 0.5)',
            color: '#fbbf24',
            
            '&:hover': {
              '@apply scale-110 shadow-lg': {},
              boxShadow: '0 0 12px rgba(251, 191, 36, 0.3)',
            },
          },
          
          '&:active': {
            '@apply scale-95': {},
          },
        },

        // ───────────────────────────────────────────────────────
        // TYPOGRAPHY COMPONENTS
        // ───────────────────────────────────────────────────────

        '.title': {
          '@apply font-playfair text-[1.7em] font-black tracking-tight': {},
          background: 'linear-gradient(120deg, rgb(var(--app-pink)), rgb(var(--app-violet)), rgb(var(--app-cyan)))',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },

        '.section-title': {
          '@apply font-playfair text-3xl md:text-4xl font-black tracking-tight': {},
          background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #ff5fa0 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
          
          'html[data-theme="light"] &': {
            background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #ec4899 100%)',
            '-webkit-background-clip': 'text',
            '-webkit-text-fill-color': 'transparent',
            'background-clip': 'text',
          },
        },

        // ───────────────────────────────────────────────────────
        // UTILITY COMPONENTS
        // ───────────────────────────────────────────────────────

        '.link-primary': {
          '@apply text-app-text hover:text-app-pink transition-colors duration-200 font-medium': {},
        },

        '.badge': {
          '@apply inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide': {},
          backgroundColor: 'rgb(var(--app-surface))',
          color: 'rgb(var(--app-text))',
          borderColor: 'rgb(var(--app-border))',
          '@apply border': {},
        },

        '.badge-success': {
          '@apply bg-app-green/20 text-app-green border-app-green/30': {},
        },

        '.badge-error': {
          '@apply bg-app-pink/20 text-app-pink border-app-pink/30': {},
        },

        '.badge-warning': {
          '@apply bg-app-gold/20 text-app-gold border-app-gold/30': {},
        },
      });
    },
  ],
}