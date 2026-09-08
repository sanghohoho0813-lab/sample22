"use client";
import type { ReactNode } from "react";
import { useHydrated } from "@/lib/hooks";

export default function ClientGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated)
    return (
      fallback ?? (
        <div className="mx-auto max-w-[1280px] px-4 py-6 space-y-4" aria-busy="true" aria-label="불러오는 중">
          <div className="skeleton h-10 w-2/3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div>
        </div>
      )
    );
  return <>{children}</>;
}
