"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { buildSkuInsights, type SkuInsight } from "./engines";
import { getLedger } from "./dataset";
import { forecastShipments } from "./fulfillment";
import { marginReport } from "./margin";
import { returnSignals } from "./returns";
import { repeatReport } from "./repeat";
import { buildExceptions, forRole } from "./control";
import { ledgerOrderToOrder, type Ledger } from "./ledger";
import { DEFAULT_COST_MODEL } from "./costs";
import type { Order } from "./types";

export function useHydrated() {
  const hydrated = useStore((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && hydrated;
}

export function useData() {
  return useStore((s) => s.data);
}

export function useInsights(): SkuInsight[] {
  const data = useData();
  const now = useMinute();
  return useMemo(() => buildSkuInsights(data, now), [data, now]);
}

/** 분 단위로 바뀌는 같은 Date 객체 — 분석 계산이 1분에 한 번만 다시 돈다 */
let minuteCache: Date | null = null;
const minuteNow = () => {
  const t = new Date();
  t.setSeconds(0, 0);
  if (!minuteCache || minuteCache.getTime() !== t.getTime()) minuteCache = t;
  return minuteCache;
};
export function useMinute() {
  const [now, setNow] = useState(minuteNow);
  useEffect(() => {
    const t = setInterval(() => setNow(minuteNow()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** 90일 주문 원장 (저장하지 않고 생성 시각으로 다시 만든다) */
export function useLedger(): Ledger | null {
  const data = useData();
  return useMemo(() => (data.generatedAt ? getLedger(data) : null), [data]);
}

export function useBulkyOf() {
  const products = useStore((s) => s.data.products);
  return useMemo(() => {
    const m = new Map(products.map((p) => [p.id, !!p.bulky]));
    return (pid: string) => m.get(pid) ?? false;
  }, [products]);
}

export function useForecast(staff?: Record<string, number>, priority?: Set<string>) {
  const data = useData();
  const now = useMinute();
  const bulkyOf = useBulkyOf();
  return useMemo(
    () => forecastShipments(data, now, { bulkyOf, staff, priority }),
    [data, now, bulkyOf, staff, priority],
  );
}

export function useCustomerName() {
  const ledger = useLedger();
  const customers = useStore((s) => s.data.customers);
  return useMemo(() => {
    const m = new Map<string, string>();
    ledger?.customers.forEach((c) => m.set(c.id, c.name));
    customers.forEach((c) => m.set(c.id, c.name));
    return (id: string) => m.get(id) ?? id;
  }, [ledger, customers]);
}

/** 고객 배송비 규칙 — 설정의 비용 기준과 같은 값 (주문 생성 시 store.placeOrder도 같은 값을 쓴다) */
export function useShippingRule() {
  const m = useStore((s) => s.ui.costModel) ?? DEFAULT_COST_MODEL;
  return useMemo(
    () => ({
      threshold: m.freeShippingThreshold,
      fee: m.shippingFee,
      feeFor: (subtotal: number) =>
        subtotal <= 0 || subtotal >= m.freeShippingThreshold ? 0 : m.shippingFee,
    }),
    [m.freeShippingThreshold, m.shippingFee],
  );
}

export function useMargin(days = 30) {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const model = useStore((s) => s.ui.costModel) ?? DEFAULT_COST_MODEL;
  const customerName = useCustomerName();
  return useMemo(
    () => marginReport(data, ledger, now, { days, model, customerName }),
    [data, ledger, now, days, model, customerName],
  );
}

export function useReturnSignals() {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  return useMemo(() => returnSignals(data, ledger, now), [data, ledger, now]);
}

export function useRepeat() {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  return useMemo(() => repeatReport(data, ledger, now), [data, ledger, now]);
}

/** 컨트롤 타워 예외 (역할 기준 정렬 선택) */
export function useExceptions(byRole = false) {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const insights = useInsights();
  const forecast = useForecast();
  const margin = useMargin(30);
  const signals = useReturnSignals();
  const repeat = useRepeat();
  const role = useStore((s) => s.ui.role);
  return useMemo(() => {
    const all = buildExceptions({ data, ledger, now, insights, forecast, margin, signals, repeat });
    return byRole ? forRole(all, role) : all;
  }, [data, ledger, now, insights, forecast, margin, signals, repeat, byRole, role]);
}

/** 저장 주문 + 원장 주문을 같은 모양으로 찾기 (반품·고객 이력에서 과거 주문 열기) */
export function useOrderLookup() {
  const data = useData();
  const ledger = useLedger();
  return useMemo(() => {
    const live = new Map(data.orders.map((o) => [o.id, o]));
    const products = new Map(data.products.map((p) => [p.id, p]));
    const skus = new Map(data.skus.map((s) => [s.id, s]));
    const hist = new Map(ledger?.orders.map((o) => [o.id, o]) ?? []);
    return (id: string): Order | undefined => {
      const o = live.get(id);
      if (o) return o;
      const h = hist.get(id);
      return h ? ledgerOrderToOrder(h, products, skus) : undefined;
    };
  }, [data.orders, data.products, data.skus, ledger]);
}

/** 값이 커질 때만 잠깐 true — 장바구니 배지 "튀는" 반응용 (첫 렌더·감소에는 반응하지 않음) */
export function useBump(value: number, ms = 380) {
  const prev = useRef<number | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prev.current !== null && value > prev.current) {
      setOn(true);
      const t = setTimeout(() => setOn(false), ms);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value, ms]);
  return on;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useLookups() {
  const data = useData();
  return useMemo(
    () => ({
      productById: new Map(data.products.map((p) => [p.id, p])),
      skuById: new Map(data.skus.map((s) => [s.id, s])),
      supplierById: new Map(data.suppliers.map((s) => [s.id, s])),
      customerById: new Map(data.customers.map((c) => [c.id, c])),
      brandById: new Map(data.brands.map((b) => [b.id, b])),
      categoryBySlug: new Map(data.categories.map((c) => [c.slug, c])),
      invBySku: new Map(data.inventory.map((i) => [i.skuId, i])),
      warehouseById: new Map(data.warehouses.map((w) => [w.id, w])),
      skusByProduct: (pid: string) => data.skus.filter((s) => s.productId === pid),
    }),
    [data],
  );
}

export function useIsInIframe() {
  const [inIframe, setInIframe] = useState(false);
  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);
  return inIframe;
}
