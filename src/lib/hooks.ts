"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import { assessOrderRisks, buildBriefing, buildSkuInsights, type SkuInsight } from "./engines";

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
  return useMemo(() => buildSkuInsights(data), [data]);
}

export function useOrderRisks() {
  const data = useData();
  return useMemo(() => assessOrderRisks(data), [data]);
}

export function useBriefing() {
  const data = useData();
  const insights = useInsights();
  const risks = useOrderRisks();
  return useMemo(() => buildBriefing(data, insights, risks), [data, insights, risks]);
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
    try { setInIframe(window.self !== window.top); } catch { setInIframe(true); }
  }, []);
  return inIframe;
}
