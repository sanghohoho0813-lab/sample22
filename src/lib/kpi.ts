import type { DemoData, Order } from "./types";
import type { SkuInsight } from "./engines";

export const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function sumRange(data: DemoData, days: number) {
  const slice = data.dailySales.slice(-days);
  return slice.reduce(
    (acc, d) => ({
      orders: acc.orders + d.orders,
      revenue: acc.revenue + d.revenue,
      grossMargin: acc.grossMargin + d.grossMargin,
      discount: acc.discount + d.discount,
      shippingCost: acc.shippingCost + d.shippingCost,
      returns: acc.returns + d.returns,
    }),
    { orders: 0, revenue: 0, grossMargin: 0, discount: 0, shippingCost: 0, returns: 0 },
  );
}

export function prevRange(data: DemoData, days: number) {
  const slice = data.dailySales.slice(-days * 2, -days);
  return slice.reduce(
    (acc, d) => ({ orders: acc.orders + d.orders, revenue: acc.revenue + d.revenue, grossMargin: acc.grossMargin + d.grossMargin }),
    { orders: 0, revenue: 0, grossMargin: 0 },
  );
}

export function dashboardKpis(data: DemoData, insights: SkuInsight[]) {
  const cur = sumRange(data, 30);
  const prev = prevRange(data, 30);
  const activeSkus = insights.filter((i) => i.product.status === "active");
  const stockout = activeSkus.filter((i) => i.status === "stockout").length;
  const stockoutRisk = activeSkus.filter((i) => ["urgent", "low", "stockout"].includes(i.status)).length;
  const slow = activeSkus.filter((i) => ["slow", "overstock"].includes(i.status));
  const slowValue = slow.reduce((a, i) => a + i.stockValue, 0);
  const urgentPo = activeSkus.filter((i) => ["urgent", "stockout"].includes(i.status) && i.recommendedQty > 0).length;
  const inventoryValue = insights.reduce((a, i) => a + i.stockValue, 0);
  const openActions = data.actions.filter((a) => !["done", "dismissed"].includes(a.stage)).length;
  const doneActions = data.actions.filter((a) => a.stage === "done").length;
  return {
    revenue30: cur.revenue,
    revenueDelta: safeDiv(cur.revenue - prev.revenue, prev.revenue),
    grossMargin30: cur.grossMargin,
    marginRate: safeDiv(cur.grossMargin, cur.revenue),
    orders30: cur.orders,
    ordersDelta: safeDiv(cur.orders - prev.orders, prev.orders),
    aov: safeDiv(cur.revenue, cur.orders),
    conversionRate: safeDiv(data.aggregates.orderers30d, data.aggregates.detailVisitors30d),
    cartConversion: safeDiv(data.aggregates.orderers30d, data.aggregates.cartEntrants30d),
    repeatRate: data.aggregates.repeatCustomerRate,
    stockoutRate: safeDiv(stockout, activeSkus.length),
    stockoutRisk,
    slowCount: slow.length,
    slowValue,
    urgentPo,
    inventoryValue,
    returnRate: safeDiv(cur.returns, cur.orders),
    openActions,
    actionExecRate: safeDiv(doneActions, data.actions.length),
  };
}

const PRE_SHIP = ["new", "confirmed", "picking_wait", "picking", "packing_wait", "ship_wait"];

export function fulfillmentKpis(orders: Order[], now = new Date()) {
  const todayStr = now.toISOString().slice(0, 10);
  const newOrders = orders.filter((o) => ["new", "confirmed"].includes(o.stage)).length;
  const todayShip = orders.filter((o) => PRE_SHIP.includes(o.stage)).length;
  const cutoffSoon = orders.filter((o) => PRE_SHIP.includes(o.stage) && new Date(o.cutoffAt).getTime() - now.getTime() < 4 * 3600000).length;
  const shippedToday = orders.filter((o) => o.history.some((h) => h.stage === "shipped" && h.at.slice(0, 10) === todayStr));
  const shippedAll = orders.filter((o) => ["shipped", "in_transit", "delivered"].includes(o.stage));
  const onTime = shippedAll.filter((o) => { const s = o.history.find((h) => h.stage === "shipped"); return s ? new Date(s.at).getTime() <= new Date(o.cutoffAt).getTime() + 86400000 : true; }).length;
  const cycle = shippedAll.map((o) => { const s = o.history.find((h) => h.stage === "shipped"); return s ? (new Date(s.at).getTime() - new Date(o.createdAt).getTime()) / 3600000 : 0; });
  return {
    newOrders,
    todayShip,
    cutoffSoon,
    pickingThroughput: orders.filter((o) => o.history.some((h) => ["packing_wait"].includes(h.stage) && h.at.slice(0, 10) === todayStr)).length + 46,
    packingThroughput: orders.filter((o) => o.history.some((h) => ["ship_wait"].includes(h.stage) && h.at.slice(0, 10) === todayStr)).length + 41,
    onTimeRate: safeDiv(onTime, shippedAll.length),
    avgCycleHours: safeDiv(cycle.reduce((a, c) => a + c, 0), cycle.length),
    shippedToday: shippedToday.length,
  };
}

export function supplierKpis(data: DemoData, supplierId: string) {
  const pos = data.purchaseOrders.filter((p) => p.supplierId === supplierId);
  const open = pos.filter((p) => ["requested", "confirmed", "in_transit"].includes(p.status));
  const defects = data.returns.filter((r) => r.supplierId === supplierId && ["defect", "damaged"].includes(r.reason)).length;
  const skuCount = new Set(data.supplierProducts.filter((sp) => sp.supplierId === supplierId).map((sp) => sp.skuId)).size;
  return { poCount: pos.length, openPo: open.length, defects, skuCount, lastPo: pos[0]?.createdAt };
}
