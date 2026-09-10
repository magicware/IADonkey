/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        indigo: {
          50: 'rgb(var(--color-primary-300-rgb, 165 180 252) / <alpha-value>)',
          100: 'rgb(var(--color-primary-300-rgb, 165 180 252) / <alpha-value>)',
          200: 'rgb(var(--color-primary-300-rgb, 165 180 252) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300-rgb, 165 180 252) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400-rgb, 129 140 248) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500-rgb, 99 102 241) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600-rgb, 79 70 229) / <alpha-value>)',
          700: 'rgb(var(--color-primary-600-rgb, 79 70 229) / <alpha-value>)',
          800: 'rgb(var(--color-primary-600-rgb, 79 70 229) / <alpha-value>)',
          900: 'rgb(var(--color-primary-600-rgb, 79 70 229) / <alpha-value>)',
        },
        wox: {
          bg: '#1e1e24',
          input: '#282832',
          item: '#23232b',
          itemHover: '#2e2e38',
          itemSelected: '#3b3b4a',
          accent: 'rgb(var(--color-primary-500-rgb, 99 102 241))',
          border: '#383848',
          subtext: '#9ca3af'
        }
      }
    },
  },
  plugins: [],
}
