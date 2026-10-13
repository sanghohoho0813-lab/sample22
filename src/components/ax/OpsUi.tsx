"use client";
/**
 * 운영 화면 공용 부품 — 표 정렬·페이지, 긴급도, 영향 금액, 실행 단계, 활동 타임라인.
 * 카드·배지를 늘리지 않고 표·타임라인 중심으로 정보를 정리하기 위한 최소 단위.
 */
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { ActionStage, ActivityEntry, Measurement } from "@/lib/types";
import type { Severity } from "@/lib/control";
import { SEVERITY_LABEL } from "@/lib/control";
import { LIFECYCLE, lifecycleIndex } from "@/lib/lifecycle";
import { fmtDate, relTime } from "@/lib/format";

// ---------- 숫자 표기 ----------
export function money(n: number) {
  const abs = Math.abs(n);
  if (abs >= 100000000) return `${(n / 100000000).toFixed(abs >= 1e9 ? 0 : 1)}억원`;
  if (abs >= 10000) return `${Math.round(n / 10000).toLocaleString("ko-KR")}만원`;
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}
export const pctText = (r: number, d = 1) => `${(r * 100).toFixed(d)}%`;

/** 영향 값 + 계산식 (마우스·포커스로 확인) */
export function Impact({
  value,
  unit,
  basis,
  label,
  strong = true,
}: {
  value: number;
  unit: "원" | "건" | "개" | "명";
  basis?: string;
  label?: string;
  strong?: boolean;
}) {
  const text = unit === "원" ? money(value) : `${Math.round(value).toLocaleString("ko-KR")}${unit}`;
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className={`tabular-nums ${strong ? "font-bold text-ink" : ""}`}>{text}</span>
      {label && <span className="text-[12px] text-muted">{label}</span>}
      {basis && <span className="sr-only">계산식: {basis}</span>}
    </span>
  );
}

// ---------- 긴급도 ----------
const SEV_CLS: Record<Severity, string> = {
  critical: "bg-danger text-white",
  high: "bg-orange-strong text-white",
  mid: "bg-secondary/15 text-secondary",
  low: "bg-line text-muted",
};
export function SeverityTag({ s }: { s: Severity }) {
  return (
    <span
      className={`inline-flex min-w-[40px] justify-center rounded-md px-1.5 py-0.5 text-[12px] font-bold ${SEV_CLS[s]}`}
    >
      {SEVERITY_LABEL[s]}
    </span>
  );
}

// ---------- 정렬 가능한 표 ----------
export type SortDir = "asc" | "desc";
export function useSort<T, K extends string>(
  rows: T[],
  getters: Record<K, (r: T) => number | string>,
  initial: NoInfer<K>,
  dir: SortDir = "desc",
) {
  const [key, setKey] = useState<K>(initial);
  const [d, setD] = useState<SortDir>(dir);
  const sorted = useMemo(() => {
    const g = getters[key];
    return [...rows].sort((a, b) => {
      const x = g(a);
      const y = g(b);
      const c =
        typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ko");
      return d === "asc" ? c : -c;
    });
    // getters는 호출부에서 고정된 객체로 넘긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, d]);
  const toggle = (k: K) => {
    if (k === key) setD(d === "asc" ? "desc" : "asc");
    else {
      setKey(k);
      setD("desc");
    }
  };
  return { sorted, key, dir: d, toggle };
}

export function SortTh<K extends string>({
  k,
  sort,
  children,
  className = "",
}: {
  k: K;
  sort: { key: K; dir: SortDir; toggle: (k: K) => void };
  children: ReactNode;
  className?: string;
}) {
  const on = sort.key === k;
  return (
    <th className={className} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => sort.toggle(k)}
        className={`inline-flex items-center gap-1 font-semibold hover:text-ink ${on ? "text-ink" : ""} ${className.includes("text-right") ? "flex-row-reverse" : ""}`}
      >
        {children}
        {on ? (
          sort.dir === "asc" ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

export function usePage<T>(rows: T[], size = 12) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages - 1);
  return { rows: rows.slice(p * size, p * size + size), page: p, pages, setPage, total: rows.length, size };
}

export function Pager({
  pg,
}: {
  pg: { page: number; pages: number; setPage: (n: number) => void; total: number; size: number };
}) {
  if (pg.pages <= 1) return null;
  const from = pg.page * pg.size + 1;
  const to = Math.min(pg.total, from + pg.size - 1);
  return (
    <div className="flex items-center justify-between gap-2 px-1 pt-3 text-sm text-muted">
      <span className="tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} / {pg.total.toLocaleString()}건
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn-ghost btn-sm !px-2"
          disabled={pg.page === 0}
          onClick={() => pg.setPage(pg.page - 1)}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="tabular-nums text-ink">
          {pg.page + 1} / {pg.pages}
        </span>
        <button
          className="btn-ghost btn-sm !px-2"
          disabled={pg.page >= pg.pages - 1}
          onClick={() => pg.setPage(pg.page + 1)}
          aria-label="다음 페이지"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------- 실행 라이프사이클 ----------
export function LifecycleStepper({ stage, compact = false }: { stage: ActionStage; compact?: boolean }) {
  const idx = lifecycleIndex(stage);
  const off = stage === "held" || stage === "dismissed";
  return (
    <ol className={`flex w-full items-start ${compact ? "gap-1" : "gap-1.5"}`} aria-label="실행 단계">
      {LIFECYCLE.map((st, i) => {
        const done = !off && i < idx;
        const cur = !off && i === idx;
        return (
          <li
            key={st.stage}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
            aria-current={cur ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              <span
                className={`h-[3px] flex-1 rounded ${i === 0 ? "opacity-0" : done || cur ? "bg-primary" : "bg-line"}`}
              />
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  done
                    ? "bg-primary text-white"
                    : cur
                      ? "bg-primary-strong text-white ring-4 ring-primary/15"
                      : "bg-mist text-muted"
                }`}
              >
                {done ? <Check size={13} /> : i + 1}
              </span>
              <span
                className={`h-[3px] flex-1 rounded ${i === LIFECYCLE.length - 1 ? "opacity-0" : done ? "bg-primary" : "bg-line"}`}
              />
            </div>
            {!compact && (
              <span className={`text-[12px] leading-tight ${cur ? "font-bold text-ink" : "text-muted"}`}>
                {st.label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const VERDICT: Record<Measurement["verdict"], { label: string; cls: string }> = {
  improved: { label: "개선", cls: "bg-teal/15 text-teal" },
  unchanged: { label: "변화 없음", cls: "bg-line text-muted" },
  worse: { label: "악화", cls: "bg-danger/10 text-danger" },
  pending: { label: "판단 보류", cls: "bg-secondary/12 text-secondary" },
};
export function VerdictTag({ v }: { v: Measurement["verdict"] }) {
  return <span className={`badge ${VERDICT[v].cls}`}>{VERDICT[v].label}</span>;
}

/** 실행 전 기준값 → 지금 (같은 지표) */
export function MeasureRow({ m, live = false }: { m: Measurement; live?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">{m.metric}</div>
        <div className="flex items-center gap-2">
          {live && <span className="text-[12px] text-muted">지금 계산</span>}
          <VerdictTag v={m.verdict} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="rounded-lg bg-mist px-2 py-2">
          <div className="text-[12px] text-muted">실행 전</div>
          <div className="text-[15px] font-bold tabular-nums">{m.before}</div>
        </div>
        <ChevronRight size={16} className="text-muted" />
        <div className="rounded-lg bg-soft px-2 py-2">
          <div className="text-[12px] text-muted">{live ? "지금" : "측정 시점"}</div>
          <div className="text-[15px] font-bold tabular-nums">{m.after}</div>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-muted">{m.note}</p>
    </div>
  );
}

// ---------- 활동 타임라인 ----------
export function ActivityTimeline({ items }: { items: ActivityEntry[] }) {
  if (!items.length) return <p className="text-sm text-muted">기록이 없습니다.</p>;
  return (
    <ol className="relative space-y-3 border-l-2 border-line pl-4">
      {[...items].reverse().map((e, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-line"}`}
          />
          <div className="text-[15px] leading-snug">{e.note}</div>
          <div className="mt-0.5 text-[12px] text-muted">
            {e.actor} · <time dateTime={e.at}>{fmtDate(e.at, "datetime")}</time> ({relTime(e.at)})
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- 부하·비율 막대 ----------
export function LoadBar({
  value,
  warnAt = 0.85,
  dangerAt = 1,
  max = 1.6,
}: {
  value: number;
  warnAt?: number;
  dangerAt?: number;
  max?: number;
}) {
  const w = Math.min(1, value / max) * 100;
  const tone = value >= dangerAt ? "bg-danger" : value >= warnAt ? "bg-orange" : "bg-teal";
  return (
    <div
      className="relative h-2 w-full overflow-hidden rounded-full bg-mist"
      role="img"
      aria-label={`부하율 ${Math.round(value * 100)}%`}
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${w}%` }} />
      <div className="absolute inset-y-0 w-px bg-ink/40" style={{ left: `${(dangerAt / max) * 100}%` }} />
    </div>
  );
}

/** 작은 설명 (i) — 계산식·가정 */
export function Basis({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1 text-[12px] leading-snug text-muted">
      <Info size={12} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </span>
  );
}

/** 상단 상태줄 칸 — onClick이 있으면 그 상태로 거르는 버튼이 된다 */
export function StatusCell({
  label,
  value,
  sub,
  tone = "neutral",
  onClick,
  pressed,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "danger" | "warn" | "good";
  onClick?: () => void;
  pressed?: boolean;
}) {
  const t = { neutral: "", danger: "text-danger", warn: "text-orange", good: "text-teal" }[tone];
  const body = (
    <>
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <div
        className={`mt-0.5 whitespace-nowrap text-[22px] font-black tabular-nums leading-tight tracking-tight ${t}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[13px] leading-snug text-muted">{sub}</div>}
    </>
  );
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        className={`min-w-0 px-4 py-3 text-left transition-colors hover:bg-mist ${pressed ? "bg-soft" : ""}`}
      >
        {body}
      </button>
    );
  return <div className="min-w-0 px-4 py-3">{body}</div>;
}
