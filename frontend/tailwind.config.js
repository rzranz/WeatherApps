/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  content: [
    "./index.html",
    "./compare.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        slate: {
          850: '#151f32',
          950: '#070b14',
        },
        // Backward compatibility dengan class lama
        'dark-bg': '#0B0F19',
        'dark-card': '#111827',
        'dark-border': '#1F2937',
        'accent-green': '#10B981',
        'accent-green-darker': '#059669',
        'text-light': '#F3F4F6',
        'text-dark': '#0F172A',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
      }
    },
  },
  plugins: [],
}
