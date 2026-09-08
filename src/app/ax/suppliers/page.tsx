import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import SuppliersView from "@/components/ax/SuppliersView";

export const metadata: Metadata = { title: "공급사·구매 · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="공급사·구매" subtitle="단가·납기·충족률·불량을 함께 비교하는 Supplier Decision">
      <ClientGate><Suspense fallback={null}><SuppliersView /></Suspense></ClientGate>
    </AxShell>
  );
}
