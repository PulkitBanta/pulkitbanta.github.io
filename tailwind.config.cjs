/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html}'],
  theme: {
    extend: {
      screens: {
        xs: '425px',
      },
    },
  },
  plugins: [],
};
