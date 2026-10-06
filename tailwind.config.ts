import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // 터치 기기에서 탭 후 hover 스타일이 남는 현상 방지 — hover를 지원하는 기기에서만 hover: 적용
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        shell: "rgb(var(--t-shell-rgb) / <alpha-value>)",
        // `*-strong`: 흰 글자를 올리는 채움색 (WCAG AA 4.5:1 이상). 테마 색은 themes.ts의 inkFor()가 계산
        primary: {
          DEFAULT: "rgb(var(--t-primary-rgb) / <alpha-value>)",
          strong: "rgb(var(--t-primary-ink-rgb) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--t-secondary-rgb) / <alpha-value>)",
          strong: "rgb(var(--t-secondary-ink-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--t-accent-rgb) / <alpha-value>)",
          strong: "rgb(var(--t-accent-ink-rgb) / <alpha-value>)",
        },
        highlight: "rgb(var(--t-highlight-rgb) / <alpha-value>)",
        soft: "rgb(var(--t-soft-rgb) / <alpha-value>)",
        navy: "#10243E",
        teal: { DEFAULT: "#0FAF9A", strong: "#0A7769" },
        orange: { DEFAULT: "#F47A3C", strong: "#B55A2C" },
        ink: "#15202B",
        muted: "#5A6470",
        line: "#DDE3E8",
        mist: "#F3F6F8",
        danger: "#BF3333",
      },
      /**
       * 글자색은 채움색과 분리한다. 브랜드 색(teal·orange·테마 색)을 그대로 글자에 쓰면
       * 흰/연한 배경에서 명암비가 2.7~4.3:1에 그친다. `text-teal`, `text-primary` 등은
       * 같은 색상의 진한 잉크로 렌더링되고, 어두운 배경 위 글자는 `text-*-bright`를 쓴다.
       */
      textColor: {
        primary: "rgb(var(--t-primary-ink-rgb) / <alpha-value>)",
        secondary: "rgb(var(--t-secondary-ink-rgb) / <alpha-value>)",
        accent: "rgb(var(--t-accent-ink-rgb) / <alpha-value>)",
        teal: "#0A7769",
        orange: "#A65329",
        "teal-bright": "#0FAF9A",
        "orange-bright": "#F47A3C",
        "primary-bright": "rgb(var(--t-primary-rgb) / <alpha-value>)",
        "secondary-bright": "rgb(var(--t-secondary-rgb) / <alpha-value>)",
        "accent-bright": "rgb(var(--t-accent-rgb) / <alpha-value>)",
      },
      borderRadius: { xl2: "18px", xl3: "22px" },
      boxShadow: {
        card: "0 1px 2px rgba(16,36,62,0.06), 0 6px 20px rgba(16,36,62,0.06)",
        raised: "0 2px 6px rgba(16,36,62,0.08), 0 12px 32px rgba(16,36,62,0.10)",
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      screens: { xs: "430px" },
      fontSize: {
        // MD 기준: 고객 본문 17~19 · AX 대표/관리자 가독성 우선 · 작은 글자 남발 금지
        xs: ["0.8125rem", { lineHeight: "1.15rem" }], // 13px
        sm: ["0.9375rem", { lineHeight: "1.4rem" }], // 15px
        base: ["1.0625rem", { lineHeight: "1.65rem" }], // 17px
        lg: ["1.1875rem", { lineHeight: "1.75rem" }], // 19px
        xl: ["1.375rem", { lineHeight: "1.9rem" }], // 22px
        "2xl": ["1.625rem", { lineHeight: "2.1rem" }], // 26px
        "3xl": ["2rem", { lineHeight: "2.5rem" }], // 32px
        "4xl": ["2.5rem", { lineHeight: "3rem" }], // 40px
        "5xl": ["3.25rem", { lineHeight: "1.1" }], // 52px
      },
    },
  },
  plugins: [],
};
export default config;
