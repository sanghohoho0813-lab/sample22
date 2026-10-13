/**
 * 출고 시뮬레이션 — "오늘 못 나갈 주문"을 사고 전에 찾는다.
 *
 * 모델 (현장 운영 방식 그대로):
 * - 물류 구역마다 작업 인원(staff)이 있고, 근무시간(08~18시) 안에서만 작업한다.
 * - 주문 1건의 작업시간 = 기본 + 수량당 시간(중량·부피 상품은 더 김). 구역은 인원만큼 빠르게 처리.
 * - 택배 집하는 매일 15:00(출고마감). 마감 전에 포장까지 끝난 주문만 그날 나간다.
 * - 재고는 대기열 순서대로 배정된다. 배정 못 받은 주문은 입고 전까지 출고 불가.
 *
 * 시드(과거 상태 생성)와 예측(앞으로)이 같은 함수를 쓰므로, 화면의 주문 단계와 예측이 서로 맞는다.
 */
import type { DemoData, Inventory, Order, OrderStage, Warehouse } from "./types";

export const CUTOFF_HOUR = 15;
export const SHIFT_START = 8;
export const SHIFT_END = 18;
/** 주문 1건 작업시간(분) = 기본 + 수량 × 단위시간 (중량·부피는 배수) */
export const WORK = { base: 9, perUnit: 2.5, bulkyFactor: 2 } as const;

export const PRE_SHIP: OrderStage[] = [
  "new",
  "confirmed",
  "picking_wait",
  "picking",
  "packing_wait",
  "ship_wait",
];
export const isPreShip = (s: OrderStage) => PRE_SHIP.includes(s);

/** 단계별 남은 작업 비율 */
const REMAINING_FRACTION: Partial<Record<OrderStage, number>> = {
  new: 1,
  confirmed: 1,
  picking_wait: 1,
  picking: 0.55,
  packing_wait: 0.3,
  ship_wait: 0,
};

export function workMinutes(items: { productId: string; qty: number }[], bulkyOf: (pid: string) => boolean) {
  return (
    WORK.base +
    items.reduce((a, it) => a + it.qty * WORK.perUnit * (bulkyOf(it.productId) ? WORK.bulkyFactor : 1), 0)
  );
}

const at = (base: Date, hour: number, dayOffset = 0) => {
  const t = new Date(base);
  t.setHours(hour, 0, 0, 0);
  return new Date(t.getTime() + dayOffset * 86400000);
};

/** t 이후(포함) 첫 출고마감 시각 */
export function cutoffOnOrAfter(t: Date) {
  const c = at(t, CUTOFF_HOUR);
  return t.getTime() <= c.getTime() ? c : at(t, CUTOFF_HOUR, 1);
}

/** 주문의 출고마감: 접수 시각 이후 첫 마감 */
export const cutoffForCreated = (createdAt: Date) => cutoffOnOrAfter(createdAt);

/** 근무시간 밖이면 다음 근무 시작 시각으로 */
export function toShift(t: Date) {
  const s = at(t, SHIFT_START);
  const e = at(t, SHIFT_END);
  if (t < s) return s;
  if (t >= e) return at(t, SHIFT_START, 1);
  return new Date(t);
}

/** 근무시간 안에서 staff 명이 minutes 분의 일을 끝내는 시각 */
export function finishAfterWork(start: Date, minutes: number, staff: number) {
  if (staff <= 0) return new Date(8.64e15);
  let t = new Date(start);
  let left = minutes / staff; // 실제 경과 분
  for (let guard = 0; guard < 60 && left > 1e-6; guard++) {
    const s = at(t, SHIFT_START);
    const e = at(t, SHIFT_END);
    if (t < s) t = s;
    if (t >= e) {
      t = at(t, SHIFT_START, 1);
      continue;
    }
    const room = (e.getTime() - t.getTime()) / 60000;
    if (left <= room) return new Date(t.getTime() + left * 60000);
    left -= room;
    t = at(t, SHIFT_START, 1);
  }
  return t;
}

/** from~to 사이 근무시간(분) × 인원 */
export function staffMinutesBetween(from: Date, to: Date, staff: number) {
  let total = 0;
  let t = new Date(from);
  for (let guard = 0; guard < 60 && t < to; guard++) {
    const s = at(t, SHIFT_START);
    const e = at(t, SHIFT_END);
    const a = Math.max(t.getTime(), s.getTime());
    const b = Math.min(to.getTime(), e.getTime());
    if (b > a) total += (b - a) / 60000;
    t = at(t, SHIFT_START, 1);
  }
  return total * staff;
}

// ---------- prediction ----------
export type ShipStatus = "ready" | "ok" | "tight" | "late" | "blocked" | "overdue";

export interface ShipPrediction {
  order: Order;
  warehouseId: string;
  /** 남은 작업시간(분) */
  remainingMin: number;
  /** 포장까지 끝나는 예상 시각 */
  readyAt: Date;
  /** 실제 집하(출고) 예상 시각 */
  shipAt: Date;
  cutoffAt: Date;
  /** 마감까지 여유(분) — 음수면 넘김 */
  slackMin: number;
  status: ShipStatus;
  reasons: string[];
  /** 재고가 모자라 출고할 수 없는 SKU */
  shortSkus: string[];
  queuePos: number;
}

export interface ZoneForecast {
  warehouse: Warehouse;
  staff: number;
  pending: number;
  remainingWorkMin: number;
  /** 다음 마감까지 쓸 수 있는 작업시간(분×인원) */
  capacityMin: number;
  /** 필요 작업 ÷ 가능 작업 */
  utilization: number;
  /** 마감 대상 주문을 모두 끝내는 예상 시각 */
  projectedFinish: Date | null;
  late: number;
  tight: number;
  blocked: number;
}

export interface ShipForecast {
  now: Date;
  nextCutoff: Date;
  orders: ShipPrediction[];
  zones: ZoneForecast[];
  /** 다음 마감 대상 주문 중 마감 내 출고 예상 비율 */
  onTimeRate: number;
}

export interface ForecastOptions {
  /** 구역별 인원 가정 (인력 재배치 시뮬레이션) */
  staff?: Record<string, number>;
  /** 우선처리로 볼 주문 */
  priority?: Set<string>;
  bulkyOf: (productId: string) => boolean;
}

export function forecastShipments(data: DemoData, now: Date, opts: ForecastOptions): ShipForecast {
  const nextCutoff = cutoffOnOrAfter(now);
  const pending = data.orders.filter((o) => isPreShip(o.stage));
  const isPriority = (o: Order) => !!o.priority || !!opts.priority?.has(o.id);
  const cutoffOf = (o: Order) => new Date(o.cutoffAt);
  // 처리 순서: 우선처리 → 마감 빠른 순 → 접수 순 (현장 FIFO)
  const queue = [...pending].sort(
    (a, b) =>
      Number(isPriority(b)) - Number(isPriority(a)) ||
      cutoffOf(a).getTime() - cutoffOf(b).getTime() ||
      (a.createdAt < b.createdAt ? -1 : 1),
  );

  // 재고 배정: 대기열 순서대로 보유재고를 나눠 준다
  const stockLeft = new Map<string, number>(data.inventory.map((i: Inventory) => [i.skuId, i.onHand]));
  const inboundEta = new Map(data.inventory.map((i) => [i.skuId, i.inboundEta]));
  const shortByOrder = new Map<string, string[]>();
  for (const o of queue) {
    const short: string[] = [];
    for (const it of o.items) {
      const left = stockLeft.get(it.skuId) ?? 0;
      if (left < it.qty) short.push(it.skuId);
      stockLeft.set(it.skuId, left - it.qty);
    }
    if (short.length) shortByOrder.set(o.id, short);
  }

  const zoneStaff = (w: Warehouse) => opts.staff?.[w.id] ?? w.staff;
  const predictions: ShipPrediction[] = [];
  const zones: ZoneForecast[] = data.warehouses.map((w) => {
    const staff = zoneStaff(w);
    const zq = queue.filter((o) => o.warehouseId === w.id);
    let cursor = new Date(now);
    let remainingWorkMin = 0;
    let projectedFinish: Date | null = null;
    let late = 0;
    let tight = 0;
    let blocked = 0;
    zq.forEach((o, idx) => {
      const short = shortByOrder.get(o.id) ?? [];
      const work = workMinutes(o.items, opts.bulkyOf) * (REMAINING_FRACTION[o.stage] ?? 1);
      const cutoffAt = cutoffOf(o);
      const reasons: string[] = [];
      let readyAt: Date;
      if (short.length) {
        // 재고가 없으면 작업을 시작하지 않는다 (인력을 잡아먹지 않음)
        const etas = short.map((s) => inboundEta.get(s)).filter(Boolean) as string[];
        const eta = etas.length ? new Date(`${etas.sort().reverse()[0]}T10:00:00`) : null;
        readyAt = eta ? finishAfterWork(eta, work, staff) : new Date(now.getTime() + 30 * 86400000);
        reasons.push(eta ? `재고 부족 — 입고 ${etas[0]} 이후 출고` : "재고 부족 — 입고 일정 없음");
        blocked++;
      } else {
        readyAt = work > 0 ? finishAfterWork(cursor, work, staff) : new Date(now);
        if (work > 0) cursor = readyAt;
        remainingWorkMin += work;
        if (cutoffAt.getTime() === nextCutoff.getTime()) projectedFinish = readyAt;
      }
      const shipAt = cutoffOnOrAfter(readyAt < now ? now : readyAt);
      const slackMin = Math.round((cutoffAt.getTime() - readyAt.getTime()) / 60000);
      let status: ShipStatus;
      if (short.length) status = "blocked";
      else if (cutoffAt < now) {
        status = "overdue";
        reasons.unshift("출고마감 지남 (이월 주문)");
      } else if (o.stage === "ship_wait") status = "ready";
      else if (slackMin < 0) {
        status = "late";
        reasons.push(`예상 포장완료 ${hm(readyAt)} — 마감 ${hm(cutoffAt)} 이후`);
      } else if (slackMin < 45) {
        status = "tight";
        reasons.push(`마감 ${slackMin}분 전 포장완료 예상`);
      } else status = "ok";
      if ((status === "late" || status === "tight") && idx > 0)
        reasons.push(`${w.name.split(" ")[0]} 대기열 ${idx + 1}번째`);
      if (status === "late") late++;
      if (status === "tight") tight++;
      if (
        new Date(o.promisedAt) < new Date(shipAt.getTime() + 18 * 3600000) &&
        status !== "ready" &&
        status !== "ok"
      )
        reasons.push("고객 배송약속에 영향");
      predictions.push({
        order: o,
        warehouseId: w.id,
        remainingMin: Math.round(work),
        readyAt,
        shipAt,
        cutoffAt,
        slackMin,
        status,
        reasons,
        shortSkus: short,
        queuePos: idx + 1,
      });
    });
    const capacityMin = staffMinutesBetween(now, nextCutoff, staff);
    const dueWork = zq
      .filter((o) => cutoffOf(o) <= nextCutoff && !shortByOrder.has(o.id))
      .reduce((a, o) => a + workMinutes(o.items, opts.bulkyOf) * (REMAINING_FRACTION[o.stage] ?? 1), 0);
    return {
      warehouse: w,
      staff,
      pending: zq.length,
      remainingWorkMin: Math.round(remainingWorkMin),
      capacityMin: Math.round(capacityMin),
      utilization: capacityMin > 0 ? dueWork / capacityMin : dueWork > 0 ? 9.99 : 0,
      projectedFinish,
      late,
      tight,
      blocked,
    };
  });
  const due = predictions.filter((p) => p.cutoffAt <= nextCutoff);
  const onTime = due.filter((p) => ["ready", "ok", "tight"].includes(p.status)).length;
  return {
    now,
    nextCutoff,
    orders: predictions.sort(
      (a, b) => statusRank(a.status) - statusRank(b.status) || a.slackMin - b.slackMin,
    ),
    zones,
    onTimeRate: due.length ? onTime / due.length : 1,
  };
}

const RANK: Record<ShipStatus, number> = { overdue: 0, blocked: 1, late: 2, tight: 3, ok: 4, ready: 5 };
const statusRank = (s: ShipStatus) => RANK[s];
export const SHIP_STATUS_LABEL: Record<ShipStatus, string> = {
  overdue: "마감 지남",
  blocked: "재고 부족",
  late: "마감 초과 예상",
  tight: "아슬아슬",
  ok: "마감 내 출고",
  ready: "출고 대기",
};
export const isAtRisk = (s: ShipStatus) =>
  s === "overdue" || s === "blocked" || s === "late" || s === "tight";

function hm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 인력 재배치 효과 — 여유 구역에서 병목 구역으로 n명 옮겼을 때 마감 내 출고가 몇 건 늘어나는지.
 * 옮겨 가는 구역에서 새로 늦어지는 주문까지 함께 센다(순효과).
 */
export function staffMoveEffect(
  data: DemoData,
  now: Date,
  move: { from: string; to: string; n: number },
  bulkyOf: (pid: string) => boolean,
) {
  const base = forecastShipments(data, now, { bulkyOf });
  const staff: Record<string, number> = Object.fromEntries(data.warehouses.map((w) => [w.id, w.staff]));
  staff[move.from] = Math.max(0, staff[move.from] - move.n);
  staff[move.to] = staff[move.to] + move.n;
  const after = forecastShipments(data, now, { bulkyOf, staff });
  const missed = (f: ShipForecast) =>
    f.orders.filter((p) => p.cutoffAt <= f.nextCutoff && (p.status === "late" || p.status === "overdue"))
      .length;
  return {
    before: missed(base),
    after: missed(after),
    saved: missed(base) - missed(after),
    beforeZones: base.zones,
    afterZones: after.zones,
  };
}

/** 여유가 가장 큰 구역 → 가장 밀린 구역으로 몇 명 옮기는 게 최선인지 (1~2명 탐색) */
export function suggestStaffMove(data: DemoData, now: Date, bulkyOf: (pid: string) => boolean) {
  const f = forecastShipments(data, now, { bulkyOf });
  const worst = [...f.zones].sort((a, b) => b.late + b.tight * 0.3 - (a.late + a.tight * 0.3))[0];
  if (!worst || worst.late === 0) return null;
  let best: { from: string; to: string; n: number; saved: number; after: number; before: number } | null =
    null;
  for (const z of f.zones) {
    if (z.warehouse.id === worst.warehouse.id || z.staff < 2) continue;
    for (const n of [1, 2]) {
      if (z.staff - n < 1) continue;
      const eff = staffMoveEffect(data, now, { from: z.warehouse.id, to: worst.warehouse.id, n }, bulkyOf);
      if (eff.saved > 0 && (!best || eff.saved > best.saved || (eff.saved === best.saved && n < best.n)))
        best = {
          from: z.warehouse.id,
          to: worst.warehouse.id,
          n,
          saved: eff.saved,
          after: eff.after,
          before: eff.before,
        };
    }
  }
  return best;
}
