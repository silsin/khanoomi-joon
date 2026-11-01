import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f6f4",
          100: "#eceae6",
          200: "#d6d2cb",
          300: "#b8b2a8",
          400: "#8f887d",
          500: "#6b6560",
          600: "#4a4540",
          700: "#2e2a26",
          800: "#1a1815",
          900: "#0d0c0a",
        },
        gold: {
          50: "#fdf8ec",
          100: "#f9edcd",
          200: "#f2d99a",
          300: "#e9c066",
          400: "#dda53a",
          500: "#c9a227",
          600: "#a8841f",
          700: "#87681a",
          800: "#6b5216",
          900: "#4f3d12",
        },
        navy: {
          50: "#eef2f8",
          100: "#d9e2f0",
          200: "#b3c5e1",
          300: "#8ca8d2",
          400: "#5f84bd",
          500: "#3a63a3",
          600: "#2a4d85",
          700: "#1e3a5f",
          800: "#142844",
          900: "#0b1628",
        },
        cream: {
          50: "#fdfbf7",
          100: "#faf7f0",
          200: "#f5f0e6",
          300: "#ece4d4",
          400: "#e0d4bc",
        },
        coral: {
          400: "#f07a6a",
          500: "#e85d4c",
          600: "#d14636",
        },
      },
      fontFamily: {
        vazir: ["Vazirmatn", "sans-serif"],
        cairo: ["Cairo", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        soft: "0 2px 12px rgba(13,12,10,0.06)",
        card: "0 4px 24px rgba(13,12,10,0.08)",
        elevated: "0 12px 40px rgba(13,12,10,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
