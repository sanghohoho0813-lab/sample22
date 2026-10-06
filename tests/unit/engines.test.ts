import { describe, expect, it } from "vitest";
import {
  assessOrderRisks,
  buildBriefing,
  buildSegments,
  buildSkuInsights,
  compareSuppliers,
  repeatItemsForCustomer,
} from "@/lib/engines";
import type { Order } from "@/lib/types";
import { NOW, demo } from "./fixtures";

const data = demo();
const insights = buildSkuInsights(data);

describe("buildSkuInsights", () => {
  it("SKU마다 하나씩, 우선순위는 0~100", () => {
    expect(insights.length).toBe(data.skus.length);
    for (const i of insights) {
      expect(i.priority).toBeGreaterThanOrEqual(0);
      expect(i.priority).toBeLessThanOrEqual(100);
      expect(i.recommendedQty).toBeGreaterThanOrEqual(0);
    }
  });
  it("가용재고 0이면 품절 계열 상태이고, 판단 근거가 비어 있지 않다", () => {
    for (const i of insights.filter((x) => x.available <= 0)) {
      expect(["stockout", "urgent", "po_progress", "inbound", "po_review"]).toContain(i.status);
    }
    expect(insights.filter((i) => i.status !== "normal").every((i) => i.reasons.length > 0)).toBe(true);
  });
});

describe("compareSuppliers", () => {
  const skuId = data.supplierProducts[0].skuId;
  it("점수 내림차순, 1위만 추천", () => {
    const opts = compareSuppliers(data, skuId);
    expect(opts.length).toBeGreaterThan(0);
    opts.slice(1).forEach((o, i) => expect(opts[i].score).toBeGreaterThanOrEqual(o.score));
    expect(opts.filter((o) => o.recommended)).toHaveLength(1);
    expect(opts[0].recommended).toBe(true);
  });
  it("최저 단가 공급사는 단가 차이 0%", () => {
    const opts = compareSuppliers(data, skuId);
    const cheapest = opts.reduce((a, b) => (a.sp.unitCost <= b.sp.unitCost ? a : b));
    expect(cheapest.costDiffPct).toBe(0);
    expect(cheapest.tradeoffs).toContain("최저 단가");
  });
  it("긴급 모드는 납기 가중치가 커서 리드타임 짧은 쪽이 불리해지지 않는다", () => {
    const urgent = compareSuppliers(data, skuId, "urgent");
    const normal = compareSuppliers(data, skuId, "normal");
    expect(urgent[0].sp.leadTimeDays).toBeLessThanOrEqual(normal[0].sp.leadTimeDays);
  });
});

describe("assessOrderRisks", () => {
  const base = data.orders.find((o) => ["new", "confirmed", "picking", "picking_wait"].includes(o.stage))!;
  const withTimes = (cutoffInH: number, promiseInH: number): Order => ({
    ...base,
    id: "TEST-1",
    stage: "picking",
    riskFlag: false,
    cutoffAt: new Date(NOW.getTime() + cutoffInH * 3600000).toISOString(),
    promisedAt: new Date(NOW.getTime() + promiseInH * 3600000).toISOString(),
  });
  const risksFor = (o: Order) =>
    assessOrderRisks({ ...data, orders: [o] }, NOW).find((r) => r.order.id === o.id)!;

  it("출고 전 단계 주문만 평가하고 점수 내림차순", () => {
    const risks = assessOrderRisks(data, NOW);
    expect(risks.every((r) => !["shipped", "delivered", "cancelled", "return"].includes(r.order.stage))).toBe(
      true,
    );
    risks.slice(1).forEach((r, i) => expect(risks[i].score).toBeGreaterThanOrEqual(r.score));
  });
  it("마감 1시간 미만이면 분 단위로 안내 (0분 대신 최소 1분)", () => {
    expect(risksFor(withTimes(0.3, 72)).causes).toContain("출고마감까지 18분");
    expect(risksFor(withTimes(0.001, 72)).causes).toContain("출고마감까지 1분");
  });
  it("마감 직후는 '출고 마감 시각 지남', 1시간 넘게 지나면 '오늘 마감 경과'", () => {
    expect(risksFor(withTimes(-0.5, 72)).causes).toContain("출고 마감 시각 지남");
    expect(risksFor(withTimes(-2, 72)).causes).toContain("오늘 마감 경과");
  });
  it("점수 구간 → 위험 등급", () => {
    for (const r of assessOrderRisks(data, NOW)) {
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.level).toBe(r.score >= 60 ? "high" : r.score >= 35 ? "mid" : "low");
    }
  });
});

describe("repeatItemsForCustomer", () => {
  it("반복구매 상품만, 도래 임박 순", () => {
    const items = repeatItemsForCustomer(data, data.customers[0].id, NOW);
    expect(items.every((i) => i.product.isRepeatable)).toBe(true);
    items.slice(1).forEach((it, i) => expect(items[i].dueInDays).toBeLessThanOrEqual(it.dueInDays));
  });
  it("현재 구성 재고가 부족하면 대체 구성을 제안 (재고가 있는 경우에만)", () => {
    for (const c of data.customers) {
      for (const it of repeatItemsForCustomer(data, c.id, NOW)) {
        if (it.altSku) {
          expect(it.altSku.productId).toBe(it.product.id);
          expect(it.altSku.id).not.toBe(it.sku.id);
        }
      }
    }
  });
});

describe("buildBriefing", () => {
  const briefing = buildBriefing(data, insights, assessOrderRisks(data, NOW), NOW);
  it("순위는 1부터 연속, 모든 링크는 AX 내부 경로", () => {
    expect(briefing.map((b) => b.rank)).toEqual(briefing.map((_, i) => i + 1));
    expect(briefing.every((b) => b.href.startsWith("/ax/"))).toBe(true);
  });
  it("재구매 브리핑 숫자는 고객 세그먼트와 같다", () => {
    const seg = buildSegments(data).find((s) => s.key === "repeat_due")!;
    const item = briefing.find((b) => b.href === "/ax/customers");
    expect(item?.title).toContain(`${seg.count}명`);
  });
});
