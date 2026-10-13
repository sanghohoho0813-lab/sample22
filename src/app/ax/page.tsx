import type { Metadata } from "next";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import DashboardView from "@/components/ax/DashboardView";

export const metadata: Metadata = { title: "컨트롤 타워 · AX 운영화면", robots: { index: false } };

export default function AxHome() {
  return (
    <AxShell title="컨트롤 타워" subtitle="오늘 이익과 고객에 영향을 줄 일을 근거와 함께, 먼저 처리할 순서로">
      <ClientGate>
        <DashboardView />
      </ClientGate>
    </AxShell>
  );
}
