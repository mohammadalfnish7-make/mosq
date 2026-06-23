import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211c",
        paper: "#f7f6f0",
        mint: "#d9f1df",
        teal: "#16796f",
        clay: "#b85f4d"
      }
    }
  },
  plugins: []
};

export default config;
