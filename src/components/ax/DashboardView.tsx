"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Sparkles, TrendingUp, Boxes, Truck, Users, Rocket } from "lucide-react";
import { useBriefing, useData, useInsights, useOrderRisks } from "@/lib/hooks";
import { useStore, ROLE_LABEL } from "@/lib/store";
import { dashboardKpis, fulfillmentKpis } from "@/lib/kpi";
import { pct, won, wonShort, num, signedPct, fmtDate } from "@/lib/format";
import { KpiCard, Panel } from "./Widgets";
import { ActionCard, ActionDrawer, SkuDrawer, OrderDrawer } from "./Drawers";
import { LineChart, BarChart } from "@/components/shared/Charts";
import { AiReady } from "@/components/shared/Bits";
import type { AXAction } from "@/lib/types";

export default function DashboardView() {
  const data = useData();
  const insights = useInsights();
  const risks = useOrderRisks();
  const briefing = useBriefing();
  const role = useStore((s) => s.ui.role);
  const k = useMemo(() => dashboardKpis(data, insights), [data, insights]);
  const fk = useMemo(() => fulfillmentKpis(data.orders), [data.orders]);
  const [action, setAction] = useState<AXAction | null>(null);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const myActions = data.actions.filter((a) => !["done", "dismissed"].includes(a.stage) && (role === "owner" || a.owner === role)).sort((a, b) => ({ critical: 0, high: 1, mid: 2, low: 3 }[a.urgency] - { critical: 0, high: 1, mid: 2, low: 3 }[b.urgency]));
  const series = data.dailySales.slice(-14).map((d) => ({ label: fmtDate(d.date, "md"), value: d.revenue, value2: d.grossMargin }));
  const catSeries = [...data.categorySales].sort((a, b) => b.revenue - a.revenue).map((c) => ({ label: data.categories.find((x) => x.slug === c.categorySlug)!.name, value: c.revenue }));
  const showMoney = role === "owner";
  const highRisk = risks.filter((r) => r.level === "high");
  const stockoutRisk = insights.filter((i) => ["urgent", "stockout", "low"].includes(i.status)).sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Today Brief */}
      <Panel tour="brief" title={<span className="inline-flex items-center gap-2"><Sparkles size={18} className="text-accent" />Today Brief — {ROLE_LABEL[role]}님, 오늘 확인할 순서</span>} sub="어디에서 돈이 새고, 무엇을 먼저 발주하고, 어떤 주문을 먼저 처리할지" right={<AiReady title="Executive Briefing" now="KPI·Action을 규칙으로 정렬한 우선순위 (L1 Assist)" method="Structured Rule" next="LLM이 여러 지표와 Action을 한 문단 자연어로 설명" />}>
        <ol className="grid md:grid-cols-2 gap-2 stagger">
          {briefing.map((b) => (
            <li key={b.rank}>
              <Link href={b.href} className="flex items-start gap-3 rounded-xl border border-line px-3.5 py-3 hover:bg-mist transition-colors h-full">
                <span className={`w-7 h-7 rounded-lg text-white text-sm font-bold flex items-center justify-center shrink-0 ${b.tone === "danger" ? "bg-danger" : b.tone === "warn" ? "bg-orange" : b.tone === "good" ? "bg-teal" : "bg-secondary"}`}>{b.rank}</span>
                <div className="min-w-0 flex-1"><div className="font-semibold text-[17px] leading-snug">{b.title}</div><div className="text-sm text-muted mt-0.5">{b.why}</div></div>
                <ArrowRight size={16} className="text-muted shrink-0 mt-1" />
              </Link>
            </li>
          ))}
        </ol>
      </Panel>

      {/* KPI hierarchy 1: 매출·마진 */}
      <div data-tour="kpi">
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-muted"><TrendingUp size={15} />1. 매출·마진 <span className="font-normal">(최근 30일)</span></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          {showMoney ? (
            <>
              <KpiCard label="순매출" value={wonShort(k.revenue30)} delta={k.revenueDelta} sub="전월 대비" href="/ax/sales" tone="primary" spark={data.dailySales.slice(-14).map((d) => d.revenue)} big />
              <KpiCard label="추정 매출총이익" value={wonShort(k.grossMargin30)} sub={`마진율 ${pct(k.marginRate)}`} href="/ax/sales" tone="good" spark={data.dailySales.slice(-14).map((d) => d.grossMargin)} big />
            </>
          ) : (
            <>
              <KpiCard label="주문수 (30일)" value={num(k.orders30)} delta={k.ordersDelta} href="/ax/fulfillment" tone="primary" big />
              <KpiCard label="객단가" value={won(k.aov)} sub="대표 전용 손익은 비공개" tone="neutral" big />
            </>
          )}
          <KpiCard label="구매 전환율" value={pct(k.conversionRate)} sub={`장바구니→주문 ${pct(k.cartConversion)}`} href="/ax/customers" />
          <KpiCard label="재구매율" value={pct(k.repeatRate, 0)} sub="2회 이상 구매 고객 비율" href="/ax/customers" tone="good" />
        </div>
      </div>

      {/* 2: 재고·발주 */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-muted"><Boxes size={15} />2. 재고·발주</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          <KpiCard label="품절위험 SKU" value={`${k.stockoutRisk}개`} sub={`품절률 ${pct(k.stockoutRate)}`} href="/ax/inventory?status=risk" tone={k.stockoutRisk > 0 ? "danger" : "good"} />
          <KpiCard label="긴급발주 후보" value={`${k.urgentPo}개`} sub="예상 소진 < 리드타임" href="/ax/inventory?status=urgent" tone="warn" />
          <KpiCard label="저회전·과잉 재고" value={`${k.slowCount}개`} sub={showMoney ? `재고금액 ${wonShort(k.slowValue)}` : "재고일수 75일 이상"} href="/ax/inventory?status=slow" tone="neutral" />
          <KpiCard label="공급사 입고지연" value={`${data.purchaseOrders.filter((p) => ["confirmed", "in_transit"].includes(p.status) && new Date(p.expectedAt).getTime() > Date.now() + 7 * 86400000).length}건`} sub="예정일 7일 초과" href="/ax/suppliers" tone="warn" />
        </div>
      </div>

      {/* 3: 주문·배송 */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-muted"><Truck size={15} />3. 주문·배송 (오늘)</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          <KpiCard label="신규주문" value={num(fk.newOrders)} sub={`오늘 출고대상 ${fk.todayShip}건`} href="/ax/fulfillment" tone="primary" />
          <KpiCard label="배송지연 위험" value={`${highRisk.length}건`} sub={`마감임박 ${fk.cutoffSoon}건`} href="/ax/fulfillment?tab=risk" tone={highRisk.length ? "danger" : "good"} />
          <KpiCard label="정시출고율" value={pct(fk.onTimeRate, 0)} sub={`평균 처리 ${fk.avgCycleHours.toFixed(1)}시간`} href="/ax/fulfillment" tone="good" />
          <KpiCard label="반품률" value={pct(k.returnRate)} sub="최근 30일" href="/ax/returns" tone="neutral" />
        </div>
      </div>

      {/* 4 + 5 */}
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <Panel title={<span className="inline-flex items-center gap-2"><Users size={17} />4. 고객·재구매</span>} sub="주기 도래 고객에게 다시 제안" right={<Link href="/ax/customers" className="text-sm font-semibold text-primary">자세히</Link>}>
          <div className="grid grid-cols-3 gap-2">
            {[["재구매 주기 도래", 42, "Repeat Basket 노출"], ["장바구니 이탈", 18, "복귀 안내"], ["재구매 지연", 27, "리마인드"]].map(([l, v, a]) => <div key={l as string} className="rounded-xl bg-mist p-3"><div className="text-xs text-muted">{l}</div><div className="text-2xl font-black">{v}<span className="text-sm font-semibold text-muted">명</span></div><div className="text-xs text-primary font-semibold mt-0.5">{a}</div></div>)}
          </div>
          <div className="mt-3 text-xs text-muted">고객 주문·재구매가 발생하면 이 화면과 Evidence에 즉시 반영됩니다. (Customer → AX Data Bridge)</div>
        </Panel>
        <Panel tour="actions" title={<span className="inline-flex items-center gap-2"><Rocket size={17} className="text-accent" />5. 오늘의 Action</span>} sub={`${ROLE_LABEL[role]} 권한 기준 미처리 ${myActions.length}건`} right={<Link href="/ax/actions" className="text-sm font-semibold text-primary">Action Center</Link>}>
          <div className="space-y-2">{myActions.slice(0, 3).map((a) => <ActionCard key={a.id} a={a} onOpen={setAction} compact />)}</div>
          {!myActions.length && <div className="text-sm text-muted">처리할 Action이 없습니다.</div>}
        </Panel>
      </div>

      {/* charts + drill list */}
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <Panel title="최근 14일 매출 · 추정 마진" sub={showMoney ? "매출이 올라도 할인·배송비로 마진이 줄어드는 날을 확인" : "주문·처리량 추이"} right={<Link href="/ax/sales" className="text-sm font-semibold text-primary">Detail</Link>}>
          {showMoney ? <LineChart data={series} label1="매출" label2="추정마진" format={wonShort} showEvery={2} /> : <BarChart data={data.dailySales.slice(-14).map((d) => ({ label: fmtDate(d.date, "md"), value: d.orders }))} label1="주문수" showEvery={2} />}
        </Panel>
        <Panel title={<span className="inline-flex items-center gap-2"><AlertTriangle size={17} className="text-danger" />품절위험 SKU {stockoutRisk.length}개</span>} sub="클릭 → SKU Detail → 근거 → 발주 Action" right={<Link href="/ax/inventory?status=risk" className="text-sm font-semibold text-primary">전체</Link>}>
          <ul className="divide-y divide-line -mx-1">
            {stockoutRisk.slice(0, 6).map((i) => (
              <li key={i.sku.id}><button onClick={() => setSkuId(i.sku.id)} className="w-full flex items-center gap-3 px-1 py-2.5 text-left hover:bg-mist rounded-lg"><div className="min-w-0 flex-1"><div className="font-semibold text-sm truncate">{i.product.name} <span className="text-muted font-normal">· {i.sku.name}</span></div><div className="text-xs text-muted">{i.reasons[0]}</div></div><div className="text-right shrink-0"><div className="text-sm font-bold tabular-nums">{i.daysOfStock === Infinity ? "-" : `${i.daysOfStock.toFixed(1)}일`}</div><div className="text-[13px] text-muted">가용 {i.available}</div></div></button></li>
            ))}
          </ul>
        </Panel>
      </div>

      {showMoney && (
        <Panel title="카테고리별 매출 (30일)" sub="식품·생활이 매출을 이끌고, 디지털은 재고회전 관리가 필요" right={<Link href="/ax/sales" className="text-sm font-semibold text-primary">매출·마진</Link>}>
          <BarChart data={catSeries} horizontal format={wonShort} />
        </Panel>
      )}

      <ActionDrawer action={action} onClose={() => setAction(null)} onOpenSku={(id) => { setAction(null); setSkuId(id); }} onOpenOrder={(id) => { setAction(null); setOrderId(id); }} />
      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} onOpenAction={(a) => { setSkuId(null); setAction(a); }} />
      <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />
    </div>
  );
}
