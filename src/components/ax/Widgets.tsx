"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { Sparkline } from "@/components/shared/Charts";

/** 숫자가 포함된 문자열이면 첫 숫자를 0→값으로 카운트업 (접두·접미 유지). 감속 곡선, 600ms. */
export function CountUp({ text, duration = 650 }: { text: string; duration?: number }) {
  const m = text.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  const target = m ? Number(m[2].replace(/,/g, "")) : NaN;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const [v, setV] = useState(Number.isFinite(target) ? 0 : target);
  const started = useRef(false);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    started.current = true;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setV(target * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  if (!m || !Number.isFinite(target)) return <>{text}</>;
  const shown = (decimals ? v.toFixed(decimals) : Math.round(v).toString()).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );
  return (
    <>
      {m[1]}
      {shown}
      {m[3]}
    </>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  delta,
  href,
  tone = "neutral",
  spark,
  icon,
  onClick,
  big = false,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: number;
  href?: string;
  tone?: "neutral" | "danger" | "warn" | "good" | "primary";
  spark?: number[];
  icon?: ReactNode;
  onClick?: () => void;
  big?: boolean;
}) {
  const toneBar = {
    neutral: "bg-line",
    danger: "bg-danger",
    warn: "bg-orange",
    good: "bg-teal",
    primary: "bg-primary",
  }[tone];
  const inner = (
    <div
      className={`card relative flex h-full flex-col overflow-hidden p-4 ${href || onClick ? "lift cursor-pointer" : ""}`}
    >
      <span className={`grow-bar absolute bottom-3 left-0 top-3 w-1 rounded-r ${toneBar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-snug text-muted">
          {icon}
          <span className="min-w-0">{label}</span>
        </div>
        {(href || onClick) && <ChevronRight size={16} className="text-muted" />}
      </div>
      <div
        className={`mt-1.5 whitespace-nowrap font-black tabular-nums leading-tight tracking-tight ${big ? "text-[clamp(1.5rem,7vw,2.25rem)]" : "text-[clamp(1.375rem,6vw,1.875rem)]"}`}
      >
        {typeof value === "string" || typeof value === "number" ? <CountUp text={String(value)} /> : value}
      </div>
      <div className="mt-1 flex min-h-[18px] items-start gap-2 text-xs text-muted">
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${delta >= 0 ? "text-teal" : "text-danger"}`}
          >
            {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        {sub && <span className="line-clamp-2 min-w-0 leading-snug">{sub}</span>}
      </div>
      {spark && (
        <div className="-mb-1 mt-2">
          <Sparkline values={spark} width={160} height={30} />
        </div>
      )}
    </div>
  );
  if (href)
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button onClick={onClick} className="block h-full w-full text-left">
        {inner}
      </button>
    );
  return inner;
}

export function Panel({
  title,
  sub,
  right,
  children,
  className = "",
  id,
  tour,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  tour?: string;
}) {
  return (
    <section id={id} data-tour={tour} className={`card p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-[15rem]">
            {title && (
              <h2 className="text-lg font-bold leading-snug [&>span.inline-flex>svg]:mt-[3px] [&>span.inline-flex>svg]:shrink-0 [&>span.inline-flex]:items-start">
                {title}
              </h2>
            )}
            {sub && <p className="mt-0.5 text-sm leading-relaxed text-muted">{sub}</p>}
          </div>
          {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-mist px-3 py-2.5 ${className}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 whitespace-nowrap text-[19px] font-bold tabular-nums leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Reasons({ items, title = "판단근거" }: { items: string[]; title?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      <ul className="mt-1.5 space-y-1">
        {items.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-[16px]">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-[17px] font-semibold">{children}</div>
    </div>
  );
}
