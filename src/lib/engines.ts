// Rule / statistical / optimization engines. No LLM here — everything explainable.
import { dateKey } from "./format";
import type { Ledger } from "./ledger";
import { supplierPerformance } from "./procurement";
import { memoLast } from "./memo";
import type {
  AXAction,
  DemandSignal,
  DemoData,
  Inventory,
  Product,
  SKU,
  Supplier,
  SupplierProduct,
} from "./types";

export type StockStatus =
  | "normal"
  | "rising"
  | "low"
  | "stockout"
  | "urgent"
  | "po_review"
  | "po_progress"
  | "inbound"
  | "overstock"
  | "slow";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  normal: "정상",
  rising: "관심상승",
  low: "품절임박",
  stockout: "품절",
  urgent: "긴급발주",
  po_review: "발주검토",
  po_progress: "발주진행",
  inbound: "입고예정",
  overstock: "과잉",
  slow: "저회전",
};

export interface OrderCalc {
  /** 최근 7일 일평균 판매 */
  avgDaily: number;
  /** 수요 추세 반영 배수 (증가분의 절반만 반영 — 과잉발주 방지) */
  trendFactor: number;
  forecastDaily: number;
  leadTimeDays: number;
  /** 검토 주기 — 다음 발주 검토까지 버틸 일수 */
  reviewDays: number;
  coverDays: number;
  /** 필요 수량 = 예측 일판매 × (리드타임 + 검토주기) */
  grossNeed: number;
  available: number;
  /** 커버 기간 안에 들어오는 입고 예정 */
  inbound: number;
  netNeed: number;
  moq: number;
  /** 발주 단위 (10개) 올림 + 최소주문수량 */
  recommendedQty: number;
  /** 지금 발주해도 입고 전까지 비는 일수 */
  gapDays: number;
  /** 아무것도 안 하면 놓치는 판매 (개·원) — 추정 노출액 */
  lostUnits: number;
  lostRevenue: number;
}

export interface SkuInsight {
  sku: SKU;
  product: Product;
  inv: Inventory;
  demand: DemandSignal;
  available: number;
  avgDaily: number;
  daysOfStock: number; // Infinity when no sales
  demandTrend: number; // ratio change 7d vs prev (e.g. 0.65 = +65%)
  searchTrend: number;
  cartTrend: number;
  safetyStock: number;
  shortage: number; // vs safety stock
  leadTimeDays: number;
  status: StockStatus;
  priority: number; // 0-100
  recommendedQty: number;
  reasons: string[];
  expectedInbound: { qty: number; eta?: string } | null;
  marginRate: number;
  stockValue: number;
  hasOpenAction: boolean;
  /** 추천 발주량이 왜 이 수량인지 */
  calc: OrderCalc;
  /** 60일치를 넘는 재고의 원가 (묶인 돈) */
  excessValue: number;
}

const pct = (cur: number, prev: number) => (prev <= 0 ? (cur > 0 ? 1 : 0) : (cur - prev) / prev);
export const REVIEW_DAYS = 7;
export const ORDER_PACK = 10;
export const EXCESS_COVER_DAYS = 60;

export const buildSkuInsights = (data: DemoData, now: Date = new Date()) => buildSkuInsightsMemo(data, now);
const buildSkuInsightsMemo = memoLast(buildSkuInsightsRaw);

function buildSkuInsightsRaw(data: DemoData, now: Date): SkuInsight[] {
  const bySku = new Map(data.demand.map((d) => [d.skuId, d]));
  const invBySku = new Map(data.inventory.map((i) => [i.skuId, i]));
  const prodById = new Map(data.products.map((p) => [p.id, p]));
  const supById = new Map(data.suppliers.map((s) => [s.id, s]));
  const leadBySp = new Map(
    data.supplierProducts.map((sp) => [`${sp.skuId}|${sp.supplierId}`, sp.leadTimeDays]),
  );
  const openActionSkus = new Set(
    data.actions
      .filter((a) => !["done", "measured", "dismissed"].includes(a.stage))
      .map((a) => a.related.skuId)
      .filter(Boolean),
  );
  const openPoSkus = new Map<string, "requested" | "confirmed" | "in_transit">();
  data.purchaseOrders.forEach((po) => {
    if (["requested", "confirmed", "in_transit"].includes(po.status))
      openPoSkus.set(po.skuId, po.status as never);
  });

  return data.skus.map((sku) => {
    const product = prodById.get(sku.productId)!;
    const inv = invBySku.get(sku.id)!;
    const demand = bySku.get(sku.id)!;
    const available = Math.max(0, inv.onHand - inv.reserved);
    const last7 = demand.dailySales.slice(7);
    const avgDaily = last7.reduce((a, c) => a + c, 0) / 7;
    const daysOfStock = avgDaily > 0 ? available / avgDaily : Infinity;
    const demandTrend = pct(demand.order7d, demand.orderPrev7d);
    const searchTrend = pct(demand.search7d, demand.searchPrev7d);
    const cartTrend = pct(demand.cart7d, demand.cartPrev7d);
    const supplier = supById.get(sku.primarySupplierId);
    const leadTimeDays = leadBySp.get(`${sku.id}|${sku.primarySupplierId}`) ?? supplier?.leadTimeDays ?? 5;
    const safetyStock = Math.ceil(avgDaily * (leadTimeDays * 0.6 + 2));
    const shortage = Math.max(0, safetyStock - available);
    const expectedInbound =
      inv.inboundExpected > 0 ? { qty: inv.inboundExpected, eta: inv.inboundEta } : null;
    const etaDays = expectedInbound?.eta
      ? Math.max(0, (new Date(`${expectedInbound.eta}T10:00:00`).getTime() - now.getTime()) / 86400000)
      : null;
    const marginRate = sku.salePrice > 0 ? (sku.salePrice - sku.cost) / sku.salePrice : 0;
    const stockValue = inv.onHand * sku.cost;
    const poStatus = openPoSkus.get(sku.id);

    // ---- 발주량 계산 (화면의 "왜 이 수량인가"와 같은 식) ----
    const trendFactor = 1 + Math.min(1, Math.max(0, demandTrend)) * 0.5;
    const forecastDaily = avgDaily * trendFactor;
    const coverDays = leadTimeDays + REVIEW_DAYS;
    const grossNeed = forecastDaily * coverDays;
    const inboundInWindow =
      expectedInbound && etaDays !== null && etaDays <= coverDays ? expectedInbound.qty : 0;
    const netNeed = Math.ceil(grossNeed - available - inboundInWindow);
    // 지금 발주해도 리드타임 동안 비는 날 — 입고 예정분이 먼저 들어오면 그만큼 메워진다
    const coveredDays = forecastDaily > 0 ? available / forecastDaily : Infinity;
    const inboundCovers =
      expectedInbound && etaDays !== null && etaDays <= coveredDays + 0.5
        ? expectedInbound.qty / Math.max(forecastDaily, 0.01)
        : 0;
    const gapDays = forecastDaily > 0 ? Math.max(0, leadTimeDays - coveredDays - inboundCovers) : 0;
    const lostUnits = Math.round(forecastDaily * gapDays);

    const reasons: string[] = [];
    let status: StockStatus = "normal";
    let priority = 0;

    if (available <= 0 && avgDaily > 0) {
      status = "stockout";
      priority = 95;
      reasons.push(
        inv.reserved > inv.onHand
          ? `가용재고 0 — 주문 ${inv.reserved - inv.onHand}개 재고 부족`
          : "가용재고 0",
      );
    } else if (daysOfStock < leadTimeDays) {
      status = "urgent";
      priority = 90 - Math.min(20, daysOfStock * 4);
      reasons.push(`예상 소진 ${daysOfStock.toFixed(1)}일 < 공급 리드타임 ${leadTimeDays}일`);
    } else if (daysOfStock < leadTimeDays * 1.8) {
      status = "low";
      priority = 60;
      reasons.push(`예상 소진 ${daysOfStock.toFixed(1)}일 (리드타임 ${leadTimeDays}일)`);
    } else if (demandTrend > 0.3 && daysOfStock < leadTimeDays * 3) {
      status = "rising";
      priority = 45;
      reasons.push(`최근 7일 주문 ${Math.round(demandTrend * 100)}% 증가`);
    } else if (daysOfStock > 180 && inv.onHand > 20) {
      status = "slow";
      priority = 35;
      reasons.push(`재고일수 ${Math.round(daysOfStock)}일 (저회전)`);
    } else if (daysOfStock > 75 && inv.onHand > 20) {
      status = "overstock";
      priority = 25;
      reasons.push(`재고일수 ${Math.round(daysOfStock)}일`);
    }

    if (expectedInbound && ["stockout", "urgent", "low"].includes(status)) {
      const eDays = etaDays ?? leadTimeDays;
      if (eDays <= daysOfStock + 0.5) {
        status = "inbound";
        priority = Math.max(15, priority - 50);
        reasons.push(`입고예정 ${expectedInbound.qty}개 (${expectedInbound.eta ?? "일정 확인"})`);
      } else {
        reasons.push(`입고예정 ${expectedInbound.qty}개가 소진 이후 도착 (${expectedInbound.eta})`);
        priority += 5;
      }
    }
    if (poStatus && status !== "inbound" && ["urgent", "low", "stockout"].includes(status)) {
      status = "po_progress";
      priority = Math.max(20, priority - 30);
    }
    if (demandTrend > 0.3) reasons.push(`주문 ${Math.round(demandTrend * 100)}% 증가`);
    if (searchTrend > 0.3) reasons.push(`검색 ${Math.round(searchTrend * 100)}% 증가`);
    if (cartTrend > 0.3) reasons.push(`장바구니 ${Math.round(cartTrend * 100)}% 증가`);
    if ((demand.restockRequests ?? 0) > 0) reasons.push(`재입고 알림 신청 ${demand.restockRequests}명`);
    if (demandTrend < -0.25 && ["slow", "overstock"].includes(status))
      reasons.push(`주문 ${Math.round(-demandTrend * 100)}% 감소`);

    const recommendedQty =
      ["urgent", "low", "stockout", "rising"].includes(status) && netNeed > 0
        ? Math.max(sku.moq, Math.ceil(netNeed / ORDER_PACK) * ORDER_PACK)
        : 0;

    if (reasons.length === 0)
      reasons.push(`재고일수 ${daysOfStock === Infinity ? "-" : Math.round(daysOfStock)}일, 정상 범위`);

    const excessUnits = Math.max(0, inv.onHand - inv.reserved - avgDaily * EXCESS_COVER_DAYS);
    return {
      sku,
      product,
      inv,
      demand,
      available,
      avgDaily,
      daysOfStock,
      demandTrend,
      searchTrend,
      cartTrend,
      safetyStock,
      shortage,
      leadTimeDays,
      status,
      priority: Math.round(Math.min(100, priority)),
      recommendedQty,
      reasons,
      expectedInbound,
      marginRate,
      stockValue,
      hasOpenAction: openActionSkus.has(sku.id),
      calc: {
        avgDaily,
        trendFactor,
        forecastDaily,
        leadTimeDays,
        reviewDays: REVIEW_DAYS,
        coverDays,
        grossNeed,
        available,
        inbound: inboundInWindow,
        netNeed,
        moq: sku.moq,
        recommendedQty,
        gapDays,
        lostUnits,
        lostRevenue: lostUnits * sku.salePrice,
      },
      excessValue: Math.round(excessUnits * sku.cost),
    };
  });
}

/** 지금부터 days일 동안의 가용재고 예상 (입고 예정·지금 발주 시 입고 포함) */
export function projectStock(
  ins: SkuInsight,
  now: Date,
  days = 21,
  orderQty = 0,
  orderLead = ins.leadTimeDays,
) {
  const out: { day: number; available: number; inbound: number }[] = [];
  let stock = ins.available;
  const etaDay = ins.expectedInbound?.eta
    ? Math.round((new Date(`${ins.expectedInbound.eta}T10:00:00`).getTime() - now.getTime()) / 86400000)
    : null;
  for (let d = 0; d <= days; d++) {
    let inbound = 0;
    if (d > 0) stock -= ins.calc.forecastDaily;
    if (etaDay !== null && d === Math.max(0, etaDay)) inbound += ins.expectedInbound!.qty;
    if (orderQty > 0 && d === orderLead) inbound += orderQty;
    stock += inbound;
    out.push({ day: d, available: Math.round(stock * 10) / 10, inbound });
  }
  return out;
}

// ---------- Supplier decision ----------
export interface SupplierOption {
  supplier: Supplier;
  sp: SupplierProduct;
  score: number;
  expectedArrival: string;
  tradeoffs: string[];
  recommended: boolean;
  costDiffPct: number;
  /** 최소주문수량을 반영한 실제 발주 수량 */
  orderQty: number;
  orderCost: number;
  /** 실적 지연을 반영한 예상 도착 (일) */
  expectedDays: number;
  /** 도착 전까지 비는 일수 → 놓치는 이익 */
  gapDays: number;
  lostMargin: number;
  /** 실적 불량률 × 발주 원가 */
  defectCost: number;
  /** 필요량을 넘는 수량 (최소주문수량 때문) */
  excessQty: number;
  /** 총 소요 비용 = 발주금액 + 결품 손실 이익 + 예상 불량 손실 */
  totalCost: number;
  reliability: {
    onTimeRate: number;
    avgDelayDays: number;
    fillRate: number;
    defectRate: number;
    pos: number;
    measured: boolean;
  };
  /** 추천 사유 또는 탈락 사유 한 문장 */
  why: string;
}

export function compareSuppliers(
  data: DemoData,
  skuId: string,
  mode: "urgent" | "normal" | "overstock" = "normal",
  opts: { now?: Date; ledger?: Ledger | null; qty?: number } = {},
): SupplierOption[] {
  const now = opts.now ?? new Date();
  const options = data.supplierProducts.filter((sp) => sp.skuId === skuId);
  const sku = data.skus.find((s) => s.id === skuId);
  if (!sku || !options.length) return [];
  const ins = buildSkuInsights(data, now).find((i) => i.sku.id === skuId)!;
  const perf = supplierPerformance(data, opts.ledger ?? null, now);
  const supById = new Map(data.suppliers.map((s) => [s.id, s]));
  const need = Math.max(
    1,
    opts.qty ?? (ins.calc.netNeed > 0 ? ins.calc.netNeed : Math.max(sku.moq, ins.recommendedQty)),
  );
  const unitMargin = Math.max(0, sku.salePrice - sku.cost);
  const minCost = Math.min(...options.map((o) => o.unitCost));
  const coveredDays = ins.calc.forecastDaily > 0 ? ins.available / ins.calc.forecastDaily : Infinity;
  const scored = options.map((sp) => {
    const s = supById.get(sp.supplierId)!;
    const pf = perf.get(s.id)!;
    const orderQty = Math.max(sp.moq, Math.ceil(need / ORDER_PACK) * ORDER_PACK);
    const orderCost = orderQty * sp.unitCost;
    const expectedDays = sp.leadTimeDays + (1 - pf.onTimeRate) * (pf.avgDelayDays || 2);
    const gapDays = Number.isFinite(coveredDays) ? Math.max(0, expectedDays - coveredDays) : 0;
    const lostMargin = Math.round(ins.calc.forecastDaily * gapDays * unitMargin);
    const defectCost = Math.round(orderQty * pf.defectRate * sp.unitCost);
    const excessQty = Math.max(0, orderQty - need);
    // 과잉재고 상황에서는 남는 수량의 보관비(월 2%)도 비용
    const holding = mode === "overstock" ? Math.round(excessQty * sp.unitCost * 0.02) : 0;
    const shortfallCost = Math.round(orderCost * (1 - pf.fillRate) * 0.3); // 부족 입고분 재발주 부담
    const totalCost = orderCost + lostMargin + defectCost + holding + shortfallCost;
    const costDiffPct = Math.round(((sp.unitCost - minCost) / minCost) * 1000) / 10;
    const tradeoffs: string[] = [];
    tradeoffs.push(costDiffPct === 0 ? "최저 단가" : `단가 +${costDiffPct}%`);
    tradeoffs.push(`납기 ${sp.leadTimeDays}일`);
    if (pf.onTimeRate < 0.85) tradeoffs.push(`정시 입고 ${Math.round(pf.onTimeRate * 100)}% (주의)`);
    if (pf.defectRate > 0.004) tradeoffs.push(`불량 반품 ${(pf.defectRate * 100).toFixed(1)}% (주의)`);
    if (excessQty > 0) tradeoffs.push(`최소주문 ${sp.moq}개 → ${excessQty}개 초과`);
    const eta = dateKey(new Date(now.getTime() + sp.leadTimeDays * 86400000));
    return {
      supplier: s,
      sp,
      score: 0,
      expectedArrival: eta,
      tradeoffs,
      recommended: false,
      costDiffPct,
      orderQty,
      orderCost,
      expectedDays: Math.round(expectedDays * 10) / 10,
      gapDays: Math.round(gapDays * 10) / 10,
      lostMargin,
      defectCost,
      excessQty,
      totalCost,
      reliability: {
        onTimeRate: pf.onTimeRate,
        avgDelayDays: pf.avgDelayDays,
        fillRate: pf.fillRate,
        defectRate: pf.defectRate,
        pos: pf.poCount,
        measured: pf.enoughData,
      },
      why: "",
      riskPenalty: s.contractStatus !== "active" ? 0.03 : s.riskLevel === "high" ? 0.02 : 0,
    };
  });
  // 점수 = 최저 총비용 대비 (100점 만점), 계약 검토·고위험 공급사는 감점
  const minTotal = Math.min(...scored.map((x) => x.totalCost / Math.max(1, Math.min(x.orderQty, need))));
  scored.forEach((x) => {
    const perUnit = x.totalCost / Math.max(1, Math.min(x.orderQty, need));
    x.score = Math.round(Math.max(0, 100 * (minTotal / perUnit) - x.riskPenalty * 100));
  });
  scored.sort((a, b) => b.score - a.score || a.totalCost - b.totalCost);
  const best = scored[0];
  best.recommended = true;
  scored.forEach((x) => {
    if (x === best) {
      const cheaper = scored.find((y) => y !== x && y.sp.unitCost < x.sp.unitCost);
      x.why = cheaper
        ? `단가는 ${cheaper.supplier.name}보다 ${Math.round(((x.sp.unitCost - cheaper.sp.unitCost) / cheaper.sp.unitCost) * 1000) / 10}% 높지만, 결품·불량 손실을 더하면 총비용이 ${Math.max(0, cheaper.totalCost - x.totalCost).toLocaleString()}원 낮습니다`
        : "단가와 총비용이 모두 가장 낮습니다";
    } else {
      const diff = x.totalCost - best.totalCost;
      const driver =
        x.lostMargin > best.lostMargin
          ? `도착이 늦어 결품 손실 ${x.lostMargin.toLocaleString()}원`
          : x.defectCost > best.defectCost
            ? `불량 손실 ${x.defectCost.toLocaleString()}원`
            : x.excessQty > best.excessQty
              ? `최소주문수량으로 ${x.excessQty}개 초과 발주`
              : x.sp.unitCost > best.sp.unitCost
                ? "단가가 높음"
                : "위험도 감점";
      x.why = `총비용 ${diff >= 0 ? "+" : ""}${diff.toLocaleString()}원 — ${driver}`;
    }
  });
  return scored.map(({ riskPenalty: _r, ...rest }) => rest);
}

// ---------- Repeat purchase ----------
export interface RepeatItem {
  sku: SKU;
  product: Product;
  lastOrderedAt: string;
  avgCycleDays: number;
  dueInDays: number; // negative = overdue
  suggestedQty: number;
  timesOrdered: number;
  available: number;
  altSku?: SKU;
  reasons: string[];
}

export function repeatItemsForCustomer(data: DemoData, customerId: string, now = new Date()): RepeatItem[] {
  const orders = data.orders.filter(
    (o) => o.customerId === customerId && !["cancelled", "return"].includes(o.stage),
  );
  const skuById = new Map(data.skus.map((s) => [s.id, s]));
  const prodById = new Map(data.products.map((p) => [p.id, p]));
  const invBySku = new Map(data.inventory.map((i) => [i.skuId, i]));
  const byProduct = new Map<string, { dates: number[]; skuId: string; qty: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const p = prodById.get(it.productId)!;
      if (!p.isRepeatable) continue;
      const cur = byProduct.get(p.id) ?? { dates: [], skuId: it.skuId, qty: it.qty };
      cur.dates.push(new Date(o.createdAt).getTime());
      cur.skuId = it.skuId;
      cur.qty = it.qty;
      byProduct.set(p.id, cur);
    }
  }
  const items: RepeatItem[] = [];
  byProduct.forEach((v, pid) => {
    const product = prodById.get(pid)!;
    const sku = skuById.get(v.skuId)!;
    const dates = v.dates.sort((a, b) => a - b);
    let cycle = product.avgRepeatCycleDays ?? 30;
    if (dates.length >= 2) {
      const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / 86400000);
      const observed = gaps.reduce((a, c) => a + c, 0) / gaps.length;
      cycle = Math.round((observed + cycle) / 2);
    }
    const last = dates[dates.length - 1];
    const dueInDays = Math.round(cycle - (now.getTime() - last) / 86400000);
    const inv = invBySku.get(sku.id);
    const available = inv ? Math.max(0, inv.onHand - inv.reserved) : 0;
    const reasons = [
      `마지막 구매 ${Math.round((now.getTime() - last) / 86400000)}일 전`,
      `평균 구매주기 ${cycle}일`,
      dates.length >= 2 ? `${dates.length}회 구매` : "1회 구매 (상품 평균 주기 적용)",
    ];
    let altSku: SKU | undefined;
    if (available < v.qty) {
      altSku = data.skus.find(
        (s) =>
          s.productId === pid &&
          s.id !== sku.id &&
          (invBySku.get(s.id)?.onHand ?? 0) - (invBySku.get(s.id)?.reserved ?? 0) >= v.qty,
      );
      reasons.push("현재 구성 재고 부족 → 대체 구성 제안");
    }
    items.push({
      sku,
      product,
      lastOrderedAt: new Date(last).toISOString(),
      avgCycleDays: cycle,
      dueInDays,
      suggestedQty: v.qty,
      timesOrdered: dates.length,
      available,
      altSku,
      reasons,
    });
  });
  return items.sort((a, b) => a.dueInDays - b.dueInDays);
}

export function actionTypeLabel(t: AXAction["type"]) {
  return {
    urgent_po: "긴급발주",
    stop_po: "발주중단",
    alt_supplier: "대체공급",
    priority_order: "우선처리",
    delay_notice: "고객안내",
    repeat_expose: "재구매",
    promo_adjust: "프로모션",
    staff_rebalance: "인력재배치",
    quality_issue: "품질개선",
  }[t];
}
