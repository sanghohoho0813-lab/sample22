"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Factory,
  PackageCheck,
  Radar,
  Repeat,
  RotateCcw,
  Search,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  useData,
  useExceptions,
  useForecast,
  useInsights,
  useLedger,
  useMargin,
  useMinute,
  useRepeat,
  useReturnSignals,
} from "@/lib/hooks";
import { ROLE_LABEL, useStore } from "@/lib/store";
import { EXCEPTION_LABEL, type ExceptionKind, type OpsException } from "@/lib/control";
import { isPreShip } from "@/lib/fulfillment";
import { LIFECYCLE } from "@/lib/lifecycle";
import { CHANNEL_LABEL } from "@/lib/costs";
import { dateKey, fmtDate, wonShort } from "@/lib/format";
import { LineChart } from "@/components/shared/Charts";
import type { AXAction } from "@/lib/types";
import { Panel } from "./Widgets";
import { OrderDrawer, SkuDrawer } from "./Drawers";
import { ActionDrawer } from "./ActionDrawer";
import ExceptionDrawer from "./ExceptionDrawer";
import { Impact, money, pctText, SeverityTag, StatusCell, VerdictTag } from "./OpsUi";

const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default function DashboardView() {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const role = useStore((s) => s.ui.role);
  const insights = useInsights();
  const forecast = useForecast();
  const margin = useMargin(30);
  const repeat = useRepeat();
  const signals = useReturnSignals();
  const [byRole, setByRole] = useState(role !== "owner");
  const exceptions = useExceptions(byRole);
  const [kind, setKind] = useState<ExceptionKind | "all">("all");
  const [showAll, setShowAll] = useState(false);
  const [ex, setEx] = useState<OpsException | null>(null);
  const [action, setAction] = useState<AXAction | null>(null);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // ---- 오늘 운영 상태 ----
  const due = forecast.orders.filter((p) => p.cutoffAt <= forecast.nextCutoff);
  const atRisk = due.filter((p) => ["late", "overdue", "blocked"].includes(p.status));
  const minsLeft = Math.max(0, Math.round((forecast.nextCutoff.getTime() - now.getTime()) / 60000));
  const todayKey = dateKey(now);
  const todayOrders = data.orders.filter(
    (o) => dateKey(new Date(o.createdAt)) === todayKey && o.stage !== "cancelled",
  );
  const todayRevenue = todayOrders.reduce((a, o) => a + o.total, 0);
  const secOfDay = now.getHours() * 3600 + now.getMinutes() * 60;
  const ySameTime = useMemo(() => {
    if (!ledger) return 0;
    const y = ledger.orders.filter((o) => {
      if (o.day !== 1) return false;
      const t = new Date(o.createdAt);
      return t.getHours() * 3600 + t.getMinutes() * 60 <= secOfDay;
    }).length;
    const yLive = data.orders.filter((o) => {
      const t = new Date(o.createdAt);
      return (
        dateKey(t) === dateKey(new Date(now.getTime() - 86400000)) &&
        t.getHours() * 3600 + t.getMinutes() * 60 <= secOfDay
      );
    }).length;
    return y + yLive;
  }, [ledger, data.orders, secOfDay, now]);
  const exposure = exceptions
    .filter((e) => e.impact.unit === "원" && (e.severity === "critical" || e.severity === "high"))
    .reduce((a, e) => a + e.impact.value, 0);
  const sevCount = (s: OpsException["severity"]) => exceptions.filter((e) => e.severity === s).length;
  const actionsBy = (stages: AXAction["stage"][]) => data.actions.filter((a) => stages.includes(a.stage));

  // ---- 우선 처리 큐 ----
  const kinds = useMemo(() => {
    const m = new Map<ExceptionKind, number>();
    exceptions.forEach((e) => m.set(e.kind, (m.get(e.kind) ?? 0) + 1));
    return Array.from(m.entries());
  }, [exceptions]);
  const queue = exceptions.filter((e) => kind === "all" || e.kind === kind);
  const shown = showAll ? queue : queue.slice(0, 10);

  // ---- 운영 흐름 (수요 → 재구매) ----
  const risingSkus = insights.filter(
    (i) => i.demandTrend > 0.3 || i.searchTrend > 0.3 || i.cartTrend > 0.3,
  ).length;
  const riskSkus = insights.filter((i) => ["stockout", "urgent", "low"].includes(i.status));
  const openPos = data.purchaseOrders.filter((p) =>
    ["requested", "confirmed", "in_transit"].includes(p.status),
  );
  const in3 = openPos.filter(
    (p) => new Date(`${p.expectedAt}T23:59:59`).getTime() - now.getTime() <= 3 * 86400000,
  );
  const pending = data.orders.filter((o) => isPreShip(o.stage));
  const moving = data.orders.filter((o) => ["shipped", "in_transit"].includes(o.stage));
  const recentReturns = signals.reduce((a, s) => a + s.recentCount, 0);
  const flow: {
    key: string;
    label: string;
    icon: typeof Search;
    value: string;
    sub: string;
    href: string;
    tone: "good" | "warn" | "danger";
  }[] = [
    {
      key: "demand",
      label: "수요",
      icon: Search,
      value: `오늘 ${data.demand.reduce((a, d) => a + (d.today ?? 0), 0).toLocaleString()}개 주문`,
      sub: `검색·장바구니·주문 30%↑ SKU ${risingSkus}개`,
      href: "/ax/products",
      tone: risingSkus > 8 ? "warn" : "good",
    },
    {
      key: "stock",
      label: "재고",
      icon: Boxes,
      value: `위험 SKU ${riskSkus.length}개`,
      sub: `가용재고 0: ${riskSkus.filter((i) => i.status === "stockout").length}개`,
      href: "/ax/inventory?status=risk",
      tone: riskSkus.some((i) => i.status === "stockout" || i.status === "urgent")
        ? "danger"
        : riskSkus.length
          ? "warn"
          : "good",
    },
    {
      key: "po",
      label: "발주",
      icon: Factory,
      value: `진행 ${openPos.length}건`,
      sub: `지연 통보 ${openPos.filter((p) => p.note).length}건`,
      href: "/ax/suppliers",
      tone: openPos.some((p) => p.note) ? "warn" : "good",
    },
    {
      key: "inbound",
      label: "입고",
      icon: PackageCheck,
      value: `3일 내 ${in3.length}건`,
      sub: `${in3.reduce((a, p) => a + p.qty, 0).toLocaleString()}개 예정`,
      href: "/ax/inventory?status=inbound",
      tone: "good",
    },
    {
      key: "orders",
      label: "주문",
      icon: ShoppingCart,
      value: `미출고 ${pending.length}건`,
      sub: `우선처리 ${pending.filter((o) => o.priority).length}건`,
      href: "/ax/fulfillment?tab=board",
      tone: "good",
    },
    {
      key: "ship",
      label: "출고",
      icon: ClipboardList,
      value: `마감 내 ${Math.round(forecast.onTimeRate * 100)}%`,
      sub: `초과 예상 ${due.filter((p) => p.status === "late").length} · 재고부족 ${due.filter((p) => p.status === "blocked").length} · 이월 ${due.filter((p) => p.status === "overdue").length}`,
      href: "/ax/fulfillment?tab=forecast",
      tone: forecast.onTimeRate < 0.9 ? "danger" : forecast.onTimeRate < 0.97 ? "warn" : "good",
    },
    {
      key: "delivery",
      label: "배송",
      icon: Truck,
      value: `배송중 ${moving.length}건`,
      sub: `지연 사전안내 ${data.orders.filter((o) => o.customerNotified).length}건`,
      href: "/ax/fulfillment?tab=list",
      tone: "good",
    },
    {
      key: "returns",
      label: "반품",
      icon: RotateCcw,
      value: `이상 신호 ${signals.length}건`,
      sub: `신호 관련 최근 4주 ${recentReturns}건`,
      href: "/ax/returns",
      tone: signals.length ? "warn" : "good",
    },
    {
      key: "repeat",
      label: "재구매",
      icon: Repeat,
      value: `주기 도래 ${repeat.counts.due.toLocaleString()}명`,
      sub: `주기 지남 ${repeat.counts.late.toLocaleString()}명 · 노출 중 ${data.actions.filter((a) => a.type === "repeat_expose" && a.stage === "in_progress").length}건`,
      href: "/ax/customers",
      tone: "good",
    },
  ];

  // ---- 실행 파이프라인 ----
  const pipeline = LIFECYCLE.map((s) => ({
    ...s,
    count:
      s.stage === "in_progress"
        ? actionsBy(["in_progress", "requested", "approved"]).length
        : data.actions.filter((a) => a.stage === s.stage).length,
  }));
  const measured = data.actions
    .filter((a) => a.measurement)
    .sort((a, b) => (a.measurement!.measuredAt < b.measurement!.measuredAt ? 1 : -1))
    .slice(0, 3);
  const series = data.dailySales
    .slice(-15, -1)
    .map((d) => ({ label: fmtDate(d.date, "md"), value: d.revenue, value2: d.grossMargin }));
  const showMoney = role === "owner";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 오늘 운영 상태 — 카드 대신 한 줄 상태판 */}
      <section
        data-tour="kpi"
        aria-label="오늘 운영 상태"
        className="card grid grid-cols-2 divide-line sm:grid-cols-3 sm:divide-x xl:grid-cols-5"
      >
        <StatusCell
          label={`다음 출고마감 ${hm(forecast.nextCutoff)}`}
          value={`${Math.floor(minsLeft / 60)}시간 ${minsLeft % 60}분`}
          sub={`마감 내 출고 예상 ${Math.round(forecast.onTimeRate * 100)}% · 위험 ${atRisk.length}건`}
          tone={atRisk.length > 5 ? "danger" : atRisk.length ? "warn" : "good"}
        />
        <StatusCell
          label="오늘 주문"
          value={`${todayOrders.length.toLocaleString()}건`}
          sub={`${showMoney ? `${money(todayRevenue)} · ` : ""}어제 같은 시각 ${ySameTime.toLocaleString()}건`}
        />
        <StatusCell
          label="위험 노출 (추정)"
          value={money(exposure)}
          sub={`긴급 ${sevCount("critical")} · 높음 ${sevCount("high")}건 — 계산식은 각 항목에`}
          tone={exposure > 0 ? "danger" : "good"}
        />
        <StatusCell
          label="실행"
          value={`대기 ${actionsBy(["recommended", "reviewing"]).length}`}
          sub={`진행 ${actionsBy(["approved", "requested", "in_progress"]).length} · 측정 대기 ${actionsBy(["done"]).length} · 보류 ${actionsBy(["held"]).length}`}
        />
        {showMoney && (
          <StatusCell
            label="공헌이익률 (30일)"
            value={pctText(margin.total.marginRate)}
            sub={`순매출 ${money(margin.total.revenue)} · 공헌이익 ${money(margin.total.contribution)}`}
          />
        )}
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* 우선 처리 큐 */}
        <Panel
          tour="brief"
          title={
            <span className="inline-flex items-center gap-2">
              <Radar size={18} className="text-primary" />
              우선 처리 큐 — 오늘 이익과 고객에 영향
            </span>
          }
          sub="근거 → 영향 → 상세 → 실행. 영향은 아무것도 하지 않을 때의 노출 규모(계산식 공개)입니다."
          right={
            <div
              className="inline-flex rounded-lg border border-line p-0.5 text-sm"
              role="group"
              aria-label="정렬 기준"
            >
              <button
                className={`rounded-md px-2.5 py-1 ${!byRole ? "bg-soft font-semibold text-primary" : "text-muted"}`}
                aria-pressed={!byRole}
                onClick={() => setByRole(false)}
              >
                전체
              </button>
              <button
                className={`rounded-md px-2.5 py-1 ${byRole ? "bg-soft font-semibold text-primary" : "text-muted"}`}
                aria-pressed={byRole}
                onClick={() => setByRole(true)}
              >
                {ROLE_LABEL[role]} 기준
              </button>
            </div>
          }
        >
          <div
            className="hide-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1"
            role="tablist"
            aria-label="예외 유형"
          >
            <button
              role="tab"
              aria-selected={kind === "all"}
              className={`chip shrink-0 whitespace-nowrap ${kind === "all" ? "chip-on" : ""}`}
              onClick={() => setKind("all")}
            >
              전체 <span className="tabular-nums">{exceptions.length}</span>
            </button>
            {kinds.map(([k, n]) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                className={`chip shrink-0 whitespace-nowrap ${kind === k ? "chip-on" : ""}`}
                onClick={() => setKind(k)}
              >
                {EXCEPTION_LABEL[k]} <span className="tabular-nums">{n}</span>
              </button>
            ))}
          </div>
          {queue.length === 0 ? (
            <p className="rounded-xl bg-mist p-4 text-[15px] text-muted">
              이 유형의 예외가 없습니다. 운영이 정상 범위입니다.
            </p>
          ) : (
            <>
              {/* 모바일: 한 줄 요약 목록 (긴급도·유형 → 제목 → 영향·기한) */}
              <ol className="space-y-2 sm:hidden">
                {shown.map((e) => (
                  <li key={e.id}>
                    <button
                      className="w-full rounded-xl border border-line bg-white p-3 text-left active:bg-mist"
                      onClick={() => setEx(e)}
                    >
                      <span className="flex items-center gap-2 text-[12px] font-semibold text-muted">
                        <SeverityTag s={e.severity} />
                        {EXCEPTION_LABEL[e.kind]}
                        <span className="ml-auto">
                          {e.action ? (
                            <span className="text-primary">실행 연결됨</span>
                          ) : e.actionType ? (
                            <span className="text-orange">실행 없음</span>
                          ) : (
                            "정책 검토"
                          )}
                        </span>
                      </span>
                      <span className="mt-1.5 block font-semibold leading-snug">{e.title}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                        {e.evidence[0]}
                      </span>
                      <span className="mt-2 flex items-baseline justify-between gap-2 text-[13px]">
                        <span>
                          <b className="tabular-nums">
                            {e.impact.unit === "원"
                              ? money(e.impact.value)
                              : `${Math.round(e.impact.value).toLocaleString()}${e.impact.unit}`}
                          </b>{" "}
                          <span className="text-muted">{e.impact.label}</span>
                        </span>
                        {e.dueAt && (
                          <span className="shrink-0 tabular-nums text-muted">
                            기한{" "}
                            {fmtDate(
                              e.dueAt,
                              new Date(e.dueAt).toDateString() === now.toDateString() ? "time" : "md",
                            )}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="table-wrap hidden sm:block">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>긴급도</th>
                      <th>내용</th>
                      <th className="text-right">영향</th>
                      <th>기한</th>
                      <th>실행</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((e, i) => (
                      <tr key={e.id} className="row-clickable" onClick={() => setEx(e)}>
                        <td className="tabular-nums text-muted">{i + 1}</td>
                        <td>
                          <SeverityTag s={e.severity} />
                        </td>
                        <td className="min-w-[220px]">
                          <div className="text-[12px] font-semibold text-muted">
                            {EXCEPTION_LABEL[e.kind]}
                          </div>
                          <div className="font-semibold leading-snug">{e.title}</div>
                          <div className="text-[13px] leading-snug text-muted">{e.evidence[0]}</div>
                        </td>
                        <td className="text-right">
                          <Impact
                            value={e.impact.value}
                            unit={e.impact.unit}
                            label={e.impact.label}
                            basis={e.impact.basis}
                          />
                        </td>
                        <td className="whitespace-nowrap text-[13px] text-muted">
                          {e.dueAt
                            ? fmtDate(
                                e.dueAt,
                                new Date(e.dueAt).toDateString() === now.toDateString() ? "time" : "md",
                              )
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap text-[13px]">
                          {e.action ? (
                            <span className="font-semibold text-primary">연결됨</span>
                          ) : e.actionType ? (
                            <span className="text-orange">실행 없음</span>
                          ) : (
                            <span className="text-muted">정책 검토</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {queue.length > 10 && (
            <button className="btn-ghost btn-sm mt-2 w-full" onClick={() => setShowAll(!showAll)}>
              {showAll ? "접기" : `나머지 ${queue.length - 10}건 보기`}
            </button>
          )}
        </Panel>

        {/* 운영 흐름 */}
        <Panel
          tour="actions"
          title="운영 흐름 — 하나의 데이터로"
          sub="고객 주문이 재고를 예약하고, 위험을 만들고, 실행으로 돌아옵니다"
        >
          <ol className="relative space-y-0.5">
            {flow.map((f, i) => (
              <li key={f.key}>
                <Link
                  href={f.href}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-mist"
                >
                  <span className="relative flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft text-primary">
                      <f.icon size={16} />
                    </span>
                    <span
                      className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${f.tone === "danger" ? "bg-danger" : f.tone === "warn" ? "bg-orange" : "bg-teal"}`}
                      aria-label={f.tone === "danger" ? "위험" : f.tone === "warn" ? "주의" : "정상"}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold text-muted">
                        {i + 1}. {f.label}
                      </span>
                      <span className="whitespace-nowrap text-[15px] font-bold tabular-nums">{f.value}</span>
                    </span>
                    <span className="block truncate text-[13px] text-muted">{f.sub}</span>
                  </span>
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="실행 파이프라인"
          sub="추천 → 담당자 확인 → 승인 → 실행 → 완료 → 성과 측정"
          right={
            <Link href="/ax/actions" className="text-sm font-semibold text-primary">
              실행 센터
            </Link>
          }
        >
          <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {pipeline.map((p) => (
              <li key={p.stage}>
                <Link
                  href={`/ax/actions?stage=${p.stage}`}
                  className="block rounded-xl bg-mist px-2 py-2.5 text-center hover:bg-soft"
                >
                  <div className="text-[22px] font-bold tabular-nums">{p.count}</div>
                  <div className="text-[12px] font-semibold text-muted">{p.label}</div>
                </Link>
              </li>
            ))}
          </ol>
          <h3 className="mb-2 mt-4 text-sm font-bold">최근 성과 측정</h3>
          {measured.length ? (
            <ul className="divide-y divide-line">
              {measured.map((a) => (
                <li key={a.id}>
                  <button
                    className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-mist"
                    onClick={() => setAction(a)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{a.title}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {a.measurement!.metric}: {a.measurement!.before} → {a.measurement!.after}
                      </span>
                    </span>
                    <VerdictTag v={a.measurement!.verdict} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              아직 측정된 실행이 없습니다. 완료된 실행에서 ‘성과 측정 기록’을 누르세요.
            </p>
          )}
        </Panel>

        {showMoney ? (
          <Panel
            title="매출 · 매출총이익 (최근 14일)"
            sub="매출총이익 = 순매출 − 상품원가 − 순운임 (원장 집계)"
            right={
              <Link href="/ax/sales" className="text-sm font-semibold text-primary">
                이익 분석
              </Link>
            }
          >
            <LineChart data={series} label1="순매출" label2="매출총이익" format={wonShort} showEvery={2} />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {margin.byChannel.map((c) => (
                <div key={c.key} className="rounded-lg bg-mist px-2.5 py-2">
                  <div className="text-[12px] text-muted">
                    {CHANNEL_LABEL[c.key as keyof typeof CHANNEL_LABEL]}
                  </div>
                  <div
                    className={`text-[15px] font-bold tabular-nums ${c.marginRate < margin.total.marginRate * 0.75 ? "text-danger" : ""}`}
                  >
                    {pctText(c.marginRate)}
                  </div>
                  <div className="text-[12px] text-muted">공헌이익률</div>
                </div>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel title="내 역할의 실행" sub={`${ROLE_LABEL[role]} 담당 · 기한 순`}>
            <ul className="divide-y divide-line">
              {data.actions
                .filter((a) => a.owner === role && !["done", "measured", "dismissed"].includes(a.stage))
                .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1))
                .slice(0, 6)
                .map((a) => (
                  <li key={a.id}>
                    <button
                      className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-mist"
                      onClick={() => setAction(a)}
                    >
                      <SeverityTag s={a.urgency} />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{a.title}</span>
                      <span className="whitespace-nowrap text-[13px] text-muted">
                        {fmtDate(a.dueAt, "md")}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
        )}
      </div>

      <ExceptionDrawer
        ex={ex}
        onClose={() => setEx(null)}
        onOpenAction={(id) => {
          setEx(null);
          setAction(data.actions.find((a) => a.id === id) ?? ({ id } as AXAction));
        }}
      />
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
