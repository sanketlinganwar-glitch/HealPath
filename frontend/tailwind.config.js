/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae6fd',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb', // Real Hospital Azure Blue (Center Cylindrical Pillar)
          600: '#1d4ed8',
          700: '#1b3b6f', // Real Hospital Royal Cobalt Blue (Main Architectural Pillars)
          800: '#13264f', // Deep Shaded Navy
          900: '#0e1f3d', // Architectural Deep Shadow
          950: '#071124',
        },
        azure: {
          DEFAULT: '#2563eb',
          light: '#60a5fa',
          ice: '#bae6fd',
          hover: '#1d4ed8',
        },
        signageRed: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
          surface: 'rgba(220, 38, 38, 0.08)',
        },
        emblemGreen: {
          DEFAULT: '#059669',
          light: '#10b981',
          surface: 'rgba(5, 150, 105, 0.08)',
        }
      }
    },
  },
  plugins: [],
}
