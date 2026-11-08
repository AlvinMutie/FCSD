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
        brand: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#ced9fd',
          300: '#a3bbfb',
          400: '#7295f7',
          500: '#466cf1',
          600: '#2c4fe5',
          700: '#233cb7',
          800: '#203394',
          900: '#1e2e76',
        },
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#090d16',
        }
      }
    },
  },
  plugins: [],
}
