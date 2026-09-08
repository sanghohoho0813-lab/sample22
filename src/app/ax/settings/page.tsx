import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import SettingsView from "@/components/ax/SettingsView";

export const metadata: Metadata = { title: "설정 · Business AX", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="설정" subtitle="Theme 9 · 글자 크기 · 역할 · 데이터 연결 · AI 상태 · 기술자산 · Demo">
      <ClientGate><Suspense fallback={null}><SettingsView /></Suspense></ClientGate>
    </AxShell>
  );
}
