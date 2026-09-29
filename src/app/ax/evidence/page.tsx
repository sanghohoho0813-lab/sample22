import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import EvidenceView from "@/components/ax/EvidenceView";

export const metadata: Metadata = { title: "AX 성과 기록 · AX 운영화면", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="AX 성과 기록" subtitle="실증 준비 — 실행과 결과를 연결해 남깁니다">
      <ClientGate><Suspense fallback={null}><EvidenceView /></Suspense></ClientGate>
    </AxShell>
  );
}
