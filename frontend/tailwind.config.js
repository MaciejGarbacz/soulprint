/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}