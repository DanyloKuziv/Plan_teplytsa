/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg:     '#0f1117',
        card:   '#1a1f2e',
        border: '#2a3040',
        hover:  '#222736',
        accent: {
          DEFAULT: '#00d4aa',
          dark:    '#00b894',
          light:   '#4dffd8',
        },
        danger: '#ff4757',
        warn:   '#ffa502',
        txt:    '#e2e8f0',
        muted:  '#64748b',
        primary: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card:        '0 4px 24px rgba(0,0,0,0.4)',
        glow:        '0 0 20px rgba(0,212,170,0.25)',
        'glow-sm':   '0 0 10px rgba(0,212,170,0.15)',
        'glow-danger': '0 0 20px rgba(255,71,87,0.25)',
      },
      animation: {
        fadeIn:   'fadeIn 0.2s ease-out',
        slideUp:  'slideUp 0.3s ease-out',
        shimmer:  'shimmer 1.5s infinite linear',
        toastIn:  'toastSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        modalIn:  'modalScaleIn 0.2s cubic-bezier(0.34,1.4,0.64,1) forwards',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer:      { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        toastSlideIn: { from: { opacity: '0', transform: 'translateX(100%) scale(0.9)' }, to: { opacity: '1', transform: 'translateX(0) scale(1)' } },
        modalScaleIn: { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
      }
    }
  },
  plugins: []
}
