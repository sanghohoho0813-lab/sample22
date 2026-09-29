"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockScroll, unlockScroll } from "./Overlay";

/**
 * 모바일 공통 햄버거 Drawer — 왼쪽에서 열림
 * - 폭 86vw · 최대 380px (화면 전체를 덮지 않음) · 배경 dim
 * - 상단(로고·닫기) / 중단(메뉴 — 이 영역만 독립 스크롤) / 하단(부가 기능·전환 CTA) 3단 구조
 * - 열려 있는 동안 배경 페이지 스크롤 잠금 · Esc·뒤로가기·배경 탭으로 닫힘
 */
export default function MobileDrawer({ open, onClose, label, header, footer, children, tone = "light" }: {
  open: boolean;
  onClose: () => void;
  label: string;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const last = document.activeElement as HTMLElement | null;
    lockScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    const onPop = () => closeRef.current();
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("button, a")?.focus(), 40);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      unlockScroll();
      last?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const dark = tone === "dark";
  return createPortal(
    <div className="fixed inset-0 z-[800]" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-[#0B1520]/55 fade-in" onClick={onClose} />
      <div
        ref={panel}
        className={`absolute inset-y-0 left-0 w-[86vw] max-w-[380px] flex flex-col shadow-raised slide-in-left ${dark ? "text-white" : "bg-white text-ink"}`}
        style={dark ? { background: "var(--t-shell)" } : undefined}
      >
        <div className={`shrink-0 border-b ${dark ? "border-white/10" : "border-line"}`}>{header}</div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className={`shrink-0 border-t safe-bottom ${dark ? "border-white/10" : "border-line bg-white"}`}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
