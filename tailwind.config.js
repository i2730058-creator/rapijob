/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F6FF',
          100: '#E2ECFF',
          200: '#C3D8FF',
          300: '#94BAFF',
          400: '#5D92FF',
          500: '#1565FF',
          600: '#0B4EE0',
          700: '#0C3FB4',
          800: '#0E368F',
          900: '#0B2447',
          950: '#071A33',
        },
        sun: {
          100: '#FFF7D6',
          200: '#FFEDAA',
          300: '#FFE07A',
          400: '#FFD24D',
          500: '#FFC531',
          600: '#E8A900',
          700: '#B98200',
        },
        cloud: '#F5F8FD',
        ink: '#071A33',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(7, 26, 51, 0.18)',
        card: '0 4px 24px -8px rgba(7, 26, 51, 0.12)',
        glow: '0 18px 60px -18px rgba(21, 101, 255, 0.55)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
