import type { Metadata } from "next";
import { Suspense } from "react";
import AxShell from "@/components/ax/AxShell";
import ClientGate from "@/components/shared/ClientGate";
import SalesView from "@/components/ax/SalesView";

export const metadata: Metadata = { title: "매출·이익 · AX 운영화면", robots: { index: false } };

export default function Page() {
  return (
    <AxShell title="매출·이익" subtitle="매출과 이익을 나눠 보고, 어디서 이익이 새는지 찾습니다">
      <ClientGate>
        <Suspense fallback={null}>
          <SalesView />
        </Suspense>
      </ClientGate>
    </AxShell>
  );
}
