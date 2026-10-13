// @vitest-environment jsdom
/**
 * 폐쇄 루프 — 고객 주문 → 재고 예약 → 위험 감지 → 실행(발주·안내·재배치) → 입고·출고 → 고객 화면 → 재구매 측정.
 * 화면이 아니라 저장소 액션과 판단 엔진만으로 한 바퀴를 돌려, 숫자가 서로 이어져 있는지 확인한다.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoData } from "@/lib/types";
import { generateDemoData } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { forecastShipments } from "@/lib/fulfillment";
import { buildSkuInsights } from "@/lib/engines";
import { measureAction } from "@/lib/lifecycle";
import { getLedger } from "@/lib/dataset";
import { marginReport } from "@/lib/margin";
import { DEFAULT_COST_MODEL, isBulky } from "@/lib/costs";
import type { OpsException } from "@/lib/control";
import { NOW } from "./fixtures";

const st = () => useStore.getState();
const inv = (skuId: string) => st().data.inventory.find((i) => i.skuId === skuId)!;
const bulkyOf = (d: DemoData) => {
  const m = new Map(d.products.map((p) => [p.id, isBulky(p)]));
  return (pid: string) => m.get(pid) ?? false;
};

let base: DemoData;
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  base = generateDemoData(NOW);
});
beforeEach(() => {
  vi.setSystemTime(NOW);
  localStorage.clear();
  useStore.setState({ data: base });
  useStore.setState((s) => ({
    ui: { ...s.ui, cart: [], role: "owner", customerId: "c-001", costModel: DEFAULT_COST_MODEL },
  }));
});

describe("주문 → 예약 → 출고 예측 → 출고 → 고객 상태", () => {
  it("고객 주문은 즉시 예약재고가 되고, 출고 시뮬레이션 대기열에 들어가며, 출고하면 보유·예약이 함께 준다", () => {
    const sku = st().data.skus.find((k) => inv(k.id).onHand - inv(k.id).reserved > 20)!;
    const before = { ...inv(sku.id) };
    const order = st().placeOrder({ itemsOverride: [{ skuId: sku.id, qty: 2, selected: true }] })!;
    expect(inv(sku.id).reserved).toBe(before.reserved + 2);
    expect(inv(sku.id).onHand).toBe(before.onHand);

    const f = forecastShipments(st().data, new Date(), { bulkyOf: bulkyOf(st().data) });
    const p = f.orders.find((x) => x.order.id === order.id);
    expect(p).toBeDefined();
    expect(p!.readyAt.getTime()).toBeGreaterThan(NOW.getTime());

    for (const stage of ["confirmed", "picking", "packing_wait", "ship_wait", "shipped"] as const) {
      expect(st().advanceOrder(order.id, stage)).toBe(true);
    }
    expect(inv(sku.id).onHand).toBe(before.onHand - 2);
    expect(inv(sku.id).reserved).toBe(before.reserved);
    // 고객 화면이 읽는 같은 주문 레코드
    expect(st().data.orders.find((o) => o.id === order.id)!.stage).toBe("shipped");
  });
});

describe("품절 위험 → 긴급발주 실행 → 입고 → 성과 측정", () => {
  it("승인하면 발주서·입고예정이 생기고, 입고 처리로 보유재고와 실행 상태가 함께 바뀐다", () => {
    const a = st().data.actions.find((x) => x.type === "urgent_po" && x.stage === "recommended")!;
    expect(a).toBeDefined();
    const skuId = a.related.skuId!;
    const before = { ...inv(skuId) };

    st().setActionStage(a.id, "reviewing");
    expect(st().data.actions.find((x) => x.id === a.id)!.stage).toBe("reviewing");
    st().setActionStage(a.id, "approved");
    const after = st().data.actions.find((x) => x.id === a.id)!;
    expect(after.stage).toBe("requested");
    const po = st().data.purchaseOrders.find((p) => p.id === after.related.poId)!;
    expect(po.status).toBe("requested");
    expect(po.qty).toBeGreaterThan(0);
    expect(inv(skuId).inboundExpected).toBe(before.inboundExpected + po.qty);
    // 활동 기록: 추천 → 담당자 확인 → 승인 → 실행중(입고 대기)
    expect(after.activity!.map((e) => e.to)).toEqual(
      expect.arrayContaining(["reviewing", "approved", "requested"]),
    );

    st().receiveInbound(po.id);
    expect(inv(skuId).onHand).toBe(before.onHand + po.qty);
    const done = st().data.actions.find((x) => x.id === a.id)!;
    expect(done.stage).toBe("done");

    st().setActionStage(a.id, "measured");
    const m = st().data.actions.find((x) => x.id === a.id)!.measurement!;
    expect(m.before).toBe(a.baseline!.display);
    expect(["improved", "unchanged", "worse", "pending"]).toContain(m.verdict);
  });

  it("입고 후 같은 SKU의 판단이 다시 계산된다 (가용재고가 늘어 소진일이 길어진다)", () => {
    const a = st().data.actions.find((x) => x.type === "urgent_po" && x.stage === "recommended")!;
    const skuId = a.related.skuId!;
    const d0 = buildSkuInsights(st().data, NOW).find((i) => i.sku.id === skuId)!.daysOfStock;
    st().setActionStage(a.id, "approved");
    st().receiveInbound(st().data.actions.find((x) => x.id === a.id)!.related.poId!);
    const d1 = buildSkuInsights(st().data, NOW).find((i) => i.sku.id === skuId)!.daysOfStock;
    expect(d1).toBeGreaterThan(d0);
  });
});

describe("출고 위험 → 고객 사전 안내", () => {
  it("승인하면 대상 고객에게 새 도착 예정일 알림이 가고, 주문 이력·배송약속이 바뀐다", () => {
    const a = st().data.actions.find((x) => x.type === "delay_notice" && x.stage === "recommended")!;
    expect(a).toBeDefined();
    const ids = a.related.orderIds!;
    const promisedBefore = new Map(
      st()
        .data.orders.filter((o) => ids.includes(o.id))
        .map((o) => [o.id, o.promisedAt]),
    );
    st().setActionStage(a.id, "approved");
    expect(st().data.actions.find((x) => x.id === a.id)!.stage).toBe("done");
    for (const id of ids) {
      const o = st().data.orders.find((x) => x.id === id)!;
      expect(o.customerNotified).toBe(true);
      expect(o.history.at(-1)!.note).toMatch(/^출고 지연 안내 · 새 도착 예정 \d+\/\d+$/);
      expect(new Date(o.promisedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(promisedBefore.get(id)!).getTime(),
      );
      expect(st().data.notifications.some((n) => n.customerId === o.customerId && n.title.includes(id))).toBe(
        true,
      );
    }
  });
});

describe("출고 병목 → 인력 재배치", () => {
  it("승인하면 구역 인원이 실제로 옮겨지고, 결과에 시뮬레이션 전후가 남는다", () => {
    const a = st().data.actions.find((x) => x.type === "staff_rebalance" && x.stage === "recommended")!;
    expect(a).toBeDefined();
    const mv = a.detail!.staffMove!;
    const staff = (id: string) => st().data.warehouses.find((w) => w.id === id)!.staff;
    const [from0, to0] = [staff(mv.from), staff(mv.to)];
    st().setActionStage(a.id, "approved");
    expect(staff(mv.from)).toBe(from0 - mv.n);
    expect(staff(mv.to)).toBe(to0 + mv.n);
    expect(st().data.actions.find((x) => x.id === a.id)!.result).toMatch(/마감 초과 예상 \d+건 → \d+건/);
  });
});

describe("품절 상품 재입고 알림", () => {
  it("고객 신청은 수요 신호가 되고, 입고 처리 시 그 고객에게 알림이 가며 신청 목록이 비워진다", () => {
    const mask = st().data.skus.find((k) =>
      st()
        .data.products.find((p) => p.id === k.productId)!
        .name.includes("KF94"),
    )!;
    const before = st().data.demand.find((d) => d.skuId === mask.id)!.restockRequests ?? 0;
    st().requestRestock(mask.id);
    st().requestRestock(mask.id); // 같은 고객 중복 신청은 한 번만
    expect(st().data.restockAlerts).toEqual([
      expect.objectContaining({ skuId: mask.id, customerId: "c-001" }),
    ]);
    expect(st().data.demand.find((d) => d.skuId === mask.id)!.restockRequests).toBe(before + 1);

    const po = st().data.purchaseOrders.find((p) => p.skuId === mask.id && p.status !== "received");
    expect(po).toBeDefined();
    st().receiveInbound(po!.id);
    expect(st().data.notifications[0]).toEqual(
      expect.objectContaining({ customerId: "c-001", title: expect.stringContaining("재입고") }),
    );
    expect(st().data.restockAlerts).toEqual([]);
  });
});

describe("재구매 실행 → 실제 주문으로 측정", () => {
  it("노출 승인 후 대상 고객이 그 상품을 주문하면 측정이 '개선'으로, 다른 상품 주문은 세지 않는다", () => {
    const product = st().data.products.find((p) => p.name.includes("프리미엄 물티슈"))!;
    const sku = st().data.skus.find(
      (k) => k.productId === product.id && inv(k.id).onHand - inv(k.id).reserved > 5,
    )!;
    const other = st().data.skus.find(
      (k) => k.productId !== product.id && inv(k.id).onHand - inv(k.id).reserved > 5,
    )!;
    const ex: OpsException = {
      id: "ex-test-repeat",
      kind: "repeat",
      severity: "low",
      title: "테스트",
      subject: "",
      evidence: [],
      impact: { value: 0, unit: "원", label: "", basis: "" },
      weight: 0,
      owner: "cs",
      href: "/ax/customers",
      actionType: "repeat_expose",
      related: { productId: product.id, customerIds: ["c-001"] },
    };
    const id = st().createActionFromException(ex)!;
    st().setActionStage(id, "approved");
    const a1 = st().data.actions.find((x) => x.id === id)!;
    expect(a1.stage).toBe("in_progress");
    expect(
      st().data.notifications.some((n) => n.customerId === "c-001" && n.title.includes(product.name)),
    ).toBe(true);

    vi.setSystemTime(new Date(NOW.getTime() + 3600000));
    st().placeOrder({ itemsOverride: [{ skuId: other.id, qty: 1, selected: true }] });
    expect(measureAction(a1, st().data, getLedger(st().data), new Date()).verdict).toBe("pending");
    st().placeOrder({ itemsOverride: [{ skuId: sku.id, qty: 1, selected: true }], isRepeat: true });
    const m = measureAction(a1, st().data, getLedger(st().data), new Date());
    expect(m.verdict).toBe("improved");
    expect(m.after).toMatch(/^1\/1명/);
  });
});

describe("비용 기준 → 이익 판단", () => {
  it("제휴몰 수수료를 올리면 제휴몰 공헌이익만 그만큼 줄고 매출은 그대로", () => {
    const d = st().data;
    const L = getLedger(d);
    const name = () => "";
    const a = marginReport(d, L, NOW, { days: 30, model: DEFAULT_COST_MODEL, customerName: name });
    const model = {
      ...DEFAULT_COST_MODEL,
      feeRate: { ...DEFAULT_COST_MODEL.feeRate, partner: DEFAULT_COST_MODEL.feeRate.partner + 0.05 },
    };
    const b = marginReport(d, L, NOW, { days: 30, model, customerName: name });
    expect(b.total.revenue).toBe(a.total.revenue);
    const pa = a.byChannel.find((r) => r.key === "partner")!;
    const pb = b.byChannel.find((r) => r.key === "partner")!;
    expect(pb.contribution).toBeLessThan(pa.contribution);
    const app = (r: typeof a) => r.byChannel.find((x) => x.key === "app")!.contribution;
    expect(app(b)).toBeCloseTo(app(a), 0);
  });
});

describe("모든 실행 유형 — 승인 후 같은 지표로 측정", () => {
  it("추천·확인 단계 실행을 모두 승인해도 오류 없이 진행되고, 측정은 실행 전 기준값과 같은 지표를 쓴다", () => {
    const open = st().data.actions.filter((a) => ["recommended", "reviewing"].includes(a.stage));
    expect(new Set(open.map((a) => a.type)).size).toBeGreaterThanOrEqual(5);
    for (const a of open) {
      st().setActionStage(a.id, "approved");
      const now = st().data.actions.find((x) => x.id === a.id)!;
      expect(["requested", "in_progress", "done"]).toContain(now.stage);
      // 시간이 흐른 뒤 측정 (판단 보류 구간을 지나서)
      const later = new Date(NOW.getTime() + 5 * 86400000);
      const m = measureAction(now, st().data, getLedger(st().data), later);
      expect(m.metric.length).toBeGreaterThan(0);
      expect(["improved", "unchanged", "worse", "pending"]).toContain(m.verdict);
      if (a.baseline) expect(m.before).toBe(a.baseline.display);
    }
  });

  it("보류·기각은 사유를 남기고 부수효과(발주·알림)를 만들지 않는다", () => {
    const a = st().data.actions.find((x) => x.type === "urgent_po" && x.stage === "recommended")!;
    const pos = st().data.purchaseOrders.length;
    const notes = st().data.notifications.length;
    st().setActionStage(a.id, "held", { reason: "공급사 단가 재협상 중" });
    const h = st().data.actions.find((x) => x.id === a.id)!;
    expect(h.stage).toBe("held");
    expect(h.activity!.at(-1)!.note).toContain("공급사 단가 재협상 중");
    expect(st().data.purchaseOrders.length).toBe(pos);
    expect(st().data.notifications.length).toBe(notes);
    st().setActionStage(a.id, "dismissed", { reason: "중복" });
    expect(st().data.actions.find((x) => x.id === a.id)!.stage).toBe("dismissed");
  });
});
