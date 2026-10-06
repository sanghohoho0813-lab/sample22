import { describe, expect, it } from "vitest";
import { buildSkuInsights } from "@/lib/engines";
import { DEMO_THROUGHPUT_BASE, dashboardKpis, fulfillmentKpis, safeDiv, sumRange } from "@/lib/kpi";
import type { Order } from "@/lib/types";
import { NOW, demo } from "./fixtures";

const data = demo();

describe("safeDiv", () => {
  it("0으로 나누면 0 (NaN·Infinity가 화면에 나가지 않도록)", () => {
    expect(safeDiv(5, 0)).toBe(0);
    expect(safeDiv(6, 3)).toBe(2);
  });
});

describe("dashboardKpis", () => {
  const k = dashboardKpis(data, buildSkuInsights(data));
  it("모든 지표가 유한한 숫자", () => {
    for (const [key, v] of Object.entries(k)) expect(Number.isFinite(v), key).toBe(true);
  });
  it("비율 지표는 0~1 범위", () => {
    for (const key of [
      "marginRate",
      "stockoutRate",
      "returnRate",
      "actionExecRate",
      "conversionRate",
    ] as const) {
      expect(k[key], key).toBeGreaterThanOrEqual(0);
      expect(k[key], key).toBeLessThanOrEqual(1);
    }
  });
  it("30일 매출은 일별 매출 최근 30일 합", () => {
    expect(k.revenue30).toBe(sumRange(data, 30).revenue);
  });
});

describe("fulfillmentKpis", () => {
  const shippedAt = (at: Date): Order => {
    const o = data.orders[0];
    return {
      ...o,
      id: "T-SHIP",
      stage: "shipped",
      history: [...o.history, { at: at.toISOString(), stage: "shipped", actor: "test" }],
    };
  };
  it("'오늘 출고'는 KST 날짜 기준 — 새벽 출고도 오늘로 센다", () => {
    const now = new Date(2026, 9, 6, 8, 0);
    const early = shippedAt(new Date(2026, 9, 6, 0, 30)); // UTC로는 10/5
    expect(fulfillmentKpis([early], now).shippedToday).toBe(1);
    const yesterday = shippedAt(new Date(2026, 9, 5, 23, 30));
    expect(fulfillmentKpis([yesterday], now).shippedToday).toBe(0);
  });
  it("주문이 없어도 0으로 안전하게 계산", () => {
    const k = fulfillmentKpis([], NOW);
    expect(k).toMatchObject({ newOrders: 0, onTimeRate: 0, avgCycleHours: 0, shippedToday: 0 });
    expect(k.pickingThroughput).toBe(DEMO_THROUGHPUT_BASE.picking);
  });
});
