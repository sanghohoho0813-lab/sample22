import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import ActionsView from "@/components/ax/ActionsView";

export const metadata: Metadata = { title: "실행 센터 · AX 운영화면", robots: { index: false } };

export default function Page() {
  return (
    <AxShell
      title="실행 센터"
      subtitle="추천 → 확인 → 승인 → 실행 → 결과 → 성과 기록. 근거 없는 추천은 없습니다"
    >
      <ClientGate>
        <Suspense fallback={null}>
          <ActionsView />
        </Suspense>
      </ClientGate>
    </AxShell>
  );
}
