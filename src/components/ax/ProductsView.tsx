"use client";
import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useData, useInsights, useLookups } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { num, pct, won, wonShort } from "@/lib/format";
import { StatusBadge } from "@/components/shared/Badge";
import Badge from "@/components/shared/Badge";
import { Sparkline } from "@/components/shared/Charts";
import { EmptyState, Term, TERMS } from "@/components/shared/Bits";
import { KpiCard, Panel } from "./Widgets";
import { SkuDrawer, ActionDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";

export default function ProductsView() {
  const data = useData();
  const insights = useInsights();
  const { brandById, supplierById, categoryBySlug } = useLookups();
  const role = useStore((s) => s.ui.role);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState<"all" | "risk" | "slow" | "active">("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [skuId, setSkuId] = useState<string | null>(null);
  const [action, setAction] = useState<AXAction | null>(null);
  const showCost = role !== "ops" && role !== "cs";

  const byProduct = useMemo(() => {
    const m = new Map<string, typeof insights>();
    insights.forEach((i) => { const l = m.get(i.product.id) ?? []; l.push(i); m.set(i.product.id, l); });
    return m;
  }, [insights]);
  const rows = useMemo(() => data.products.filter((p) => (cat === "all" || p.categorySlug === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || brandById.get(p.brandId)?.name.includes(q))).map((p) => {
    const skus = byProduct.get(p.id) ?? [];
    const available = skus.reduce((a, i) => a + i.available, 0);
    const onHand = skus.reduce((a, i) => a + i.inv.onHand, 0);
    const reserved = skus.reduce((a, i) => a + i.inv.reserved, 0);
    const inbound = skus.reduce((a, i) => a + (i.expectedInbound?.qty ?? 0), 0);
    const sales7 = skus.reduce((a, i) => a + i.demand.order7d, 0);
    const worst = [...skus].sort((a, b) => b.priority - a.priority)[0];
    const value = skus.reduce((a, i) => a + i.stockValue, 0);
    const margin = skus.length ? skus.reduce((a, i) => a + i.marginRate, 0) / skus.length : 0;
    const daily = skus.reduce((acc, i) => i.demand.dailySales.map((v, k) => (acc[k] ?? 0) + v), [] as number[]);
    return { p, skus, available, onHand, reserved, inbound, sales7, worst, value, margin, daily, minDays: Math.min(...skus.map((i) => i.daysOfStock)) };
  }).filter((r) => status === "all" ? true : status === "risk" ? ["stockout", "urgent", "low"].includes(r.worst?.status) : status === "slow" ? ["slow", "overstock"].includes(r.worst?.status) : r.p.status === "active").sort((a, b) => (b.worst?.priority ?? 0) - (a.worst?.priority ?? 0)), [data.products, byProduct, cat, q, status, brandById]);

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="활성 상품" value={data.products.filter((p) => p.status === "active").length} sub={`SKU ${data.skus.length}개 · 카테고리 ${data.categories.length}`} tone="primary" />
        <KpiCard label="품절위험 상품" value={rows.filter((r) => ["stockout", "urgent", "low"].includes(r.worst?.status)).length} tone="danger" onClick={() => setStatus("risk")} />
        <KpiCard label="저회전·과잉 상품" value={rows.filter((r) => ["slow", "overstock"].includes(r.worst?.status)).length} tone="neutral" onClick={() => setStatus("slow")} />
        <KpiCard label={showCost ? "총 재고금액" : "가상 브랜드"} value={showCost ? wonShort(insights.reduce((a, i) => a + i.stockValue, 0)) : data.brands.length} tone="good" />
      </div>
      <Panel title="상품 · SKU" sub={<span><Term term="SKU" desc={TERMS.sku}>SKU</Term>: 용량·구성·옵션까지 구분한 상품 관리번호 — 상품을 펼치면 SKU별 판매·재고·수요신호가 보입니다</span>}>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative min-w-[220px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input !min-h-[38px] pl-9 text-sm" placeholder="상품명·브랜드 검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="input !min-h-[38px] w-auto text-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="카테고리"><option value="all">전체 카테고리</option>{data.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
          <div className="flex gap-1">{([["all", "전체"], ["risk", "품절위험"], ["slow", "저회전"], ["active", "판매중"]] as const).map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`chip !min-h-[34px] text-xs ${status === k ? "chip-on" : ""}`}>{l}</button>)}</div>
          <span className="ml-auto text-sm text-muted">{rows.length}개 상품</span>
        </div>
        {rows.length ? (
          <div className="table-wrap mt-3"><table className="table"><thead><tr><th></th><th>상품</th><th>카테고리 · 브랜드</th><th>상태</th><th className="text-right">가용 / 현재고</th><th className="text-right">입고예정</th><th className="text-right">7일 판매</th><th>추세</th><th className="text-right">예상 소진</th>{showCost && <th className="text-right">평균 마진</th>}<th className="text-right">SKU</th></tr></thead><tbody>
            {rows.map((r) => (
              <RowGroup key={r.p.id} r={r} open={open.has(r.p.id)} onToggle={() => toggle(r.p.id)} onOpenSku={setSkuId} showCost={showCost} catName={categoryBySlug.get(r.p.categorySlug)?.name} brandName={brandById.get(r.p.brandId)?.name} supplierName={(id: string) => supplierById.get(id)?.name} />
            ))}
          </tbody></table></div>
        ) : <EmptyState title="조건에 맞는 상품이 없습니다" />}
      </Panel>
      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} onOpenAction={(a) => { setSkuId(null); setAction(a); }} />
      <ActionDrawer action={action} onClose={() => setAction(null)} onOpenSku={(id) => { setAction(null); setSkuId(id); }} />
    </div>
  );
}

type RowT = { p: import("@/lib/types").Product; skus: import("@/lib/engines").SkuInsight[]; available: number; onHand: number; reserved: number; inbound: number; sales7: number; worst: import("@/lib/engines").SkuInsight; value: number; margin: number; daily: number[]; minDays: number };

function RowGroup({ r, open, onToggle, onOpenSku, showCost, catName, brandName, supplierName }: { r: RowT; open: boolean; onToggle: () => void; onOpenSku: (id: string) => void; showCost: boolean; catName?: string; brandName?: string; supplierName: (id: string) => string | undefined }) {
  return (
    <>
      <tr className="row-clickable" onClick={onToggle}>
        <td className="w-8">{open ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}</td>
        <td><div className="font-semibold whitespace-nowrap">{r.p.name}</div><div className="text-xs text-muted flex gap-1 items-center">{r.p.tags.map((t) => <Badge key={t} tone="soft">{t}</Badge>)}<Link href={`/product/${r.p.id}`} target="_blank" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 hover:text-primary">고객화면 <ExternalLink size={11} /></Link></div></td>
        <td className="text-xs whitespace-nowrap">{catName}<div className="text-muted">{brandName}</div></td>
        <td><StatusBadge status={r.worst?.status ?? "normal"} /></td>
        <td className="text-right tabular-nums"><b>{num(r.available)}</b> / {num(r.onHand)}<div className="text-[13px] text-muted">예약 {r.reserved}</div></td>
        <td className="text-right tabular-nums">{r.inbound ? num(r.inbound) : <span className="text-muted">-</span>}</td>
        <td className="text-right tabular-nums">{num(r.sales7)}</td>
        <td><Sparkline values={r.daily} width={72} height={22} /></td>
        <td className={`text-right tabular-nums font-semibold ${r.minDays < 5 ? "text-danger" : ""}`}>{r.minDays === Infinity ? "-" : `${r.minDays.toFixed(1)}일`}</td>
        {showCost && <td className="text-right tabular-nums">{pct(r.margin, 0)}</td>}
        <td className="text-right">{r.skus.length}</td>
      </tr>
      {open && r.skus.map((i) => (
        <tr key={i.sku.id} className="row-clickable bg-mist/60" onClick={() => onOpenSku(i.sku.id)}>
          <td></td>
          <td className="pl-6 text-sm"><span className="text-muted">└</span> <b>{i.sku.name}</b> <span className="text-xs text-muted">{i.sku.id}</span></td>
          <td className="text-xs text-muted whitespace-nowrap">{supplierName(i.sku.primarySupplierId)}<div>{showCost ? `판매 ${won(i.sku.salePrice)} · 원가 ${won(i.sku.cost)}` : `판매 ${won(i.sku.salePrice)}`}</div></td>
          <td><StatusBadge status={i.status} /></td>
          <td className="text-right tabular-nums"><b>{num(i.available)}</b> / {num(i.inv.onHand)}</td>
          <td className="text-right tabular-nums">{i.expectedInbound ? `${num(i.expectedInbound.qty)} (${i.expectedInbound.eta})` : "-"}</td>
          <td className="text-right tabular-nums">{num(i.demand.order7d)}</td>
          <td className="text-xs text-muted">검색 {i.searchTrend >= 0 ? "+" : ""}{Math.round(i.searchTrend * 100)}% · 담기 {i.cartTrend >= 0 ? "+" : ""}{Math.round(i.cartTrend * 100)}%</td>
          <td className={`text-right tabular-nums ${i.daysOfStock < i.leadTimeDays ? "text-danger font-semibold" : ""}`}>{i.daysOfStock === Infinity ? "-" : `${i.daysOfStock.toFixed(1)}일`}</td>
          {showCost && <td className="text-right tabular-nums">{pct(i.marginRate, 0)}</td>}
          <td className="text-right text-xs text-primary font-semibold">Detail</td>
        </tr>
      ))}
    </>
  );
}
