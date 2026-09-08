import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import CustomersView from "@/components/ax/CustomersView";

export const metadata: Metadata = { title: "고객·재구매 · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="고객·재구매" subtitle="구매주기 도래 고객을 먼저 발견해 Repeat Basket으로 연결">
      <ClientGate><Suspense fallback={null}><CustomersView /></Suspense></ClientGate>
    </AxShell>
  );
}
