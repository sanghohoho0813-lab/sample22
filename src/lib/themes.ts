// Canonical 9 Theme — Unified v3.0. Each theme changes 6 colors; neutrals stay fixed.
export interface ThemeDef {
  key: string;
  no: string;
  name: string;
  shell: string;
  primary: string;
  secondary: string;
  accent: string;
  highlight: string;
  soft: string;
}

export const THEMES: ThemeDef[] = [
  {
    key: "deep-navy",
    no: "01",
    name: "Deep Navy Blue",
    shell: "#0B1830",
    primary: "#2457D6",
    secondary: "#1687A7",
    accent: "#17A889",
    highlight: "#E7C873",
    soft: "#DCE8F7",
  },
  {
    key: "navy-gold",
    no: "02",
    name: "Navy Gold",
    shell: "#111A2D",
    primary: "#2847A7",
    secondary: "#A37A28",
    accent: "#D0A84B",
    highlight: "#F0D995",
    soft: "#EFE8D7",
  },
  {
    key: "emerald-gold",
    no: "03",
    name: "Emerald Gold",
    shell: "#11332B",
    primary: "#0E7663",
    secondary: "#2C9277",
    accent: "#B4862A",
    highlight: "#E8CE88",
    soft: "#E2F0EA",
  },
  {
    key: "forest-sage",
    no: "04",
    name: "Forest Sage",
    shell: "#17352C",
    primary: "#356E58",
    secondary: "#73977E",
    accent: "#A58E4D",
    highlight: "#D9D2AA",
    soft: "#E5ECE5",
  },
  {
    key: "deep-teal",
    no: "05",
    name: "Deep Teal",
    shell: "#08323A",
    primary: "#087A83",
    secondary: "#1597A3",
    accent: "#D2704C",
    highlight: "#E9B59B",
    soft: "#DDEDEF",
  },
  {
    key: "onyx-gold",
    no: "06",
    name: "Onyx Gold",
    shell: "#15171C",
    primary: "#343942",
    secondary: "#6A717C",
    accent: "#B89032",
    highlight: "#E0C76F",
    soft: "#E6E8EC",
  },
  {
    key: "burgundy-slate",
    no: "07",
    name: "Burgundy Slate",
    shell: "#3A1724",
    primary: "#7A2C49",
    secondary: "#667085",
    accent: "#A85C72",
    highlight: "#E6B6A5",
    soft: "#EEE4E8",
  },
  {
    key: "plum-indigo",
    no: "08",
    name: "Plum Indigo",
    shell: "#291A3D",
    primary: "#573F91",
    secondary: "#4E63A8",
    accent: "#8B5AA6",
    highlight: "#C4B0E6",
    soft: "#E9E5F3",
  },
  {
    key: "steel-platinum",
    no: "09",
    name: "Steel Platinum",
    shell: "#24303B",
    primary: "#44647A",
    secondary: "#6D8899",
    accent: "#4C9AAA",
    highlight: "#C9D6DE",
    soft: "#E7EDF1",
  },
];

export const DEFAULT_THEME = "deep-teal";

/** 테마와 무관한 고정 글자색 (tailwind.config.ts textColor와 같은 값) — 테스트로 AA 충족을 보장 */
export const STATIC_INK = {
  teal: "#0A7769",
  orange: "#A65329",
  danger: "#BF3333",
  muted: "#5A6470",
  tealStrongFill: "#0A7769",
  orangeStrongFill: "#B55A2C",
} as const;

const channels = (hex: string) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgb = (hex: string) => channels(hex).join(" ");
const toHex = (c: number[]) =>
  `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** WCAG 2.x 상대 휘도 */
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** 두 색의 명암비 (1~21) */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * 글자용 "잉크" 색. 브랜드 색을 그대로 글자에 쓰면 연한 배경 위에서 명암비가 4.5:1에 못 미치는
 * 경우가 많다. 색상(hue)은 유지한 채 검정 쪽으로 조금씩 섞어 `bg` 위에서 `min` 이상이 되는
 * 가장 밝은 색을 고른다. 이미 충분하면 원래 색을 돌려준다.
 */
export function inkFor(hex: string, bg = "#FFFFFF", min = 4.6) {
  const base = channels(hex);
  for (let k = 0; k <= 1; k += 0.02) {
    const c = toHex(base.map((v) => v * (1 - k)));
    if (contrastRatio(c, bg) >= min) return c;
  }
  return "#000000";
}

export function themeCssVars(t: ThemeDef): Record<string, string> {
  return {
    "--t-shell": t.shell,
    "--t-shell-rgb": rgb(t.shell),
    "--t-primary": t.primary,
    "--t-primary-rgb": rgb(t.primary),
    "--t-secondary": t.secondary,
    "--t-secondary-rgb": rgb(t.secondary),
    "--t-accent": t.accent,
    "--t-accent-rgb": rgb(t.accent),
    "--t-highlight": t.highlight,
    "--t-highlight-rgb": rgb(t.highlight),
    "--t-soft": t.soft,
    "--t-soft-rgb": rgb(t.soft),
    // 글자색 전용 — 가장 진한 연한 배경(soft) 위에서도 AA(4.5:1)를 넘도록
    "--t-primary-ink-rgb": rgb(inkFor(t.primary, t.soft)),
    "--t-secondary-ink-rgb": rgb(inkFor(t.secondary, t.soft)),
    "--t-accent-ink-rgb": rgb(inkFor(t.accent, t.soft)),
  };
}
