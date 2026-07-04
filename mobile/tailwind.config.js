/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: ["nativewind/preset"],
  theme: {
    extend: {
      colors: {
        accent: {
          600: "#7c3aed",
          500: "#8b5cf6",
          400: "#a78bfa",
        },
        surface: {
          base: "#0f0f1e",
          raised: "#161623",
          overlay: "#1e1e2e",
        },
        border: {
          subtle: "rgba(42, 42, 62, 0.5)",
          DEFAULT: "#2a2a3e",
          strong: "#3a3a52",
        },
      },
    },
  },
  plugins: [],
};
