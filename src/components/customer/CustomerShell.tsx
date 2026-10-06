"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Search,
  ShoppingCart,
  User,
  Home,
  LayoutGrid,
  Zap,
  Tag,
  RotateCcw,
  PackageSearch,
  X,
  Clock3,
  ChevronRight,
  ChevronLeft,
  Bell,
  LayoutDashboard,
  Presentation,
  Truck,
  Headset,
  Menu,
  ArrowRight,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useData, useHydrated, useIsInIframe, useNow } from "@/lib/hooks";
import { autocomplete, SUGGESTED_SEARCHES } from "@/lib/catalog";
import Overlay from "@/components/shared/Overlay";
import SampleBridgeCTA from "@/components/shared/SampleBridgeCTA";
import MobileDrawer from "@/components/shared/MobileDrawer";
import { STAGE_LABEL } from "@/lib/labels";
import { shipCutdown, todayLabel } from "@/lib/format";

const NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/category", label: "카테고리", icon: LayoutGrid },
  { href: "/fast", label: "빠른배송", icon: Zap },
  { href: "/deals", label: "특가", icon: Tag },
  { href: "/my/repeat", label: "다시 구매", icon: RotateCcw },
  { href: "/track", label: "주문조회", icon: PackageSearch },
];

/**
 * 고객 플랫폼 모바일 메뉴 — 고객이 자주 하는 행동 중심 2개 분류 (내부 업무 기능은 노출하지 않음)
 * 같은 분류 = 같은 아이콘 색 계열 (쇼핑: 틸 · 내 쇼핑: 네이비)
 */
const CUSTOMER_MENU: {
  label: string;
  color: string;
  items: { href: string; label: string; icon: typeof Home; hint?: string }[];
}[] = [
  {
    label: "쇼핑하기",
    color: "#0FAF9A",
    items: [
      { href: "/", label: "홈", icon: Home },
      { href: "/category", label: "카테고리", icon: LayoutGrid },
      { href: "/fast", label: "빠른배송", icon: Zap, hint: "15시 전 주문 시 내일 도착" },
      { href: "/deals", label: "특가", icon: Tag },
    ],
  },
  {
    label: "내 쇼핑",
    color: "#10243E",
    items: [
      { href: "/my/repeat", label: "다시 구매", icon: RotateCcw, hint: "자주 사는 상품 한 번에 담기" },
      { href: "/track", label: "주문·배송조회", icon: PackageSearch },
      { href: "/cart", label: "장바구니", icon: ShoppingCart },
      { href: "/my", label: "마이페이지", icon: User, hint: "주문내역 · 취소·반품 · 알림" },
    ],
  },
];

export function SearchBox({
  autoFocus = false,
  onDone,
  size = "md",
  label = "상품 검색",
}: {
  autoFocus?: boolean;
  onDone?: () => void;
  size?: "md" | "lg";
  /** 한 화면에 검색창이 둘 이상일 때 구분용 (검색 랜드마크 이름) */
  label?: string;
}) {
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
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
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
      <form
        role="search"
        aria-label={label}
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="relative"
      >
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          size={size === "lg" ? 22 : 18}
        />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
          placeholder="물티슈, 생수, 배변패드… 필요한 생활상품을 검색"
          aria-label="통합검색"
          className={`input ${size === "lg" ? "!min-h-[56px] pl-12 pr-24 text-[19px]" : "!min-h-[46px] pl-10 pr-20"} rounded-full border-2 border-line focus:border-primary`}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="지우기"
            className="absolute right-[76px] top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="submit"
          className="btn-primary absolute right-1.5 top-1/2 !min-h-[36px] -translate-y-1/2 rounded-full !px-4 text-sm"
        >
          검색
        </button>
      </form>
      {open && (
        <div className="card-raised fade-up absolute z-40 mt-2 w-full p-3">
          {q ? (
            sugg.length ? (
              <ul>
                {sugg.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={() => go(s)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[17px] hover:bg-mist"
                    >
                      <Search size={15} className="text-muted" />
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-2 py-3 text-sm text-muted">
                일치하는 추천어가 없습니다. Enter로 전체 검색합니다.
              </div>
            )
          ) : (
            <div className="space-y-3">
              {recent.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-muted">최근 검색어</span>
                    <button
                      type="button"
                      onMouseDown={clearRecent}
                      className="text-xs text-muted hover:text-ink"
                    >
                      전체 삭제
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((r) => (
                      <button key={r} type="button" onMouseDown={() => go(r)} className="chip">
                        <Clock3 size={13} className="text-muted" />
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-1 px-1 text-xs font-semibold text-muted">추천 검색어</div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_SEARCHES.map((r) => (
                    <button key={r} type="button" onMouseDown={() => go(r)} className="chip">
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 실시간 오늘 날짜·시각 + 빠른배송 출고마감 카운트다운 */
export function DeliveryStrip({ compact = false }: { compact?: boolean }) {
  const now = useNow(30000);
  if (!now) return <div className="h-9 bg-navy" aria-hidden />;
  const c = shipCutdown(now);
  return (
    <section
      aria-label="오늘 배송 안내"
      className={`bg-navy text-white ${compact ? "text-[14px]" : "text-[14px] sm:text-[15px]"}`}
    >
      {/* 모바일(360px~)에서도 한 줄에 모두 보이도록: 날짜는 sm 이상에서만, 시각만 표시 */}
      <div className="hide-scrollbar mx-auto flex h-9 max-w-[1280px] items-center gap-1.5 overflow-x-auto whitespace-nowrap px-4 sm:gap-2">
        <Clock3 size={13} className="hidden shrink-0 text-white/70 sm:block" />
        <time
          dateTime={now.toISOString()}
          className="shrink-0 tabular-nums text-white/80"
          suppressHydrationWarning
        >
          <span className="sm:hidden">{`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`}</span>
          <span className="hidden sm:inline">{todayLabel(now)}</span>
        </time>
        <span className="text-white/30" aria-hidden="true">
          |
        </span>
        {c.beforeCutoff ? (
          <span className="inline-flex items-center gap-1.5">
            <Zap
              size={13}
              className={`shrink-0 ${c.urgent ? "fill-orange text-orange-bright" : "fill-teal text-teal-bright"}`}
            />
            <span>
              <span className="hidden sm:inline">빠른배송 </span>마감까지{" "}
              <b className={`tabular-nums ${c.urgent ? "text-orange-bright" : "text-teal-bright"}`}>
                {c.remain}
              </b>
            </span>
            <span className="text-white/60">· {c.arriveLabel} 도착</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Truck size={13} className="shrink-0 text-white/70" />
            <span>
              오늘 마감 · <b className="text-teal-bright">{c.arriveLabel}</b> 도착
            </span>
            <span className="hidden text-white/60 sm:inline">
              (내일 15:00 마감까지 <b className="tabular-nums text-white/90">{c.remain}</b>)
            </span>
          </span>
        )}
        <span className="hidden text-white/30 md:inline">|</span>
        <span className="hidden text-white/60 md:inline">3만원 이상 무료배송</span>
      </div>
    </section>
  );
}

/** DEMO 배지 → 시연 컨트롤 (모바일 포함 상시 접근) */
function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const now = useNow(1000);
  const stage = useStore((s) => s.ui.stage);
  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="sheet"
      title="NEXMART 시연 안내"
      subtitle="시연용 가상 서비스 — 실제 결제·배송은 연결되어 있지 않습니다"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-mist px-4 py-3 text-sm">
          <span className="text-muted">현재 시각</span>
          <b className="tabular-nums" suppressHydrationWarning>
            {now ? todayLabel(now) : "--"}
          </b>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl bg-mist px-4 py-3 text-sm">
          <span className="text-muted">진행 단계</span>
          <span className="badge bg-orange/15 text-orange">{STAGE_LABEL[stage]}</span>
        </div>
        <Link href="/ax" onClick={onClose} className="btn-primary btn-lg w-full justify-start gap-3">
          <LayoutDashboard size={20} />
          <span className="text-left leading-tight">
            AX 운영화면 보기
            <span className="block text-[13px] font-normal opacity-80">대시보드 · 재고·발주 · 주문·출고</span>
          </span>
          <ChevronRight size={18} className="ml-auto" />
        </Link>
        <Link
          href="/ax/presentation"
          onClick={onClose}
          className="btn-outline btn-lg w-full justify-start gap-3"
        >
          <Presentation size={20} className="text-primary" />
          <span className="text-left leading-tight">
            시연 모드
            <span className="block text-[13px] font-normal text-muted">18단계로 따라가는 핵심 흐름</span>
          </span>
          <ChevronRight size={18} className="ml-auto text-muted" />
        </Link>
        <Link href="/ax/why" onClick={onClose} className="btn-outline btn-lg w-full justify-start gap-3">
          <Headset size={20} className="text-primary" />
          <span className="text-left leading-tight">
            기획 의도
            <span className="block text-[13px] font-normal text-muted">
              왜 이 시스템이 필요한가 · 16개 섹션
            </span>
          </span>
          <ChevronRight size={18} className="ml-auto text-muted" />
        </Link>
        <p className="pt-1 text-[13px] text-muted">
          실제 운영에서는 관리자 로그인 후에만 AX 운영화면에 접근할 수 있으며, 고객 플랫폼에는 이 버튼이
          노출되지 않습니다.
        </p>
      </div>
    </Overlay>
  );
}

export default function CustomerShell({
  children,
  hideBottomNav = false,
  plain = false,
  stickyBar = false,
  backHref,
}: {
  children: ReactNode;
  hideBottomNav?: boolean;
  plain?: boolean;
  /** 화면 하단 고정 주문바가 있는 페이지 — 푸터가 가려지지 않게 여백 확보 */ stickyBar?: boolean;
  /** 상세 화면: 모바일 헤더에 ← 뒤로 (기록이 없으면 이 주소로) */ backHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const cartCount = useStore((s) => s.ui.cart.reduce((a, c) => a + c.qty, 0));
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const unread = data.notifications.filter((n) => n.customerId === customerId && !n.read).length;
  const inIframe = useIsInIframe();
  const [searchOpen, setSearchOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="skip-link">
        본문 바로가기
      </a>
      {/* 실시간 날짜·시각 + 출고마감 카운트다운 */}
      {!plain && <DeliveryStrip />}

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4">
          <div className="flex h-16 items-center gap-1.5 sm:gap-6">
            {backHref ? (
              <button
                type="button"
                className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-mist md:hidden"
                aria-label="뒤로"
                onClick={() => {
                  if (window.history.length > 1) router.back();
                  else router.push(backHref);
                }}
              >
                <ChevronLeft size={26} />
              </button>
            ) : (
              !plain && (
                <button
                  type="button"
                  className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-mist md:hidden"
                  onClick={() => setMenuOpen(true)}
                  aria-label="메뉴 열기"
                  aria-expanded={menuOpen}
                >
                  <Menu size={23} />
                </button>
              )
            )}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-lg font-black text-white"
              >
                N
              </span>
              {/* 좁은 화면에선 글자를 숨기되 스크린리더 이름("NEXMART 홈")은 유지 */}
              <span className="sr-only text-xl font-black tracking-tight text-navy xs:not-sr-only">
                NEXMART
              </span>
              <span className="sr-only"> 홈</span>
            </Link>
            {!inIframe && (
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-md bg-orange/15 px-2 text-[13px] font-bold tracking-wide text-orange transition-colors hover:bg-orange/25"
                aria-label="DEMO 시연 안내 — AX 운영화면 보기"
              >
                DEMO <ChevronRight size={13} />
              </button>
            )}
            <div className="hidden max-w-2xl flex-1 md:block">
              <SearchBox label="상단 상품 검색" />
            </div>
            <div className="flex-1 md:hidden" />
            <nav className="-mr-1.5 flex shrink-0 items-center gap-0.5 sm:mr-0 sm:gap-2">
              <button
                className="btn-ghost !px-2.5 md:hidden"
                aria-label="검색"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={22} />
              </button>
              <Link href="/my" className="btn-ghost relative hidden !px-2.5 sm:inline-flex" aria-label="알림">
                <Bell size={22} />
                {hydrated && unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange" />
                )}
              </Link>
              <Link
                href="/cart"
                className="btn-ghost relative !px-2.5"
                aria-label={`장바구니 ${cartCount}개`}
              >
                <ShoppingCart size={22} />
                {hydrated && cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-strong px-1 text-[13px] font-bold tabular-nums text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
              <Link href="/my" className="btn-ghost hidden !px-2.5 sm:inline-flex" aria-label="마이페이지">
                <User size={22} />
              </Link>
            </nav>
          </div>
          {!plain && (
            <nav className="-mx-1 hidden h-11 items-center gap-1 md:flex" aria-label="주요 메뉴">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[17px] font-semibold transition-colors ${isActive(n.href) ? "bg-soft text-primary" : "text-ink hover:bg-mist"}`}
                >
                  <n.icon size={16} />
                  {n.label}
                </Link>
              ))}
              {!inIframe && (
                <Link
                  href="/ax"
                  className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-[15px] font-semibold text-primary hover:bg-soft"
                >
                  <LayoutDashboard size={16} />
                  AX 운영화면 보기
                  <ArrowRight size={15} />
                </Link>
              )}
            </nav>
          )}
        </div>
        {/* mobile search overlay */}
        {searchOpen && (
          <div className="fade-up fixed inset-0 z-[60] bg-white md:hidden">
            <div className="flex h-16 items-center gap-2 border-b border-line px-3">
              <div className="flex-1">
                <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
              </div>
              <button className="btn-ghost !px-2" onClick={() => setSearchOpen(false)} aria-label="닫기">
                <X size={22} />
              </button>
            </div>
            <div className="p-4 text-sm text-muted">검색어를 입력하고 Enter 또는 검색을 누르세요.</div>
          </div>
        )}
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={`flex-1 ${hideBottomNav ? "" : plain ? "pb-24 md:pb-0" : "pb-2 md:pb-0"}`}
      >
        {children}
      </main>

      {/* 미래AI랩 공통 CTA 브릿지 — 핵심 콘텐츠를 다 본 뒤 (주문·결제 흐름 중인 Checkout에서는 제외) */}
      {!plain && (
        <div className="mt-10 sm:mt-14">
          <SampleBridgeCTA surface="customer" />
        </div>
      )}

      {!plain && (
        <footer className="mt-10 hidden border-t border-line bg-mist sm:mt-12 md:block">
          <div className="mx-auto grid max-w-[1280px] grid-cols-4 gap-8 px-4 py-10 text-sm">
            <div>
              <div className="text-lg font-black text-navy">NEXMART</div>
              <p className="mt-2 leading-relaxed text-muted">
                생활·식품·주방·리빙·반려·소형가전을 한곳에서. 이 사이트는 AX+플랫폼 시연용 가상 서비스이며
                실제 결제·배송은 연결되어 있지 않습니다.
              </p>
            </div>
            <div>
              <div className="mb-2 font-semibold">고객 안내</div>
              <ul className="space-y-1.5 text-muted">
                <li>
                  <Link href="/track" className="hover:text-ink">
                    주문·배송조회
                  </Link>
                </li>
                <li>
                  <Link href="/my" className="hover:text-ink">
                    취소·반품·교환
                  </Link>
                </li>
                <li>
                  <Link href="/#trust" className="hover:text-ink">
                    배송·교환 안내
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-semibold">서비스</div>
              <ul className="space-y-1.5 text-muted">
                <li>
                  <Link href="/fast" className="hover:text-ink">
                    빠른배송
                  </Link>
                </li>
                <li>
                  <Link href="/my/repeat" className="hover:text-ink">
                    다시 구매
                  </Link>
                </li>
                <li>
                  <span className="inline-flex items-center gap-1">
                    정기배송 <span className="badge bg-line text-muted">예정</span>
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-semibold">회사</div>
              <ul className="space-y-1.5 text-muted">
                <li>(주)넥스마트 · 가상의 시연 기업</li>
                <li>고객센터 1588-0000 (시연)</li>
                {!inIframe && (
                  <li>
                    <Link
                      href="/ax"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      AX 운영화면 보기 <ChevronRight size={14} />
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </footer>
      )}

      {/* 모바일 Footer */}
      {!plain && (
        <footer
          className={`mt-8 border-t border-line bg-mist px-4 pt-5 md:hidden ${stickyBar && !hideBottomNav ? "pb-48" : hideBottomNav ? "pb-36" : "pb-24"} safe-bottom`}
        >
          {!inIframe && (
            <Link
              href="/ax"
              className="btn-outline w-full justify-start gap-2 border-primary/40 text-primary"
            >
              <LayoutDashboard size={18} />
              AX 운영화면 보기
              <ChevronRight size={16} className="ml-auto" />
            </Link>
          )}
          <div className="mt-4 text-[13px] leading-relaxed text-muted">
            <div className="text-base font-black text-navy">NEXMART</div>
            <p className="mt-1">(주)넥스마트 · 가상의 시연 기업 · 고객센터 1588-0000 (시연)</p>
            <p className="mt-1">
              이 사이트는 AX+플랫폼 시연용 가상 서비스이며 실제 결제·배송은 연결되어 있지 않습니다.
            </p>
          </div>
        </footer>
      )}

      {!hideBottomNav && (
        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white md:hidden"
          aria-label="모바일 메뉴"
        >
          <ul className="grid h-16 grid-cols-5">
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
                  <Link
                    href={n.href}
                    className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[13px] font-semibold ${on ? "text-primary" : "text-muted"}`}
                  >
                    <n.icon size={22} strokeWidth={on ? 2.4 : 2} />
                    {n.label}
                    {hydrated && n.count ? (
                      <span className="absolute right-1/2 top-1.5 flex h-[18px] min-w-[18px] translate-x-4 items-center justify-center rounded-full bg-orange-strong px-1 text-[12px] font-bold tabular-nums text-white">
                        {n.count > 99 ? "99+" : n.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* 모바일 햄버거 Drawer — 왼쪽에서 열림 */}
      <MobileDrawer
        open={menuOpen}
        onClose={closeMenu}
        label="고객 메뉴"
        header={
          <div className="flex h-16 items-center gap-2 pl-4 pr-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-lg font-black text-white">
              N
            </span>
            <span className="text-xl font-black tracking-tight text-navy">NEXMART</span>
            <button
              type="button"
              onClick={closeMenu}
              className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-mist"
              aria-label="메뉴 닫기"
            >
              <X size={22} />
            </button>
          </div>
        }
        footer={
          !inIframe ? (
            <div className="p-3">
              <Link
                href="/ax"
                className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl bg-navy px-4 text-[17px] font-bold text-white transition hover:brightness-110"
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutDashboard size={19} />
                  AX 운영화면 보기
                </span>
                <ArrowRight size={18} />
              </Link>
              <p className="mt-1.5 px-1 text-[13px] text-muted">시연용 링크 · 실제 서비스는 관리자만 접근</p>
            </div>
          ) : undefined
        }
      >
        <nav className="space-y-4 px-3 py-3" aria-label="고객 메뉴">
          {CUSTOMER_MENU.map((g) => (
            <div key={g.label}>
              <div className="px-2 pb-1.5 text-[14px] font-bold text-muted">{g.label}</div>
              <ul className="space-y-0.5">
                {g.items.map((n) => {
                  const on = isActive(n.href);
                  const count =
                    n.href === "/cart" && hydrated && cartCount > 0
                      ? cartCount
                      : n.href === "/my" && hydrated && unread > 0
                        ? unread
                        : 0;
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        aria-current={on ? "page" : undefined}
                        className={`flex min-h-[52px] items-center gap-3 rounded-xl px-2.5 transition-colors duration-150 ${on ? "bg-soft" : "hover:bg-mist"}`}
                      >
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: `${g.color}14`, color: g.color }}
                        >
                          <n.icon size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[17px] leading-tight ${on ? "font-bold text-ink" : "font-semibold"}`}
                          >
                            {n.label}
                          </span>
                          {n.hint && <span className="block truncate text-[13px] text-muted">{n.hint}</span>}
                        </span>
                        {count > 0 && (
                          <span className="inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-orange-strong px-1.5 text-[13px] font-bold tabular-nums text-white">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="space-y-1.5 rounded-xl bg-mist px-3.5 py-3 text-[14px] text-muted">
            <Link href="/#trust" className="flex min-h-[32px] items-center gap-2 font-semibold text-ink">
              <ShieldCheck size={16} className="text-teal" />
              배송·교환·반품 안내
            </Link>
            <div className="flex items-center gap-2">
              <Phone size={15} />
              고객센터 1588-0000 (시연)
            </div>
          </div>
          {!inIframe && (
            <div className="px-1">
              <div className="px-1 pb-1 text-[13px] font-semibold text-muted">시연 안내</div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/ax/presentation"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line px-3 text-[15px] font-semibold hover:bg-mist"
                >
                  <Presentation size={16} className="text-muted" />
                  시연 모드
                </Link>
                <Link
                  href="/ax/why"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line px-3 text-[15px] font-semibold hover:bg-mist"
                >
                  <Headset size={16} className="text-muted" />
                  기획 의도
                </Link>
              </div>
            </div>
          )}
        </nav>
      </MobileDrawer>

      <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
