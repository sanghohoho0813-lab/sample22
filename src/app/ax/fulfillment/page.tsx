import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import FulfillmentView from "@/components/ax/FulfillmentView";

export const metadata: Metadata = { title: "주문·출고 · AX 운영화면", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="주문·출고" subtitle="출고 관제 — 주문접수부터 배송까지 지연위험과 우선처리">
      <ClientGate><Suspense fallback={null}><FulfillmentView /></Suspense></ClientGate>
    </AxShell>
  );
}
