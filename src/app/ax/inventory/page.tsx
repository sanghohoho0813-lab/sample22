import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import InventoryView from "@/components/ax/InventoryView";

export const metadata: Metadata = { title: "재고·발주 · AX 운영화면", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="재고·발주" subtitle="재고·발주 레이더 — 품절위험과 발주 우선순위">
      <ClientGate><Suspense fallback={null}><InventoryView /></Suspense></ClientGate>
    </AxShell>
  );
}
