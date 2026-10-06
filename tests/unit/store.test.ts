// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateDemoData } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { NOW } from "./fixtures";

const st = () => useStore.getState();
const availableOf = (skuId: string) => {
  const inv = st().data.inventory.find((i) => i.skuId === skuId)!;
  return inv.onHand - inv.reserved;
};
/** 재고가 충분한 SKU 몇 개 */
const inStockSkus = () =>
  st()
    .data.skus.filter((k) => availableOf(k.id) > 10)
    .map((k) => k.id);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  localStorage.clear();
  useStore.setState({ data: generateDemoData(NOW) });
  st().resetDemo();
});

describe("장바구니", () => {
  it("같은 SKU를 다시 담으면 줄이 늘지 않고 수량이 더해진다", () => {
    const [a] = inStockSkus();
    st().addToCart(a, 2);
    st().addToCart(a, 3);
    expect(st().ui.cart).toEqual([{ skuId: a, qty: 5, selected: true }]);
  });
  it("수량은 1 미만으로 내려가지 않는다", () => {
    const [a] = inStockSkus();
    st().addToCart(a);
    st().updateCartQty(a, 0);
    expect(st().ui.cart[0].qty).toBe(1);
  });
  it("담기는 수요 신호(장바구니 7일)를 올린다", () => {
    const [a] = inStockSkus();
    const before = st().data.demand.find((d) => d.skuId === a)!.cart7d;
    st().addToCart(a);
    expect(st().data.demand.find((d) => d.skuId === a)!.cart7d).toBe(before + 1);
  });
});

describe("placeOrder", () => {
  it("선택한 상품만 주문하고, 주문한 상품만 장바구니에서 빠진다", () => {
    const [a, b] = inStockSkus();
    st().addToCart(a, 1);
    st().addToCart(b, 2);
    st().toggleCartSelect(b, false);
    const order = st().placeOrder({ addressNote: "문 앞" })!;
    expect(order.items.map((i) => i.skuId)).toEqual([a]);
    expect(st().ui.cart.map((c) => c.skuId)).toEqual([b]);
    expect(st().ui.lastOrderId).toBe(order.id);
  });
  it("선택된 상품이 없으면 주문을 만들지 않는다", () => {
    const [a] = inStockSkus();
    st().addToCart(a);
    st().toggleCartSelect(a, false);
    const count = st().data.orders.length;
    expect(st().placeOrder({ addressNote: "" })).toBeNull();
    expect(st().data.orders.length).toBe(count);
  });
  it("주문 즉시 재고가 예약되어 가용재고가 줄어든다", () => {
    const [a] = inStockSkus();
    const before = availableOf(a);
    st().addToCart(a, 3);
    st().placeOrder({ addressNote: "" });
    expect(availableOf(a)).toBe(before - 3);
  });
  it("3만원 이상 무료배송, 미만은 배송비 3,000원", () => {
    const sku = st().data.skus.find((k) => k.salePrice < 30000 && availableOf(k.id) > 5)!;
    st().addToCart(sku.id, 1);
    const small = st().placeOrder({ addressNote: "" })!;
    expect(small.shippingFee).toBe(3000);
    expect(small.total).toBe(small.subtotal + 3000);
    const qty = Math.ceil(30000 / sku.salePrice);
    st().addToCart(sku.id, qty);
    const big = st().placeOrder({ addressNote: "" })!;
    expect(big.subtotal).toBeGreaterThanOrEqual(30000);
    expect(big.shippingFee).toBe(0);
  });
  it("주문번호는 로컬(KST) 날짜를 쓰고 기존 번호와 겹치지 않는다", () => {
    vi.setSystemTime(new Date(2026, 9, 7, 0, 30)); // KST 새벽 — UTC로는 아직 10/6
    const [a] = inStockSkus();
    st().addToCart(a);
    const order = st().placeOrder({ addressNote: "" })!;
    expect(order.id.startsWith("NX261007-")).toBe(true);
    const ids = st().data.orders.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("주문은 증빙 로그를 남기고 Demo 모드로 표시된다 (Live로 위장하지 않음)", () => {
    const [a] = inStockSkus();
    st().addToCart(a);
    const order = st().placeOrder({ addressNote: "" })!;
    const ev = st().data.evidence.find((e) => e.orderId === order.id)!;
    expect(ev.mode).toBe("Demo Evidence");
    expect(ev.source).toBe("demo");
  });
  it("다시 구매(itemsOverride)는 장바구니를 건드리지 않는다", () => {
    const [a, b] = inStockSkus();
    st().addToCart(a);
    const order = st().placeOrder({
      addressNote: "",
      isRepeat: true,
      itemsOverride: [{ skuId: b, qty: 2, selected: true }],
    })!;
    expect(order.isRepeatOrder).toBe(true);
    expect(order.items.map((i) => i.skuId)).toEqual([b]);
    expect(st().ui.cart.map((c) => c.skuId)).toEqual([a]);
  });
});

describe("cancelOrder", () => {
  it("접수 단계 주문은 취소되고 예약 재고가 풀린다", () => {
    const [a] = inStockSkus();
    const before = availableOf(a);
    st().addToCart(a, 2);
    const order = st().placeOrder({ addressNote: "" })!;
    st().cancelOrder(order.id);
    expect(st().data.orders.find((o) => o.id === order.id)!.stage).toBe("cancelled");
    expect(availableOf(a)).toBe(before);
  });
  it("이미 출고된 주문은 취소되지 않는다", () => {
    const shipped = st().data.orders.find((o) => o.stage === "shipped")!;
    st().cancelOrder(shipped.id);
    expect(st().data.orders.find((o) => o.id === shipped.id)!.stage).toBe("shipped");
  });
});

describe("AX 실행 카드", () => {
  it("같은 SKU에 진행 중인 실행 카드가 있으면 중복 생성하지 않는다", () => {
    const skuId = st().data.skus[0].id;
    const first = st().createActionFromSku(skuId);
    const second = st().createActionFromSku(skuId);
    if (first) expect(second).toBeNull();
    expect(
      st().data.actions.filter((a) => a.related.skuId === skuId && !["done", "dismissed"].includes(a.stage))
        .length,
    ).toBeLessThanOrEqual(1);
  });
});

describe("resetDemo", () => {
  it("시연 데이터는 초기화하되 테마·글자 크기·튜토리얼 완료는 유지", () => {
    st().setTheme("navy-gold");
    st().setFontScale("large");
    st().setTutorialDone(true);
    const [a] = inStockSkus();
    st().addToCart(a);
    st().placeOrder({ addressNote: "" });
    st().resetDemo();
    expect(st().ui.cart).toEqual([]);
    expect(st().ui.theme).toBe("navy-gold");
    expect(st().ui.fontScale).toBe("large");
    expect(st().ui.tutorialDone).toBe(true);
    expect(JSON.stringify(st().data)).toBe(JSON.stringify(generateDemoData(NOW)));
  });
});
