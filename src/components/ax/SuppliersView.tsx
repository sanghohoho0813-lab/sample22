"use client";
import { useMemo, useState } from "react";
import { Factory, AlertTriangle } from "lucide-react";
import { useData, useInsights, useLookups } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { supplierKpis } from "@/lib/kpi";
import { compareSuppliers } from "@/lib/engines";
import { fmtDate, num, pct, won } from "@/lib/format";
import type { Supplier } from "@/lib/types";
import { StatusBadge } from "@/components/shared/Badge";
import Badge from "@/components/shared/Badge";
import { Meter } from "@/components/shared/Charts";
import Overlay from "@/components/shared/Overlay";
import { Tabs, Term, TERMS, AiReady } from "@/components/shared/Bits";
import { KpiCard, Panel, Stat, Field } from "./Widgets";
import { SkuDrawer } from "./Drawers";

export default function SuppliersView() {
  const data = useData();
  const insights = useInsights();
  const { categoryBySlug } = useLookups();
  const role = useStore((s) => s.ui.role);
  const [sel, setSel] = useState<Supplier | null>(null);
  const [tab, setTab] = useState<"info" | "po" | "compare">("info");
  const [skuId, setSkuId] = useState<string | null>(null);
  const [cmpSku, setCmpSku] = useState<string>(insights.find((i) => i.status === "urgent")?.sku.id ?? insights[0]?.sku.id ?? "");
  const showCost = role !== "ops" && role !== "cs";
  const rows = useMemo(() => data.suppliers.map((s) => ({ s, k: supplierKpis(data, s.id) })).sort((a, b) => (a.s.riskLevel === "high" ? -1 : b.s.riskLevel === "high" ? 1 : b.k.openPo - a.k.openPo)), [data]);
  const delayed = data.purchaseOrders.filter((p) => ["confirmed", "in_transit"].includes(p.status) && new Date(p.expectedAt).getTime() > Date.now() + 7 * 86400000);
  const cmp = useMemo(() => (cmpSku ? compareSuppliers(data, cmpSku, insights.find((i) => i.sku.id === cmpSku && ["urgent", "stockout"].includes(i.status)) ? "urgent" : "normal") : []), [data, cmpSku, insights]);
  const cmpIns = insights.find((i) => i.sku.id === cmpSku);
  const multi = useMemo(() => { const c = new Map<string, number>(); data.supplierProducts.forEach((sp) => c.set(sp.skuId, (c.get(sp.skuId) ?? 0) + 1)); return insights.filter((i) => (c.get(i.sku.id) ?? 0) >= 2); }, [data.supplierProducts, insights]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="계약 공급사" value={data.suppliers.filter((s) => s.contractStatus === "active").length} sub={`검토 ${data.suppliers.filter((s) => s.contractStatus === "review").length}`} tone="primary" />
        <KpiCard label="진행중 발주" value={data.purchaseOrders.filter((p) => ["requested", "confirmed", "in_transit"].includes(p.status)).length} sub="요청·확정·운송중" />
        <KpiCard label="입고지연 위험" value={delayed.length} tone={delayed.length ? "danger" : "good"} sub="예정일 7일 초과" />
        <KpiCard label="고위험 공급사" value={data.suppliers.filter((s) => s.riskLevel === "high").length} tone="warn" sub="납기·불량 복합" />
      </div>

      <Panel title={<span className="inline-flex items-center gap-2"><Factory size={18} className="text-accent" />Supplier Decision — 동일 상품 공급사 비교</span>} sub="가장 싼 공급사를 무조건 추천하지 않습니다. 긴급 품절위험은 납기, 과잉재고 위험은 최소주문수량이 더 중요합니다" right={<AiReady title="Supplier Decision" now="단가·납기·최소수량·정시납품·충족률·불량률 가중 점수 (L2/L3)" method="RULE + OPTIMIZATION" next="발주 결과 학습으로 공급사별 실제 납기·불량 예측" />}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <label className="text-sm text-muted">비교 상품</label>
          <select className="input !min-h-[38px] w-auto text-sm max-w-full" value={cmpSku} onChange={(e) => setCmpSku(e.target.value)}>{multi.map((i) => <option key={i.sku.id} value={i.sku.id}>{i.product.name} · {i.sku.name}</option>)}</select>
          {cmpIns && <span className="inline-flex items-center gap-2 text-sm"><StatusBadge status={cmpIns.status} /><span className="text-muted">가용 {cmpIns.available} · 소진 {cmpIns.daysOfStock === Infinity ? "-" : cmpIns.daysOfStock.toFixed(1) + "일"} · 추천수량 {cmpIns.recommendedQty || "-"}</span><button className="text-primary font-semibold" onClick={() => setSkuId(cmpIns.sku.id)}>SKU Detail</button></span>}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {cmp.map((o) => (
            <div key={o.supplier.id} className={`rounded-xl border p-4 ${o.recommended ? "border-primary bg-soft" : "border-line"}`}>
              <div className="flex items-center justify-between"><b>{o.supplier.name}</b>{o.recommended && <Badge tone="primary">추천</Badge>}</div>
              <div className="text-3xl font-black mt-1">{o.score}<span className="text-sm text-muted font-semibold"> 점</span></div>
              <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                <dt className="text-muted">단가</dt><dd className="tabular-nums font-semibold">{showCost ? won(o.sp.unitCost) : "—"} <span className="text-xs text-muted">{o.costDiffPct ? `+${o.costDiffPct}%` : "최저"}</span></dd>
                <dt className="text-muted">납기</dt><dd className="font-semibold">{o.sp.leadTimeDays}일 <span className="text-xs text-muted">→ {o.expectedArrival}</span></dd>
                <dt className="text-muted">최소수량</dt><dd className="font-semibold">{o.sp.moq}개</dd>
                <dt className="text-muted">정시납품</dt><dd className="font-semibold">{pct(o.supplier.onTimeRate, 0)}</dd>
                <dt className="text-muted"><Term term="주문충족률" desc={TERMS.fillRate}>충족률</Term></dt><dd className="font-semibold">{pct(o.supplier.fillRate, 0)}</dd>
                <dt className="text-muted">불량률</dt><dd className={`font-semibold ${o.supplier.defectRate > 0.01 ? "text-danger" : ""}`}>{(o.supplier.defectRate * 100).toFixed(1)}%</dd>
              </dl>
              <div className="mt-2 text-xs text-muted">{o.tradeoffs.join(" · ")}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="공급사 목록" sub="계약상태 · 리드타임 · 정시납품 · 충족률 · 불량 · 미입고 · 위험도">
        <div className="table-wrap"><table className="table"><thead><tr><th>공급사</th><th>담당</th><th>취급</th><th>계약</th><th className="text-right"><Term term="리드타임" desc={TERMS.leadTime}>리드타임</Term></th><th>정시납품</th><th>충족률</th><th className="text-right">불량</th><th className="text-right">진행 발주</th><th className="text-right">SKU</th><th>위험</th></tr></thead><tbody>
          {rows.map(({ s, k }) => <tr key={s.id} className="row-clickable" onClick={() => { setSel(s); setTab("info"); }}><td className="font-semibold whitespace-nowrap">{s.name}{s.note && <div className="text-[13px] text-muted font-normal">{s.note}</div>}</td><td className="text-muted">{s.contact}</td><td className="text-xs">{s.categories.map((c) => categoryBySlug.get(c)?.name).join("·")}</td><td><StatusBadge status={s.contractStatus} /></td><td className="text-right tabular-nums">{s.leadTimeDays}일</td><td><div className="flex items-center gap-1.5"><Meter value={s.onTimeRate} color={s.onTimeRate < 0.85 ? "#D93A3A" : "var(--t-primary)"} className="w-14" /><span className="text-xs tabular-nums">{pct(s.onTimeRate, 0)}</span></div></td><td className="text-xs tabular-nums">{pct(s.fillRate, 0)}</td><td className={`text-right tabular-nums ${s.defectRate > 0.01 ? "text-danger font-semibold" : ""}`}>{(s.defectRate * 100).toFixed(1)}% <span className="text-muted text-xs">({k.defects})</span></td><td className="text-right tabular-nums">{k.openPo}</td><td className="text-right tabular-nums">{k.skuCount}</td><td><Badge tone={s.riskLevel === "high" ? "danger" : s.riskLevel === "mid" ? "warn" : "success"}>{{ high: "높음", mid: "보통", low: "낮음" }[s.riskLevel]}</Badge></td></tr>)}
        </tbody></table></div>
      </Panel>

      <Overlay open={!!sel} onClose={() => setSel(null)} variant="drawer" size="lg" title={sel?.name} subtitle={sel && <span className="inline-flex gap-2 items-center"><StatusBadge status={sel.contractStatus} /><Badge tone={sel.riskLevel === "high" ? "danger" : sel.riskLevel === "mid" ? "warn" : "success"}>위험 {{ high: "높음", mid: "보통", low: "낮음" }[sel.riskLevel]}</Badge><span>담당 {sel.contact}</span></span>}>
        {sel && (() => { const k = supplierKpis(data, sel.id); const pos = data.purchaseOrders.filter((p) => p.supplierId === sel.id); const skus = data.supplierProducts.filter((sp) => sp.supplierId === sel.id); const rets = data.returns.filter((r) => r.supplierId === sel.id); return (
          <>
            {sel.riskLevel === "high" && <div className="rounded-xl bg-danger/5 border border-danger/30 p-3 text-sm flex gap-2 mb-3"><AlertTriangle size={16} className="text-danger mt-0.5 shrink-0" /><div><b>복합 위험</b> · 정시납품률 {pct(sel.onTimeRate, 0)}, 불량 반품 {rets.filter((r) => r.reason === "defect").length}건. 대체 공급사 비중 확대를 검토하세요 (Action Center).</div></div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><Stat label="리드타임" value={`${sel.leadTimeDays}일`} /><Stat label="정시납품" value={pct(sel.onTimeRate, 0)} /><Stat label="충족률" value={pct(sel.fillRate, 0)} /><Stat label="불량률" value={`${(sel.defectRate * 100).toFixed(1)}%`} sub={`반품 ${rets.length}건`} /></div>
            <Tabs className="mt-4" value={tab} onChange={setTab} tabs={[{ key: "info", label: "취급상품", count: skus.length }, { key: "po", label: "발주·미입고", count: pos.length }, { key: "compare", label: "평가" }]} />
            <div className="pt-4">
              {tab === "info" && <div className="table-wrap"><table className="table"><thead><tr><th>상품 · SKU</th>{showCost && <th className="text-right">단가</th>}<th className="text-right">최소수량</th><th className="text-right">납기</th><th>상태</th></tr></thead><tbody>{skus.map((sp) => { const i = insights.find((x) => x.sku.id === sp.skuId)!; return <tr key={sp.skuId} className="row-clickable" onClick={() => setSkuId(sp.skuId)}><td>{i.product.name} <span className="text-muted">· {i.sku.name}</span></td>{showCost && <td className="text-right tabular-nums">{won(sp.unitCost)}</td>}<td className="text-right">{sp.moq}</td><td className="text-right">{sp.leadTimeDays}일</td><td><StatusBadge status={i.status} /></td></tr>; })}</tbody></table></div>}
              {tab === "po" && (pos.length ? <div className="table-wrap"><table className="table"><thead><tr><th>PO</th><th>상품</th><th className="text-right">수량</th><th>예정</th><th>입고</th><th>상태</th></tr></thead><tbody>{pos.map((po) => { const i = insights.find((x) => x.sku.id === po.skuId); const late = ["confirmed", "in_transit"].includes(po.status) && new Date(po.expectedAt).getTime() > Date.now() + 7 * 86400000; return <tr key={po.id}><td className="font-semibold">{po.id}</td><td>{i?.product.name}</td><td className="text-right">{num(po.qty)}</td><td className={late ? "text-danger font-semibold" : ""}>{po.expectedAt}{late && " (지연)"}</td><td>{po.receivedAt ?? "-"}</td><td><StatusBadge status={po.status} /></td></tr>; })}</tbody></table></div> : <div className="text-sm text-muted">발주 이력이 없습니다.</div>)}
              {tab === "compare" && <div className="space-y-3 text-sm"><Field label="종합 평가">{sel.riskLevel === "low" ? "안정적인 공급사입니다. 긴급 대응이 필요한 상품의 주 공급사로 적합합니다." : sel.riskLevel === "mid" ? "납기 또는 충족률에 편차가 있습니다. 안전재고를 여유 있게 유지하세요." : "납기지연과 불량이 반복됩니다. 대체 공급사 비중 확대와 계약 조건 재협의를 권장합니다."}</Field><Field label="최근 발주">{k.lastPo ? fmtDate(k.lastPo) : "-"}</Field><Field label="평가 기준">정시납품률(30%) · 충족률(25%) · 불량률(25%) · 리드타임(20%) — 규칙 기반, 실제 입고 결과가 쌓이면 재계산</Field></div>}
            </div>
          </>
        ); })()}
      </Overlay>
      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} />
    </div>
  );
}
