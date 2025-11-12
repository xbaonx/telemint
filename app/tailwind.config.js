/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ton-blue': '#0098EA',
        'ton-dark': '#1C1C1E',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
