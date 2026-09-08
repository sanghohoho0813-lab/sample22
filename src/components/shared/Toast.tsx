"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

interface Toast { id: number; title: string; body?: string; tone: "success" | "info" | "warn"; }
const Ctx = createContext<{ toast: (t: Omit<Toast, "id">) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed z-[1100] left-1/2 -translate-x-1/2 bottom-24 sm:bottom-6 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto card-raised px-4 py-3 flex items-start gap-3 fade-up border-l-4" style={{ borderLeftColor: t.tone === "success" ? "var(--t-primary)" : t.tone === "warn" ? "#D93A3A" : "var(--t-secondary)" }}>
            {t.tone === "success" ? <CheckCircle2 className="text-primary shrink-0" size={20} /> : t.tone === "warn" ? <AlertTriangle className="text-danger shrink-0" size={20} /> : <Info className="text-secondary shrink-0" size={20} />}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm leading-snug">{t.title}</div>
              {t.body && <div className="text-sm text-muted mt-0.5">{t.body}</div>}
            </div>
            <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} aria-label="닫기" className="text-muted hover:text-ink"><X size={16} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx).toast;
