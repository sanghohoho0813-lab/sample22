"use client";
import { useId, useState } from "react";

export function Sparkline({ values, width = 96, height = 28, stroke = "var(--t-primary)", fill = true }: { values: number[]; width?: number; height?: number; stroke?: string; fill?: boolean }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * width, height - ((v - min) / (max - min || 1)) * (height - 4) - 2] as const);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      {fill && <path d={`${d} L${width},${height} L0,${height} Z`} fill={stroke} opacity={0.12} className="fade-in" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="draw-line" style={{ ["--len" as string]: width * 2 }} />
    </svg>
  );
}

export interface SeriesPoint { label: string; value: number; value2?: number }

export function BarChart({ data, height = 200, format = (v: number) => v.toLocaleString(), color = "var(--t-primary)", color2 = "var(--t-accent)", label2, label1 = "값", showEvery = 1, horizontal = false }: { data: SeriesPoint[]; height?: number; format?: (v: number) => string; color?: string; color2?: string; label1?: string; label2?: string; showEvery?: number; horizontal?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(...data.map((d) => Math.max(d.value, d.value2 ?? 0)), 1);
  if (horizontal) {
    return (
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-24 shrink-0 truncate text-muted">{d.label}</div>
            <div className="flex-1 h-6 rounded-md bg-mist overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-300 grow-x" style={{ width: `${(d.value / max) * 100}%`, background: color, animationDelay: `${i * 40}ms` }} />
            </div>
            <div className="w-24 text-right tabular-nums font-semibold">{format(d.value)}</div>
          </div>
        ))}
      </div>
    );
  }
  const W = 600, H = height, padL = 8, padB = 24, padT = 12;
  const n = data.length;
  const slot = (W - padL * 2) / n;
  const bw = Math.min(28, slot * (label2 ? 0.34 : 0.6));
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-labelledby={id}>
        <title id={id}>{label1}{label2 ? ` / ${label2}` : ""} 차트</title>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={padL} x2={W - padL} y1={padT + (H - padT - padB) * (1 - f)} y2={padT + (H - padT - padB) * (1 - f)} stroke="#E6EBEF" strokeDasharray="3 4" />)}
        {data.map((d, i) => {
          const x = padL + slot * i + slot / 2;
          const h1 = Math.max(0, ((H - padT - padB) * d.value) / max);
          const h2 = Math.max(0, ((H - padT - padB) * (d.value2 ?? 0)) / max);
          const on = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
              <rect x={padL + slot * i} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
              <rect x={label2 ? x - bw - 1 : x - bw / 2} y={H - padB - h1} width={bw} height={h1} rx={4} fill={color} opacity={on ? 1 : 0.85} className="grow-bar" style={{ transformOrigin: `${x}px ${H - padB}px`, animationDelay: `${i * 25}ms` }} />
              {label2 && <rect x={x + 1} y={H - padB - h2} width={bw} height={h2} rx={4} fill={color2} opacity={on ? 1 : 0.85} className="grow-bar" style={{ transformOrigin: `${x}px ${H - padB}px`, animationDelay: `${i * 25 + 60}ms` }} />}
              {i % showEvery === 0 && <text x={x} y={H - 6} textAnchor="middle" fontSize={11} fill="#66727F">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 card-raised px-3 py-1.5 text-xs pointer-events-none whitespace-nowrap">
          <b>{data[hover].label}</b> · {label1} {format(data[hover].value)}{label2 ? ` · ${label2} ${format(data[hover].value2 ?? 0)}` : ""}
        </div>
      )}
      {label2 && (
        <div className="flex gap-4 text-xs text-muted mt-1 justify-end">
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />{label1}</span>
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color2 }} />{label2}</span>
        </div>
      )}
    </div>
  );
}

export function LineChart({ data, height = 200, format = (v: number) => v.toLocaleString(), color = "var(--t-primary)", color2 = "var(--t-accent)", label1 = "값", label2, showEvery = 1 }: { data: SeriesPoint[]; height?: number; format?: (v: number) => string; color?: string; color2?: string; label1?: string; label2?: string; showEvery?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const W = 600, H = height, padL = 8, padR = 8, padB = 24, padT = 12;
  const max = Math.max(...data.map((d) => Math.max(d.value, d.value2 ?? 0)), 1);
  const min = 0;
  const n = data.length;
  const x = (i: number) => padL + ((W - padL - padR) * i) / Math.max(1, n - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min || 1));
  const path = (key: "value" | "value2") => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key] ?? 0).toFixed(1)}`).join(" ");
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-labelledby={id} onMouseLeave={() => setHover(null)}>
        <title id={id}>{label1}{label2 ? ` / ${label2}` : ""} 추이</title>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} stroke="#E6EBEF" strokeDasharray="3 4" />)}
        <path d={`${path("value")} L${x(n - 1)},${H - padB} L${x(0)},${H - padB} Z`} fill={color} opacity={0.08} className="fade-in" />
        <path d={path("value")} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" className="draw-line" style={{ ["--len" as string]: 1400 }} />
        {label2 && <path d={path("value2")} fill="none" stroke={color2} strokeWidth={2.5} strokeLinejoin="round" className="draw-line" style={{ ["--len" as string]: 1400, animationDelay: "150ms", opacity: 0.85 }} />}
        {data.map((d, i) => (
          <g key={i}>
            <rect x={x(i) - (W / n) / 2} y={padT} width={W / n} height={H - padT - padB} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
            {hover === i && <><line x1={x(i)} x2={x(i)} y1={padT} y2={H - padB} stroke="#B8C2CC" /><circle cx={x(i)} cy={y(d.value)} r={4} fill={color} /></>}
            {i % showEvery === 0 && <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="#66727F">{d.label}</text>}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 card-raised px-3 py-1.5 text-xs pointer-events-none whitespace-nowrap">
          <b>{data[hover].label}</b> · {label1} {format(data[hover].value)}{label2 ? ` · ${label2} ${format(data[hover].value2 ?? 0)}` : ""}
        </div>
      )}
    </div>
  );
}

export function Donut({ parts, size = 120, thickness = 16 }: { parts: { label: string; value: number; color: string }[]; size?: number; thickness?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F5" strokeWidth={thickness} />
        {parts.map((p, i) => {
          const len = (p.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += len;
          return el;
        })}
      </svg>
      <ul className="text-sm space-y-1">
        {parts.map((p, i) => (
          <li key={i} className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} /><span className="text-muted">{p.label}</span><b className="tabular-nums">{Math.round((p.value / total) * 100)}%</b></li>
        ))}
      </ul>
    </div>
  );
}

export function Meter({ value, max = 1, color = "var(--t-primary)", className = "" }: { value: number; max?: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-mist overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-all duration-300 grow-x" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}
