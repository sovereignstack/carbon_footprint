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
          dark: '#0B0F19',
          card: '#1F2937',
          accent: '#10B981',
          glow: '#34D399',
        }
      }
    },
  },
  plugins: [],
}
