"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

let lockCount = 0;
function lockScroll() {
  lockCount += 1;
  document.body.style.overflow = "hidden";
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = "";
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

export default function Overlay({ open, onClose, title, subtitle, variant = "modal", size = "md", children, footer }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    lockScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button, [href], input, select, textarea");
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
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <div className="absolute inset-0 bg-shell/55 backdrop-blur-[2px] fade-in" onClick={onClose} aria-hidden="true" />
      <div className={isDrawer || isSheet ? "" : "absolute inset-0 flex items-center justify-center p-4"}>
        <div ref={panelRef} className={`${panelClass} fade-up`} onClick={(e) => e.stopPropagation()}>
          {(isDrawer || isSheet) && <div className="sm:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-line" />}
          {(title || subtitle) && (
            <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line">
              <div className="min-w-0">
                {title && <h2 className="text-lg font-bold leading-snug">{title}</h2>}
                {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="닫기" className="btn-ghost btn-sm -mr-2 !min-h-[40px] !px-2 shrink-0">
                <X size={20} />
              </button>
            </div>
          )}
          {!title && !subtitle && (
            <button type="button" onClick={onClose} aria-label="닫기" className="absolute right-3 top-3 z-10 btn-ghost btn-sm !min-h-[40px] !px-2 bg-white/80">
              <X size={20} />
            </button>
          )}
          <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">{children}</div>
          {footer && <div className="border-t border-line px-5 py-3 safe-bottom bg-white rounded-b-2xl">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
