"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check, Info, AlertTriangle, X, ChevronRight } from "lucide-react";

/** action: 알림 안에서 바로 다음 행동으로 이어지는 링크 (예: 담은 뒤 "장바구니 보기") */
interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "success" | "info" | "warn";
  action?: { label: string; href: string };
}
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
      <div
        className="pointer-events-none fixed left-1/2 top-[68px] z-[1100] flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:top-auto"
        aria-live="polite"
      >
        {items.map((t) => {
          const Icon = t.tone === "success" ? Check : t.tone === "warn" ? AlertTriangle : Info;
          return (
            <div
              key={t.id}
              role="status"
              className="fade-up pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#1B2733] py-3 pl-3.5 pr-2 text-white shadow-[0_12px_32px_-8px_rgba(15,23,32,0.45)]"
            >
              {/* 색은 아이콘 원 하나에만 — 어두운 바탕에서도 상태가 한눈에 보이게 */}
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full"
                style={{
                  background:
                    t.tone === "success"
                      ? "var(--t-primary)"
                      : t.tone === "warn"
                        ? "#D93A3A"
                        : "var(--t-secondary)",
                }}
                aria-hidden="true"
              >
                <Icon size={15} strokeWidth={2.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold leading-snug">{t.title}</div>
                {t.body && <div className="mt-0.5 line-clamp-2 text-[14px] text-[#C5CED6]">{t.body}</div>}
              </div>
              {t.action && (
                <Link
                  href={t.action.href}
                  onClick={() => dismiss(t.id)}
                  className="inline-flex min-h-[36px] shrink-0 items-center gap-0.5 whitespace-nowrap rounded-xl bg-white/[0.12] px-3 text-[14px] font-bold text-white hover:bg-white/20"
                >
                  {t.action.label}
                  <ChevronRight size={15} />
                </Link>
              )}
              <button
                onClick={() => dismiss(t.id)}
                aria-label="닫기"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#AEB8C2] hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx).toast;
