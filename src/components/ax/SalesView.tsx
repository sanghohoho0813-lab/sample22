"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useData, useInsights } from "@/lib/hooks";
import { sumRange, prevRange, safeDiv } from "@/lib/kpi";
import { fmtDate, pct, won, wonShort, num } from "@/lib/format";
import { KpiCard, Panel } from "./Widgets";
import { BarChart, LineChart, Donut } from "@/components/shared/Charts";
import { Tabs, Term, TERMS } from "@/components/shared/Bits";
import { SkuDrawer } from "./Drawers";

export default function SalesView() {
  const data = useData();
  const insights = useInsights();
  const [range, setRange] = useState<"day" | "week" | "month">("day");
  const [skuId, setSkuId] = useState<string | null>(null);
  const cur = sumRange(data, 30);
  const prev = prevRange(data, 30);
  const series = useMemo(() => {
    if (range === "day") return data.dailySales.slice(-30).map((d) => ({ label: fmtDate(d.date, "md"), value: d.revenue, value2: d.grossMargin }));
    if (range === "week") { const out = []; for (let i = 0; i < 12; i++) { const s = data.dailySales.slice(-(12 - i) * 7, i === 11 ? undefined : -(11 - i) * 7); if (!s.length) continue; out.push({ label: `W${i + 1}`, value: s.reduce((a, d) => a + d.revenue, 0), value2: s.reduce((a, d) => a + d.grossMargin, 0) }); } return out; }
    const m = new Map<string, { value: number; value2: number }>();
    data.dailySales.forEach((d) => { const k = d.date.slice(0, 7); const c = m.get(k) ?? { value: 0, value2: 0 }; c.value += d.revenue; c.value2 += d.grossMargin; m.set(k, c); });
    return Array.from(m.entries()).map(([k, v]) => ({ label: k.slice(2), ...v }));
  }, [data.dailySales, range]);
  const catRows = [...data.categorySales].map((c) => ({ ...c, name: data.categories.find((x) => x.slug === c.categorySlug)!.name, rate: safeDiv(c.margin, c.revenue) })).sort((a, b) => b.revenue - a.revenue);
  // high-revenue low-margin products
  const skuRows = insights.map((i) => { const rev = i.demand.order7d * 4 * i.sku.salePrice; const cogs = i.demand.order7d * 4 * i.sku.cost; const promo = data.promotions.some((p) => p.status === "running" && p.skuIds.includes(i.sku.id)); const disc = promo ? rev * 0.1 : 0; const ship = i.demand.order7d * 4 * 0.6 * 2400 / 2.6; const margin = rev - cogs - disc - ship; return { i, rev, margin, rate: safeDiv(margin, rev), promo }; }).filter((r) => r.rev > 0).sort((a, b) => b.rev - a.rev);
  const lowMargin = skuRows.filter((r) => r.rate < 0.18).slice(0, 8);
  const promoDelta = data.promotions.filter((p) => p.status !== "planned").map((p) => ({ label: p.name.slice(0, 10), value: p.revenue, value2: p.revenue - p.cogs - p.discountCost - p.shippingCost }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="순매출 (30일)" value={wonShort(cur.revenue)} delta={safeDiv(cur.revenue - prev.revenue, prev.revenue)} tone="primary" big />
        <KpiCard label={<Term term="매출총이익" desc={TERMS.grossMargin}>추정 매출총이익</Term>} value={wonShort(cur.grossMargin)} delta={safeDiv(cur.grossMargin - prev.grossMargin, prev.grossMargin)} sub={`마진율 ${pct(safeDiv(cur.grossMargin, cur.revenue))}`} tone="good" big />
        <KpiCard label="주문수" value={num(cur.orders)} delta={safeDiv(cur.orders - prev.orders, prev.orders)} />
        <KpiCard label="객단가" value={won(safeDiv(cur.revenue, cur.orders))} />
        <KpiCard label="할인 · 배송비" value={wonShort(cur.discount + cur.shippingCost)} sub={`할인 ${pct(safeDiv(cur.discount, cur.revenue))} · 배송비 ${pct(safeDiv(cur.shippingCost, cur.revenue))}`} tone="warn" />
        <KpiCard label="취소·반품" value={num(cur.returns)} sub={`반품률 ${pct(safeDiv(cur.returns, cur.orders))}`} tone="neutral" href="/ax/returns" />
      </div>

      <Panel title="매출 · 추정 마진 추이" sub="매출이 증가했지만 할인과 배송비 때문에 실질수익성이 낮아진 구간을 봅니다" right={<Tabs value={range} onChange={setRange} tabs={[{ key: "day", label: "일" }, { key: "week", label: "주" }, { key: "month", label: "월" }]} className="!border-0" />}>
        <LineChart data={series} label1="순매출" label2="추정마진" format={wonShort} showEvery={range === "day" ? 3 : 1} height={240} />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="카테고리별 매출·마진" sub="매출 순 · 마진율 낮은 카테고리는 원가·배송비 점검">
          <div className="table-wrap"><table className="table"><thead><tr><th>카테고리</th><th className="text-right">매출</th><th className="text-right">주문</th><th className="text-right">추정마진</th><th className="text-right">마진율</th></tr></thead><tbody>
            {catRows.map((c) => <tr key={c.categorySlug} className="row-clickable" onClick={() => setSkuId(insights.find((i) => i.product.categorySlug === c.categorySlug)?.sku.id ?? null)}><td className="font-semibold">{c.name}</td><td className="text-right tabular-nums">{wonShort(c.revenue)}</td><td className="text-right tabular-nums">{num(c.orders)}</td><td className="text-right tabular-nums">{wonShort(c.margin)}</td><td className={`text-right tabular-nums font-semibold ${c.rate < 0.2 ? "text-danger" : ""}`}>{pct(c.rate, 0)}</td></tr>)}
          </tbody></table></div>
        </Panel>
        <Panel title="주문채널 · 비용 구조" sub="현재는 자사 Customer Platform 단일 채널이 대부분">
          <div className="grid sm:grid-cols-2 gap-4 items-center">
            <Donut parts={[{ label: "자사 플랫폼", value: 92, color: "var(--t-primary)" }, { label: "전화·B2B 소량", value: 8, color: "var(--t-accent)" }]} />
            <Donut parts={[{ label: "상품원가", value: cur.revenue - cur.grossMargin - cur.discount - cur.shippingCost, color: "#66727F" }, { label: "할인", value: cur.discount, color: "var(--t-accent)" }, { label: "배송비", value: cur.shippingCost, color: "var(--t-secondary)" }, { label: "매출총이익", value: cur.grossMargin, color: "var(--t-primary)" }]} />
          </div>
          <p className="text-xs text-muted mt-2">외부 쇼핑채널 연동은 READY 단계입니다. 채널이 늘면 채널별 마진을 같은 방식으로 비교합니다.</p>
        </Panel>
      </div>

      <Panel title="고매출 · 저마진 상품" sub="매출은 높지만 할인·배송비 후 실질마진이 18% 미만인 SKU (최근 4주 추정)" right={<Link href="/ax/promotions" className="text-sm font-semibold text-primary">프로모션 조정</Link>}>
        <div className="table-wrap"><table className="table"><thead><tr><th>상품 · SKU</th><th className="text-right">추정 매출</th><th className="text-right">추정 마진</th><th className="text-right">마진율</th><th>프로모션</th><th>Action</th></tr></thead><tbody>
          {lowMargin.map((r) => <tr key={r.i.sku.id} className="row-clickable" onClick={() => setSkuId(r.i.sku.id)}><td className="font-semibold">{r.i.product.name} <span className="text-muted font-normal">· {r.i.sku.name}</span></td><td className="text-right tabular-nums">{wonShort(r.rev)}</td><td className="text-right tabular-nums">{wonShort(r.margin)}</td><td className={`text-right tabular-nums font-bold ${r.rate < 0.12 ? "text-danger" : "text-[#B84F1A]"}`}>{pct(r.rate, 0)}</td><td>{r.promo ? <span className="badge bg-accent/15 text-accent">진행중</span> : <span className="text-muted">-</span>}</td><td className="text-xs text-primary font-semibold">{r.promo ? "할인율 조정 검토" : "묶음가·배송조건 검토"}</td></tr>)}
        </tbody></table></div>
      </Panel>

      <Panel title="프로모션 전후 비교" sub="매출만 높은 캠페인을 성공으로 표시하지 않습니다 — 실질마진과 함께 봅니다" right={<Link href="/ax/promotions" className="text-sm font-semibold text-primary">Detail</Link>}>
        <BarChart data={promoDelta} label1="매출" label2="실질마진" format={wonShort} height={200} />
      </Panel>

      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} />
    </div>
  );
}
