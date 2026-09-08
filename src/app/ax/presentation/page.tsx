import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import PresentationView from "@/components/ax/PresentationView";

export const metadata: Metadata = { title: "Presentation Mode · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="Presentation Mode" subtitle="실제 앱 기능을 따라가는 3~5분 Guided Journey">
      <ClientGate><Suspense fallback={null}><PresentationView /></Suspense></ClientGate>
    </AxShell>
  );
}
