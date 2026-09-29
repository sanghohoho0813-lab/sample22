import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import PresentationView from "@/components/ax/PresentationView";

export const metadata: Metadata = { title: "시연 모드 · AX 운영화면", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="시연 모드" subtitle="실제 앱 기능을 따라가는 3~5분 단계별 시연">
      <ClientGate><Suspense fallback={null}><PresentationView /></Suspense></ClientGate>
    </AxShell>
  );
}
