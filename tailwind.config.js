/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./*.html",
    "./*.js",
    "./admin/**/*.html",
    "./admin/**/*.js",
    "./src/**/*.{html,js}",
    "./pages/**/*.{html,js}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
