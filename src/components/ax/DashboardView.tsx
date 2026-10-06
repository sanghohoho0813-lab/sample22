"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Sparkles, TrendingUp, Boxes, Truck, Users, Rocket } from "lucide-react";
import { useBriefing, useData, useInsights, useOrderRisks } from "@/lib/hooks";
import { useStore, ROLE_LABEL } from "@/lib/store";
import { dashboardKpis, fulfillmentKpis } from "@/lib/kpi";
import { pct, won, wonShort, num, fmtDate } from "@/lib/format";
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
  const [briefAll, setBriefAll] = useState(false);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const myActions = data.actions
    .filter((a) => !["done", "dismissed"].includes(a.stage) && (role === "owner" || a.owner === role))
    .sort(
      (a, b) =>
        ({ critical: 0, high: 1, mid: 2, low: 3 })[a.urgency] -
        { critical: 0, high: 1, mid: 2, low: 3 }[b.urgency],
    );
  const series = data.dailySales
    .slice(-14)
    .map((d) => ({ label: fmtDate(d.date, "md"), value: d.revenue, value2: d.grossMargin }));
  const catSeries = [...data.categorySales]
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({ label: data.categories.find((x) => x.slug === c.categorySlug)!.name, value: c.revenue }));
  const showMoney = role === "owner";
  const highRisk = risks.filter((r) => r.level === "high");
  const stockoutRisk = insights
    .filter((i) => ["urgent", "stockout", "low"].includes(i.status))
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Today Brief */}
      <Panel
        tour="brief"
        title={
          <span className="inline-flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            오늘의 브리핑 — {ROLE_LABEL[role]}님, 오늘 확인할 순서
          </span>
        }
        right={
          <AiReady
            title="경영 브리핑"
            now="KPI·실행을 규칙으로 정렬한 우선순위 (L1 보조)"
            method="구조화 규칙"
            next="LLM이 여러 지표와 실행을 한 문단 자연어로 설명"
          />
        }
      >
        <ol className="stagger grid gap-2 md:grid-cols-2">
          {briefing.map((b) => (
            <li key={b.rank} className={!briefAll && b.rank > 3 ? "hidden md:block" : ""}>
              <Link
                href={b.href}
                className="flex h-full items-start gap-3 rounded-xl border border-line px-3.5 py-3 transition-colors hover:bg-mist"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${b.tone === "danger" ? "bg-danger" : b.tone === "warn" ? "bg-orange" : b.tone === "good" ? "bg-teal" : "bg-secondary"}`}
                >
                  {b.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-semibold leading-snug">{b.title}</div>
                  <div className="mt-0.5 text-sm text-muted">{b.why}</div>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ol>
        {/* 모바일은 급한 3건만 먼저 — 나머지는 펼쳐서 */}
        {briefing.length > 3 && (
          <button
            className="btn-ghost mt-2 !min-h-[44px] w-full text-primary md:hidden"
            onClick={() => setBriefAll((v) => !v)}
          >
            {briefAll ? "접기" : `나머지 ${briefing.length - 3}건 더 보기`}
          </button>
        )}
      </Panel>

      {/* KPI hierarchy 1: 매출·마진 */}
      <div data-tour="kpi">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
          <TrendingUp size={15} />
          1. 매출·마진 <span className="font-normal">(최근 30일)</span>
        </div>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          {showMoney ? (
            <>
              <KpiCard
                label="순매출"
                value={wonShort(k.revenue30)}
                delta={k.revenueDelta}
                sub="전월 대비"
                href="/ax/sales"
                tone="primary"
                spark={data.dailySales.slice(-14).map((d) => d.revenue)}
                big
              />
              <KpiCard
                label="추정 매출총이익"
                value={wonShort(k.grossMargin30)}
                sub={`마진율 ${pct(k.marginRate)}`}
                href="/ax/sales"
                tone="good"
                spark={data.dailySales.slice(-14).map((d) => d.grossMargin)}
                big
              />
            </>
          ) : (
            <>
              <KpiCard
                label="주문수 (30일)"
                value={num(k.orders30)}
                delta={k.ordersDelta}
                href="/ax/fulfillment"
                tone="primary"
                big
              />
              <KpiCard label="객단가" value={won(k.aov)} sub="대표 전용 손익은 비공개" tone="neutral" big />
            </>
          )}
          <KpiCard
            label="구매 전환율"
            value={pct(k.conversionRate)}
            sub={`장바구니→주문 ${pct(k.cartConversion)}`}
            href="/ax/customers"
          />
          <KpiCard
            label="재구매율"
            value={pct(k.repeatRate, 0)}
            sub="2회 이상 구매 고객 비율"
            href="/ax/customers"
            tone="good"
          />
        </div>
      </div>

      {/* 2: 재고·발주 */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
          <Boxes size={15} />
          2. 재고·발주
        </div>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="품절위험 SKU"
            value={`${k.stockoutRisk}개`}
            sub={`품절률 ${pct(k.stockoutRate)}`}
            href="/ax/inventory?status=risk"
            tone={k.stockoutRisk > 0 ? "danger" : "good"}
          />
          <KpiCard
            label="긴급발주 후보"
            value={`${k.urgentPo}개`}
            sub="예상 소진 < 리드타임"
            href="/ax/inventory?status=urgent"
            tone="warn"
          />
          <KpiCard
            label="저회전·과잉 재고"
            value={`${k.slowCount}개`}
            sub={showMoney ? `재고금액 ${wonShort(k.slowValue)}` : "재고일수 75일 이상"}
            href="/ax/inventory?status=slow"
            tone="neutral"
          />
          <KpiCard
            label="공급사 입고지연"
            value={`${data.purchaseOrders.filter((p) => ["confirmed", "in_transit"].includes(p.status) && new Date(p.expectedAt).getTime() > Date.now() + 7 * 86400000).length}건`}
            sub="예정일 7일 초과"
            href="/ax/suppliers"
            tone="warn"
          />
        </div>
      </div>

      {/* 3: 주문·배송 */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
          <Truck size={15} />
          3. 주문·배송 (오늘)
        </div>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="신규주문"
            value={num(fk.newOrders)}
            sub={`오늘 출고대상 ${fk.todayShip}건`}
            href="/ax/fulfillment"
            tone="primary"
          />
          <KpiCard
            label="배송지연 위험"
            value={`${highRisk.length}건`}
            sub={`마감임박 ${fk.cutoffSoon}건`}
            href="/ax/fulfillment?tab=risk"
            tone={highRisk.length ? "danger" : "good"}
          />
          <KpiCard
            label="정시출고율"
            value={pct(fk.onTimeRate, 0)}
            sub={`평균 처리 ${fk.avgCycleHours.toFixed(1)}시간`}
            href="/ax/fulfillment"
            tone="good"
          />
          <KpiCard
            label="반품률"
            value={pct(k.returnRate)}
            sub="최근 30일"
            href="/ax/returns"
            tone="neutral"
          />
        </div>
      </div>

      {/* 4 + 5 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <Users size={17} />
              4. 고객·재구매
            </span>
          }
          sub="주기 도래 고객에게 다시 제안"
          right={
            <Link href="/ax/customers" className="text-sm font-semibold text-primary">
              자세히
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              ["주기 도래", 42, "다시 구매 노출"],
              ["장바구니 이탈", 18, "복귀 안내"],
              ["재구매 지연", 27, "리마인드"],
            ].map(([l, v, a]) => (
              <Link
                href="/ax/customers"
                key={l as string}
                className="rounded-xl bg-mist p-3 hover:brightness-95"
              >
                <div className="text-[13px] leading-snug text-muted">{l}</div>
                <div className="text-2xl font-black tabular-nums">
                  {v}
                  <span className="text-sm font-semibold text-muted">명</span>
                </div>
                <div className="mt-0.5 text-[13px] font-semibold leading-snug text-primary">{a}</div>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel
          tour="actions"
          title={
            <span className="inline-flex items-center gap-2">
              <Rocket size={17} className="text-accent" />
              5. 오늘의 실행
            </span>
          }
          sub={`${ROLE_LABEL[role]} 권한 기준 미처리 ${myActions.length}건`}
          right={
            <Link href="/ax/actions" className="text-sm font-semibold text-primary">
              실행 센터
            </Link>
          }
        >
          <div className="space-y-2">
            {myActions.slice(0, 3).map((a) => (
              <ActionCard key={a.id} a={a} onOpen={setAction} compact />
            ))}
          </div>
          {!myActions.length && <div className="text-sm text-muted">처리할 실행이 없습니다.</div>}
        </Panel>
      </div>

      {/* charts + drill list */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel
          title="최근 14일 매출 · 추정 마진"
          sub={showMoney ? "매출이 올라도 할인·배송비로 마진이 줄어드는 날을 확인" : "주문·처리량 추이"}
          right={
            <Link href="/ax/sales" className="text-sm font-semibold text-primary">
              상세
            </Link>
          }
        >
          {showMoney ? (
            <LineChart data={series} label1="매출" label2="추정마진" format={wonShort} showEvery={2} />
          ) : (
            <BarChart
              data={data.dailySales
                .slice(-14)
                .map((d) => ({ label: fmtDate(d.date, "md"), value: d.orders }))}
              label1="주문수"
              showEvery={2}
            />
          )}
        </Panel>
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={17} className="text-danger" />
              품절위험 SKU {stockoutRisk.length}개
            </span>
          }
          sub="누르면 근거와 발주 추천이 열립니다"
          right={
            <Link href="/ax/inventory?status=risk" className="text-sm font-semibold text-primary">
              전체
            </Link>
          }
        >
          <ul className="-mx-1 divide-y divide-line">
            {stockoutRisk.slice(0, 6).map((i) => (
              <li key={i.sku.id}>
                <button
                  onClick={() => setSkuId(i.sku.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-mist"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {i.product.name} <span className="font-normal text-muted">· {i.sku.name}</span>
                    </div>
                    <div className="text-xs text-muted">{i.reasons[0]}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold tabular-nums">
                      {i.daysOfStock === Infinity ? "-" : `${i.daysOfStock.toFixed(1)}일`}
                    </div>
                    <div className="text-[13px] text-muted">가용 {i.available}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {showMoney && (
        <Panel
          title="카테고리별 매출 (30일)"
          sub="식품·생활이 매출을 이끌고, 디지털은 재고회전 관리가 필요"
          right={
            <Link href="/ax/sales" className="text-sm font-semibold text-primary">
              매출·마진
            </Link>
          }
        >
          <BarChart data={catSeries} horizontal format={wonShort} />
        </Panel>
      )}

      <ActionDrawer
        action={action}
        onClose={() => setAction(null)}
        onOpenSku={(id) => {
          setAction(null);
          setSkuId(id);
        }}
        onOpenOrder={(id) => {
          setAction(null);
          setOrderId(id);
        }}
      />
      <SkuDrawer
        skuId={skuId}
        onClose={() => setSkuId(null)}
        onOpenAction={(a) => {
          setSkuId(null);
          setAction(a);
        }}
      />
      <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />
    </div>
  );
}
