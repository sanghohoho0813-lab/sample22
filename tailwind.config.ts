import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "rgb(var(--t-shell-rgb) / <alpha-value>)",
        primary: "rgb(var(--t-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--t-secondary-rgb) / <alpha-value>)",
        accent: "rgb(var(--t-accent-rgb) / <alpha-value>)",
        highlight: "rgb(var(--t-highlight-rgb) / <alpha-value>)",
        soft: "rgb(var(--t-soft-rgb) / <alpha-value>)",
        navy: "#10243E",
        teal: "#0FAF9A",
        orange: "#F47A3C",
        ink: "#15202B",
        muted: "#66727F",
        line: "#DDE3E8",
        mist: "#F3F6F8",
        danger: "#D93A3A",
      },
      borderRadius: { xl2: "18px", xl3: "22px" },
      boxShadow: {
        card: "0 1px 2px rgba(16,36,62,0.06), 0 6px 20px rgba(16,36,62,0.06)",
        raised: "0 2px 6px rgba(16,36,62,0.08), 0 12px 32px rgba(16,36,62,0.10)",
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "Roboto", "Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"],
      },
      screens: { xs: "430px" },
    },
  },
  plugins: [],
};
export default config;
