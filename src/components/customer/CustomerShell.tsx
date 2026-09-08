"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, ShoppingCart, User, Home, LayoutGrid, Zap, Tag, RotateCcw, PackageSearch, X, Clock3, ChevronRight, Bell } from "lucide-react";
import { useStore } from "@/lib/store";
import { useData, useHydrated, useIsInIframe } from "@/lib/hooks";
import { autocomplete, SUGGESTED_SEARCHES } from "@/lib/catalog";
import { DemoBadge } from "@/components/shared/Badge";

const NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/category", label: "카테고리", icon: LayoutGrid },
  { href: "/fast", label: "빠른배송", icon: Zap },
  { href: "/deals", label: "특가", icon: Tag },
  { href: "/my/repeat", label: "다시 구매", icon: RotateCcw },
  { href: "/track", label: "주문조회", icon: PackageSearch },
];

export function SearchBox({ autoFocus = false, onDone, size = "md" }: { autoFocus?: boolean; onDone?: () => void; size?: "md" | "lg" }) {
  const data = useData();
  const router = useRouter();
  const recent = useStore((s) => s.ui.recentSearches);
  const pushRecent = useStore((s) => s.pushRecentSearch);
  const clearRecent = useStore((s) => s.clearRecentSearches);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const sugg = autocomplete(data, q);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    pushRecent(t);
    setOpen(false);
    setQ("");
    onDone?.();
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <div ref={wrap} className="relative w-full">
      <form role="search" onSubmit={(e) => { e.preventDefault(); go(q); }} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={size === "lg" ? 22 : 18} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
          placeholder="물티슈, 생수, 배변패드… 필요한 생활상품을 검색"
          aria-label="통합검색"
          className={`input ${size === "lg" ? "pl-12 pr-24 !min-h-[56px] text-[17px]" : "pl-10 pr-20 !min-h-[46px]"} rounded-full border-2 border-line focus:border-primary`}
        />
        {q && <button type="button" onClick={() => setQ("")} aria-label="지우기" className="absolute right-[76px] top-1/2 -translate-y-1/2 text-muted hover:text-ink"><X size={16} /></button>}
        <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary !min-h-[36px] rounded-full !px-4 text-sm">검색</button>
      </form>
      {open && (
        <div className="absolute z-40 mt-2 w-full card-raised p-3 fade-up">
          {q ? (
            sugg.length ? (
              <ul>
                {sugg.map((s) => (
                  <li key={s}><button type="button" onMouseDown={() => go(s)} className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-mist flex items-center gap-2 text-[15px]"><Search size={15} className="text-muted" />{s}</button></li>
                ))}
              </ul>
            ) : (
              <div className="px-2 py-3 text-sm text-muted">일치하는 추천어가 없습니다. Enter로 전체 검색합니다.</div>
            )
          ) : (
            <div className="space-y-3">
              {recent.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-1 mb-1"><span className="text-xs font-semibold text-muted">최근 검색어</span><button type="button" onMouseDown={clearRecent} className="text-xs text-muted hover:text-ink">전체 삭제</button></div>
                  <div className="flex flex-wrap gap-1.5">{recent.map((r) => <button key={r} type="button" onMouseDown={() => go(r)} className="chip"><Clock3 size={13} className="text-muted" />{r}</button>)}</div>
                </div>
              )}
              <div>
                <div className="px-1 mb-1 text-xs font-semibold text-muted">추천 검색어</div>
                <div className="flex flex-wrap gap-1.5">{SUGGESTED_SEARCHES.map((r) => <button key={r} type="button" onMouseDown={() => go(r)} className="chip">{r}</button>)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerShell({ children, hideBottomNav = false, plain = false }: { children: ReactNode; hideBottomNav?: boolean; plain?: boolean }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const cartCount = useStore((s) => s.ui.cart.reduce((a, c) => a + c.qty, 0));
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const unread = data.notifications.filter((n) => n.customerId === customerId && !n.read).length;
  const inIframe = useIsInIframe();
  const [searchOpen, setSearchOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-[1280px] px-4">
          <div className="flex items-center gap-3 sm:gap-6 h-16">
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="NEXMART 홈">
              <span className="w-9 h-9 rounded-xl bg-navy text-white font-black text-lg flex items-center justify-center">N</span>
              <span className="font-black text-xl tracking-tight text-navy hidden xs:inline">NEXMART</span>
              <DemoBadge className="hidden sm:inline-flex" />
            </Link>
            <div className="hidden md:block flex-1 max-w-2xl"><SearchBox /></div>
            <div className="flex-1 md:hidden" />
            <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button className="btn-ghost !px-2.5 md:hidden" aria-label="검색" onClick={() => setSearchOpen(true)}><Search size={22} /></button>
              <Link href="/my" className="btn-ghost !px-2.5 relative hidden sm:inline-flex" aria-label="알림">
                <Bell size={22} />{hydrated && unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange" />}
              </Link>
              <Link href="/cart" className="btn-ghost !px-2.5 relative" aria-label={`장바구니 ${cartCount}개`}>
                <ShoppingCart size={22} />
                {hydrated && cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-orange text-white text-[11px] font-bold flex items-center justify-center">{cartCount}</span>}
              </Link>
              <Link href="/my" className="btn-ghost !px-2.5 hidden sm:inline-flex" aria-label="마이페이지"><User size={22} /></Link>
            </nav>
          </div>
          {!plain && (
            <nav className="hidden md:flex items-center gap-1 h-11 -mx-1" aria-label="주요 메뉴">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`px-3 h-9 inline-flex items-center gap-1.5 rounded-lg text-[15px] font-semibold transition-colors ${isActive(n.href) ? "text-primary bg-soft" : "text-ink hover:bg-mist"}`}>
                  <n.icon size={16} />{n.label}
                </Link>
              ))}
              <span className="ml-auto text-xs text-muted">오늘 15:00 전 주문 시 빠른배송 상품은 내일 도착</span>
            </nav>
          )}
        </div>
        {/* mobile search overlay */}
        {searchOpen && (
          <div className="fixed inset-0 z-[60] bg-white md:hidden fade-up">
            <div className="flex items-center gap-2 px-3 h-16 border-b border-line">
              <div className="flex-1"><SearchBox autoFocus onDone={() => setSearchOpen(false)} /></div>
              <button className="btn-ghost !px-2" onClick={() => setSearchOpen(false)} aria-label="닫기"><X size={22} /></button>
            </div>
            <div className="p-4 text-sm text-muted">검색어를 입력하고 Enter 또는 검색을 누르세요.</div>
          </div>
        )}
      </header>

      <main className={`flex-1 ${hideBottomNav ? "" : "pb-24 md:pb-0"}`}>{children}</main>

      {!plain && (
        <footer className="border-t border-line bg-mist mt-10 hidden md:block">
          <div className="mx-auto max-w-[1280px] px-4 py-10 grid grid-cols-4 gap-8 text-sm">
            <div>
              <div className="font-black text-lg text-navy">NEXMART</div>
              <p className="text-muted mt-2 leading-relaxed">생활·식품·주방·리빙·반려·소형가전을 한곳에서. 이 사이트는 AX+플랫폼 시연용 가상 서비스이며 실제 결제·배송은 연결되어 있지 않습니다.</p>
            </div>
            <div>
              <div className="font-semibold mb-2">고객 안내</div>
              <ul className="space-y-1.5 text-muted">
                <li><Link href="/track" className="hover:text-ink">주문·배송조회</Link></li>
                <li><Link href="/my" className="hover:text-ink">취소·반품·교환</Link></li>
                <li><Link href="/#trust" className="hover:text-ink">배송·교환 안내</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">서비스</div>
              <ul className="space-y-1.5 text-muted">
                <li><Link href="/fast" className="hover:text-ink">빠른배송</Link></li>
                <li><Link href="/my/repeat" className="hover:text-ink">다시 구매 (Repeat Basket)</Link></li>
                <li><span className="inline-flex items-center gap-1">정기배송 <span className="badge bg-line text-muted">NEXT</span></span></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">회사</div>
              <ul className="space-y-1.5 text-muted">
                <li>(주)넥스마트 · 가상의 시연 기업</li>
                <li>고객센터 1588-0000 (시연)</li>
                {!inIframe && <li><Link href="/ax" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">관리자 Demo — Business AX <ChevronRight size={14} /></Link></li>}
              </ul>
            </div>
          </div>
        </footer>
      )}

      {!hideBottomNav && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-line safe-bottom" aria-label="모바일 메뉴">
          <ul className="grid grid-cols-5 h-16">
            {[
              { href: "/", label: "홈", icon: Home },
              { href: "/category", label: "카테고리", icon: LayoutGrid },
              { href: "/search", label: "검색", icon: Search },
              { href: "/cart", label: "장바구니", icon: ShoppingCart, count: cartCount },
              { href: "/my", label: "마이", icon: User },
            ].map((n) => {
              const on = isActive(n.href);
              return (
                <li key={n.href}>
                  <Link href={n.href} className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold relative ${on ? "text-primary" : "text-muted"}`}>
                    <n.icon size={22} strokeWidth={on ? 2.4 : 2} />
                    {n.label}
                    {hydrated && n.count ? <span className="absolute top-1.5 right-1/2 translate-x-4 min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-white text-[10px] font-bold flex items-center justify-center">{n.count}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
