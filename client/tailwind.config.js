import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(__dirname, 'index.html'),
    resolve(__dirname, 'src/**/*.{js,jsx}'),
  ],
  theme: {
    extend: {
      colors: {
        'dark': {
          950: '#0a0a10',
          900: '#111118',
          800: '#16161f',
          700: '#1e1e2a',
          600: '#2a2a38',
          500: '#3a3a4a',
        },
        'brand': {
          DEFAULT: '#7c3aed',
          light: '#8A5CF6',
          dark: '#6d28d9',
        },
        'accent': {
          cyan: '#22d3ee',
          blue: '#60A5FA',
          orange: '#FF9F43',
          red: '#ef4444',
          yellow: '#f59e0b',
          green: '#10b981',
        },
      },
      boxShadow: {
        'glow-brand': '0 0 20px rgba(124,58,237,0.15), 0 0 40px rgba(124,58,237,0.05)',
        'glow-cyan': '0 0 20px rgba(34,211,238,0.15), 0 0 40px rgba(34,211,238,0.05)',
        'glow-green': '0 0 20px rgba(16,185,129,0.15)',
        'glow-red': '0 0 20px rgba(239,68,68,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out both',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};
