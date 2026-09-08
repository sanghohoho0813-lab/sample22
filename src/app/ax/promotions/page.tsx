import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import PromotionsView from "@/components/ax/PromotionsView";

export const metadata: Metadata = { title: "프로모션 · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="프로모션" subtitle="실제로 남는 것이 있는가 — 매출이 아니라 실질마진으로 평가">
      <ClientGate><Suspense fallback={null}><PromotionsView /></Suspense></ClientGate>
    </AxShell>
  );
}
