"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, X, ChevronRight } from "lucide-react";

/** action: 알림 안에서 바로 다음 행동으로 이어지는 링크 (예: 담은 뒤 "장바구니 보기") */
interface Toast { id: number; title: string; body?: string; tone: "success" | "info" | "warn"; action?: { label: string; href: string } }
const Ctx = createContext<{ toast: (t: Omit<Toast, "id">) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((x) => x.id !== id)), []);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    // 알림이 쌓여 화면을 덮지 않도록 최근 2개만 유지
    setItems((s) => [...s.slice(-1), { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.action ? 5000 : 3800);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {/* 모바일은 화면 위쪽(하단 탭바·주문 바를 가리지 않게), 데스크톱은 아래쪽 */}
      <div className="fixed z-[1100] left-1/2 -translate-x-1/2 top-[68px] sm:top-auto sm:bottom-6 flex flex-col gap-2 w-[calc(100%-1.5rem)] max-w-md pointer-events-none" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto card-raised px-4 py-3 flex items-start gap-3 fade-up border-l-4" style={{ borderLeftColor: t.tone === "success" ? "var(--t-primary)" : t.tone === "warn" ? "#D93A3A" : "var(--t-secondary)" }}>
            {t.tone === "success" ? <CheckCircle2 className="text-primary shrink-0 mt-0.5" size={20} /> : t.tone === "warn" ? <AlertTriangle className="text-danger shrink-0 mt-0.5" size={20} /> : <Info className="text-secondary shrink-0 mt-0.5" size={20} />}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[15px] leading-snug">{t.title}</div>
              {t.body && <div className="text-[14px] text-muted mt-0.5 line-clamp-2">{t.body}</div>}
              {t.action && <Link href={t.action.href} onClick={() => dismiss(t.id)} className="mt-1.5 inline-flex items-center gap-0.5 rounded-lg bg-soft px-2.5 min-h-[34px] text-[14px] font-bold text-primary hover:brightness-95 whitespace-nowrap">{t.action.label}<ChevronRight size={15} /></Link>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="닫기" className="shrink-0 -mr-1 w-7 h-7 inline-flex items-center justify-center text-muted hover:text-ink"><X size={16} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx).toast;
