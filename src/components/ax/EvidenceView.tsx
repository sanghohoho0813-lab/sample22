"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PilotPanel from "./PilotPanel";
import { useStore } from "@/lib/store";
import { buildEvidencePack, downloadText } from "@/lib/evidencePack";
import { useToast } from "@/components/shared/Toast";
import Link from "next/link";
import { FileCheck2, Search, Download, FlaskConical } from "lucide-react";
import { useData, useLookups } from "@/lib/hooks";
import { fmtDate } from "@/lib/format";
import type { EvidenceType } from "@/lib/types";
import Badge from "@/components/shared/Badge";
import { EmptyState, Tabs } from "@/components/shared/Bits";
import { KpiCard, Panel } from "./Widgets";
import { ActionDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";

const TYPES: EvidenceType[] = ["BASELINE", "ACTION", "RESULT", "ADOPTION", "CUSTOMER", "EFFICIENCY", "REVENUE", "SCALE", "RISK", "EXCEPTION"];
const tone = (t: EvidenceType) => (t === "RESULT" || t === "REVENUE" || t === "EFFICIENCY" ? "success" : t === "RISK" || t === "EXCEPTION" ? "danger" : t === "BASELINE" || t === "SCALE" ? "neutral" : "primary");

export default function EvidenceView() {
  const data = useData();
  const { productById, skuById, supplierById } = useLookups();
  const [type, setType] = useState<EvidenceType | "all">("all");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [action, setAction] = useState<AXAction | null>(null);
  const sp = useSearchParams();
  const [view, setView] = useState<"log" | "pilot">(sp.get("tab") === "pilot" ? "pilot" : "log");
  useEffect(() => { if (sp.get("tab") === "pilot") setView("pilot"); }, [sp]);
  const ui = useStore((s) => s.ui);
  const toast = useToast();
  const baselineCount = Object.values(ui.pilot.baselines).filter((b) => b.value !== undefined).length;
  const list = useMemo(() => data.evidence.filter((e) => (type === "all" || e.type === type) && (Date.now() - new Date(e.createdAt).getTime()) / 86400000 <= Number(period) && (!q || `${e.title} ${e.detail} ${e.actor}`.includes(q))).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [data.evidence, type, q, period]);
  const counts = TYPES.map((t) => ({ t, n: data.evidence.filter((e) => e.type === t).length }));
  const results = data.evidence.filter((e) => e.type === "RESULT").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Evidence 총계" value={data.evidence.length} tone="primary" sub="Baseline·Action·Result·…" />
        <KpiCard label="RESULT 기록" value={results} tone="good" sub="Action → 결과 연결" />
        <KpiCard label="RISK · EXCEPTION" value={data.evidence.filter((e) => ["RISK", "EXCEPTION"].includes(e.type)).length} tone="warn" />
        <KpiCard label="실증 상태" value={ui.stage === "DEMO" ? (baselineCount ? "준비 중" : "준비") : ui.stage} sub={ui.stage === "DEMO" ? `Owner ${ui.pilot.owner ? "지정" : "미지정"} · Baseline ${baselineCount}건` : `Owner ${ui.pilot.owner} · Baseline ${baselineCount}건`} tone={ui.stage === "DEMO" ? "neutral" : "primary"} onClick={() => setView("pilot")} />
      </div>

      <Tabs value={view} onChange={setView} tabs={[{ key: "log", label: "Evidence Log", count: data.evidence.length }, { key: "pilot", label: "실증 준비 · Pilot Readiness" }]} />
      {view === "pilot" && <PilotPanel />}
      {view === "log" && (

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <Panel title={<span className="inline-flex items-center gap-2"><FileCheck2 size={18} className="text-accent" />AX Evidence Log</span>} sub="단순 로그가 아닌 실증 시스템 — Before → Trigger → 추천 → 승인 → Action → 결과 → KPI Delta → 출처 → 담당 → 시각">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <button onClick={() => setType("all")} className={`chip !min-h-[32px] text-xs ${type === "all" ? "chip-on" : ""}`}>전체</button>
            {counts.map(({ t, n }) => <button key={t} onClick={() => setType(t)} className={`chip !min-h-[32px] text-xs ${type === t ? "chip-on" : ""}`}>{t}<span className="text-muted">{n}</span></button>)}
            <div className="ml-auto flex items-center gap-1.5"><div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input !min-h-[34px] pl-8 text-xs w-40" placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>{(["7", "30", "90"] as const).map((p) => <button key={p} onClick={() => setPeriod(p)} className={`chip !min-h-[32px] text-xs ${period === p ? "chip-on" : ""}`}>{p}일</button>)}</div>
          </div>
          {list.length ? (
            <ol className="mt-4 border-l-2 border-line pl-5 space-y-4">
              {list.map((e) => { const p = e.skuId ? productById.get(skuById.get(e.skuId)?.productId ?? "") : undefined; const a = e.actionId ? data.actions.find((x) => x.id === e.actionId) : undefined; return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: tone(e.type) === "success" ? "#0FAF9A" : tone(e.type) === "danger" ? "#D93A3A" : "var(--t-primary)" }} />
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted"><Badge tone={tone(e.type)}>{e.type}</Badge><span>{fmtDate(e.createdAt, "datetime")}</span><span>· {e.actor}</span><Badge tone="neutral">{e.mode}</Badge></div>
                  <div className="font-semibold mt-1">{e.title}</div>
                  <div className="text-sm text-ink/80">{e.detail}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    {e.kpiDelta && <span>KPI Δ <b className="text-ink">{e.kpiDelta}</b></span>}
                    <span>출처 {e.dataSource}</span>
                    {p && <span>상품 {p.name}</span>}
                    {e.supplierId && <span>공급사 {supplierById.get(e.supplierId)?.name}</span>}
                    {e.orderId && <span>주문 {e.orderId}</span>}
                    {a && <button onClick={() => setAction(a)} className="text-primary font-semibold">Action 보기 →</button>}
                  </div>
                </li>
              ); })}
            </ol>
          ) : <EmptyState title="조건에 맞는 Evidence가 없습니다" />}
        </Panel>

        <div className="space-y-4">
          <Panel title="Evidence Pack (12주 실증 후)" sub="지금은 구조만 준비 — 숫자는 실측 후 채웁니다" right={<button className="btn-outline btn-sm" onClick={() => { downloadText(`NEXMART_Evidence_Pack_${new Date().toISOString().slice(0, 10)}.md`, buildEvidencePack(data, ui)); toast({ title: "Evidence Pack 초안을 내려받았습니다", tone: "success" }); }}><Download size={14} />초안</button>}>
            <ol className="text-sm space-y-1.5">
              {["Before / Baseline", "Trigger / Problem", "Recommendation / Decision", "Human Approval", "Action", "Result", "KPI Delta", "Data Source / Provenance", "User / Time Log", "Screenshot / Report"].map((s, i) => <li key={s} className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-mist text-[11px] font-bold flex items-center justify-center">{i + 1}</span>{s}</li>)}
            </ol>
            <div className="mt-3 rounded-xl bg-mist p-3 text-xs text-muted">BASELINE STATUS: <b className="text-ink">{baselineCount ? `${baselineCount} / 11 입력 (나머지 UNKNOWN / REQUIRED)` : "UNKNOWN / REQUIRED"}</b><br />TARGET: DO NOT INVENT<br />CURRENT NUMBERS: DEMO SIMULATION ONLY</div>
          </Panel>
          <Panel title="12주 실증 계획">
            <ul className="text-sm space-y-2">
              <li><b>1~2주</b> · 상품·SKU·공급사 정리, 재고·주문 Baseline, 교육, 핵심 Event 수집</li>
              <li><b>3~6주</b> · 품절위험·발주 Action 운영, 공급사 비교, Fulfillment 상태관리, 사용률 측정</li>
              <li><b>7~10주</b> · Repeat Basket, 프로모션 마진 비교, 배송위험 사전처리, Action 결과 축적</li>
              <li><b>11~12주</b> · Before/After, Cost·Revenue·Scale KPI, Adoption, Evidence Pack, 고도화/재설계 결정</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold"><button onClick={() => setView("pilot")} className="inline-flex items-center gap-1 text-primary"><FlaskConical size={14} />실증 준비 화면 →</button><Link href="/ax/why#16" className="text-primary">기획의도 16 →</Link></div>
          </Panel>
        </div>
      </div>
      )}
      <ActionDrawer action={action} onClose={() => setAction(null)} />
    </div>
  );
}
