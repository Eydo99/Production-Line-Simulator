/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2094f3",
        "primary-dark": "#1a7ac8",
        success: "#22c55e",
        "background-light": "#f5f7f8",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
