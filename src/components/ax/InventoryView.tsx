"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Radar, Search, ArrowUpDown, PackagePlus } from "lucide-react";
import { useData, useInsights, useLookups } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { STOCK_STATUS_LABEL, type StockStatus, type SkuInsight } from "@/lib/engines";
import { num, won, wonShort } from "@/lib/format";
import { StatusBadge } from "@/components/shared/Badge";
import { Sparkline } from "@/components/shared/Charts";
import { EmptyState, Term, TERMS, AiReady } from "@/components/shared/Bits";
import { KpiCard, Panel } from "./Widgets";
import { ActionDrawer, SkuDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";
import { useToast } from "@/components/shared/Toast";

type Group = "all" | "risk" | "urgent" | "slow" | "inbound" | "normal";
const GROUPS: { key: Group; label: string; statuses: StockStatus[] }[] = [
  { key: "all", label: "전체", statuses: [] },
  { key: "risk", label: "품절위험", statuses: ["stockout", "urgent", "low"] },
  { key: "urgent", label: "긴급발주", statuses: ["urgent", "stockout"] },
  { key: "inbound", label: "발주·입고진행", statuses: ["po_progress", "inbound"] },
  { key: "slow", label: "과잉·저회전", statuses: ["overstock", "slow"] },
  { key: "normal", label: "정상·관심상승", statuses: ["normal", "rising"] },
];

export default function InventoryView() {
  const data = useData();
  const insights = useInsights();
  const { supplierById, categoryBySlug } = useLookups();
  const role = useStore((s) => s.ui.role);
  const receive = useStore((s) => s.receiveInbound);
  const toast = useToast();
  const sp = useSearchParams();
  const [group, setGroup] = useState<Group>((sp.get("status") as Group) || "risk");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<"priority" | "days" | "value" | "trend">("priority");
  const [skuId, setSkuId] = useState<string | null>(null);
  const [action, setAction] = useState<AXAction | null>(null);
  useEffect(() => { const s = sp.get("status") as Group | null; if (s && GROUPS.some((g) => g.key === s)) setGroup(s); }, [sp]);

  const list = useMemo(() => {
    const g = GROUPS.find((x) => x.key === group)!;
    let l = insights.filter((i) => (g.statuses.length ? g.statuses.includes(i.status) : true) && (cat === "all" || i.product.categorySlug === cat) && (!q || `${i.product.name} ${i.sku.name} ${i.sku.id}`.toLowerCase().includes(q.toLowerCase())));
    l = [...l].sort((a, b) => sort === "priority" ? b.priority - a.priority : sort === "days" ? (a.daysOfStock === Infinity ? 1e9 : a.daysOfStock) - (b.daysOfStock === Infinity ? 1e9 : b.daysOfStock) : sort === "value" ? b.stockValue - a.stockValue : b.demandTrend - a.demandTrend);
    return l;
  }, [insights, group, cat, q, sort]);

  const counts = (statuses: StockStatus[]) => insights.filter((i) => statuses.includes(i.status)).length;
  const totalValue = insights.reduce((a, i) => a + i.stockValue, 0);
  const openPos = data.purchaseOrders.filter((p) => ["requested", "confirmed", "in_transit"].includes(p.status));
  const showCost = role !== "ops";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="품절위험" value={counts(["stockout", "urgent", "low"])} tone="danger" onClick={() => setGroup("risk")} sub="예상 소진 < 리드타임×1.8" />
        <KpiCard label="긴급발주" value={counts(["urgent", "stockout"])} tone="warn" onClick={() => setGroup("urgent")} sub="예상 소진 < 리드타임" />
        <KpiCard label="발주·입고 진행" value={counts(["po_progress", "inbound"])} tone="primary" onClick={() => setGroup("inbound")} sub={`발주서 ${openPos.length}건`} />
        <KpiCard label="과잉·저회전" value={counts(["overstock", "slow"])} tone="neutral" onClick={() => setGroup("slow")} sub={showCost ? `재고금액 ${wonShort(insights.filter((i) => ["overstock", "slow"].includes(i.status)).reduce((a, i) => a + i.stockValue, 0))}` : "재고일수 75일+"} />
        <KpiCard label={showCost ? "총 재고금액" : "총 SKU"} value={showCost ? wonShort(totalValue) : insights.length} sub={`활성 SKU ${insights.length}개`} tone="good" />
      </div>

      <Panel title={<span className="inline-flex items-center gap-2"><Radar size={18} className="text-accent" />Stock & Purchase Radar</span>} sub="판매량뿐 아니라 검색·조회·장바구니·현재고·공급기간을 함께 보고 발주 우선순위를 정합니다" right={<AiReady title="Demand & Purchase Recommendation" now="규칙 기반: 가용재고 ÷ 일판매량, 추세 가중, 리드타임 비교" method="RULE + STATISTICAL + OPTIMIZATION · L3 (사람 승인)" next="시즌·프로모션·날씨 변수를 반영한 수요예측" />}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 overflow-x-auto hide-scrollbar">{GROUPS.map((g) => <button key={g.key} onClick={() => setGroup(g.key)} className={`chip !min-h-[34px] text-xs whitespace-nowrap ${group === g.key ? "chip-on" : ""}`}>{g.label}{g.statuses.length ? <span className="text-muted">{counts(g.statuses)}</span> : null}</button>)}</div>
          <div className="relative ml-auto min-w-[200px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input !min-h-[38px] pl-9 text-sm" placeholder="상품·SKU 검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="input !min-h-[38px] w-auto text-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="카테고리"><option value="all">전체 카테고리</option>{data.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
          <select className="input !min-h-[38px] w-auto text-sm" value={sort} onChange={(e) => setSort(e.target.value as never)} aria-label="정렬"><option value="priority">우선순위순</option><option value="days">예상 소진일 빠른순</option><option value="trend">수요 증가순</option>{showCost && <option value="value">재고금액순</option>}</select>
        </div>

        {list.length ? (
          <div className="table-wrap mt-3">
            <table className="table">
              <thead><tr><th>상품 · <Term term="SKU" desc={TERMS.sku}>SKU</Term></th><th>상태</th><th className="text-right">가용재고</th><th className="text-right">일판매</th><th className="text-right"><Term term="재고일수" desc={TERMS.daysOfStock}>예상 소진</Term></th><th>수요 14일</th><th className="text-right">검색·장바구니</th><th className="text-right">입고예정</th><th className="text-right"><Term term="리드타임" desc={TERMS.leadTime}>리드타임</Term></th><th className="text-right">추천수량</th><th className="text-right">우선순위</th></tr></thead>
              <tbody>
                {list.map((i) => <Row key={i.sku.id} i={i} onOpen={() => setSkuId(i.sku.id)} supplierName={supplierById.get(i.sku.primarySupplierId)?.name} catName={categoryBySlug.get(i.product.categorySlug)?.name} />)}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="조건에 맞는 SKU가 없습니다" />}
        <div className="mt-2 text-xs text-muted flex flex-wrap gap-x-3">{(Object.keys(STOCK_STATUS_LABEL) as StockStatus[]).map((s) => <span key={s} className="inline-flex items-center gap-1"><StatusBadge status={s} /></span>)}</div>
      </Panel>

      <Panel title={<span className="inline-flex items-center gap-2"><PackagePlus size={18} />발주서 · 입고예정</span>} sub="승인된 Action은 여기 발주서로 생성되며, 입고 처리 시 가용재고와 고객 배송예정이 갱신됩니다">
        <div className="table-wrap"><table className="table"><thead><tr><th>PO</th><th>상품</th><th>공급사</th><th className="text-right">수량</th>{showCost && <th className="text-right">금액</th>}<th>입고예정</th><th>상태</th><th>담당</th><th></th></tr></thead><tbody>
          {data.purchaseOrders.map((po) => { const ins = insights.find((i) => i.sku.id === po.skuId); return (
            <tr key={po.id} className="row-clickable" onClick={() => setSkuId(po.skuId)}><td className="font-semibold whitespace-nowrap">{po.id}</td><td>{ins?.product.name} <span className="text-muted">· {ins?.sku.name}</span></td><td className="whitespace-nowrap">{supplierById.get(po.supplierId)?.name}</td><td className="text-right tabular-nums">{num(po.qty)}</td>{showCost && <td className="text-right tabular-nums">{won(po.qty * po.unitCost)}</td>}<td className="whitespace-nowrap">{po.expectedAt}</td><td><StatusBadge status={po.status} /></td><td className="text-muted whitespace-nowrap">{po.actor}</td><td>{po.status !== "received" && po.status !== "cancelled" && (role === "owner" || role === "buyer" || role === "ops") && <button className="btn-outline btn-sm whitespace-nowrap" onClick={(e) => { e.stopPropagation(); receive(po.id); toast({ title: `${po.id} 입고 처리`, body: "가용재고 증가 · 고객 상품 재고상태 갱신", tone: "success" }); }}>입고 처리</button>}</td></tr>
          ); })}
        </tbody></table></div>
        <p className="text-xs text-muted mt-2">자동발주(L4)는 구현하지 않습니다. 모든 발주는 사람이 검토·승인하는 L3 이하로 동작합니다.</p>
      </Panel>

      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} onOpenAction={(a) => { setSkuId(null); setAction(a); }} />
      <ActionDrawer action={action} onClose={() => setAction(null)} onOpenSku={(id) => { setAction(null); setSkuId(id); }} />
    </div>
  );
}

function Row({ i, onOpen, supplierName, catName }: { i: SkuInsight; onOpen: () => void; supplierName?: string; catName?: string }) {
  const trend = i.demandTrend;
  return (
    <tr className={`row-clickable ${i.priority >= 70 ? "bg-danger/[0.04]" : ""}`} onClick={onOpen}>
      <td><div className="font-semibold whitespace-nowrap">{i.product.name}</div><div className="text-xs text-muted">{i.sku.name} · {catName} · {supplierName}{i.hasOpenAction && <span className="ml-1 text-accent font-semibold">· Action</span>}</div></td>
      <td><StatusBadge status={i.status} /></td>
      <td className="text-right tabular-nums font-semibold">{num(i.available)}<div className="text-[11px] text-muted font-normal">예약 {i.inv.reserved}</div></td>
      <td className="text-right tabular-nums">{i.avgDaily.toFixed(1)}</td>
      <td className={`text-right tabular-nums font-bold ${i.daysOfStock < i.leadTimeDays ? "text-danger" : i.daysOfStock > 180 ? "text-muted" : ""}`}>{i.daysOfStock === Infinity ? "-" : `${i.daysOfStock.toFixed(1)}일`}</td>
      <td><Sparkline values={i.demand.dailySales} width={80} height={24} stroke={trend > 0.3 ? "#D2704C" : "var(--t-primary)"} /></td>
      <td className="text-right tabular-nums text-xs"><span className={i.searchTrend > 0.3 ? "text-accent font-semibold" : ""}>{i.searchTrend >= 0 ? "+" : ""}{Math.round(i.searchTrend * 100)}%</span> · <span className={i.cartTrend > 0.3 ? "text-accent font-semibold" : ""}>{i.cartTrend >= 0 ? "+" : ""}{Math.round(i.cartTrend * 100)}%</span></td>
      <td className="text-right tabular-nums">{i.expectedInbound ? <>{num(i.expectedInbound.qty)}<div className="text-[11px] text-muted">{i.expectedInbound.eta}</div></> : <span className="text-muted">-</span>}</td>
      <td className="text-right tabular-nums">{i.leadTimeDays}일</td>
      <td className="text-right tabular-nums font-semibold">{i.recommendedQty ? num(i.recommendedQty) : <span className="text-muted">-</span>}</td>
      <td className="text-right"><div className="inline-flex items-center gap-1.5"><span className="font-bold tabular-nums w-7 text-right">{i.priority}</span><span className="w-12 h-1.5 rounded-full bg-mist overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${i.priority}%`, background: i.priority >= 70 ? "#D93A3A" : i.priority >= 40 ? "#F47A3C" : "var(--t-primary)" }} /></span></div></td>
    </tr>
  );
}
