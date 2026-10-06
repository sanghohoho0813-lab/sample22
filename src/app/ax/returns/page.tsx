import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import ReturnsView from "@/components/ax/ReturnsView";

export const metadata: Metadata = { title: "반품·문의 · AX 운영화면", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="반품·문의" subtitle="사유·단계·공급사별로 나누어 개선 실행으로 연결">
      <ClientGate><Suspense fallback={null}><ReturnsView /></Suspense></ClientGate>
    </AxShell>
  );
}
