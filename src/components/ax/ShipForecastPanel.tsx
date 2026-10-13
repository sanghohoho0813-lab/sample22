"use client";
import { useMemo, useState } from "react";
import { BellRing, ChevronRight, Rocket, Users } from "lucide-react";
import type { OpsException } from "@/lib/control";
import {
  SHIP_STATUS_LABEL,
  staffMoveEffect,
  suggestStaffMove,
  type ShipPrediction,
  type ShipStatus,
} from "@/lib/fulfillment";
import { useBulkyOf, useCustomerName, useData, useForecast, useMinute } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import type { AXAction } from "@/lib/types";
import { StatusBadge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/Bits";
import { useToast } from "@/components/shared/Toast";
import { Basis, LoadBar, Pager, usePage } from "./OpsUi";

const hm = (d: Date | null) =>
  d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "-";
const STATUS_CLS: Record<ShipStatus, string> = {
  overdue: "text-danger font-bold",
  blocked: "text-danger font-semibold",
  late: "text-danger font-semibold",
  tight: "text-orange font-semibold",
  ok: "text-muted",
  ready: "text-teal",
};

/** 구역별 처리 예측 + 인력 재배치 시뮬레이터 + 마감 위험 주문 */
export default function ShipForecastPanel({
  zoneFilter,
  onZone,
  onOpenOrder,
  onOpenAction,
}: {
  zoneFilter: string;
  onZone: (id: string) => void;
  onOpenOrder: (id: string) => void;
  onOpenAction: (a: AXAction) => void;
}) {
  const data = useData();
  const now = useMinute();
  const bulkyOf = useBulkyOf();
  const forecast = useForecast();
  const customerName = useCustomerName();
  const role = useStore((s) => s.ui.role);
  const create = useStore((s) => s.createActionFromException);
  const toast = useToast();
  const canOps = role === "owner" || role === "ops";
  const canCs = role === "owner" || role === "cs";

  // 인력 재배치 시뮬레이터
  const suggestion = useMemo(() => suggestStaffMove(data, now, bulkyOf), [data, now, bulkyOf]);
  const [from, setFrom] = useState<string>(suggestion?.from ?? "wh-E");
  const [to, setTo] = useState<string>(suggestion?.to ?? "wh-C");
  const [n, setN] = useState<number>(suggestion?.n ?? 1);
  const fromW = data.warehouses.find((w) => w.id === from);
  const effect = useMemo(
    () =>
      from !== to && fromW && fromW.staff >= n ? staffMoveEffect(data, now, { from, to, n }, bulkyOf) : null,
    [data, now, from, to, n, fromW, bulkyOf],
  );

  // 마감 위험 주문
  const [filter, setFilter] = useState<"risk" | "all">("risk");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const rows = forecast.orders.filter(
    (p) =>
      (zoneFilter === "all" || p.warehouseId === zoneFilter) &&
      (filter === "all" || ["late", "overdue", "blocked", "tight"].includes(p.status)),
  );
  const pg = usePage(rows, 12);
  const covered = new Set(
    data.actions
      .filter(
        (a) =>
          ["priority_order", "delay_notice"].includes(a.type) &&
          !["done", "measured", "dismissed"].includes(a.stage),
      )
      .flatMap((a) => a.related.orderIds ?? []),
  );

  const makeAction = (
    type: "priority_order" | "delay_notice" | "staff_rebalance",
    preds: ShipPrediction[],
  ) => {
    const ids = preds.map((p) => p.order.id);
    const ex: OpsException = {
      id: `ex-manual-${type}`,
      kind: "ship_risk",
      severity: "high",
      title: type === "staff_rebalance" ? "구역 마감 초과 예상" : `선택 주문 ${ids.length}건`,
      subject: "",
      evidence: Array.from(new Set(preds.flatMap((p) => p.reasons))).slice(0, 3),
      impact: { value: ids.length, unit: "건", label: "대상 주문", basis: "출고 시뮬레이션" },
      weight: 0,
      owner: type === "delay_notice" ? "cs" : "ops",
      href: "/ax/fulfillment?tab=forecast",
      actionType: type,
      dueAt: forecast.nextCutoff.toISOString(),
      related: {
        orderIds: ids,
        warehouseId: type === "staff_rebalance" ? to : undefined,
        staffMove: type === "staff_rebalance" ? { from, to, n } : undefined,
      },
    };
    const id = create(ex);
    if (!id) return toast({ title: "실행을 만들 수 없습니다", tone: "info" });
    toast({ title: "실행을 만들었습니다", body: "승인하면 출고 대기열이 다시 계산됩니다.", tone: "success" });
    setSel(new Set());
    const a = useStore.getState().data.actions.find((x) => x.id === id);
    if (a) onOpenAction(a);
  };
  const selected = forecast.orders.filter((p) => sel.has(p.order.id));

  return (
    <div className="space-y-4">
      {/* 구역별 처리 예측 */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>구역</th>
              <th className="text-right">인원</th>
              <th className="text-right">대기</th>
              <th className="text-right">남은 작업</th>
              <th className="text-right">마감까지 가능</th>
              <th className="min-w-[140px]">부하율</th>
              <th className="text-right">포장 완료 예상</th>
              <th className="text-right">마감 위험</th>
            </tr>
          </thead>
          <tbody>
            {forecast.zones.map((z) => (
              <tr
                key={z.warehouse.id}
                className={`row-clickable ${zoneFilter === z.warehouse.id ? "row-selected" : ""}`}
                onClick={() => onZone(zoneFilter === z.warehouse.id ? "all" : z.warehouse.id)}
              >
                <td className="font-semibold">{z.warehouse.name}</td>
                <td className="text-right tabular-nums">
                  {z.staff}명
                  {z.warehouse.staff < z.warehouse.staffPlanned && (
                    <span className="block text-[12px] font-semibold text-danger">
                      정원 {z.warehouse.staffPlanned}
                    </span>
                  )}
                </td>
                <td className="text-right tabular-nums">{z.pending}건</td>
                <td className="text-right tabular-nums">{(z.remainingWorkMin / 60).toFixed(1)}시간</td>
                <td className="text-right tabular-nums">{(z.capacityMin / 60).toFixed(1)}시간</td>
                <td>
                  <div className="flex items-center gap-2">
                    <LoadBar value={z.utilization} />
                    <span
                      className={`w-12 text-right text-[13px] font-semibold tabular-nums ${z.utilization >= 1 ? "text-danger" : ""}`}
                    >
                      {Math.round(z.utilization * 100)}%
                    </span>
                  </div>
                </td>
                <td
                  className={`text-right tabular-nums ${z.projectedFinish && z.projectedFinish > forecast.nextCutoff ? "font-semibold text-danger" : ""}`}
                >
                  {z.projectedFinish
                    ? z.projectedFinish.toDateString() === now.toDateString()
                      ? hm(z.projectedFinish)
                      : `내일 ${hm(z.projectedFinish)}`
                    : "-"}
                </td>
                <td className="text-right text-[13px]">
                  {z.late + z.blocked > 0 ? (
                    <span className="font-semibold text-danger">
                      초과 {z.late}
                      {z.blocked ? ` · 재고부족 ${z.blocked}` : ""}
                    </span>
                  ) : z.tight ? (
                    <span className="text-orange">아슬 {z.tight}</span>
                  ) : (
                    <span className="text-muted">없음</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Basis>
        작업시간 = 주문당 9분 + 수량당 2.5분(중량·부피 상품 2배), 근무 08~18시, 택배 집하 15:00. 구역을 누르면
        그 구역 주문만 봅니다.
      </Basis>

      {/* 인력 재배치 시뮬레이터 */}
      <section className="rounded-2xl border border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 font-bold">
              <Users size={17} className="text-primary" /> 인력 재배치 시뮬레이터
            </h3>
            <p className="text-sm text-muted">
              사고가 나기 전에 — 옮겼을 때 마감 초과가 얼마나 줄어드는지 지금 데이터로 계산합니다.
            </p>
          </div>
          {suggestion && (
            <span className="rounded-lg bg-soft px-2.5 py-1 text-[13px] font-semibold text-primary">
              추천: {data.warehouses.find((w) => w.id === suggestion.from)?.name.split(" ")[0]} {suggestion.n}
              명 → {data.warehouses.find((w) => w.id === suggestion.to)?.name.split(" ")[0]} (초과{" "}
              {suggestion.before}→{suggestion.after}건)
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className="input !min-h-[40px] w-auto"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="보내는 구역"
          >
            {data.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.staff}명)
              </option>
            ))}
          </select>
          <ChevronRight size={16} className="text-muted" />
          <select
            className="input !min-h-[40px] w-auto"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="받는 구역"
          >
            {data.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.staff}명)
              </option>
            ))}
          </select>
          <select
            className="input !min-h-[40px] w-auto"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            aria-label="인원"
          >
            {[1, 2].map((k) => (
              <option key={k} value={k}>
                {k}명
              </option>
            ))}
          </select>
          {effect ? (
            <span className="text-[15px]">
              마감 초과 예상 <b className="tabular-nums">{effect.before}건</b> →{" "}
              <b
                className={`tabular-nums ${effect.after < effect.before ? "text-teal" : effect.after > effect.before ? "text-danger" : ""}`}
              >
                {effect.after}건
              </b>
            </span>
          ) : (
            <span className="text-sm text-danger">
              {from === to ? "다른 구역을 고르세요" : "보내는 구역 인원이 부족합니다"}
            </span>
          )}
          {canOps && effect && effect.saved > 0 && (
            <button className="btn-primary btn-sm ml-auto" onClick={() => makeAction("staff_rebalance", [])}>
              <Rocket size={14} /> 이 안으로 실행 만들기
            </button>
          )}
        </div>
      </section>

      {/* 마감 위험 주문 */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div
            className="inline-flex rounded-lg border border-line p-0.5 text-sm"
            role="group"
            aria-label="주문 범위"
          >
            <button
              className={`rounded-md px-2.5 py-1 ${filter === "risk" ? "bg-soft font-semibold text-primary" : "text-muted"}`}
              aria-pressed={filter === "risk"}
              onClick={() => setFilter("risk")}
            >
              마감 위험만
            </button>
            <button
              className={`rounded-md px-2.5 py-1 ${filter === "all" ? "bg-soft font-semibold text-primary" : "text-muted"}`}
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              미출고 전체
            </button>
          </div>
          {sel.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {canOps && (
                <button className="btn-primary btn-sm" onClick={() => makeAction("priority_order", selected)}>
                  <Rocket size={14} /> 우선처리 실행 ({sel.size})
                </button>
              )}
              {canCs && (
                <button className="btn-outline btn-sm" onClick={() => makeAction("delay_notice", selected)}>
                  <BellRing size={14} /> 고객 사전안내 실행 ({sel.size})
                </button>
              )}
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="마감 위험 주문이 없습니다"
            body="모든 미출고 주문이 다음 마감 안에 포장까지 끝날 것으로 예상됩니다."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <span className="sr-only">선택</span>
                    </th>
                    <th>주문</th>
                    <th>예측</th>
                    <th>구역</th>
                    <th>단계</th>
                    <th className="text-right">포장 완료 예상</th>
                    <th className="text-right">여유</th>
                    <th>원인</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.rows.map((p) => {
                    const pick = !covered.has(p.order.id) && p.status !== "ok" && p.status !== "ready";
                    return (
                      <tr
                        key={p.order.id}
                        className={`row-clickable ${sel.has(p.order.id) ? "row-selected" : ""}`}
                        onClick={() => onOpenOrder(p.order.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          {pick && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[var(--t-primary)]"
                              checked={sel.has(p.order.id)}
                              aria-label={`${p.order.id} 선택`}
                              onChange={(e) => {
                                const s = new Set(sel);
                                if (e.target.checked) s.add(p.order.id);
                                else s.delete(p.order.id);
                                setSel(s);
                              }}
                            />
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-semibold tabular-nums">{p.order.id}</span>
                          {p.order.priority && (
                            <span className="ml-1 text-[12px] font-bold text-primary">우선</span>
                          )}
                          {covered.has(p.order.id) && (
                            <span className="ml-1 text-[12px] text-muted">실행 연결</span>
                          )}
                          <span className="block text-[12px] text-muted">
                            {customerName(p.order.customerId)}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap text-[13px] ${STATUS_CLS[p.status]}`}>
                          {SHIP_STATUS_LABEL[p.status]}
                        </td>
                        <td className="whitespace-nowrap text-[13px]">
                          {data.warehouses.find((w) => w.id === p.warehouseId)?.name.split(" ")[0]}
                        </td>
                        <td>
                          <StatusBadge status={p.order.stage} />
                        </td>
                        <td className="text-right tabular-nums">
                          {p.status === "blocked"
                            ? "-"
                            : p.readyAt.toDateString() === now.toDateString()
                              ? hm(p.readyAt)
                              : fmtDate(p.readyAt.toISOString(), "md") + " " + hm(p.readyAt)}
                        </td>
                        <td className={`text-right tabular-nums ${p.slackMin < 0 ? "text-danger" : ""}`}>
                          {p.status === "blocked"
                            ? "-"
                            : p.slackMin < 0
                              ? `${Math.round(-p.slackMin / 6) / 10}시간 초과`
                              : `${Math.floor(p.slackMin / 60)}:${String(p.slackMin % 60).padStart(2, "0")}`}
                        </td>
                        <td className="max-w-[280px] text-[13px] text-muted">
                          {p.reasons.join(" · ") || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager pg={pg} />
          </>
        )}
      </section>
    </div>
  );
}
