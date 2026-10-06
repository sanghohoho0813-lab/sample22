"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/lib/hooks";

/**
 * 저장된 시연 데이터를 불러오기 전(첫 진입 순간)에는 화면 모양을 닮은 자리표시를 보여준다.
 * AX 화면은 KPI 4칸 + 패널, 고객 화면은 상품 카드 모양 — 데이터가 들어와도 레이아웃이 크게 흔들리지 않게.
 */
export default function ClientGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  if (hydrated) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  if (pathname?.startsWith("/ax"))
    return (
      <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[104px] rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-[320px] rounded-2xl" />
      </div>
    );
  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-6" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-9 w-1/2 max-w-xs rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
