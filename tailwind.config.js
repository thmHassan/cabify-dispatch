/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      "1.5xl": "1280px",
      xl: "1536px",
      "2xl": "1920px",
    },
  },
  plugins: [],
};
