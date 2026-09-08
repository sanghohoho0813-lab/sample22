import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import ProductsView from "@/components/ax/ProductsView";

export const metadata: Metadata = { title: "상품·SKU · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="상품·SKU" subtitle="상품 → SKU별 판매·재고 → 수요신호 → 공급사 → 발주이력 → Action">
      <ClientGate><Suspense fallback={null}><ProductsView /></Suspense></ClientGate>
    </AxShell>
  );
}
