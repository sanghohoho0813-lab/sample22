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
        {/* 상단 상태줄(한 줄 5칸) + 표 패널 — 실제 업무 화면 구성과 같은 모양 */}
        <div className="skeleton h-[92px] rounded-2xl" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border border-line bg-white p-5">
            <div className="skeleton h-6 w-1/3" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
          <div className="skeleton hidden h-[360px] rounded-2xl xl:block" />
        </div>
      </div>
    );
  return (
    <div className="mx-auto max-w-[1280px] space-y-5 px-4 py-6" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-9 w-1/2 max-w-xs rounded-xl" />
      <div className="skeleton h-12 max-w-3xl rounded-full" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** 상품 카드 자리표시 — 이미지 타일 + 브랜드·이름·가격 3줄 (실제 카드와 같은 비율) */
export function ProductSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-square rounded-2xl" />
      <div className="skeleton mt-3 h-3 w-1/3" />
      <div className="skeleton mt-2 h-4 w-5/6" />
      <div className="skeleton mt-2 h-5 w-1/2" />
    </div>
  );
}
