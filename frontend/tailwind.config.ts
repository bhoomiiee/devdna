import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4ab5e0",
          dark: "#2e9fc8",
        },
        surface: "#0b1110",
        card: "#111d1b",
        paper: "#fdf1e1",
        ink: "#111411",
      },
      fontFamily: {
        ogg: ['"Ogg Medium"', '"Playfair Display"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        sky: "0 8px 28px rgba(74,181,224,0.28)",
        "sky-lg": "0 16px 48px rgba(74,181,224,0.36)",
        card: "0 8px 40px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
