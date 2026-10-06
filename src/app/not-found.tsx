import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="text-5xl font-black text-primary/30">404</div>
        <h1 className="mt-2 text-xl font-bold">페이지를 찾을 수 없습니다</h1>
        <p className="mt-1 text-sm text-muted">주소를 확인하거나 아래에서 이동하세요.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/" className="btn-primary btn-sm">
            고객 플랫폼
          </Link>
          <Link href="/ax" className="btn-outline btn-sm">
            AX 운영화면
          </Link>
        </div>
      </div>
    </div>
  );
}
