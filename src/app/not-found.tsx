import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-mist">
      <div className="card p-8 text-center max-w-md">
        <div className="text-5xl font-black text-primary/30">404</div>
        <h1 className="text-xl font-bold mt-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-muted mt-1 text-sm">주소를 확인하거나 아래에서 이동하세요.</p>
        <div className="mt-4 flex gap-2 justify-center"><Link href="/" className="btn-primary btn-sm">Customer Platform</Link><Link href="/ax" className="btn-outline btn-sm">Business AX</Link></div>
      </div>
    </div>
  );
}
