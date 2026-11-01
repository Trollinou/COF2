/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#fcfbf7',
          100: '#f7f4ea',
          200: '#ede6d1',
          300: '#dfd2b0',
          400: '#cbb689',
          500: '#b89b65',
          600: '#9d7e4d',
          700: '#7e623d',
          800: '#674f35',
          900: '#54422e',
        },
        fantasy: {
          crimson: '#8b1e1e',
          amber: '#b45309',
          navy: '#1e293b',
          gold: '#d97706',
          emerald: '#166534',
          slate: '#334155'
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Palatino', 'Palatino Linotype', 'Book Antiqua', 'Baskerville', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

