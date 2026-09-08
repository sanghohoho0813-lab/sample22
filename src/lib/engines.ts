// Rule / statistical / optimization engines. No LLM here — everything explainable.
import type {
  AXAction,
  Customer,
  DemandSignal,
  DemoData,
  Inventory,
  Order,
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
}

const pct = (cur: number, prev: number) => (prev <= 0 ? (cur > 0 ? 1 : 0) : (cur - prev) / prev);

export function buildSkuInsights(data: DemoData): SkuInsight[] {
  const bySku = new Map(data.demand.map((d) => [d.skuId, d]));
  const invBySku = new Map(data.inventory.map((i) => [i.skuId, i]));
  const prodById = new Map(data.products.map((p) => [p.id, p]));
  const supById = new Map(data.suppliers.map((s) => [s.id, s]));
  const openActionSkus = new Set(
    data.actions.filter((a) => !["done", "dismissed"].includes(a.stage)).map((a) => a.related.skuId).filter(Boolean),
  );
  const openPoSkus = new Map<string, "requested" | "confirmed" | "in_transit">();
  data.purchaseOrders.forEach((po) => {
    if (["requested", "confirmed", "in_transit"].includes(po.status)) openPoSkus.set(po.skuId, po.status as never);
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
    const leadTimeDays = supplier?.leadTimeDays ?? 5;
    const safetyStock = Math.ceil(avgDaily * (leadTimeDays * 0.6 + 2));
    const shortage = Math.max(0, safetyStock - available);
    const expectedInbound = inv.inboundExpected > 0 ? { qty: inv.inboundExpected, eta: inv.inboundEta } : null;
    const marginRate = sku.salePrice > 0 ? (sku.salePrice - sku.cost) / sku.salePrice : 0;
    const stockValue = inv.onHand * sku.cost;
    const poStatus = openPoSkus.get(sku.id);

    const reasons: string[] = [];
    let status: StockStatus = "normal";
    let priority = 0;

    if (available <= 0 && avgDaily > 0) {
      status = "stockout";
      priority = 95;
      reasons.push("가용재고 0");
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
      const etaDays = expectedInbound.eta ? Math.max(0, (new Date(expectedInbound.eta).getTime() - Date.now()) / 86400000) : leadTimeDays;
      if (etaDays <= daysOfStock + 0.5) {
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
    if (demandTrend < -0.25 && ["slow", "overstock"].includes(status)) reasons.push(`주문 ${Math.round(-demandTrend * 100)}% 감소`);

    // recommended qty: cover lead time + 7 days review period minus available/inbound, rounded to MOQ
    const coverDays = leadTimeDays + 7;
    const need = Math.ceil(avgDaily * (1 + Math.max(0, demandTrend) * 0.5) * coverDays - available - (expectedInbound?.qty ?? 0));
    const recommendedQty = ["urgent", "low", "stockout", "rising"].includes(status) && need > 0 ? Math.max(sku.moq, Math.ceil(need / 10) * 10) : 0;

    if (reasons.length === 0) reasons.push(`재고일수 ${daysOfStock === Infinity ? "-" : Math.round(daysOfStock)}일, 정상 범위`);

    return {
      sku, product, inv, demand, available, avgDaily, daysOfStock, demandTrend, searchTrend, cartTrend,
      safetyStock, shortage, leadTimeDays, status, priority: Math.round(Math.min(100, priority)), recommendedQty, reasons,
      expectedInbound, marginRate, stockValue, hasOpenAction: openActionSkus.has(sku.id),
    };
  });
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
}

export function compareSuppliers(data: DemoData, skuId: string, mode: "urgent" | "normal" | "overstock" = "normal"): SupplierOption[] {
  const opts = data.supplierProducts.filter((sp) => sp.skuId === skuId);
  const supById = new Map(data.suppliers.map((s) => [s.id, s]));
  const minCost = Math.min(...opts.map((o) => o.unitCost));
  const weights = mode === "urgent" ? { cost: 0.2, lead: 0.45, ontime: 0.25, fill: 0.1 } : mode === "overstock" ? { cost: 0.45, lead: 0.1, ontime: 0.2, fill: 0.25 } : { cost: 0.4, lead: 0.25, ontime: 0.2, fill: 0.15 };
  const scored = opts.map((sp) => {
    const s = supById.get(sp.supplierId)!;
    const costScore = minCost / sp.unitCost; // 1 = cheapest
    const leadScore = Math.max(0, 1 - (sp.leadTimeDays - 2) / 12);
    const score = Math.round((costScore * weights.cost + leadScore * weights.lead + s.onTimeRate * weights.ontime + s.fillRate * weights.fill) * 100 - s.defectRate * 300 - (s.riskLevel === "high" ? 8 : s.riskLevel === "mid" ? 3 : 0));
    const costDiffPct = Math.round(((sp.unitCost - minCost) / minCost) * 1000) / 10;
    const tradeoffs: string[] = [];
    if (costDiffPct === 0) tradeoffs.push("최저 단가");
    else tradeoffs.push(`단가 +${costDiffPct}%`);
    tradeoffs.push(`납기 ${sp.leadTimeDays}일`);
    if (s.onTimeRate < 0.85) tradeoffs.push(`정시납품 ${Math.round(s.onTimeRate * 100)}% (주의)`);
    if (s.defectRate > 0.01) tradeoffs.push(`불량률 ${(s.defectRate * 100).toFixed(1)}% (주의)`);
    if (sp.moq > 50) tradeoffs.push(`최소수량 ${sp.moq}개`);
    const eta = new Date(Date.now() + sp.leadTimeDays * 86400000).toISOString().slice(0, 10);
    return { supplier: s, sp, score, expectedArrival: eta, tradeoffs, recommended: false, costDiffPct };
  });
  scored.sort((a, b) => b.score - a.score);
  if (scored[0]) scored[0].recommended = true;
  return scored;
}

// ---------- Fulfillment risk ----------
export interface OrderRisk {
  order: Order;
  score: number; // 0-100
  level: "high" | "mid" | "low";
  causes: string[];
  hoursToCutoff: number;
  hoursToPromise: number;
}

const PRE_SHIP = ["new", "confirmed", "picking_wait", "picking", "packing_wait", "ship_wait"];

export function assessOrderRisks(data: DemoData, now = new Date()): OrderRisk[] {
  const whById = new Map(data.warehouses.map((w) => [w.id, w]));
  const stockoutSkus = new Set(data.inventory.filter((i) => i.onHand - i.reserved <= 0).map((i) => i.skuId));
  return data.orders
    .filter((o) => PRE_SHIP.includes(o.stage))
    .map((order) => {
      const hoursToCutoff = (new Date(order.cutoffAt).getTime() - now.getTime()) / 3600000;
      const hoursToPromise = (new Date(order.promisedAt).getTime() - now.getTime()) / 3600000;
      const wh = whById.get(order.warehouseId)!;
      const causes: string[] = [];
      let score = 0;
      if (hoursToPromise < 30) { score += 35; causes.push(`배송약속까지 ${Math.max(0, Math.round(hoursToPromise))}시간`); }
      if (hoursToCutoff < 4 && hoursToCutoff > -1) { score += 25; causes.push(`출고마감까지 ${Math.max(0, hoursToCutoff).toFixed(1)}시간`); }
      if (hoursToCutoff <= -1) { score += 15; causes.push("오늘 마감 경과"); }
      if (wh.congestion > 0.7) { score += 25; causes.push(`${wh.name} 피킹 적체 ${Math.round(wh.congestion * 100)}%`); }
      if (["new", "confirmed", "picking_wait"].includes(order.stage)) { score += 10; causes.push("아직 피킹 시작 전"); }
      if (order.items.some((it) => stockoutSkus.has(it.skuId))) { score += 30; causes.push("품절 SKU 포함 (재고예외)"); }
      if (order.riskFlag) score += 5;
      score = Math.min(100, score);
      const level: OrderRisk["level"] = score >= 60 ? "high" : score >= 35 ? "mid" : "low";
      return { order, score, level, causes, hoursToCutoff, hoursToPromise };
    })
    .sort((a, b) => b.score - a.score);
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
  const orders = data.orders.filter((o) => o.customerId === customerId && !["cancelled", "return"].includes(o.stage));
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
      altSku = data.skus.find((s) => s.productId === pid && s.id !== sku.id && (invBySku.get(s.id)?.onHand ?? 0) - (invBySku.get(s.id)?.reserved ?? 0) >= v.qty);
      reasons.push("현재 구성 재고 부족 → 대체 구성 제안");
    }
    items.push({ sku, product, lastOrderedAt: new Date(last).toISOString(), avgCycleDays: cycle, dueInDays, suggestedQty: v.qty, timesOrdered: dates.length, available, altSku, reasons });
  });
  return items.sort((a, b) => a.dueInDays - b.dueInDays);
}

export interface CustomerSegmentRow {
  key: string;
  name: string;
  description: string;
  count: number;
  action: string;
  customers: Customer[];
}

export function buildSegments(data: DemoData): CustomerSegmentRow[] {
  const c = data.customers;
  return [
    { key: "first", name: "첫 주문 전환후보", description: "회원가입 후 상세조회·장바구니만 있고 주문 없음", count: 214, action: "첫 주문 웰컴 5천원 노출", customers: c.slice(14, 18) },
    { key: "cart_abandon", name: "장바구니 이탈", description: "담기 후 48시간 미주문", count: 18, action: "복귀 안내", customers: c.slice(8, 14) },
    { key: "repeat_due", name: "반복상품 구매주기 도래", description: "마지막 구매일 + 평균주기 ≤ 3일 이내", count: 42, action: "Repeat Basket 노출", customers: c.slice(0, 8) },
    { key: "repeat_late", name: "재구매 지연", description: "주기 경과 후 10일 이상 미주문", count: 27, action: "재구매 리마인드 + 대체상품", customers: c.slice(18, 22) },
    { key: "loyal_cat", name: "카테고리 충성고객", description: "동일 카테고리 3회 이상 구매", count: 96, action: "신상품·묶음 우선노출", customers: c.slice(2, 8) },
    { key: "delay_exp", name: "배송지연 경험고객", description: "최근 30일 배송지연 1회 이상", count: 11, action: "사전안내 + 사과 쿠폰 검토", customers: c.slice(3, 7) },
    { key: "high_value", name: "고가치 반복고객", description: "월 3회 이상 · 월 10만원 이상", count: 58, action: "정기배송 Preview 초대 (NEXT)", customers: c.slice(0, 5) },
  ];
}

// ---------- Executive briefing ----------
export interface BriefingItem {
  rank: number;
  title: string;
  why: string;
  href: string;
  tone: "danger" | "warn" | "info" | "good";
}

export function buildBriefing(data: DemoData, insights: SkuInsight[], risks: OrderRisk[], now = new Date()): BriefingItem[] {
  const items: BriefingItem[] = [];
  const stockoutRisk = insights.filter((i) => ["urgent", "stockout", "low"].includes(i.status));
  const highRisk = risks.filter((r) => r.level === "high");
  const openCritical = data.actions.filter((a) => a.urgency === "critical" && !["done", "dismissed"].includes(a.stage));
  const slow = insights.filter((i) => ["slow", "overstock"].includes(i.status));
  const slowValue = slow.reduce((a, i) => a + i.stockValue, 0);
  const delayedPo = data.purchaseOrders.filter((po) => ["confirmed", "in_transit"].includes(po.status) && new Date(po.expectedAt).getTime() > now.getTime() + 7 * 86400000);

  if (openCritical.length) items.push({ rank: 0, title: `긴급 Action ${openCritical.length}건이 승인 대기 중입니다`, why: openCritical.map((a) => a.title).slice(0, 2).join(" · "), href: "/ax/actions", tone: "danger" });
  if (stockoutRisk.length) items.push({ rank: 0, title: `품절위험 SKU ${stockoutRisk.length}개 — 발주 판단이 오늘 필요합니다`, why: `${stockoutRisk[0].product.name} 등, 예상 소진일이 공급 리드타임보다 짧습니다`, href: "/ax/inventory", tone: "danger" });
  if (highRisk.length) items.push({ rank: 0, title: `배송지연 위험 주문 ${highRisk.length}건 — 마감 전 우선처리`, why: highRisk[0].causes.slice(0, 2).join(", "), href: "/ax/fulfillment", tone: "warn" });
  if (delayedPo.length) items.push({ rank: 0, title: `공급사 입고지연 ${delayedPo.length}건 — 대체구매 검토`, why: "입고 예정일이 재고 소진일보다 늦습니다", href: "/ax/suppliers", tone: "warn" });
  if (slowValue > 0) items.push({ rank: 0, title: `저회전·과잉재고 ${slow.length}개 SKU, 재고금액 ${Math.round(slowValue / 10000).toLocaleString()}만원`, why: "추가 발주 보류와 프로모션 조정을 검토하세요", href: "/ax/inventory?status=slow", tone: "info" });
  items.push({ rank: 0, title: "재구매 주기 도래 고객 42명에게 Repeat Basket 노출 가능", why: "지난달 Repeat Basket 전환율 31% (Demo 집계)", href: "/ax/customers", tone: "good" });
  return items.map((it, i) => ({ ...it, rank: i + 1 }));
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
  }[t];
}
