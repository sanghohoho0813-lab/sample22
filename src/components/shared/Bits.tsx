"use client";
import { useState, type ReactNode } from "react";
import { HelpCircle, Inbox, Sparkles } from "lucide-react";
import Overlay from "./Overlay";

export function Tabs<T extends string>({ tabs, value, onChange, className = "" }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; className?: string }) {
  return (
    <div className={`flex gap-1 overflow-x-auto hide-scrollbar border-b border-line ${className}`} role="tablist">
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button key={t.key} role="tab" aria-selected={on} onClick={() => onChange(t.key)} className={`relative px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 min-h-[44px] ${on ? "text-primary" : "text-muted hover:text-ink"}`}>
            {t.label}{t.count !== undefined && <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${on ? "bg-primary/12 text-primary" : "bg-mist"}`}>{t.count}</span>}
            {on && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-primary rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-2">
      <div className="w-12 h-12 rounded-2xl bg-mist flex items-center justify-center text-muted">{icon ?? <Inbox size={22} />}</div>
      <div className="font-semibold">{title}</div>
      {body && <p className="text-sm text-muted max-w-sm">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** 용어 설명 — 첫 등장 시 쉬운 설명 */
export function Term({ term, children, desc }: { term: string; children?: ReactNode; desc: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-4 decoration-muted/60 hover:decoration-primary">
        {children ?? term}<HelpCircle size={13} className="text-muted" />
      </button>
      <Overlay open={open} onClose={() => setOpen(false)} title={term} size="sm">
        <p className="text-[17px] leading-relaxed">{desc}</p>
      </Overlay>
    </>
  );
}

export const TERMS = {
  sku: "용량·구성·옵션까지 구분한 상품 관리번호입니다. 같은 물티슈라도 단품과 20팩 묶음은 다른 SKU입니다.",
  fulfillment: "주문 이후 상품을 피킹·포장·출고·배송하는 전체 처리과정입니다.",
  leadTime: "발주한 뒤 실제 상품을 받기까지 걸리는 기간입니다.",
  daysOfStock: "지금 가진 재고로 며칠 동안 팔 수 있는지 계산한 값입니다. 가용재고 ÷ 평균 일판매량.",
  safetyStock: "공급이 늦어져도 품절되지 않도록 항상 남겨두는 최소 재고량입니다.",
  fillRate: "발주한 수량 중 실제로 입고된 비율입니다.",
  grossMargin: "매출에서 상품원가·할인·배송비를 뺀, 실제로 남는 돈입니다.",
  demandSignal: "검색·조회·장바구니·주문 데이터를 합쳐 '앞으로 얼마나 팔릴지'를 나타내는 신호입니다.",
  rls: "Row Level Security. 로그인한 사람의 역할에 따라 볼 수 있는 데이터 행을 데이터베이스가 제한하는 방식입니다.",
  ssot: "Single Source of Truth. 같은 정보를 여러 곳에 따로 두지 않고 기준이 되는 한 곳에서만 관리하는 원칙입니다.",
} as const;

/** AI Ready marker — 규칙기반 Demo 상태를 정직하게 표시 */
export function AiReady({ title, now, next, method, compact = false }: { title: string; now: string; next: string; method: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-secondary/60 bg-secondary/8 text-secondary font-semibold ${compact ? "px-2 py-1 text-[13px]" : "px-2.5 py-1.5 text-xs"} hover:bg-secondary/15 transition-colors`}>
        <Sparkles size={compact ? 12 : 14} /> AI READY
      </button>
      <Overlay open={open} onClose={() => setOpen(false)} title={title} subtitle="AI 적용 상태 — 정직한 표시" size="sm">
        <dl className="space-y-3 text-[17px]">
          <div><dt className="text-xs font-semibold text-muted uppercase">현재</dt><dd className="mt-0.5">{now}</dd></div>
          <div><dt className="text-xs font-semibold text-muted uppercase">계산 방식</dt><dd className="mt-0.5">{method}</dd></div>
          <div><dt className="text-xs font-semibold text-muted uppercase">향후 (API 연결 시)</dt><dd className="mt-0.5">{next}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-muted">단순 합계·재고일수·정렬은 코드로 계산하며 AI라고 부르지 않습니다. 실제 LLM 연결은 READY 상태입니다.</p>
      </Overlay>
    </>
  );
}

export function Freshness({ updatedAt, source = "Demo Repository" }: { updatedAt?: string; source?: string }) {
  const t = updatedAt ? new Date(updatedAt) : null;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-teal" />
      {source} · {t ? `${p(t.getMonth() + 1)}/${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())} 기준` : "실시간"}
    </span>
  );
}

export function SectionHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
