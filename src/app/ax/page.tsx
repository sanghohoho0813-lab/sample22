import type { Metadata } from "next";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import DashboardView from "@/components/ax/DashboardView";

export const metadata: Metadata = { title: "경영 대시보드 · Business AX", robots: { index: false } };

export default function AxHome() {
  return (
    <AxShell title="경영 대시보드" subtitle="오늘 무엇이 잘되고, 어디에서 돈이 새고, 무엇을 먼저 발주·처리해야 하는가">
      <ClientGate><DashboardView /></ClientGate>
    </AxShell>
  );
}
