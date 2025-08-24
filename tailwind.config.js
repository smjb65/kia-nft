/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FCD34D', 
        secondary: '#F59E0B', 
        dark: '#0F172A',
        'dark-light': '#1E293B',
        'dark-lighter': '#334155'
      },
    },
  },
  plugins: [],
};