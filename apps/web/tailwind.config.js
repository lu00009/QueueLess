/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1F5C3A',
          hover: '#18472D',
          light: '#E8F3EC',
        },
        mint: {
          DEFAULT: '#E8F3EC',
          border: '#D0E6D8',
        },
        'off-white': '#FAFAF7',
        ink: {
          DEFAULT: '#14201A',
          muted: '#6B7A72',
        },
        'soft-grey': '#6B7A72',
        lime: {
          DEFAULT: '#B7E36B',
          accent: '#A4D652',
        },
        brand: {
          50: '#E8F3EC',
          100: '#E8F3EC',
          500: '#1F5C3A',
          600: '#1F5C3A',
          700: '#18472D',
          900: '#14201A',
        },
      },
      borderRadius: {
        'input': '12px',
        'button': '12px',
        'sheet': '16px',
        'badge': '8px',
      },
    },
  },
  plugins: [],
}
