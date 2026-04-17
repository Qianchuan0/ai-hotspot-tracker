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
          900: '#1E1E2E',
          800: '#252536',
          700: '#2D2D3A',
          600: '#3A3A4A',
          500: '#4A4A5A',
        },
        'brand': {
          DEFAULT: '#8A5CF6',
          light: '#A78BFA',
          dark: '#7C3AED',
        },
        'accent': {
          blue: '#60A5FA',
          cyan: '#4ECDC4',
          orange: '#FF9F43',
          red: '#FF6B6B',
          yellow: '#F7DC6F',
          green: '#3FB950',
        },
      },
    },
  },
  plugins: [],
};
