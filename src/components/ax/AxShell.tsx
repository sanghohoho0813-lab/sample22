"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LayoutDashboard, Rocket, TrendingUp, Package, Boxes, Factory, Truck, Users, Megaphone, Undo2, FileCheck2, BookOpenText, Presentation, Settings, Menu, X, Store, Smartphone, Monitor, ChevronDown, HelpCircle, Bell, RotateCcw, ExternalLink, ChevronLeft } from "lucide-react";
import { ROLE_LABEL, ROLE_PERSON, useStore } from "@/lib/store";
import { useData, useHydrated, useIsInIframe } from "@/lib/hooks";
import type { RoleKey } from "@/lib/types";
import Clock from "@/components/shared/Clock";
import { Freshness } from "@/components/shared/Bits";
import Overlay from "@/components/shared/Overlay";
import { THEMES } from "@/lib/themes";
import Tutorial from "./Tutorial";
import SampleBridgeCTA, { SidebarBridgeCTA } from "@/components/shared/SampleBridgeCTA";
import { useToast } from "@/components/shared/Toast";

export type NavGroupKey = "exec" | "supply" | "ops" | "proof" | "system";
export interface NavItem { no: string; href: string; label: string; icon: typeof LayoutDashboard; color: string; group: NavGroupKey; roles: RoleKey[]; }
/** 비슷한 메뉴끼리 묶고, 그룹은 같은 색상 계열 · 항목은 톤만 다르게 */
export const NAV_GROUPS: { key: NavGroupKey; label: string; base: string }[] = [
  { key: "exec", label: "경영 · 판단", base: "#2F6FED" },
  { key: "supply", label: "상품 · 재고 · 공급", base: "#E0A526" },
  { key: "ops", label: "주문 · 고객 · 운영", base: "#17A889" },
  { key: "proof", label: "실증 · 스토리", base: "#8B5AA6" },
  { key: "system", label: "시스템", base: "#6D8899" },
];
export const AX_NAV: NavItem[] = [
  { no: "01", href: "/ax", label: "경영 대시보드", icon: LayoutDashboard, color: "#2F6FED", group: "exec", roles: ["owner", "buyer", "ops", "cs"] },
  { no: "02", href: "/ax/actions", label: "Action Center", icon: Rocket, color: "#5B8DF2", group: "exec", roles: ["owner", "buyer", "ops", "cs"] },
  { no: "03", href: "/ax/sales", label: "매출·마진", icon: TrendingUp, color: "#1F55C9", group: "exec", roles: ["owner"] },
  { no: "04", href: "/ax/products", label: "상품·SKU", icon: Package, color: "#E0A526", group: "supply", roles: ["owner", "buyer"] },
  { no: "05", href: "/ax/inventory", label: "재고·발주", icon: Boxes, color: "#F0B94A", group: "supply", roles: ["owner", "buyer", "ops"] },
  { no: "06", href: "/ax/suppliers", label: "공급사·구매", icon: Factory, color: "#C98E12", group: "supply", roles: ["owner", "buyer"] },
  { no: "07", href: "/ax/fulfillment", label: "주문·Fulfillment", icon: Truck, color: "#17A889", group: "ops", roles: ["owner", "ops", "cs"] },
  { no: "08", href: "/ax/customers", label: "고객·재구매", icon: Users, color: "#3DBFA3", group: "ops", roles: ["owner", "cs"] },
  { no: "09", href: "/ax/promotions", label: "프로모션", icon: Megaphone, color: "#0F8C71", group: "ops", roles: ["owner", "buyer"] },
  { no: "10", href: "/ax/returns", label: "반품·VOC", icon: Undo2, color: "#5FD0B8", group: "ops", roles: ["owner", "ops", "cs"] },
  { no: "11", href: "/ax/evidence", label: "AX Evidence", icon: FileCheck2, color: "#8B5AA6", group: "proof", roles: ["owner", "buyer", "ops", "cs"] },
  { no: "12", href: "/ax/why", label: "기획의도 (Why AX)", icon: BookOpenText, color: "#A87BC0", group: "proof", roles: ["owner", "buyer", "ops", "cs"] },
  { no: "13", href: "/ax/presentation", label: "Presentation Mode", icon: Presentation, color: "#6E4590", group: "proof", roles: ["owner", "buyer", "ops", "cs"] },
  { no: "14", href: "/ax/settings", label: "설정", icon: Settings, color: "#6D8899", group: "system", roles: ["owner", "buyer", "ops", "cs"] },
];

export function DevicePreview({ src, onClose, title }: { src: string; onClose: () => void; title: string }) {
  const [w, setW] = useState<390 | 430 | 360>(390);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); }; window.addEventListener("keydown", onKey); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; }; }, []);
  return (
    <div className="fixed inset-0 z-[900] bg-shell/85 backdrop-blur-sm flex flex-col" role="dialog" aria-label={title}>
      <div className="flex items-center justify-between px-4 h-14 text-white shrink-0">
        <div className="flex items-center gap-3"><Smartphone size={18} /><span className="font-semibold">{title}</span><span className="text-white/60 text-sm hidden sm:inline">실제 반응형 UI를 {w}px 폭으로 표시합니다</span></div>
        <div className="flex items-center gap-2">
          {([360, 390, 430] as const).map((x) => <button key={x} onClick={() => setW(x)} className={`h-9 px-2.5 rounded-lg text-sm font-semibold ${w === x ? "bg-white text-shell" : "bg-white/10 hover:bg-white/20"}`}>{x}</button>)}
          <a href={src} target="_blank" rel="noreferrer" className="h-9 px-2.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 inline-flex items-center gap-1"><ExternalLink size={14} />새 탭</a>
          <button onClick={onClose} className="h-9 px-3 rounded-lg bg-white text-shell text-sm font-bold inline-flex items-center gap-1"><X size={16} />닫기 (Esc)</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-3">
        <div className="rounded-[36px] bg-black p-2.5 shadow-raised max-h-full" style={{ width: w + 20 }}>
          <div className="rounded-[28px] overflow-hidden bg-white relative" style={{ width: w, height: "min(844px, calc(100vh - 110px))" }}>
            <div className="absolute top-0 inset-x-0 h-6 flex justify-center pointer-events-none z-10"><div className="w-28 h-5 bg-black rounded-b-2xl" /></div>
            <iframe title={title} src={src} className="w-full h-full border-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AxShell({ children, title, subtitle, actions, tour }: { children: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; tour?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const inIframe = useIsInIframe();
  const data = useData();
  const roleStored = useStore((s) => s.ui.role);
  const setRole = useStore((s) => s.setRole);
  const themeStored = useStore((s) => s.ui.theme);
  const setTheme = useStore((s) => s.setTheme);
  const stageStored = useStore((s) => s.ui.stage);
  // SSR renders defaults; persisted values apply after hydration to avoid text mismatch
  const role = hydrated ? roleStored : "owner";
  const theme = hydrated ? themeStored : "deep-teal";
  const stage = hydrated ? stageStored : "DEMO";
  const tutorialDone = useStore((s) => s.ui.tutorialDone);
  const resetDemo = useStore((s) => s.resetDemo);
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const openActions = data.actions.filter((a) => !["done", "dismissed"].includes(a.stage) && (role === "owner" || a.owner === role)).length;
  const nav = useMemo(() => AX_NAV.filter((n) => n.roles.includes(role)), [role]);

  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => { if (hydrated && !tutorialDone && pathname === "/ax" && !inIframe) { const t = setTimeout(() => setTutorial(true), 800); return () => clearTimeout(t); } }, [hydrated, tutorialDone, pathname, inIframe]);
  // role guard: if current route not allowed for role, go to dashboard
  useEffect(() => { if (!hydrated) return; const item = AX_NAV.find((n) => (n.href === "/ax" ? pathname === "/ax" : pathname.startsWith(n.href))); if (item && !item.roles.includes(role)) router.replace("/ax"); }, [role, pathname, hydrated, router]);

  const isActive = (href: string) => (href === "/ax" ? pathname === "/ax" : pathname.startsWith(href));
  const themeDef = THEMES.find((t) => t.key === theme) ?? THEMES[4];

  const Sidebar = (
    <div className="flex flex-col h-full text-white" style={{ background: "var(--t-shell)" }}>
      <div className="h-16 flex items-center gap-2 px-4 border-b border-white/10 shrink-0">
        <span className="w-9 h-9 rounded-xl bg-white/12 font-black flex items-center justify-center">N</span>
        <div className="leading-tight"><div className="font-black tracking-tight">NEXMART</div><div className="text-[13px] text-white/60 font-semibold tracking-wider">Business AX</div></div>
        <button className="ml-auto lg:hidden btn-ghost !text-white !px-2" onClick={() => setMenu(false)} aria-label="메뉴 닫기"><X size={20} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2.5" data-tour="sidebar" aria-label="AX 메뉴">
        {NAV_GROUPS.map((g) => {
          const items = nav.filter((n) => n.group === g.key);
          if (!items.length) return null;
          return (
            <div key={g.key} className="mb-2.5">
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: g.base }} /><span className="text-[14px] font-bold tracking-wider text-white/55 uppercase">{g.label}</span></div>
              <div className="space-y-0.5">
                {items.map((n) => {
                  const on = isActive(n.href);
                  return (
                    <Link key={n.href} href={n.href} className={`nav-item group/nav relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[18px] font-semibold min-h-[48px] transition-[background-color,transform,color] duration-150 ease-out ${on ? "bg-white text-shell shadow-card" : "text-white/85 hover:bg-white/10 hover:translate-x-0.5"}`} aria-current={on ? "page" : undefined}>
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full transition-all duration-200 ${on ? "opacity-100" : "opacity-0"}`} style={{ background: n.color }} />
                      <span className="ax-icon transition-transform duration-150 group-hover/nav:scale-105" style={{ background: on ? `${n.color}22` : `${n.color}33`, color: on ? n.color : "#fff" }}><n.icon size={18} /></span>
                      <span className="flex-1 truncate">{n.label}</span>
                      {n.href === "/ax/actions" && hydrated && openActions > 0 && <span className="text-xs rounded-full px-1.5 py-0.5 font-bold bg-accent text-white">{openActions}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10">
        <SidebarBridgeCTA />
      </div>
      <div className="px-4 py-3 border-t border-white/10 text-xs text-white/60 space-y-1.5">
        <div className="flex items-center justify-between"><span>기술·사업화 자산</span><Link href="/ax/settings?tab=tech" className="text-white/85 hover:text-white underline underline-offset-2">보기</Link></div>
        <div className="flex items-center justify-between"><span>Stage</span><span className="badge bg-white/15 text-white">{stage}</span></div>
        <div>Unified v3.0 · First Build</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-mist">
      {/* desktop sidebar */}
      <aside className="hidden lg:block w-[288px] shrink-0 sticky top-0 h-screen">{Sidebar}</aside>
      {/* mobile drawer */}
      {menu && (
        <div className="fixed inset-0 z-[800] lg:hidden">
          <div className="absolute inset-0 bg-shell/60" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] shadow-raised slide-in-left">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
          <div className="flex items-center gap-2 px-3 sm:px-5 h-16">
            <button className="lg:hidden btn-ghost !px-2" onClick={() => setMenu(true)} aria-label="메뉴 열기"><Menu size={22} /></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0"><h1 className="text-lg sm:text-xl font-bold truncate">{title}</h1><span className="badge bg-orange/15 text-[#B84F1A] hidden sm:inline-flex">{stage}</span></div>
              <div className="text-xs text-muted hidden sm:flex items-center gap-3"><Clock />{hydrated && <Freshness updatedAt={data.generatedAt} />}</div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {actions}
              {!inIframe && (
                <>
                  <button data-tour="customer" onClick={() => setPreview({ src: "/", title: "고객 화면 보기 — Customer Platform" })} className="btn-outline btn-sm hidden md:inline-flex" title="고객 화면 보기"><Store size={16} />고객 화면</button>
                  <Link href="/" className="btn-outline btn-sm md:hidden !px-2" aria-label="고객 화면"><Store size={18} /></Link>
                  <button data-tour="device" onClick={() => setPreview({ src: `${pathname}${pathname.includes("?") ? "&" : "?"}embed=1`, title: "스마트폰 미리보기 — Business AX" })} className="btn-outline btn-sm hidden md:inline-flex" title="PC ↔ 스마트폰"><Smartphone size={16} /><span className="hidden xl:inline">스마트폰</span></button>
                </>
              )}
              <div className="relative">
                <button data-tour="role" onClick={() => setRoleOpen((v) => !v)} className="btn-outline btn-sm" aria-haspopup="menu" aria-expanded={roleOpen}><span className="w-6 h-6 rounded-full bg-soft text-shell text-xs font-bold flex items-center justify-center">{ROLE_LABEL[role].charAt(0)}</span><span className="hidden sm:inline">{ROLE_LABEL[role]}</span><ChevronDown size={14} /></button>
                {roleOpen && (
                  <div className="absolute right-0 mt-1 w-56 card-raised p-1.5 z-50 fade-up" role="menu" onMouseLeave={() => setRoleOpen(false)}>
                    <div className="px-2 py-1 text-[13px] font-semibold text-muted">역할 전환 (Demo RLS)</div>
                    {(Object.keys(ROLE_LABEL) as RoleKey[]).map((r) => (
                      <button key={r} role="menuitem" onClick={() => { setRole(r); setRoleOpen(false); toast({ title: `${ROLE_LABEL[r]} 화면으로 전환`, body: `${ROLE_PERSON[r]} · 메뉴·KPI·민감정보가 역할에 맞게 바뀝니다.`, tone: "info" }); }} className={`w-full text-left px-2.5 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-mist ${r === role ? "font-bold text-primary" : ""}`}>{ROLE_PERSON[r]}{r === role && <span className="text-xs">현재</span>}</button>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/ax/actions" className="btn-ghost !px-2 relative hidden sm:inline-flex" aria-label="알림"><Bell size={20} />{hydrated && openActions > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />}</Link>
              {!inIframe && <button onClick={() => setTutorial(true)} className="btn-ghost !px-2 hidden sm:inline-flex" aria-label="튜토리얼" title="튜토리얼"><HelpCircle size={20} /></button>}
            </div>
          </div>
          {subtitle && <div className="px-3 sm:px-5 pb-3 -mt-1 text-sm text-muted">{subtitle}</div>}
        </header>

        <main key={pathname} className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1600px] w-full mx-auto page-enter">{children}</main>

        {/* 미래AI랩 공통 CTA 브릿지 — AX 화면 하단 */}
        <div className="px-3 sm:px-5 lg:px-6 pb-5 lg:pb-6"><SampleBridgeCTA surface="ax" /></div>

        <footer className="px-5 py-3 text-xs text-muted flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-white">
          <span>NEXMART Business AX · Demo Repository · 모든 수치는 시연용 Simulation</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: themeDef.primary }} />Theme {themeDef.no} {themeDef.name}</span>
          <button onClick={() => setResetOpen(true)} className="ml-auto inline-flex items-center gap-1 hover:text-ink"><RotateCcw size={12} />Demo Reset</button>
          <Link href="/" className="inline-flex items-center gap-1 hover:text-ink"><ChevronLeft size={12} />Customer Platform</Link>
        </footer>
      </div>

      {preview && <DevicePreview src={preview.src} title={preview.title} onClose={() => setPreview(null)} />}
      {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
      <Overlay open={resetOpen} onClose={() => setResetOpen(false)} title="Demo Reset" size="sm" footer={<div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setResetOpen(false)}>취소</button><button className="btn-danger flex-1" onClick={() => { resetDemo(); setResetOpen(false); toast({ title: "Demo 데이터를 초기화했습니다", body: "주문·Action·Evidence·장바구니가 초기 시나리오로 돌아갑니다.", tone: "info" }); router.push("/ax"); }}>초기화</button></div>}>
        <p className="text-[17px]">고객 주문, Action 처리, Evidence, 장바구니 등 시연 중 변경한 모든 상태를 초기 시나리오(A~E)로 되돌립니다. Theme·글자크기 설정은 유지됩니다.</p>
      </Overlay>
      {/* quick theme dots (desktop) */}
      {!inIframe && (
        <div className="hidden xl:flex fixed bottom-4 right-4 z-30 card-raised px-2 py-1.5 items-center gap-1" data-tour="theme" aria-label="빠른 Theme 전환">
          {THEMES.map((t) => <button key={t.key} title={`${t.no} ${t.name}`} onClick={() => setTheme(t.key)} className={`w-5 h-5 rounded-full border-2 ${theme === t.key ? "border-ink scale-110" : "border-white"}`} style={{ background: `linear-gradient(135deg, ${t.shell} 50%, ${t.primary} 50%)` }} aria-label={t.name} aria-pressed={theme === t.key} />)}
          <Link href="/ax/settings" className="ml-1 text-xs text-muted hover:text-ink"><Settings size={14} /></Link>
          <span className="sr-only"><Monitor /></span>
        </div>
      )}
    </div>
  );
}
