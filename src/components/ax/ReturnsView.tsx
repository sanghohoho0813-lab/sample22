"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Undo2 } from "lucide-react";
import { useData, useLookups } from "@/lib/hooks";
import { safeDiv } from "@/lib/kpi";
import { fmtDate, num, pct } from "@/lib/format";
import { Donut, BarChart } from "@/components/shared/Charts";
import Badge, { StatusBadge } from "@/components/shared/Badge";
import { KpiCard, Panel } from "./Widgets";
import { SkuDrawer } from "./Drawers";
import { useStore } from "@/lib/store";

const REASON: Record<string, string> = { defect: "상품불량", damaged: "파손", wrong_item: "오배송", delay: "배송지연", info_mismatch: "상품정보 차이", missing: "구성 누락", change_mind: "단순 변심", other: "기타" };
const COLORS = ["#D93A3A", "#F47A3C", "#E0A526", "#8B5AA6", "#4C9AAA", "#6D8899", "#1597A3", "#B8C2CC"];

export default function ReturnsView() {
  const data = useData();
  const { skuById, productById, supplierById } = useLookups();
  const role = useStore((s) => s.ui.role);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const byReason = useMemo(() => Object.keys(REASON).map((k, i) => ({ label: REASON[k], value: data.returns.filter((r) => r.reason === k).length, color: COLORS[i], key: k })), [data.returns]);
  const byProduct = useMemo(() => { const m = new Map<string, number>(); data.returns.forEach((r) => { const s = skuById.get(r.skuId); if (s) m.set(s.productId, (m.get(s.productId) ?? 0) + 1); }); return Array.from(m.entries()).map(([pid, n]) => { const p = productById.get(pid)!; const skus = data.skus.filter((s) => s.productId === pid); const sold = data.demand.filter((d) => skus.some((s) => s.id === d.skuId)).reduce((a, d) => a + d.order7d * 12, 0); return { p, n, rate: safeDiv(n, sold), skuId: skus[0].id }; }).sort((a, b) => b.n - a.n).slice(0, 8); }, [data, skuById, productById]);
  const bySupplier = useMemo(() => { const m = new Map<string, { defect: number; total: number }>(); data.returns.forEach((r) => { if (!r.supplierId) return; const c = m.get(r.supplierId) ?? { defect: 0, total: 0 }; c.total += 1; if (["defect", "damaged"].includes(r.reason)) c.defect += 1; m.set(r.supplierId, c); }); return Array.from(m.entries()).map(([id, v]) => ({ s: supplierById.get(id)!, ...v })).sort((a, b) => b.defect - a.defect); }, [data.returns, supplierById]);
  const list = data.returns.filter((r) => filter === "all" || r.reason === filter).slice(0, 40);
  const delivStage = [{ label: "피킹·포장", value: data.returns.filter((r) => ["missing", "wrong_item"].includes(r.reason)).length }, { label: "배송", value: data.returns.filter((r) => ["damaged", "delay"].includes(r.reason)).length }, { label: "상품·공급", value: data.returns.filter((r) => ["defect", "info_mismatch"].includes(r.reason)).length }, { label: "고객", value: data.returns.filter((r) => ["change_mind", "other"].includes(r.reason)).length }];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="반품·교환 (90일)" value={num(data.returns.length)} sub={`반품률 ${pct(safeDiv(data.aggregates.returnCount90d, data.aggregates.orderCount90d))}`} tone="primary" />
        <KpiCard label="상품불량·파손" value={num(data.returns.filter((r) => ["defect", "damaged"].includes(r.reason)).length)} tone="danger" sub="공급사 Action 대상" />
        <KpiCard label="오배송·구성누락" value={num(data.returns.filter((r) => ["wrong_item", "missing"].includes(r.reason)).length)} tone="warn" sub="피킹·포장 개선" />
        <KpiCard label="처리 대기" value={num(data.returns.filter((r) => r.status === "requested").length)} sub="CS 확인 필요" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="반품 사유"><Donut parts={byReason.filter((r) => r.value > 0)} size={140} /></Panel>
        <Panel title="문제 발생 단계" sub="어느 단계에서 문제가 생기는지 — 개선 담당이 달라집니다"><BarChart data={delivStage} horizontal /></Panel>
        <Panel title="공급사별 불량·파손" sub="불량 반복 공급사는 Action Center에서 평가 갱신">
          <ul className="space-y-2 text-sm">{bySupplier.slice(0, 6).map((r) => <li key={r.s.id} className="flex items-center justify-between"><span className="font-semibold">{r.s.name}</span><span className="inline-flex items-center gap-2"><Badge tone={r.defect >= 6 ? "danger" : "neutral"}>불량 {r.defect}</Badge><span className="text-muted">전체 {r.total}</span></span></li>)}</ul>
          {bySupplier[0]?.defect >= 6 && <Link href="/ax/actions?id=act-011" className="mt-3 inline-flex text-sm text-primary font-semibold">공급사 평가 갱신 Action →</Link>}
        </Panel>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="상품별 반품" sub="반품률 높은 상품은 상품정보·포장 개선 검토">
          <div className="table-wrap"><table className="table"><thead><tr><th>상품</th><th className="text-right">반품</th><th className="text-right">추정 반품률</th><th>개선 포인트</th></tr></thead><tbody>{byProduct.map((r) => <tr key={r.p.id} className="row-clickable" onClick={() => setSkuId(r.skuId)}><td className="font-semibold">{r.p.name}</td><td className="text-right">{r.n}</td><td className={`text-right tabular-nums ${r.rate > 0.04 ? "text-danger font-semibold" : ""}`}>{pct(r.rate)}</td><td className="text-xs text-muted">{r.rate > 0.04 ? "상품정보·포장 점검" : "정상 범위"}</td></tr>)}</tbody></table></div>
        </Panel>
        <Panel title={<span className="inline-flex items-center gap-2"><Undo2 size={17} />반품·VOC 목록</span>} right={<select className="input !min-h-[36px] w-auto text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="사유"><option value="all">전체 사유</option>{Object.entries(REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}>
          <div className="table-wrap max-h-[420px] overflow-y-auto"><table className="table"><thead><tr><th>접수</th><th>주문</th><th>상품</th><th>사유</th><th>상태</th></tr></thead><tbody>{list.map((r) => { const s = skuById.get(r.skuId); const p = s && productById.get(s.productId); return <tr key={r.id} className="row-clickable" onClick={() => setSkuId(r.skuId)}><td className="text-muted whitespace-nowrap">{fmtDate(r.createdAt, "md")}</td><td className="text-xs">{role === "buyer" ? "—" : r.orderId}</td><td>{p?.name}</td><td><Badge tone={["defect", "damaged"].includes(r.reason) ? "danger" : "neutral"}>{REASON[r.reason]}</Badge></td><td><StatusBadge status={r.status === "requested" ? "recommended" : r.status === "refunded" ? "done" : "in_progress"} /></td></tr>; })}</tbody></table></div>
          <p className="text-xs text-muted mt-2">고객에게 불이익을 자동 적용하지 않습니다. 반복 VOC는 상품·공급사·포장 개선 Action으로 연결합니다.</p>
        </Panel>
      </div>
      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} />
    </div>
  );
}
