import { describe, expect, it } from "vitest";
import { buildSkuInsights, compareSuppliers, repeatItemsForCustomer } from "@/lib/engines";
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
