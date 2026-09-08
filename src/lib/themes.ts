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
  { key: "deep-navy", no: "01", name: "Deep Navy Blue", shell: "#0B1830", primary: "#2457D6", secondary: "#1687A7", accent: "#17A889", highlight: "#E7C873", soft: "#DCE8F7" },
  { key: "navy-gold", no: "02", name: "Navy Gold", shell: "#111A2D", primary: "#2847A7", secondary: "#A37A28", accent: "#D0A84B", highlight: "#F0D995", soft: "#EFE8D7" },
  { key: "emerald-gold", no: "03", name: "Emerald Gold", shell: "#11332B", primary: "#0E7663", secondary: "#2C9277", accent: "#B4862A", highlight: "#E8CE88", soft: "#E2F0EA" },
  { key: "forest-sage", no: "04", name: "Forest Sage", shell: "#17352C", primary: "#356E58", secondary: "#73977E", accent: "#A58E4D", highlight: "#D9D2AA", soft: "#E5ECE5" },
  { key: "deep-teal", no: "05", name: "Deep Teal", shell: "#08323A", primary: "#087A83", secondary: "#1597A3", accent: "#D2704C", highlight: "#E9B59B", soft: "#DDEDEF" },
  { key: "onyx-gold", no: "06", name: "Onyx Gold", shell: "#15171C", primary: "#343942", secondary: "#6A717C", accent: "#B89032", highlight: "#E0C76F", soft: "#E6E8EC" },
  { key: "burgundy-slate", no: "07", name: "Burgundy Slate", shell: "#3A1724", primary: "#7A2C49", secondary: "#667085", accent: "#A85C72", highlight: "#E6B6A5", soft: "#EEE4E8" },
  { key: "plum-indigo", no: "08", name: "Plum Indigo", shell: "#291A3D", primary: "#573F91", secondary: "#4E63A8", accent: "#8B5AA6", highlight: "#C4B0E6", soft: "#E9E5F3" },
  { key: "steel-platinum", no: "09", name: "Steel Platinum", shell: "#24303B", primary: "#44647A", secondary: "#6D8899", accent: "#4C9AAA", highlight: "#C9D6DE", soft: "#E7EDF1" },
];

export const DEFAULT_THEME = "deep-teal";

const rgb = (hex: string) => { const h = hex.replace("#", ""); return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`; };

export function themeCssVars(t: ThemeDef): Record<string, string> {
  return {
    "--t-shell": t.shell, "--t-shell-rgb": rgb(t.shell),
    "--t-primary": t.primary, "--t-primary-rgb": rgb(t.primary),
    "--t-secondary": t.secondary, "--t-secondary-rgb": rgb(t.secondary),
    "--t-accent": t.accent, "--t-accent-rgb": rgb(t.accent),
    "--t-highlight": t.highlight, "--t-highlight-rgb": rgb(t.highlight),
    "--t-soft": t.soft, "--t-soft-rgb": rgb(t.soft),
  };
}
