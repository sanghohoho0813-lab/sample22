import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import SalesView from "@/components/ax/SalesView";

export const metadata: Metadata = { title: "매출·마진 · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="매출·마진" subtitle="매출이 올라도 남는 게 없는 상품을 찾습니다">
      <ClientGate><Suspense fallback={null}><SalesView /></Suspense></ClientGate>
    </AxShell>
  );
}
