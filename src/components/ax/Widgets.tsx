"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { Sparkline } from "@/components/shared/Charts";

export function KpiCard({ label, value, sub, delta, href, tone = "neutral", spark, icon, onClick, big = false }: { label: ReactNode; value: ReactNode; sub?: ReactNode; delta?: number; href?: string; tone?: "neutral" | "danger" | "warn" | "good" | "primary"; spark?: number[]; icon?: ReactNode; onClick?: () => void; big?: boolean }) {
  const toneBar = { neutral: "bg-line", danger: "bg-danger", warn: "bg-orange", good: "bg-teal", primary: "bg-primary" }[tone];
  const inner = (
    <div className={`card p-4 h-full flex flex-col relative overflow-hidden transition-shadow ${href || onClick ? "hover:shadow-raised cursor-pointer" : ""}`}>
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${toneBar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-muted font-semibold flex items-center gap-1.5">{icon}{label}</div>
        {(href || onClick) && <ChevronRight size={16} className="text-muted" />}
      </div>
      <div className={`mt-1.5 font-black tabular-nums tracking-tight ${big ? "text-3xl sm:text-4xl" : "text-2xl sm:text-[28px]"}`}>{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted min-h-[18px]">
        {delta !== undefined && <span className={`inline-flex items-center gap-0.5 font-semibold ${delta >= 0 ? "text-teal" : "text-danger"}`}>{delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(delta * 100).toFixed(1)}%</span>}
        {sub && <span className="truncate">{sub}</span>}
      </div>
      {spark && <div className="mt-2 -mb-1"><Sparkline values={spark} width={160} height={30} /></div>}
    </div>
  );
  if (href) return <Link href={href} className="block h-full">{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block h-full w-full text-left">{inner}</button>;
  return inner;
}

export function Panel({ title, sub, right, children, className = "", id, tour }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; id?: string; tour?: string }) {
  return (
    <section id={id} data-tour={tour} className={`card p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">{title && <h2 className="font-bold text-lg leading-tight">{title}</h2>}{sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}</div>
          {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, className = "" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-mist px-3 py-2.5 ${className}`}><div className="text-xs text-muted">{label}</div><div className="font-bold tabular-nums text-[17px] leading-tight mt-0.5">{value}</div>{sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}</div>;
}

export function Reasons({ items, title = "판단근거" }: { items: string[]; title?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">{title}</div>
      <ul className="mt-1.5 space-y-1">{items.map((r, i) => <li key={i} className="flex items-start gap-2 text-[14px]"><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{r}</li>)}</ul>
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return <div className={className}><div className="text-xs text-muted">{label}</div><div className="font-semibold text-[15px] mt-0.5">{children}</div></div>;
}
