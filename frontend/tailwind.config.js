/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0D9488',    // Apollo-inspired healthcare teal
          primaryHover: '#0f766e',
          primaryLight: '#ccfbf1',
          secondary: '#10B981',  // Wellness emerald
          secondaryHover: '#059669',
          secondaryLight: '#d1fae5',
          bg: '#F8FAFC',         // Crisp clean clinical background
          surface: '#FFFFFF',    // Pure white cards
          textPrimary: '#0F172A',// High-contrast slate 900
          textSecondary: '#64748B', // Muted slate 500
          border: '#E2E8F0',     // Subtle border slate 200
          accent: '#0284C7',     // Sky blue
          accentLight: '#E0F2FE',
          emergency: '#EF4444',  // Urgent red
          emergencyBg: '#FEF2F2',
          warning: '#F59E0B',
          warningBg: '#FFFBEB'
        },
        hospital: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0d9488', // Primary Teal
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#042f2e',
          950: '#021e1d',
        },
        azure: {
          DEFAULT: '#0284c7',
          light: '#38bdf8',
          ice: '#e0f2fe',
          hover: '#0369a1',
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
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(13, 148, 136, 0.1), 0 8px 10px -6px rgba(13, 148, 136, 0.05)',
        'elevated': '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
      }
    },
  },
  plugins: [],
}
