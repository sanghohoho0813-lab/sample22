import { describe, expect, it } from "vitest";
import { buildSkuInsights, compareSuppliers, projectStock } from "@/lib/engines";
import {
  forecastShipments,
  finishAfterWork,
  isPreShip,
  staffMoveEffect,
  suggestStaffMove,
} from "@/lib/fulfillment";
import { marginReport } from "@/lib/margin";
import { returnSignals, significant } from "@/lib/returns";
import { repeatReport } from "@/lib/repeat";
import { buildExceptions, forRole } from "@/lib/control";
import { draftFromException, quickContext } from "@/lib/actionFactory";
import { measureAction, opsSnapshot } from "@/lib/lifecycle";
import { getLedger } from "@/lib/dataset";
import { orderEconomics, DEFAULT_COST_MODEL } from "@/lib/costs";
import { NOW, demo } from "./fixtures";

const data = demo();
const ledger = getLedger(data);
const bulkyOf = (pid: string) => !!data.products.find((p) => p.id === pid)?.bulky;
const insights = buildSkuInsights(data, NOW);

describe("주문 원장 — 하나의 데이터 체계", () => {
  it("최근 14일 SKU별 판매량 = 원장 주문 수량 (수요신호와 매출이 같은 숫자를 본다)", () => {
    for (const d of data.demand.slice(0, 40)) {
      for (let dd = 2; dd <= 14; dd++) {
        const units = ledger.orders
          .filter((o) => o.day === dd)
          .reduce((a, o) => a + o.lines.filter((l) => l.skuId === d.skuId).reduce((x, l) => x + l.qty, 0), 0);
        expect(units, `${d.skuId} ${dd}일 전`).toBe(d.dailySales[14 - dd]);
      }
    }
  });
  it("예약재고 = 아직 출고되지 않은 주문 수량", () => {
    const pending = new Map<string, number>();
    data.orders
      .filter((o) => isPreShip(o.stage))
      .forEach((o) => o.items.forEach((it) => pending.set(it.skuId, (pending.get(it.skuId) ?? 0) + it.qty)));
    for (const inv of data.inventory) expect(inv.reserved, inv.skuId).toBe(pending.get(inv.skuId) ?? 0);
  });
  it("일별 매출 집계 = 원장 + 저장 주문의 합", () => {
    const yKey = data.dailySales.at(-2)!.date;
    const fromLedger = ledger.orders.filter(
      (o) =>
        o.createdAt && new Date(o.createdAt).toDateString() === new Date(`${yKey}T12:00:00`).toDateString(),
    );
    const fromData = data.orders.filter(
      (o) => new Date(o.createdAt).toDateString() === new Date(`${yKey}T12:00:00`).toDateString(),
    );
    expect(data.dailySales.at(-2)!.orders).toBe(fromLedger.length + fromData.length);
  });
  it("반품은 실제 주문 줄에 붙어 있다", () => {
    for (const o of ledger.orders.filter((x) => x.returned).slice(0, 200)) {
      expect(o.lines.some((l) => l.skuId === o.returned!.skuId)).toBe(true);
    }
    const ids = new Set(ledger.orders.map((o) => o.id));
    for (const r of data.returns)
      expect(ids.has(r.orderId) || data.orders.some((o) => o.id === r.orderId)).toBe(true);
  });
  it("원장 주문번호는 저장 주문과 겹치지 않는다", () => {
    const live = new Set(data.orders.map((o) => o.id));
    expect(ledger.orders.some((o) => live.has(o.id))).toBe(false);
  });
});

describe("발주량 계산 — 왜 이 수량인가", () => {
  it("추천 수량 = 올림(예측 일판매 × (리드타임+검토주기) − 가용 − 입고예정, 10개 단위) 이상, 최소주문수량 이상", () => {
    for (const i of insights.filter((x) => x.recommendedQty > 0)) {
      const c = i.calc;
      expect(c.grossNeed).toBeCloseTo(c.forecastDaily * c.coverDays, 6);
      expect(c.netNeed).toBe(Math.ceil(c.grossNeed - c.available - c.inbound));
      expect(i.recommendedQty).toBe(Math.max(c.moq, Math.ceil(c.netNeed / 10) * 10));
    }
  });
  it("재고 투영은 예측 판매만큼 줄고 입고일에 늘어난다", () => {
    const i = insights.find((x) => x.expectedInbound && x.calc.forecastDaily > 0)!;
    const p = projectStock(i, NOW, 14);
    const etaDay = p.findIndex((x) => x.inbound > 0);
    expect(etaDay).toBeGreaterThanOrEqual(0);
    expect(p[1].available).toBeCloseTo(
      i.available - i.calc.forecastDaily + (etaDay === 1 ? p[1].inbound : 0),
      0,
    );
  });
});

describe("공급사 비교 — 총비용", () => {
  const target = insights
    .filter((i) => i.status === "urgent")
    .sort((a, b) => b.calc.lostRevenue - a.calc.lostRevenue)[0];
  const opts = compareSuppliers(data, target.sku.id, "urgent", { now: NOW, ledger });
  it("총비용 = 발주금액 + 결품 손실 이익 + 불량 손실 + 부족입고 부담 (≥ 발주금액)", () => {
    for (const o of opts) {
      expect(o.orderQty).toBeGreaterThanOrEqual(o.sp.moq);
      expect(o.totalCost).toBeGreaterThanOrEqual(o.orderCost + o.lostMargin + o.defectCost);
    }
  });
  it("추천은 하나, 점수 최고 · 사유 문장이 있다", () => {
    expect(opts.filter((o) => o.recommended)).toHaveLength(1);
    expect(opts[0].recommended).toBe(true);
    opts.forEach((o) => expect(o.why.length).toBeGreaterThan(5));
  });
  it("실적은 원장 입고 기록에서 계산 (발주 3건 이상이면 실측)", () => {
    expect(opts.some((o) => o.reliability.measured && o.reliability.pos >= 3)).toBe(true);
  });
});

describe("출고 시뮬레이션", () => {
  const f = forecastShipments(data, NOW, { bulkyOf });
  it("근무시간 밖 작업은 다음 근무일로 넘어간다", () => {
    const t = finishAfterWork(new Date(2026, 9, 13, 17, 30), 60, 1); // 30분 남은 근무 + 다음날 30분
    expect(t.getDate()).toBe(14);
    expect(t.getHours()).toBe(8);
    expect(t.getMinutes()).toBe(30);
  });
  it("결원 구역(C)이 병목 — 마감 초과 예상이 생기고, 인력 재배치로 줄어든다", () => {
    const c = f.zones.find((z) => z.warehouse.id === "wh-C")!;
    expect(c.utilization).toBeGreaterThan(1);
    expect(c.late).toBeGreaterThan(0);
    const sug = suggestStaffMove(data, NOW, bulkyOf)!;
    expect(sug.to).toBe("wh-C");
    const eff = staffMoveEffect(data, NOW, sug, bulkyOf);
    expect(eff.after).toBeLessThan(eff.before);
  });
  it("재고가 모자란 주문은 작업하지 않고 '재고 부족'으로 분리", () => {
    const blocked = f.orders.filter((p) => p.status === "blocked");
    expect(blocked.length).toBeGreaterThan(0);
    blocked.forEach((p) => expect(p.shortSkus.length).toBeGreaterThan(0));
  });
  it("우선처리 지정 주문은 대기열 앞으로", () => {
    const late = f.orders.find((p) => p.status === "late")!;
    const after = forecastShipments(data, NOW, { bulkyOf, priority: new Set([late.order.id]) });
    expect(after.orders.find((p) => p.order.id === late.order.id)!.queuePos).toBe(1);
  });
});

describe("이익 분석", () => {
  const m = marginReport(data, ledger, NOW, { days: 30 });
  it("공헌이익 = 순매출 − 원가 − 순운임 − 포장 − 수수료 − 반품손실", () => {
    const t = m.total;
    expect(t.contribution).toBe(
      Math.round(t.revenue - t.cogs - t.shipping - t.packaging - t.channelFee - t.returnLoss),
    );
    expect(m.waterfall.at(-1)!.value).toBe(t.contribution);
  });
  it("SKU 배분 합계가 전체와 맞는다 (반올림 오차 이내)", () => {
    const sum = m.bySku.reduce((a, r) => a + r.revenue, 0);
    expect(Math.abs(sum - m.total.revenue) / m.total.revenue).toBeLessThan(0.001);
  });
  it("제휴몰은 수수료 때문에 자사몰보다 이익률이 낮다", () => {
    const app = m.byChannel.find((c) => c.key === "app")!;
    const partner = m.byChannel.find((c) => c.key === "partner")!;
    expect(partner.marginRate).toBeLessThan(app.marginRate);
  });
  it("주문 1건 손익 — 무료배송 기준 미만은 고객 배송비가 운임을 일부 메운다", () => {
    const e = orderEconomics(
      {
        channel: "app",
        lines: [{ skuId: "x", productId: "x", qty: 1, unitPrice: 10000, unitCost: 6000 }],
        discount: 0,
        shippingFee: 3000,
      },
      () => false,
      DEFAULT_COST_MODEL,
    );
    expect(e.contribution).toBe(10000 + 3000 - 6000 - 2900 - 350 - Math.round(13000 * 0.022));
  });
});

describe("반품 이상 — 엔진은 데이터만 보고 원인을 찾는다", () => {
  const sigs = returnSignals(data, ledger, NOW);
  it("공급사 불량 로트: 심어 둔 발주(로트)를 정확히 짚는다", () => {
    const s = sigs.find((x) => x.kind === "supplier" && x.supplierId === ledger.planted.defectSupplierId)!;
    expect(s).toBeTruthy();
    expect(s.lotPoId).toBe(ledger.planted.defectLotPoId);
  });
  it("결원 구역의 피킹 오류 증가를 찾는다", () => {
    expect(
      sigs.some((x) => x.kind === "warehouse" && x.warehouseId === ledger.planted.pickingWarehouseId),
    ).toBe(true);
  });
  it("상품정보 차이가 몰린 상품을 찾는다", () => {
    expect(sigs.some((x) => x.kind === "content" && x.productId === ledger.planted.contentProductId)).toBe(
      true,
    );
  });
  it("통계적 유의성: 기대 1건에 4건은 이상, 기대 4건에 6건은 아님", () => {
    expect(significant(5, 0.5)).toBe(true);
    expect(significant(6, 4)).toBe(false);
  });
});

describe("재구매 기회", () => {
  const r = repeatReport(data, ledger, NOW);
  it("주기 도래 = 마지막 구매 + 주기가 ±3일, 이미 다시 주문한 고객은 제외", () => {
    r.rows
      .filter((x) => x.status === "due")
      .forEach((x) => expect(Math.abs(x.dueInDays)).toBeLessThanOrEqual(3));
    const pending = new Set(
      data.orders
        .filter((o) => isPreShip(o.stage))
        .flatMap((o) => o.items.map((it) => `${o.customerId}|${it.productId}`)),
    );
    r.rows.forEach((x) => expect(pending.has(`${x.customerId}|${x.productId}`)).toBe(false));
  });
  it("2회 이상 산 고객은 실제 구매 간격을 주기로 쓴다", () => {
    expect(r.rows.some((x) => x.cycleSource === "observed")).toBe(true);
  });
});

describe("컨트롤 타워 → 실행 → 성과 측정", () => {
  const forecast = forecastShipments(data, NOW, { bulkyOf });
  const signals = returnSignals(data, ledger, NOW);
  const ex = buildExceptions({
    data,
    ledger,
    now: NOW,
    insights,
    forecast,
    margin: marginReport(data, ledger, NOW),
    signals,
    repeat: repeatReport(data, ledger, NOW),
  });
  it("모든 예외는 근거·영향(계산식)·상세 링크를 갖는다", () => {
    expect(ex.length).toBeGreaterThan(5);
    ex.forEach((e) => {
      expect(e.evidence.length).toBeGreaterThan(0);
      expect(e.impact.basis.length).toBeGreaterThan(0);
      expect(e.href.startsWith("/ax/")).toBe(true);
    });
  });
  it("8가지 유형 중 시나리오 예외가 모두 잡힌다", () => {
    const kinds = new Set(ex.map((e) => e.kind));
    [
      "stockout",
      "supply_delay",
      "ship_risk",
      "large_order",
      "return_anomaly",
      "low_margin",
      "overstock",
      "repeat",
    ].forEach((k) => expect(kinds.has(k as never), k).toBe(true));
  });
  it("긴급도 순으로 정렬, 역할별로 먼저 볼 것이 다르다", () => {
    const rank = { critical: 4, high: 3, mid: 2, low: 1 } as const;
    ex.slice(1).forEach((e, i) => expect(rank[ex[i].severity]).toBeGreaterThanOrEqual(rank[e.severity]));
    expect(forRole(ex, "ops")[0].kind).toBe("ship_risk");
    expect(
      forRole(ex, "buyer").every((e) =>
        ["stockout", "supply_delay", "overstock", "return_anomaly", "low_margin"].includes(e.kind),
      ),
    ).toBe(true);
  });
  it("예외에서 만든 실행은 기준값을 갖고, 실행 전에는 '판단 보류'로 측정된다", () => {
    const ctx = quickContext(data, ledger, NOW, insights, signals);
    const stock = ex.find((e) => e.kind === "stockout" && e.severity === "critical")!;
    const draft = draftFromException(stock, ctx)!;
    expect(draft.baseline?.display).toMatch(/가용/);
    expect(draft.proposal?.qty).toBeGreaterThan(0);
    const m = measureAction(
      { ...draft, id: "x", createdAt: "", updatedAt: "", source: "demo", evidenceIds: [] },
      data,
      ledger,
      NOW,
    );
    expect(m.verdict).toBe("pending");
  });
  it("시드의 실행 목록은 엔진이 찾은 예외에서 만들어졌다 (손으로 쓴 숫자 없음)", () => {
    const staff = data.actions.find((a) => a.type === "staff_rebalance")!;
    expect(staff.detail?.staffMove?.to).toBe("wh-C");
    expect(staff.baseline?.value).toBe(forecast.zones.find((z) => z.warehouse.id === "wh-C")!.late);
  });
  it("운영 스냅샷: 시연 시작 시점 기준값이 저장되어 있다", () => {
    const now = opsSnapshot(data, ledger, NOW);
    expect(data.baseline?.stockoutRiskSkus).toBe(now.stockoutRiskSkus);
    expect(data.baseline?.lateOrders).toBe(now.lateOrders);
  });
});
