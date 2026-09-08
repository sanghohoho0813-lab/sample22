"use client";
import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { THEMES, themeCssVars } from "@/lib/themes";
import { ToastProvider } from "./Toast";

function ThemeApplier() {
  const theme = useStore((s) => s.ui.theme);
  const fontScale = useStore((s) => s.ui.fontScale);
  useEffect(() => {
    const t = THEMES.find((x) => x.key === theme) ?? THEMES[4];
    const root = document.documentElement;
    Object.entries(themeCssVars(t)).forEach(([k, v]) => root.style.setProperty(k, v));
    root.setAttribute("data-theme", t.key);
    root.setAttribute("data-font", fontScale);
  }, [theme, fontScale]);
  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ThemeApplier />
      {children}
    </ToastProvider>
  );
}
