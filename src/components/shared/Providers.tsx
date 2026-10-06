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

/** 하이드레이션 완료 표시 — E2E 테스트가 "버튼이 실제로 동작하는 시점"을 기다릴 때 사용 */
function HydrationMarker() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "true");
  }, []);
  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ThemeApplier />
      <HydrationMarker />
      {children}
    </ToastProvider>
  );
}
