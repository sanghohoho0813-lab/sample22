"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** 오버레이·드로어가 여러 개 겹쳐도 마지막 하나가 닫힐 때만 배경 스크롤을 푼다 */
let lockCount = 0;
export function lockScroll() {
  lockCount += 1;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}
export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
}

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  variant?: "modal" | "drawer" | "sheet";
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
  /** on mobile drawer becomes bottom sheet automatically */
}

const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
const drawerWidths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

export default function Overlay({
  open,
  onClose,
  title,
  subtitle,
  variant = "modal",
  size = "md",
  children,
  footer,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], button, [href], input, select, textarea",
      );
      el?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      lastFocused.current?.focus?.();
    };
  }, [open, onClose]);

  // browser back closes overlay
  useEffect(() => {
    if (!open) return;
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const isDrawer = variant === "drawer";
  const isSheet = variant === "sheet";
  const panelClass = isDrawer
    ? `fixed inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full ${drawerWidths[size]} bg-white shadow-raised flex flex-col max-h-[92vh] sm:max-h-none rounded-t-3xl sm:rounded-none`
    : isSheet
      ? "fixed inset-x-0 bottom-0 w-full bg-white shadow-raised flex flex-col max-h-[88vh] rounded-t-3xl"
      : `relative w-full ${widths[size]} bg-white rounded-2xl shadow-raised flex flex-col max-h-[90vh]`;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <div
        className="fade-in absolute inset-0 bg-shell/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={isDrawer || isSheet ? "" : "absolute inset-0 flex items-center justify-center p-4"}>
        <div ref={panelRef} className={`${panelClass} fade-up`} onClick={(e) => e.stopPropagation()}>
          {(isDrawer || isSheet) && (
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line sm:hidden" />
          )}
          {(title || subtitle) && (
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-3 pt-4">
              <div className="min-w-0">
                {title && <h2 className="text-lg font-bold leading-snug">{title}</h2>}
                {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="btn-ghost btn-sm -mr-2 !min-h-[40px] shrink-0 !px-2"
              >
                <X size={20} />
              </button>
            </div>
          )}
          {!title && !subtitle && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="btn-ghost btn-sm absolute right-3 top-3 z-10 !min-h-[40px] bg-white/80 !px-2"
            >
              <X size={20} />
            </button>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="safe-bottom rounded-b-2xl border-t border-line bg-white px-5 py-3">{footer}</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
