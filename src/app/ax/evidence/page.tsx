import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import EvidenceView from "@/components/ax/EvidenceView";

export const metadata: Metadata = { title: "AX Evidence · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="AX Evidence" subtitle="실증 준비 — Action과 결과를 연결해 남깁니다">
      <ClientGate><Suspense fallback={null}><EvidenceView /></Suspense></ClientGate>
    </AxShell>
  );
}
