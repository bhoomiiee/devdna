import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6C63FF",
          dark: "#4B44CC",
        },
        surface: "#0F0F1A",
        card: "#1A1A2E",
      },
    },
  },
  plugins: [],
};

export default config;
