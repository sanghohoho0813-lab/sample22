import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import ActionsView from "@/components/ax/ActionsView";

export const metadata: Metadata = { title: "Growth & Action Center · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="Growth & Action Center" subtitle="추천 → 확인 → 승인 → 실행 → 결과 → Evidence. 근거 없는 추천은 없습니다">
      <ClientGate><Suspense fallback={null}><ActionsView /></Suspense></ClientGate>
    </AxShell>
  );
}
