/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          dark: '#0B0F19',
          panel: '#151C2C',
          accent: '#00F0FF',
          success: '#00FF9D',
          warning: '#FFB800',
          danger: '#FF3366',
          text: '#E2E8F0',
          muted: '#94A3B8'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
