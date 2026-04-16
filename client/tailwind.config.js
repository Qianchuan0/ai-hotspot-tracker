/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'radar-bg': '#0A0E17',
        'radar-card': '#111827',
        'radar-scan': '#00FFB2',
        'radar-blue': '#3B82F6',
        'radar-warn': '#F59E0B',
        'radar-danger': '#EF4444',
        'radar-text': '#E5E7EB',
        'radar-muted': '#9CA3AF',
      },
      animation: {
        'scan': 'scan 4s linear infinite',
        'pulse-signal': 'pulse-signal 1.5s ease-out',
      },
      keyframes: {
        scan: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-signal': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.5)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
