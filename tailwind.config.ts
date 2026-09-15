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
      fontSize: {
        // MD 기준: 고객 본문 17~19 · AX 대표/관리자 가독성 우선 · 작은 글자 남발 금지
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],   // 13px
        sm: ["0.9375rem", { lineHeight: "1.4rem" }],    // 15px
        base: ["1.0625rem", { lineHeight: "1.65rem" }], // 17px
        lg: ["1.1875rem", { lineHeight: "1.75rem" }],   // 19px
        xl: ["1.375rem", { lineHeight: "1.9rem" }],     // 22px
        "2xl": ["1.625rem", { lineHeight: "2.1rem" }],  // 26px
        "3xl": ["2rem", { lineHeight: "2.5rem" }],      // 32px
        "4xl": ["2.5rem", { lineHeight: "3rem" }],      // 40px
        "5xl": ["3.25rem", { lineHeight: "1.1" }],      // 52px
      },
    },
  },
  plugins: [],
};
export default config;
