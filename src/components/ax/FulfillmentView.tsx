"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Truck, AlertTriangle, Bell, Search, Rocket } from "lucide-react";
import { useData, useLookups, useOrderRisks } from "@/lib/hooks";
import { ORDER_STAGE_LABEL, useStore } from "@/lib/store";
import { fulfillmentKpis } from "@/lib/kpi";
import { fmtDate, num, pct, relTime, won } from "@/lib/format";
import type { Order, OrderStage } from "@/lib/types";
import { StatusBadge } from "@/components/shared/Badge";
import Badge from "@/components/shared/Badge";
import { Meter } from "@/components/shared/Charts";
import { EmptyState, Tabs, Term, TERMS, AiReady } from "@/components/shared/Bits";
import { KpiCard, Panel } from "./Widgets";
import { OrderDrawer, ActionDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";
import { useToast } from "@/components/shared/Toast";

const COLS: { key: string; label: string; stages: OrderStage[] }[] = [
  { key: "new", label: "신규·확인", stages: ["new", "confirmed"] },
  { key: "pick", label: "피킹", stages: ["picking_wait", "picking"] },
  { key: "pack", label: "포장·출고대기", stages: ["packing_wait", "ship_wait"] },
  { key: "ship", label: "출고·배송중", stages: ["shipped", "in_transit"] },
  { key: "done", label: "배송완료", stages: ["delivered"] },
  { key: "ex", label: "취소·반품", stages: ["cancelled", "return"] },
];

export default function FulfillmentView() {
  const data = useData();
  const risks = useOrderRisks();
  const { customerById, warehouseById } = useLookups();
  const advance = useStore((s) => s.advanceOrder);
  const createPriorityAction = useStore((s) => s.createPriorityAction);
  const role = useStore((s) => s.ui.role);
  const [action, setAction] = useState<AXAction | null>(null);
  const toast = useToast();
  const sp = useSearchParams();
  const [tab, setTab] = useState<"board" | "risk" | "list">((sp.get("tab") as never) || "board");
  const [orderId, setOrderId] = useState<string | null>(sp.get("order"));
  const [q, setQ] = useState("");
  const [wh, setWh] = useState("all");
  useEffect(() => {
    const o = sp.get("order");
    if (o) setOrderId(o);
    const t = sp.get("tab");
    if (t === "risk") setTab("risk");
  }, [sp]);
  const fk = useMemo(() => fulfillmentKpis(data.orders), [data.orders]);
  const riskMap = useMemo(() => new Map(risks.map((r) => [r.order.id, r])), [risks]);
  const orders = useMemo(
    () =>
      data.orders.filter(
        (o) =>
          (wh === "all" || o.warehouseId === wh) &&
          (!q ||
            o.id.toLowerCase().includes(q.toLowerCase()) ||
            customerById.get(o.customerId)?.name.includes(q) ||
            o.items.some((it) => it.name.includes(q))),
      ),
    [data.orders, wh, q, customerById],
  );
  const highRisk = risks.filter((r) => r.level !== "low");
  const canOps = role === "owner" || role === "ops";
  const pickingWaitRisk = risks.filter(
    (r) => r.level === "high" && ["new", "confirmed", "picking_wait"].includes(r.order.stage),
  );
  const coveredByAction = useMemo(
    () =>
      new Set(
        data.actions
          .filter((a) => a.type === "priority_order" && !["done", "dismissed"].includes(a.stage))
          .flatMap((a) => a.related.orderIds ?? []),
      ),
    [data.actions],
  );
  const uncovered = pickingWaitRisk.filter((r) => !coveredByAction.has(r.order.id));
  const makePriorityAction = () => {
    const id = createPriorityAction(uncovered.map((r) => r.order.id));
    if (!id) {
      toast({
        title: "생성할 대상이 없습니다",
        body: "위험 주문이 이미 진행 중인 실행에 포함되어 있습니다.",
        tone: "info",
      });
      return;
    }
    setAction(useStore.getState().data.actions.find((x) => x.id === id) ?? null);
    toast({
      title: "우선처리 실행을 생성했습니다",
      body: "승인하면 해당 주문이 피킹 단계로 전환됩니다.",
      tone: "success",
    });
  };

  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="신규주문" value={num(fk.newOrders)} tone="primary" />
        <KpiCard label="오늘 출고대상" value={num(fk.todayShip)} />
        <KpiCard label="마감임박" value={num(fk.cutoffSoon)} tone="warn" sub="15:00 마감 4시간 이내" />
        <KpiCard
          label="지연위험"
          value={num(highRisk.length)}
          tone={highRisk.length ? "danger" : "good"}
          onClick={() => setTab("risk")}
        />
        {/* 처리량은 보조 지표 — 휴대폰에서는 핵심 6개만 */}
        <div className="hidden lg:block">
          <KpiCard label="피킹 처리량" value={num(fk.pickingThroughput)} sub="오늘" />
        </div>
        <div className="hidden lg:block">
          <KpiCard label="포장 처리량" value={num(fk.packingThroughput)} sub="오늘" />
        </div>
        <KpiCard label="정시출고율" value={pct(fk.onTimeRate, 0)} tone="good" />
        <KpiCard label="평균 처리시간" value={`${fk.avgCycleHours.toFixed(1)}시간`} sub="주문→출고" />
      </div>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Truck size={18} className="text-accent" />
            출고 관제
          </span>
        }
        sub={
          <span>
            구역별 적체와{" "}
            <Term term="주문·출고" desc={TERMS.fulfillment}>
              주문 처리 단계
            </Term>
            를 한눈에 — 구역을 누르면 해당 주문만 봅니다
          </span>
        }
        right={
          <AiReady
            title="배송 지연 위험"
            now="마감·배송약속·구역 적체·재고예외 규칙 점수 (L2 추천)"
            method="규칙 + 통계"
            next="시간대별 처리량 예측으로 마감 초과 확률 계산"
          />
        }
      >
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {data.warehouses.map((w) => (
            <button
              key={w.id}
              onClick={() => setWh(wh === w.id ? "all" : w.id)}
              aria-pressed={wh === w.id}
              className={`rounded-xl border p-3 text-left ${wh === w.id ? "border-primary bg-soft" : "border-line hover:bg-mist"}`}
            >
              <div className="truncate text-[13px] text-muted">{w.name}</div>
              <div className={`font-bold ${w.congestion > 0.7 ? "text-danger" : ""}`}>
                적체 {Math.round(w.congestion * 100)}%
              </div>
              <Meter
                value={w.congestion}
                color={w.congestion > 0.7 ? "#D93A3A" : w.congestion > 0.5 ? "#F47A3C" : "var(--t-primary)"}
                className="mt-1.5"
              />
              <div className="mt-1 text-[13px] text-muted">
                대기{" "}
                {
                  data.orders.filter(
                    (o) =>
                      o.warehouseId === w.id &&
                      ["new", "confirmed", "picking_wait", "picking", "packing_wait", "ship_wait"].includes(
                        o.stage,
                      ),
                  ).length
                }
                건
              </div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "board", label: "상태 보드" },
              { key: "risk", label: "지연위험", count: highRisk.length },
              { key: "list", label: "전체 목록", count: orders.length },
            ]}
            className="flex-1"
          />
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input !min-h-[38px] w-56 pl-9 text-sm"
              placeholder="주문번호·고객·상품"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {tab === "board" && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {COLS.map((c) => {
              const items = orders.filter((o) => c.stages.includes(o.stage));
              return (
                <div key={c.key} className="min-h-[120px] rounded-xl bg-mist p-2">
                  <div className="flex items-center justify-between px-1 py-1 text-sm font-bold">
                    {c.label}
                    <span className="text-xs font-semibold text-muted">{items.length}</span>
                  </div>
                  <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-0.5">
                    {items.slice(0, 30).map((o) => (
                      <OrderMini
                        key={o.id}
                        o={o}
                        risk={riskMap.get(o.id)?.level}
                        name={customerById.get(o.customerId)?.name}
                        onOpen={() => setOrderId(o.id)}
                      />
                    ))}
                    {!items.length && <div className="px-1 py-3 text-xs text-muted">없음</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "risk" && (
          <div className="mt-3">
            {pickingWaitRisk.length > 0 && canOps && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
                <div className="inline-flex items-center gap-2">
                  <AlertTriangle size={16} className="text-danger" />
                  <b>피킹 전 단계 고위험 주문 {pickingWaitRisk.length}건</b> — 마감 전 우선 피킹이 필요합니다.
                </div>
                <div className="flex flex-wrap gap-2">
                  {uncovered.length > 0 && (
                    <button className="btn-outline btn-sm" onClick={makePriorityAction}>
                      <Rocket size={14} />
                      실행 생성 ({uncovered.length}건)
                    </button>
                  )}
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => {
                      pickingWaitRisk.forEach((r) => advance(r.order.id, "picking", "박운영"));
                      toast({
                        title: `${pickingWaitRisk.length}건 우선 피킹 시작`,
                        body: "고객 마이페이지 '상품준비' 반영",
                        tone: "success",
                      });
                    }}
                  >
                    전체 우선처리
                  </button>
                </div>
              </div>
            )}
            {highRisk.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>주문</th>
                      <th>고객</th>
                      <th>구역</th>
                      <th>단계</th>
                      <th>배송약속</th>
                      <th>위험</th>
                      <th>원인</th>
                      <th>
                        <span className="sr-only">작업</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRisk.map((r) => (
                      <tr key={r.order.id} className="row-clickable" onClick={() => setOrderId(r.order.id)}>
                        <td className="whitespace-nowrap font-semibold">
                          {r.order.id}
                          {r.order.customerNotified && <Bell size={12} className="ml-1 inline text-orange" />}
                        </td>
                        <td>{customerById.get(r.order.customerId)?.name}</td>
                        <td className="whitespace-nowrap text-xs">
                          {warehouseById.get(r.order.warehouseId)?.name}
                        </td>
                        <td>
                          <StatusBadge status={r.order.stage} />
                        </td>
                        <td className="whitespace-nowrap text-muted">
                          {fmtDate(r.order.promisedAt, "datetime")}
                        </td>
                        <td>
                          <Badge tone={r.level === "high" ? "danger" : "warn"}>{r.score}</Badge>
                        </td>
                        <td className="max-w-[260px] text-xs text-muted">{r.causes.join(" · ")}</td>
                        <td>
                          {canOps && ["new", "confirmed", "picking_wait"].includes(r.order.stage) && (
                            <button
                              className="btn-outline btn-sm whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                advance(r.order.id, "picking");
                                toast({ title: "우선 피킹 시작", tone: "success" });
                              }}
                            >
                              우선처리
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="지연위험 주문이 없습니다"
                body="마감·배송약속·구역 적체 기준으로 위험이 감지되면 여기에 표시됩니다."
              />
            )}
          </div>
        )}

        {tab === "list" && (
          <div className="table-wrap mt-3">
            <table className="table">
              <thead>
                <tr>
                  <th>주문</th>
                  <th>일시</th>
                  <th>고객</th>
                  <th>상품</th>
                  <th className="text-right">금액</th>
                  <th>구역</th>
                  <th>단계</th>
                  <th>담당</th>
                  <th>배송약속</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 80).map((o) => (
                  <tr key={o.id} className="row-clickable" onClick={() => setOrderId(o.id)}>
                    <td className="whitespace-nowrap font-semibold">{o.id}</td>
                    <td className="whitespace-nowrap text-muted">{relTime(o.createdAt)}</td>
                    <td className="whitespace-nowrap">{customerById.get(o.customerId)?.name}</td>
                    <td className="max-w-[240px] truncate">
                      {o.items[0].name}
                      {o.items.length > 1 ? ` 외 ${o.items.length - 1}` : ""}
                    </td>
                    <td className="text-right tabular-nums">{won(o.total)}</td>
                    <td className="whitespace-nowrap text-xs">
                      {warehouseById.get(o.warehouseId)?.name.split(" ")[0]}
                    </td>
                    <td>
                      <StatusBadge status={o.stage} />
                    </td>
                    <td className="text-muted">{o.assignee ?? "-"}</td>
                    <td className="whitespace-nowrap text-muted">{fmtDate(o.promisedAt, "md")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <details className="card group p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold">
          주문 단계 안내
          <span className="text-[14px] font-semibold text-primary group-open:hidden">펼치기</span>
          <span className="hidden text-[14px] font-semibold text-primary group-open:inline">접기</span>
        </summary>
        <p className="mt-1 text-sm text-muted">
          여기서 단계를 바꾸면 고객 마이페이지에도 같은 시각에 반영됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {(Object.keys(ORDER_STAGE_LABEL) as OrderStage[]).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="mt-2 text-[13px] text-muted">
          고객 화면 표시: 주문접수 → 상품준비 → 출고완료 → 배송중 → 배송완료
        </div>
      </details>

      <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />
      <ActionDrawer
        action={action}
        onClose={() => setAction(null)}
        onOpenOrder={(id) => {
          setAction(null);
          setOrderId(id);
        }}
      />
    </div>
  );
}

function OrderMini({
  o,
  risk,
  name,
  onOpen,
}: {
  o: Order;
  risk?: "high" | "mid" | "low";
  name?: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className={`w-full rounded-lg border bg-white px-2.5 py-2 text-left transition-shadow hover:shadow-card ${risk === "high" ? "border-danger/50" : risk === "mid" ? "border-orange/50" : "border-line"}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[12px] font-bold tabular-nums">{o.id}</span>
        {risk && risk !== "low" && (
          <span className={`h-2 w-2 shrink-0 rounded-full ${risk === "high" ? "bg-danger" : "bg-orange"}`} />
        )}
      </div>
      <div className="mt-0.5 truncate text-xs">
        {o.items[0].name}
        {o.items.length > 1 ? ` 외 ${o.items.length - 1}` : ""}
      </div>
      <div className="mt-0.5 flex justify-between text-[13px] text-muted">
        <span>{name}</span>
        <span>{fmtDate(o.promisedAt, "md")} 약속</span>
      </div>
    </button>
  );
}
