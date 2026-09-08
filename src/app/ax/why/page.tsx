import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import WhyAxView from "@/components/ax/WhyAxView";

export const metadata: Metadata = { title: "기획의도 · Why AX · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="기획의도 · Why AX" subtitle="왜 NEXMART에 AX+플랫폼이 필요한가 — 16개 섹션">
      <ClientGate><Suspense fallback={null}><WhyAxView /></Suspense></ClientGate>
    </AxShell>
  );
}
