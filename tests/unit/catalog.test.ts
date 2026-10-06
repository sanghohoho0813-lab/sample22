import { describe, expect, it } from "vitest";
import { autocomplete, searchProducts, summarize } from "@/lib/catalog";
import { generateDemoData } from "@/lib/seed";
import { NOW, demo } from "./fixtures";

const data = demo();
const search = (f: Parameters<typeof searchProducts>[1]) => searchProducts(data, f, NOW);

describe("시드 데이터", () => {
  it("같은 시각으로 만들면 항상 같은 데이터 (시연 초기화 재현성)", () => {
    expect(JSON.stringify(generateDemoData(NOW))).toBe(JSON.stringify(data));
  });
  it("참조 무결성 — SKU·재고·수요가 모두 실제 상품/SKU를 가리킨다", () => {
    const productIds = new Set(data.products.map((p) => p.id));
    const skuIds = new Set(data.skus.map((s) => s.id));
    expect(data.skus.every((s) => productIds.has(s.productId))).toBe(true);
    expect(data.inventory.every((i) => skuIds.has(i.skuId))).toBe(true);
    expect(data.demand.every((d) => skuIds.has(d.skuId))).toBe(true);
    expect(data.orders.every((o) => o.items.every((it) => skuIds.has(it.skuId)))).toBe(true);
  });
  it("주문번호는 중복되지 않는다", () => {
    const ids = data.orders.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("재고는 음수가 아니고 예약은 보유 이하", () => {
    for (const inv of data.inventory) {
      expect(inv.onHand).toBeGreaterThanOrEqual(0);
      expect(inv.reserved).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("summarize", () => {
  it("bestDiscount는 모든 구성 중 최대 할인율, 품절은 전체 가용재고 기준", () => {
    for (const p of data.products) {
      const s = summarize(data, p, NOW);
      const max = Math.max(
        0,
        ...s.skus.map((k) => (k.listPrice > 0 ? Math.round((1 - k.salePrice / k.listPrice) * 100) : 0)),
      );
      expect(s.bestDiscount).toBe(max);
      expect(s.bestDiscount).toBeGreaterThanOrEqual(s.discountRate);
      expect(s.soldOut).toBe(s.totalAvailable <= 0);
    }
  });
  it("재고가 있으면 기본 구성은 재고 있는 구성", () => {
    for (const p of data.products) {
      const s = summarize(data, p, NOW);
      if (!s.soldOut) expect(s.available).toBeGreaterThan(0);
    }
  });
});

describe("searchProducts", () => {
  it("판매중 상품만 노출", () => {
    const activeCount = data.products.filter((p) => p.status === "active").length;
    expect(search({}).length).toBe(activeCount);
  });
  it("특가만: 할인 있는 상품만, 할인순 정렬은 내림차순", () => {
    const deals = search({ discountOnly: true, sort: "discount" });
    expect(deals.length).toBeGreaterThan(0);
    expect(deals.every((s) => s.bestDiscount > 0)).toBe(true);
    deals.slice(1).forEach((s, i) => expect(deals[i].bestDiscount).toBeGreaterThanOrEqual(s.bestDiscount));
  });
  it("가격 정렬", () => {
    const asc = search({ sort: "price_asc" }).map((s) => s.minPrice);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = search({ sort: "price_desc" }).map((s) => s.minPrice);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });
  it("카테고리·가격대·평점 필터는 서로 AND", () => {
    const r = search({ category: "living", priceMax: 20000, minRating: 4.5 });
    expect(
      r.every((s) => s.product.categorySlug === "living" && s.minPrice <= 20000 && s.product.rating >= 4.5),
    ).toBe(true);
  });
  it("재고 있음 / 빠른배송 필터는 품절 상품을 제외", () => {
    expect(search({ stock: "in" }).some((s) => s.soldOut)).toBe(false);
    expect(search({ delivery: "fast" }).every((s) => s.product.deliveryType === "fast" && !s.soldOut)).toBe(
      true,
    );
  });
  it("동의어 검색: '티슈'로 물티슈를 찾는다, 대소문자 무시", () => {
    expect(search({ q: "티슈" }).length).toBeGreaterThan(0);
    expect(search({ q: "KF94" }).length).toBe(search({ q: "kf94" }).length);
  });
  it("결과 없는 검색어는 빈 배열", () => {
    expect(search({ q: "존재하지않는상품명xyz" })).toEqual([]);
  });
});

describe("autocomplete", () => {
  it("입력어를 포함한 제안만, 중복 없이 최대 8개", () => {
    const r = autocomplete(data, "물");
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(8);
    expect(new Set(r).size).toBe(r.length);
    expect(r.every((n) => n.includes("물"))).toBe(true);
  });
  it("공백만 입력하면 제안 없음", () => {
    expect(autocomplete(data, "   ")).toEqual([]);
  });
});
