"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, LayoutDashboard } from "lucide-react";

/**
 * 렌더링 예외가 나도 흰 화면("화면 오류")으로 끝나지 않게 한다.
 * 다시 시도 → 안 되면 Demo 데이터 초기화(저장 상태 손상 대비) → 홈/AX 이동.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[NEXMART] render error:", error);
  }, [error]);
  const hardReset = () => {
    try {
      localStorage.removeItem("nexmart-demo-v1");
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist p-6">
      <div className="card fade-up w-full max-w-lg p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle size={24} />
        </div>
        <h1 className="mt-3 text-2xl font-bold">화면을 불러오는 중 문제가 생겼습니다</h1>
        <p className="mt-1 text-muted">
          시연 데이터는 브라우저에 저장되어 있어 아래 순서로 복구할 수 있습니다. 데이터 초기화 시 주문·실행
          진행 상태는 초기 시나리오로 돌아갑니다.
        </p>
        {error?.message && (
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-mist p-3 text-xs text-muted">
            {error.message}
            {error.digest ? ` · ${error.digest}` : ""}
          </pre>
        )}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button className="btn-primary" onClick={reset}>
            <RotateCcw size={16} />
            다시 시도
          </button>
          <button className="btn-outline" onClick={hardReset}>
            시연 데이터 초기화 후 홈으로
          </button>
          <Link href="/" className="btn-ghost">
            <Home size={16} />
            고객 플랫폼
          </Link>
          <Link href="/ax" className="btn-ghost">
            <LayoutDashboard size={16} />
            AX 운영화면
          </Link>
        </div>
      </div>
    </div>
  );
}
