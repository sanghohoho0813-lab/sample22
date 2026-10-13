/**
 * 반품 분석 — 반품을 CS 목록으로 끝내지 않고 "어디서 생긴 문제인가"로 거슬러 올라간다.
 *
 * 최근 4주 반품률을 이전 기간(5~13주 전)과 비교해 평소보다 늘어난 곳을 찾는다.
 * - 불량·파손이 한 공급사에 몰리면 → 공급 문제. 증가가 시작된 시점 직전 입고된 발주(로트)를 함께 보여준다.
 * - 오배송·구성누락이 한 구역에 몰리면 → 물류(피킹) 문제
 * - 상품정보 차이가 한 상품에 몰리면 → 상세페이지 문제
 * 엔진은 시드에 어떤 문제가 심어졌는지 모른다. 데이터만 보고 찾는다 (테스트로 확인).
 */
import type { DemoData, ReturnRequest } from "./types";
import type { Ledger } from "./ledger";
import { RETURN_REASON_LABEL } from "./labels";
import { memoLast } from "./memo";

export type ReturnReason = ReturnRequest["reason"];
export type ReturnRoute = "supplier" | "content" | "warehouse" | "fulfillment";

export const ROUTE_LABEL: Record<ReturnRoute, string> = {
  supplier: "공급사 품질",
  content: "상품정보",
  warehouse: "물류 피킹",
  fulfillment: "출고 지연",
};

const ROUTE_OF: Record<ReturnReason, ReturnRoute | null> = {
  defect: "supplier",
  damaged: "supplier",
  wrong_item: "warehouse",
  missing: "warehouse",
  info_mismatch: "content",
  delay: "fulfillment",
  change_mind: null,
  other: null,
};

export interface ReturnRecord {
  orderId: string;
  skuId: string;
  productId: string;
  supplierId: string;
  warehouseId: string;
  reason: ReturnReason;
  at: string;
  daysAgo: number;
  qty: number;
  refund: number;
  lostCogs: number;
}

export interface ReturnSignal {
  id: string;
  kind: "supplier" | "sku" | "warehouse" | "content";
  route: ReturnRoute;
  title: string;
  subjectLabel: string;
  supplierId?: string;
  warehouseId?: string;
  productId?: string;
  skuIds: string[];
  recentCount: number;
  recentRate: number;
  baselineRate: number;
  /** 평소 대비 배수 */
  lift: number;
  reasons: { reason: ReturnReason; count: number }[];
  /** 증가가 시작된 날 (공급사 신호) */
  onset?: string;
  /** 증가 직전 입고된 발주 (로트 의심) */
  lotPoId?: string;
  lotReceivedAt?: string;
  /** 최근 4주 손실 = 환불 − 재판매 원가회수 + 회수운임 */
  cost: number;
  evidence: string[];
  suggestion: string;
}

const RECENT = 28;
const RETURN_PICKUP = 5000;

export function returnRecords(data: DemoData, ledger: Ledger | null, now: Date): ReturnRecord[] {
  const skuById = new Map(data.skus.map((s) => [s.id, s]));
  const out: ReturnRecord[] = [];
  const seenOrders = new Set<string>();
  ledger?.orders.forEach((o) => {
    if (!o.returned) return;
    const r = o.returned;
    const line = o.lines.find((l) => l.skuId === r.skuId);
    const sku = skuById.get(r.skuId);
    if (!line || !sku) return;
    seenOrders.add(o.id);
    out.push({
      orderId: o.id,
      skuId: r.skuId,
      productId: line.productId,
      supplierId: sku.primarySupplierId,
      warehouseId: o.warehouseId,
      reason: r.reason,
      at: r.at,
      daysAgo: r.daysAgo,
      qty: r.qty,
      refund: line.unitPrice * r.qty,
      lostCogs: r.resellable ? 0 : line.unitCost * r.qty,
    });
  });
  // 원장에 없는 반품 (시연 중 고객이 새로 신청한 것)
  const orderById = new Map(data.orders.map((o) => [o.id, o]));
  data.returns.forEach((r) => {
    if (seenOrders.has(r.orderId)) return;
    const o = orderById.get(r.orderId);
    const sku = skuById.get(r.skuId);
    const item = o?.items.find((i) => i.skuId === r.skuId);
    if (!sku) return;
    out.push({
      orderId: r.orderId,
      skuId: r.skuId,
      productId: sku.productId,
      supplierId: r.supplierId ?? sku.primarySupplierId,
      warehouseId: o?.warehouseId ?? "",
      reason: r.reason,
      at: r.createdAt,
      daysAgo: Math.max(0, Math.floor((now.getTime() - new Date(r.createdAt).getTime()) / 86400000)),
      qty: 1,
      refund: item?.unitPrice ?? sku.salePrice,
      lostCogs: ["defect", "damaged"].includes(r.reason) ? sku.cost : 0,
    });
  });
  return out.sort((a, b) => a.daysAgo - b.daysAgo);
}

/** SKU·구역별 판매 수량·주문 수 (최근 4주 / 이전 기간) */
function salesWindows(data: DemoData, ledger: Ledger | null, now: Date) {
  const skuUnits = new Map<string, { recent: number; base: number }>();
  /** SKU별 일자별 판매 수량 [daysAgo] — 변화 시점 찾기용 */
  const skuDaily = new Map<string, Float64Array>();
  const daily = (id: string) => {
    let a = skuDaily.get(id);
    if (!a) {
      a = new Float64Array(120);
      skuDaily.set(id, a);
    }
    return a;
  };
  const whOrders = new Map<string, { recent: number; base: number }>();
  const bump = <K>(m: Map<K, { recent: number; base: number }>, k: K, recent: boolean, n: number) => {
    const v = m.get(k) ?? { recent: 0, base: 0 };
    if (recent) v.recent += n;
    else v.base += n;
    m.set(k, v);
  };
  ledger?.orders.forEach((o) => {
    const recent = o.day <= RECENT;
    o.lines.forEach((l) => {
      bump(skuUnits, l.skuId, recent, l.qty);
      daily(l.skuId)[Math.min(119, o.day)] += l.qty;
    });
    bump(whOrders, o.warehouseId, recent, 1);
  });
  data.orders.forEach((o) => {
    const recent = now.getTime() - new Date(o.createdAt).getTime() <= RECENT * 86400000;
    o.items.forEach((l) => bump(skuUnits, l.skuId, recent, l.qty));
    bump(whOrders, o.warehouseId, recent, 1);
  });
  return { skuUnits, whOrders, skuDaily };
}

/**
 * 변화 시점 — 몇 주 전부터 반품률이 달라졌는지. 후보 시점마다 "앞뒤 비율이 다르다"는 가정의
 * 포아송 로그우도비(LLR)를 계산해 가장 큰 시점을 고른다 (앞 구간이 최소 4주는 남도록).
 */
function changePoint(
  returnsDaysAgo: number[],
  unitsByDay: (d: number) => number,
  maxDays: number,
): { onsetDays: number; before: number; after: number } | null {
  const xlx = (c: number, u: number) => (c > 0 && u > 0 ? c * Math.log(c / u) : 0);
  let best: { llr: number; onsetDays: number; before: number; after: number } | null = null;
  for (let w = 1; w * 7 <= maxDays - 28; w++) {
    const cut = w * 7;
    let uAfter = 0;
    let uBefore = 0;
    for (let d = 0; d <= maxDays; d++) {
      if (d <= cut) uAfter += unitsByDay(d);
      else uBefore += unitsByDay(d);
    }
    const cAfter = returnsDaysAgo.filter((d) => d <= cut).length;
    const cBefore = returnsDaysAgo.length - cAfter;
    if (!uAfter || !uBefore) continue;
    const rateAfter = cAfter / uAfter;
    const rateBefore = cBefore / uBefore;
    if (rateAfter <= rateBefore) continue;
    const llr = xlx(cAfter, uAfter) + xlx(cBefore, uBefore) - xlx(cAfter + cBefore, uAfter + uBefore);
    if (!best || llr > best.llr) best = { llr, onsetDays: cut, before: rateBefore, after: rateAfter };
  }
  return best && best.llr > 3 ? best : null;
}

const reasonMix = (rs: ReturnRecord[]) => {
  const m = new Map<ReturnReason, number>();
  rs.forEach((r) => m.set(r.reason, (m.get(r.reason) ?? 0) + 1));
  return Array.from(m.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
};
const lossOf = (rs: ReturnRecord[]) => rs.reduce((a, r) => a + r.lostCogs + RETURN_PICKUP, 0);
export const pctTxt = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.001 ? 2 : 1)}%`;
/** 평소가 거의 0이면 배수가 과장되므로 "급증"으로 표기 */
export const liftTxt = (lift: number) => (lift >= 10 ? "급증" : `${lift.toFixed(1)}배 증가`);

export const returnSignals = memoLast(returnSignalsRaw);

/**
 * 통계적으로 의미 있는 증가만 신호로 본다 — 평소 비율로 기대되는 건수보다 2.5σ(포아송) 이상 많을 때.
 * 적은 건수의 우연한 몰림을 "이상"이라고 부르지 않기 위함.
 */
export function significant(observed: number, expected: number) {
  return observed >= 4 && observed >= expected + 2.5 * Math.sqrt(Math.max(expected, 0.6)) + 1;
}

function returnSignalsRaw(data: DemoData, ledger: Ledger | null, now: Date): ReturnSignal[] {
  const recs = returnRecords(data, ledger, now);
  const { skuUnits, whOrders, skuDaily } = salesWindows(data, ledger, now);
  // 비교는 "판매 수량(주문 수) 대비 비율"로 하므로 두 기간의 길이가 달라도 그대로 비교된다
  const skuById = new Map(data.skus.map((s) => [s.id, s]));
  const productById = new Map(data.products.map((p) => [p.id, p]));
  const supplierById = new Map(data.suppliers.map((s) => [s.id, s]));
  const recent = recs.filter((r) => r.daysAgo <= RECENT);
  const base = recs.filter((r) => r.daysAgo > RECENT);
  const signals: ReturnSignal[] = [];

  // 1) 공급사 품질 — 불량·파손
  for (const sup of data.suppliers) {
    const supSkus = data.skus.filter((s) => s.primarySupplierId === sup.id).map((s) => s.id);
    const units = supSkus.reduce(
      (a, id) => ({ r: a.r + (skuUnits.get(id)?.recent ?? 0), b: a.b + (skuUnits.get(id)?.base ?? 0) }),
      { r: 0, b: 0 },
    );
    const isQ = (r: ReturnRecord) =>
      r.supplierId === sup.id && (r.reason === "defect" || r.reason === "damaged");
    const rq = recent.filter(isQ);
    const bq = base.filter(isQ);
    const recentRate = units.r ? rq.length / units.r : 0;
    const baselineRate = units.b ? bq.length / units.b : 0;
    const lift = recentRate / Math.max(baselineRate, 1 / Math.max(1, units.b));
    if (!significant(rq.length, baselineRate * units.r) || lift < 1.8) continue;
    // 반품이 가장 많은 SKU에서 증가 시작 시점(변화점)을 찾고 → 그 무렵 입고된 그 SKU의 발주를 로트 후보로
    const affected = Array.from(new Set(rq.map((r) => r.skuId)));
    const topSku = affected
      .map((id) => ({ id, n: rq.filter((r) => r.skuId === id).length }))
      .sort((a, b) => b.n - a.n)[0]?.id;
    const cp = topSku
      ? changePoint(
          recs.filter((r) => isQ(r) && r.skuId === topSku).map((r) => r.daysAgo),
          (d) => skuDaily.get(topSku)?.[d] ?? 0,
          ledger?.days ?? 89,
        )
      : null;
    const onsetDays = cp?.onsetDays ?? RECENT;
    const onset = new Date(now.getTime() - onsetDays * 86400000);
    const lot = ledger?.purchaseOrders
      .filter((po) => po.supplierId === sup.id && (!topSku || po.skuId === topSku))
      // 반품 증가보다 먼저(늦어도 3일 안) 들어온 입고 중 가장 최근 것 = 로트 후보
      .map((po) => ({ po, d: (now.getTime() - new Date(`${po.receivedAt}T09:00:00`).getTime()) / 86400000 }))
      .filter((x) => x.d >= onsetDays - 3 && x.d <= onsetDays + 21)
      .sort((a, b) => a.d - b.d)[0]?.po;
    const productNames = Array.from(
      new Set(affected.map((id) => productById.get(skuById.get(id)!.productId)?.name)),
    );
    signals.push({
      id: `sig-sup-${sup.id}`,
      kind: "supplier",
      route: "supplier",
      title: `${sup.name} 불량·파손 반품 ${liftTxt(lift)}`,
      subjectLabel: sup.name,
      supplierId: sup.id,
      skuIds: affected,
      recentCount: rq.length,
      recentRate,
      baselineRate,
      lift,
      reasons: reasonMix(rq),
      onset: onset.toISOString().slice(0, 10),
      lotPoId: lot?.id,
      lotReceivedAt: lot?.receivedAt,
      cost: lossOf(rq),
      evidence: [
        `최근 4주 불량·파손 ${rq.length}건 / 판매 ${units.r.toLocaleString()}개 = ${pctTxt(recentRate)} (평소 ${pctTxt(baselineRate)})`,
        cp
          ? `${onset.getMonth() + 1}/${onset.getDate()}경부터 증가 (이전 ${pctTxt(cp.before)} → 이후 ${pctTxt(cp.after)})${lot ? ` — 그 무렵 입고 ${lot.id} (${lot.receivedAt}, ${lot.receivedQty.toLocaleString()}개)` : ""}`
          : "증가 시점 특정 어려움 — 전 기간 고르게 높음",
        `관련 상품 ${productNames.length}종: ${productNames.slice(0, 3).join(", ")}${productNames.length > 3 ? " 외" : ""}`,
      ],
      suggestion: lot
        ? `${lot.id} 로트 잔량 검수·출고 보류, 공급사에 품질 클레임 및 대체 공급 검토`
        : "공급사 품질 점검 요청 및 대체 공급 검토",
    });
  }

  // 2) 물류 구역 — 오배송·구성누락 (주문 수 대비)
  for (const w of data.warehouses) {
    const isP = (r: ReturnRecord) =>
      r.warehouseId === w.id && (r.reason === "wrong_item" || r.reason === "missing");
    const rp = recent.filter(isP);
    const bp = base.filter(isP);
    const o = whOrders.get(w.id) ?? { recent: 0, base: 0 };
    const recentRate = o.recent ? rp.length / o.recent : 0;
    const baselineRate = o.base ? bp.length / o.base : 0;
    const lift = recentRate / Math.max(baselineRate, 1 / Math.max(1, o.base));
    if (!significant(rp.length, baselineRate * o.recent) || lift < 2) continue;
    signals.push({
      id: `sig-wh-${w.id}`,
      kind: "warehouse",
      route: "warehouse",
      title: `${w.name.split(" ")[0]} 오배송·구성누락 ${liftTxt(lift)}`,
      subjectLabel: w.name,
      warehouseId: w.id,
      skuIds: Array.from(new Set(rp.map((r) => r.skuId))),
      recentCount: rp.length,
      recentRate,
      baselineRate,
      lift,
      reasons: reasonMix(rp),
      cost: lossOf(rp),
      evidence: [
        `최근 4주 오배송·누락 ${rp.length}건 / 출고 ${o.recent.toLocaleString()}건 = ${pctTxt(recentRate)} (평소 ${pctTxt(baselineRate)})`,
        w.staff < w.staffPlanned
          ? `작업 인원 ${w.staff}명 (정원 ${w.staffPlanned}명) — 결원 상태에서 피킹 오류 증가`
          : "피킹 검수 단계 점검 필요",
      ],
      suggestion: "출고 전 검수(바코드 대조) 강화, 혼동 상품 진열 위치 분리",
    });
  }

  // 3) 상품정보 — 상품정보 차이
  for (const p of data.products) {
    const ids = data.skus.filter((s) => s.productId === p.id).map((s) => s.id);
    const isC = (r: ReturnRecord) => r.productId === p.id && r.reason === "info_mismatch";
    const rc = recent.filter(isC);
    const bc = base.filter(isC);
    const units = ids.reduce(
      (a, id) => ({ r: a.r + (skuUnits.get(id)?.recent ?? 0), b: a.b + (skuUnits.get(id)?.base ?? 0) }),
      { r: 0, b: 0 },
    );
    const recentRate = units.r ? rc.length / units.r : 0;
    const baselineRate = units.b ? bc.length / units.b : 0;
    const lift = recentRate / Math.max(baselineRate, 1 / Math.max(1, units.b));
    if (!significant(rc.length, baselineRate * units.r) || lift < 3) continue;
    signals.push({
      id: `sig-content-${p.id}`,
      kind: "content",
      route: "content",
      title: `${p.name} '상품정보 차이' 반품 ${liftTxt(lift)}`,
      subjectLabel: p.name,
      productId: p.id,
      skuIds: ids,
      recentCount: rc.length,
      recentRate,
      baselineRate,
      lift,
      reasons: reasonMix(rc),
      cost: lossOf(rc),
      evidence: [
        `최근 4주 ${rc.length}건 / 판매 ${units.r.toLocaleString()}개 = ${pctTxt(recentRate)} (평소 ${pctTxt(baselineRate)})`,
        "같은 사유가 한 상품에 집중 — 상세페이지 규격·호환 정보 확인 필요",
      ],
      suggestion: "상세페이지 규격·호환 표기 수정, 문의 많은 항목 상단 배치",
    });
  }

  // 4) 개별 SKU — 위에서 잡히지 않은 SKU 반품 급증 (단순 변심 제외)
  const covered = new Set(signals.flatMap((s) => s.skuIds));
  for (const sku of data.skus) {
    if (covered.has(sku.id)) continue;
    const isS = (r: ReturnRecord) => r.skuId === sku.id && ROUTE_OF[r.reason] !== null;
    const rs = recent.filter(isS);
    const bs = base.filter(isS);
    const u = skuUnits.get(sku.id) ?? { recent: 0, base: 0 };
    const recentRate = u.recent ? rs.length / u.recent : 0;
    const baselineRate = u.base ? bs.length / u.base : 0;
    const lift = recentRate / Math.max(baselineRate, 1 / Math.max(1, u.base));
    // 개별 SKU는 건수가 적어 우연이 섞이기 쉬우므로 5건 이상만
    if (rs.length < 5 || !significant(rs.length, baselineRate * u.recent) || lift < 2.5 || recentRate < 0.015)
      continue;
    const mix = reasonMix(rs);
    const route = ROUTE_OF[mix[0].reason] ?? "supplier";
    const p = productById.get(sku.productId)!;
    signals.push({
      id: `sig-sku-${sku.id}`,
      kind: "sku",
      route,
      title: `${p.name} ${sku.name} 반품 ${liftTxt(lift)}`,
      subjectLabel: `${p.name} · ${sku.name}`,
      productId: p.id,
      supplierId: sku.primarySupplierId,
      skuIds: [sku.id],
      recentCount: rs.length,
      recentRate,
      baselineRate,
      lift,
      reasons: mix,
      cost: lossOf(rs),
      evidence: [
        `최근 4주 ${rs.length}건 / 판매 ${u.recent.toLocaleString()}개 = ${pctTxt(recentRate)} (평소 ${pctTxt(baselineRate)})`,
        `주요 사유 ${RETURN_REASON_LABEL[mix[0].reason] ?? mix[0].reason} ${mix[0].count}건 · 공급 ${supplierById.get(sku.primarySupplierId)?.name ?? "-"}`,
      ],
      suggestion:
        route === "supplier"
          ? "공급사 품질 점검"
          : route === "content"
            ? "상세페이지 점검"
            : "피킹·출고 점검",
    });
  }
  return signals.sort((a, b) => b.cost - a.cost || b.lift - a.lift);
}

export interface ReturnSummary {
  total: number;
  recent: number;
  byReason: { reason: ReturnReason; count: number }[];
  byRoute: { route: ReturnRoute | "customer"; count: number }[];
  weekly: { weekStart: string; count: number }[];
  topSkus: { skuId: string; count: number; rate: number }[];
  bySupplier: { supplierId: string; quality: number; total: number }[];
  /** 최근 4주 반품률 (판매 수량 대비) */
  recentRate: number;
}

export function returnSummary(data: DemoData, ledger: Ledger | null, now: Date): ReturnSummary {
  const recs = returnRecords(data, ledger, now);
  const { skuUnits } = salesWindows(data, ledger, now);
  const recent = recs.filter((r) => r.daysAgo <= RECENT);
  const unitsRecent = Array.from(skuUnits.values()).reduce((a, v) => a + v.recent, 0);
  const byRouteMap = new Map<ReturnRoute | "customer", number>();
  recs.forEach((r) => {
    const k = ROUTE_OF[r.reason] ?? "customer";
    byRouteMap.set(k, (byRouteMap.get(k) ?? 0) + 1);
  });
  // 7일 단위로 꽉 찬 구간만 (원장 시작 쪽 부분 주는 건수가 적어 보이는 착시를 만든다)
  const weeks = Math.floor(((ledger?.days ?? 89) + 1) / 7);
  const weekly = Array.from({ length: weeks }, (_, i) => {
    const w = weeks - 1 - i;
    const start = new Date(now.getTime() - ((w + 1) * 7 - 1) * 86400000);
    return {
      weekStart: `${start.getMonth() + 1}/${start.getDate()}`,
      count: recs.filter((r) => r.daysAgo >= w * 7 && r.daysAgo < (w + 1) * 7).length,
    };
  });
  const skuCount = new Map<string, number>();
  recent.forEach((r) => skuCount.set(r.skuId, (skuCount.get(r.skuId) ?? 0) + 1));
  const supMap = new Map<string, { quality: number; total: number }>();
  recent.forEach((r) => {
    const v = supMap.get(r.supplierId) ?? { quality: 0, total: 0 };
    v.total += 1;
    if (r.reason === "defect" || r.reason === "damaged") v.quality += 1;
    supMap.set(r.supplierId, v);
  });
  return {
    total: recs.length,
    recent: recent.length,
    byReason: reasonMix(recs),
    byRoute: Array.from(byRouteMap.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count),
    weekly,
    topSkus: Array.from(skuCount.entries())
      .map(([skuId, count]) => ({
        skuId,
        count,
        rate: count / Math.max(1, skuUnits.get(skuId)?.recent ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    bySupplier: Array.from(supMap.entries())
      .map(([supplierId, v]) => ({ supplierId, ...v }))
      .sort((a, b) => b.quality - a.quality),
    recentRate: unitsRecent ? recent.reduce((a, r) => a + r.qty, 0) / unitsRecent : 0,
  };
}
