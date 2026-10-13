/**
 * 공급사 실적 — 계약서의 약속이 아니라 실제 입고·반품 기록으로 잰다.
 * (원장의 지난 90일 발주·입고 + 진행 중 발주 + 판매·반품)
 */
import type { DemoData, Supplier } from "./types";
import type { Ledger } from "./ledger";
import { memoLast } from "./memo";

export interface SupplierPerformance {
  supplier: Supplier;
  /** 지난 90일 입고 완료 발주 수 */
  poCount: number;
  onTimeRate: number;
  /** 늦은 건의 평균 지연일 */
  avgDelayDays: number;
  fillRate: number;
  /** 판매 수량 대비 불량·파손 반품 비율 */
  defectRate: number;
  defectReturns: number;
  unitsSold: number;
  /** 이 공급사만 공급하는 SKU 수 (대체 불가 = 의존도) */
  soleSourceSkus: number;
  skuCount: number;
  openPos: number;
  lateOpenPos: number;
  /** 실적 데이터가 충분한가 (발주 3건 이상) */
  enoughData: boolean;
}

export const supplierPerformance = memoLast(supplierPerformanceRaw);

function supplierPerformanceRaw(data: DemoData, ledger: Ledger | null, now: Date) {
  const out = new Map<string, SupplierPerformance>();
  const skuById = new Map(data.skus.map((s) => [s.id, s]));
  const unitsBySupplier = new Map<string, number>();
  const defectsBySupplier = new Map<string, number>();
  ledger?.orders.forEach((o) =>
    o.lines.forEach((l) => {
      const sid = skuById.get(l.skuId)?.primarySupplierId;
      if (!sid) return;
      unitsBySupplier.set(sid, (unitsBySupplier.get(sid) ?? 0) + l.qty);
      if (
        o.returned?.skuId === l.skuId &&
        (o.returned.reason === "defect" || o.returned.reason === "damaged")
      )
        defectsBySupplier.set(sid, (defectsBySupplier.get(sid) ?? 0) + o.returned.qty);
    }),
  );
  data.returns.forEach((r) => {
    if ((r.reason === "defect" || r.reason === "damaged") && r.supplierId && !ledger)
      defectsBySupplier.set(r.supplierId, (defectsBySupplier.get(r.supplierId) ?? 0) + 1);
  });
  const sourcesBySku = new Map<string, Set<string>>();
  data.supplierProducts.forEach((sp) => {
    const set = sourcesBySku.get(sp.skuId) ?? new Set<string>();
    set.add(sp.supplierId);
    sourcesBySku.set(sp.skuId, set);
  });
  const today = now.toISOString().slice(0, 10);
  for (const s of data.suppliers) {
    const pos = ledger?.purchaseOrders.filter((p) => p.supplierId === s.id) ?? [];
    const late = pos.filter((p) => p.delayDays > 0);
    const qty = pos.reduce((a, p) => a + p.qty, 0);
    const rec = pos.reduce((a, p) => a + p.receivedQty, 0);
    const units = unitsBySupplier.get(s.id) ?? 0;
    const defects = defectsBySupplier.get(s.id) ?? 0;
    const skus = data.supplierProducts.filter((sp) => sp.supplierId === s.id).map((sp) => sp.skuId);
    const open = data.purchaseOrders.filter(
      (p) => p.supplierId === s.id && ["requested", "confirmed", "in_transit"].includes(p.status),
    );
    const enough = pos.length >= 3;
    out.set(s.id, {
      supplier: s,
      poCount: pos.length,
      onTimeRate: enough ? (pos.length - late.length) / pos.length : s.onTimeRate,
      avgDelayDays: late.length ? late.reduce((a, p) => a + p.delayDays, 0) / late.length : 0,
      fillRate: enough && qty > 0 ? rec / qty : s.fillRate,
      defectRate: units > 0 ? defects / units : s.defectRate,
      defectReturns: defects,
      unitsSold: units,
      soleSourceSkus: skus.filter((id) => (sourcesBySku.get(id)?.size ?? 0) <= 1).length,
      skuCount: new Set(skus).size,
      openPos: open.length,
      lateOpenPos: open.filter((p) => !!p.note || p.expectedAt < today).length,
      enoughData: enough,
    });
  }
  return out;
}
