"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Truck, Search } from "lucide-react";
import { useCustomerName, useData, useForecast, useLedger, useLookups, useMinute } from "@/lib/hooks";
import { isPreShip } from "@/lib/fulfillment";
import ShipForecastPanel from "./ShipForecastPanel";
import { StatusCell } from "./OpsUi";
import { ORDER_STAGE_LABEL } from "@/lib/store";
import { fmtDate, relTime, won } from "@/lib/format";
import type { Order, OrderStage } from "@/lib/types";
import { StatusBadge } from "@/components/shared/Badge";
import { Tabs, Term, AiReady } from "@/components/shared/Bits";
import { Panel } from "./Widgets";
import { OrderDrawer, ActionDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";

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
  const ledger = useLedger();
  const now = useMinute();
  const forecast = useForecast();
  const customerName = useCustomerName();
  const { warehouseById } = useLookups();
  const [action, setAction] = useState<AXAction | null>(null);
  const sp = useSearchParams();
  const initialTab = (sp.get("tab") === "risk" ? "forecast" : sp.get("tab")) as
    "forecast" | "board" | "list" | null;
  const [tab, setTab] = useState<"forecast" | "board" | "list">(initialTab ?? "forecast");
  const [orderId, setOrderId] = useState<string | null>(sp.get("order"));
  const [q, setQ] = useState("");
  const [wh, setWh] = useState(sp.get("zone") ?? "all");
  useEffect(() => {
    const o = sp.get("order");
    if (o) setOrderId(o);
    const t = sp.get("tab");
    if (t === "risk" || t === "forecast") setTab("forecast");
    else if (t === "board" || t === "list") setTab(t);
    const z = sp.get("zone");
    if (z) setWh(z);
  }, [sp]);
  const predMap = useMemo(() => new Map(forecast.orders.map((p) => [p.order.id, p])), [forecast]);
  const orders = useMemo(
    () =>
      data.orders.filter(
        (o) =>
          (wh === "all" || o.warehouseId === wh) &&
          (!q ||
            o.id.toLowerCase().includes(q.toLowerCase()) ||
            customerName(o.customerId).includes(q) ||
            o.items.some((it) => it.name.includes(q))),
      ),
    [data.orders, wh, q, customerName],
  );
  // 최근 30일 정시 출고율 — 원장 출고 기록 기준
  const onTime30 = useMemo(() => {
    const recent = ledger?.orders.filter((o) => o.day <= 30) ?? [];
    return recent.length ? 1 - recent.filter((o) => o.shipLate).length / recent.length : 1;
  }, [ledger]);
  const due = forecast.orders.filter((p) => p.cutoffAt <= forecast.nextCutoff);
  const late = due.filter((p) => p.status === "late").length;
  const blocked = due.filter((p) => p.status === "blocked").length;
  const overdue = due.filter((p) => p.status === "overdue").length;
  const pending = data.orders.filter((o) => isPreShip(o.stage));
  const minsLeft = Math.max(0, Math.round((forecast.nextCutoff.getTime() - now.getTime()) / 60000));

  return (
    <div className="space-y-4">
      <section
        aria-label="출고 현황"
        className="card grid grid-cols-2 sm:grid-cols-3 sm:divide-x xl:grid-cols-5"
      >
        <StatusCell
          label={`다음 출고마감 ${String(forecast.nextCutoff.getHours()).padStart(2, "0")}:00`}
          value={`${Math.floor(minsLeft / 60)}시간 ${minsLeft % 60}분`}
          sub={forecast.nextCutoff.toDateString() === now.toDateString() ? "오늘 집하" : "내일 집하"}
        />
        <StatusCell
          label="미출고 주문"
          value={`${pending.length.toLocaleString()}건`}
          sub={`우선처리 ${pending.filter((o) => o.priority).length}건`}
        />
        <StatusCell
          label="마감 내 출고 예상"
          value={`${Math.round(forecast.onTimeRate * 100)}%`}
          sub={`대상 ${due.length}건 (시뮬레이션)`}
          tone={forecast.onTimeRate < 0.9 ? "danger" : forecast.onTimeRate < 0.97 ? "warn" : "good"}
        />
        <StatusCell
          label="마감 위험"
          value={`${late + blocked + overdue}건`}
          sub={`초과 예상 ${late} · 재고부족 ${blocked} · 이월 ${overdue}`}
          tone={late + blocked + overdue ? "danger" : "good"}
        />
        <StatusCell
          label="정시 출고율 (30일)"
          value={`${(onTime30 * 100).toFixed(1)}%`}
          sub="원장 출고 기록 기준"
        />
      </section>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Truck size={18} className="text-accent" />
            출고 관제
          </span>
        }
        sub={
          <span>
            지금 대기열과 인원으로 계산한{" "}
            <Term
              term="출고 예측"
              desc="구역별 인원 × 남은 근무시간과 주문별 작업시간으로, 각 주문이 몇 시에 포장까지 끝나는지 계산합니다."
            >
              출고 예측
            </Term>{" "}
            — 문제가 생기기 전에 인원·순서·고객 안내를 조정합니다
          </span>
        }
        right={
          <AiReady
            title="출고 예측"
            now="구역 인원·근무시간·작업시간 시뮬레이션 (L2 추천, 사람이 승인)"
            method="이산 시뮬레이션 + 재고 배정"
            next="시간대별 실제 처리 속도를 학습해 작업시간 자동 보정"
          />
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "forecast", label: "출고 예측", count: late + blocked + overdue },
              { key: "board", label: "상태 보드" },
              { key: "list", label: "전체 목록", count: orders.length },
            ]}
            className="flex-1"
          />
          {tab !== "forecast" && (
            <>
              <select
                className="input !min-h-[38px] w-auto text-sm"
                value={wh}
                onChange={(e) => setWh(e.target.value)}
                aria-label="구역"
              >
                <option value="all">전체 구역</option>
                {data.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input !min-h-[38px] w-56 pl-9 text-sm"
                  placeholder="주문번호·고객·상품"
                  aria-label="주문 검색"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {tab === "forecast" && (
          <div className="mt-4">
            <ShipForecastPanel
              zoneFilter={wh}
              onZone={setWh}
              onOpenOrder={setOrderId}
              onOpenAction={setAction}
            />
          </div>
        )}

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
                    {items.slice(0, 40).map((o) => {
                      const pr = predMap.get(o.id);
                      return (
                        <OrderMini
                          key={o.id}
                          o={o}
                          risk={
                            pr && ["late", "overdue", "blocked"].includes(pr.status)
                              ? "high"
                              : pr?.status === "tight"
                                ? "mid"
                                : undefined
                          }
                          name={customerName(o.customerId)}
                          onOpen={() => setOrderId(o.id)}
                        />
                      );
                    })}
                    {items.length > 40 && (
                      <div className="px-1 py-2 text-center text-xs text-muted">
                        외 {items.length - 40}건 — 전체 목록에서 검색
                      </div>
                    )}
                    {!items.length && <div className="px-1 py-3 text-xs text-muted">없음</div>}
                  </div>
                </div>
              );
            })}
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
                {orders.slice(0, 120).map((o) => (
                  <tr key={o.id} className="row-clickable" onClick={() => setOrderId(o.id)}>
                    <td className="whitespace-nowrap font-semibold">{o.id}</td>
                    <td className="whitespace-nowrap text-muted">{relTime(o.createdAt)}</td>
                    <td className="whitespace-nowrap">{customerName(o.customerId)}</td>
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
