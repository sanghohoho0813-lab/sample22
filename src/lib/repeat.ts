/**
 * 재구매 기회 — 고객별·상품별 실제 구매 간격으로 "지금 다시 살 때"인 고객을 찾는다.
 * 추천 영역을 채우는 게 아니라, 운영 실행(노출·안내)의 대상 명단과 재고 확인까지 만든다.
 */
import type { DemoData } from "./types";
import type { Ledger, LedgerCustomer } from "./ledger";
import { isPreShip } from "./fulfillment";
import { memoLast } from "./memo";

export type RepeatStatus = "due" | "late" | "upcoming" | "lapsed";

export const REPEAT_STATUS_LABEL: Record<RepeatStatus, string> = {
  due: "주기 도래",
  late: "주기 지남",
  upcoming: "곧 도래",
  lapsed: "이탈 위험",
};

export interface RepeatOpportunity {
  customerId: string;
  customerName: string;
  business: boolean;
  productId: string;
  productName: string;
  skuId: string;
  skuName: string;
  purchases: number;
  lastDaysAgo: number;
  cycleDays: number;
  /** 주기가 실제 구매 간격인지, 상품 평균 주기인지 */
  cycleSource: "observed" | "product";
  /** 음수면 지난 일수 */
  dueInDays: number;
  status: RepeatStatus;
  qty: number;
  expectedValue: number;
  stockOk: boolean;
  targeted: boolean;
}

export interface RepeatReport {
  rows: RepeatOpportunity[];
  counts: Record<RepeatStatus, number>;
  dueCustomers: number;
  dueValue: number;
  byProduct: {
    productId: string;
    name: string;
    due: number;
    late: number;
    value: number;
    stockOk: boolean;
    available: number;
    need: number;
  }[];
}

export const repeatReport = memoLast(repeatReportRaw);

function repeatReportRaw(data: DemoData, ledger: Ledger | null, now: Date): RepeatReport {
  const productById = new Map(data.products.map((p) => [p.id, p]));
  const skuById = new Map(data.skus.map((s) => [s.id, s]));
  const invBySku = new Map(data.inventory.map((i) => [i.skuId, i]));
  const custById = new Map<string, Pick<LedgerCustomer, "name" | "kind">>();
  ledger?.customers.forEach((c) => custById.set(c.id, c));
  data.customers.forEach((c) => custById.set(c.id, { name: c.name, kind: "consumer" }));

  // 고객×상품 구매 이력 (일 단위, 최신 SKU·수량)
  type H = { days: number[]; skuId: string; qty: number };
  const hist = new Map<string, H>();
  const pendingKey = new Set<string>();
  const add = (cid: string, pid: string, skuId: string, qty: number, daysAgo: number) => {
    const p = productById.get(pid);
    if (!p?.isRepeatable) return;
    const k = `${cid}|${pid}`;
    const h = hist.get(k) ?? { days: [], skuId, qty };
    h.days.push(daysAgo);
    if (daysAgo <= Math.min(...h.days)) {
      h.skuId = skuId;
      h.qty = qty;
    }
    hist.set(k, h);
  };
  ledger?.orders.forEach((o) =>
    o.lines.forEach((l) => add(o.customerId, l.productId, l.skuId, l.qty, o.day)),
  );
  data.orders.forEach((o) => {
    if (o.stage === "cancelled") return;
    const d = Math.max(0, Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / 86400000));
    o.items.forEach((it) => {
      add(o.customerId, it.productId, it.skuId, it.qty, d);
      if (isPreShip(o.stage) || d <= 2) pendingKey.add(`${o.customerId}|${it.productId}`);
    });
  });
  const targeted = new Set(
    data.actions
      .filter((a) => a.type === "repeat_expose" && !["dismissed"].includes(a.stage))
      .flatMap((a) => (a.related.customerIds ?? []).map((c) => `${c}|${a.related.productId ?? ""}`)),
  );
  const targetedAny = new Set(
    data.actions
      .filter((a) => a.type === "repeat_expose" && !["dismissed"].includes(a.stage) && !a.related.productId)
      .flatMap((a) => a.related.customerIds ?? []),
  );

  const rows: RepeatOpportunity[] = [];
  hist.forEach((h, k) => {
    if (pendingKey.has(k)) return; // 이미 다시 주문함
    const [cid, pid] = k.split("|");
    const p = productById.get(pid)!;
    const sku = skuById.get(h.skuId);
    if (!sku) return;
    const days = [...h.days].sort((a, b) => b - a); // 오래된 → 최근
    const last = days[days.length - 1];
    let cycle = p.avgRepeatCycleDays ?? 30;
    let source: RepeatOpportunity["cycleSource"] = "product";
    if (days.length >= 2) {
      const gaps = days
        .slice(1)
        .map((d, i) => days[i] - d)
        .filter((g) => g > 0);
      if (gaps.length) {
        cycle = Math.round(gaps.reduce((a, g) => a + g, 0) / gaps.length);
        source = "observed";
      }
    }
    cycle = Math.max(5, cycle);
    const dueIn = cycle - last;
    let status: RepeatStatus | null = null;
    if (last > cycle * 2.2) status = "lapsed";
    else if (dueIn >= -3 && dueIn <= 3) status = "due";
    else if (dueIn < -3) status = "late";
    else if (dueIn <= 10) status = "upcoming";
    if (!status) return;
    if (status === "lapsed" && last > 75) return; // 너무 오래된 고객은 재활성 캠페인 대상 (여기선 제외)
    const c = custById.get(cid);
    rows.push({
      customerId: cid,
      customerName: c?.name ?? cid,
      business: c?.kind === "business",
      productId: pid,
      productName: p.name,
      skuId: sku.id,
      skuName: sku.name,
      purchases: days.length,
      lastDaysAgo: last,
      cycleDays: cycle,
      cycleSource: source,
      dueInDays: dueIn,
      status,
      qty: h.qty,
      expectedValue: h.qty * sku.salePrice,
      stockOk: true,
      targeted: targeted.has(k) || targetedAny.has(cid),
    });
  });

  // 재고 확인: 도래·지남 고객이 모두 다시 사면 필요한 수량 vs 가용재고
  const needBySku = new Map<string, number>();
  rows
    .filter((r) => r.status === "due" || r.status === "late")
    .forEach((r) => needBySku.set(r.skuId, (needBySku.get(r.skuId) ?? 0) + r.qty));
  rows.forEach((r) => {
    const inv = invBySku.get(r.skuId);
    const avail = inv ? Math.max(0, inv.onHand - inv.reserved) : 0;
    r.stockOk = avail >= (needBySku.get(r.skuId) ?? r.qty) * 0.5; // 절반 이상 전환을 감당할 수 있는지
  });
  const order: Record<RepeatStatus, number> = { due: 0, late: 1, upcoming: 2, lapsed: 3 };
  rows.sort((a, b) => order[a.status] - order[b.status] || b.expectedValue - a.expectedValue);

  const counts = { due: 0, late: 0, upcoming: 0, lapsed: 0 } as Record<RepeatStatus, number>;
  rows.forEach((r) => counts[r.status]++);
  const due = rows.filter((r) => r.status === "due" || r.status === "late");
  const byProductMap = new Map<string, RepeatReport["byProduct"][number]>();
  due.forEach((r) => {
    const v = byProductMap.get(r.productId) ?? {
      productId: r.productId,
      name: r.productName,
      due: 0,
      late: 0,
      value: 0,
      stockOk: true,
      available: 0,
      need: 0,
    };
    if (r.status === "due") v.due++;
    else v.late++;
    v.value += r.expectedValue;
    v.need += r.qty;
    byProductMap.set(r.productId, v);
  });
  byProductMap.forEach((v) => {
    const skus = data.skus.filter((s) => s.productId === v.productId);
    v.available = skus.reduce((a, s) => {
      const inv = invBySku.get(s.id);
      return a + (inv ? Math.max(0, inv.onHand - inv.reserved) : 0);
    }, 0);
    v.stockOk = v.available >= v.need * 0.5;
  });
  return {
    rows,
    counts,
    dueCustomers: new Set(due.map((r) => r.customerId)).size,
    dueValue: due.reduce((a, r) => a + r.expectedValue, 0),
    byProduct: Array.from(byProductMap.values()).sort((a, b) => b.value - a.value),
  };
}
