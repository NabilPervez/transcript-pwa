/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0b0d',
          900: '#121215',
          800: '#1b1b1f',
          700: '#26262c',
          600: '#38383f',
          500: '#57575f',
          400: '#84848c',
          300: '#aeaeb5',
          200: '#d4d4d8',
          100: '#ececee'
        },
        gilt: {
          400: '#e4c98a',
          500: '#c9a55c',
          600: '#a9824a'
        },
        signal: {
          rec: '#c4453f',
          live: '#4a9e7d'
        }
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      letterSpacing: {
        wideish: '0.02em'
      },
      keyframes: {
        pulse_ring: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        }
      },
      animation: {
        pulse_ring: 'pulse_ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite'
      }
    }
  },
  plugins: []
};
