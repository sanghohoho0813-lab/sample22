"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LayoutDashboard, Rocket, TrendingUp, Package, Boxes, Factory, Truck, Users, Megaphone, Undo2, FileCheck2, BookOpenText, Presentation, Settings, Menu, X, Store, Smartphone, ChevronDown, HelpCircle, Bell, RotateCcw, ExternalLink, ArrowRight } from "lucide-react";
import { ROLE_LABEL, ROLE_PERSON, useStore } from "@/lib/store";
import { useData, useHydrated, useIsInIframe, useNow } from "@/lib/hooks";
import { DOW } from "@/lib/format";
import { STAGE_LABEL } from "@/lib/labels";
import MobileDrawer from "@/components/shared/MobileDrawer";
import type { RoleKey } from "@/lib/types";
import { Freshness } from "@/components/shared/Bits";
import Overlay from "@/components/shared/Overlay";
import { THEMES } from "@/lib/themes";
import Tutorial from "./Tutorial";
import SampleBridgeCTA, { SidebarBridgeCTA } from "@/components/shared/SampleBridgeCTA";
import { useToast } from "@/components/shared/Toast";

type Icon = typeof LayoutDashboard;
export type NavFamily = "exec" | "supply" | "ops" | "system";
/**
 * 아이콘 색상 계열 — 같은 분류는 같은 계열, 항목은 톤만 다르게.
 * 전체 3개 계열(경영 블루 · 상품 앰버 · 주문/고객 틸) + 중립(시스템)으로 제한한다.
 */
export const NAV_FAMILY: Record<NavFamily, string> = { exec: "#2F6FED", supply: "#D9961A", ops: "#149C80", system: "#6D8899" };
export interface NavItem { href: string; label: string; icon: Icon; color: string; family: NavFamily; roles: RoleKey[]; badge?: "actions" }
export interface NavGroup { key: string; label: string; icon: Icon; family: NavFamily; items: NavItem[] }
export type NavNode = { type: "item"; item: NavItem } | { type: "group"; group: NavGroup };

const ALL: RoleKey[] = ["owner", "buyer", "ops", "cs"];
const I = {
  dashboard: { href: "/ax", label: "경영 대시보드", icon: LayoutDashboard, color: "#2F6FED", family: "exec", roles: ALL },
  actions: { href: "/ax/actions", label: "실행 센터", icon: Rocket, color: "#4A82F0", family: "exec", roles: ALL, badge: "actions" },
  products: { href: "/ax/products", label: "상품·SKU", icon: Package, color: "#D9961A", family: "supply", roles: ["owner", "buyer"] },
  inventory: { href: "/ax/inventory", label: "재고·발주", icon: Boxes, color: "#E5AA3C", family: "supply", roles: ["owner", "buyer", "ops"] },
  suppliers: { href: "/ax/suppliers", label: "공급사·구매", icon: Factory, color: "#BF830F", family: "supply", roles: ["owner", "buyer"] },
  fulfillment: { href: "/ax/fulfillment", label: "주문·출고", icon: Truck, color: "#149C80", family: "ops", roles: ["owner", "ops", "cs"] },
  returns: { href: "/ax/returns", label: "반품·문의", icon: Undo2, color: "#36B596", family: "ops", roles: ["owner", "ops", "cs"] },
  customers: { href: "/ax/customers", label: "고객·재구매", icon: Users, color: "#0F8A72", family: "ops", roles: ["owner", "cs"] },
  promotions: { href: "/ax/promotions", label: "프로모션", icon: Megaphone, color: "#4CC2A8", family: "ops", roles: ["owner", "buyer"] },
  sales: { href: "/ax/sales", label: "매출·마진", icon: TrendingUp, color: "#2459CC", family: "exec", roles: ["owner"] },
  evidence: { href: "/ax/evidence", label: "AX 성과 기록", icon: FileCheck2, color: "#5B8FF2", family: "exec", roles: ALL },
  settings: { href: "/ax/settings", label: "설정", icon: Settings, color: "#6D8899", family: "system", roles: ALL },
  why: { href: "/ax/why", label: "기획 의도", icon: BookOpenText, color: "#7D93A3", family: "system", roles: ALL },
  presentation: { href: "/ax/presentation", label: "시연 모드", icon: Presentation, color: "#5E7A8C", family: "system", roles: ALL },
} satisfies Record<string, NavItem>;

/**
 * AX 메뉴 정보구조 (최대 2단계)
 * 14개 기능을 모두 유지하면서, 처음 보이는 상위 항목은 7개 + 샘플 안내로 줄인다.
 * 기존 URL은 그대로 — 메뉴 위치만 바뀐다.
 */
export const AX_MENU: NavNode[] = [
  { type: "item", item: I.dashboard },
  { type: "item", item: I.actions },
  { type: "group", group: { key: "stock", label: "상품·재고", icon: Boxes, family: "supply", items: [I.products, I.inventory, I.suppliers] } },
  { type: "group", group: { key: "orders", label: "주문·배송", icon: Truck, family: "ops", items: [I.fulfillment, I.returns] } },
  { type: "group", group: { key: "customers", label: "고객·마케팅", icon: Users, family: "ops", items: [I.customers, I.promotions] } },
  { type: "group", group: { key: "analytics", label: "경영분석", icon: TrendingUp, family: "exec", items: [I.sales, I.evidence] } },
  { type: "item", item: I.settings },
];
/** 샘플 안내 — 핵심 업무 메뉴보다 한 단계 낮은 시각적 중요도로 분리 */
export const AX_EXTRA: NavItem[] = [I.why, I.presentation];
/** 역할 가드·검색용 평면 목록 (14개 기능 전부) */
export const AX_NAV: NavItem[] = [...AX_MENU.flatMap((n) => (n.type === "item" ? [n.item] : n.group.items)), ...AX_EXTRA];

const isActiveHref = (pathname: string, href: string) => (href === "/ax" ? pathname === "/ax" : pathname.startsWith(href));
/** 사용자가 펼친 그룹을 페이지 이동 후에도 기억 (세션 내) */
let rememberedOpen: string[] | null = null;

/** 어두운 사이드바/드로어 공용 메뉴 트리 — 현재 위치는 '흰 배경' 한 가지 방식으로만 강조 */
function AxNavTree({ pathname, role, openActions, hydrated }: { pathname: string; role: RoleKey; openActions: number; hydrated: boolean }) {
  const nodes = useMemo(() => AX_MENU.flatMap<NavNode>((n) => {
    if (n.type === "item") return n.item.roles.includes(role) ? [n] : [];
    const items = n.group.items.filter((x) => x.roles.includes(role));
    if (!items.length) return [];
    if (items.length === 1) return [{ type: "item", item: items[0] }]; // 하위 1개뿐이면 그룹 없이 바로 노출
    return [{ type: "group", group: { ...n.group, items } }];
  }), [role]);
  const activeGroup = nodes.find((n) => n.type === "group" && n.group.items.some((x) => isActiveHref(pathname, x.href)));
  const [open, setOpen] = useState<string[]>(() => {
    const base = rememberedOpen ?? [];
    return activeGroup && activeGroup.type === "group" && !base.includes(activeGroup.group.key) ? [...base, activeGroup.group.key] : base;
  });
  const toggle = (k: string) => setOpen((o) => { const next = o.includes(k) ? o.filter((x) => x !== k) : [...o, k]; rememberedOpen = next; return next; });
  const extras = AX_EXTRA.filter((x) => x.roles.includes(role));

  const row = (item: NavItem, sub = false) => {
    const on = isActiveHref(pathname, item.href);
    return (
      <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined}
        className={`group/nav flex items-center gap-3 rounded-xl transition-colors duration-150 ${sub ? "pl-3 pr-3 min-h-[44px] text-[16px]" : "px-3 min-h-[48px] text-[17px]"} font-semibold ${on ? "bg-white text-shell shadow-card" : "text-white/85 hover:bg-white/10"}`}>
        <span className={`inline-flex items-center justify-center shrink-0 rounded-lg ${sub ? "w-7 h-7" : "w-9 h-9"}`} style={{ background: `${item.color}${on ? "1F" : "30"}`, color: on ? item.color : "#fff" }}>
          <item.icon size={sub ? 15 : 18} />
        </span>
        <span className="flex-1 min-w-0 truncate">{item.label}</span>
        {item.badge === "actions" && hydrated && openActions > 0 && <span className="shrink-0 min-w-[26px] text-center text-[13px] rounded-full px-1.5 py-0.5 font-bold bg-accent text-white tabular-nums">{openActions > 99 ? "99+" : openActions}</span>}
      </Link>
    );
  };

  return (
    <div className="space-y-1">
      {nodes.map((n) => {
        if (n.type === "item") return row(n.item);
        const g = n.group;
        const expanded = open.includes(g.key);
        const hasActive = g.items.some((x) => isActiveHref(pathname, x.href));
        const color = NAV_FAMILY[g.family];
        return (
          <div key={g.key}>
            <button type="button" onClick={() => toggle(g.key)} aria-expanded={expanded}
              className="w-full flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-[17px] font-semibold text-white/85 hover:bg-white/10 transition-colors duration-150">
              <span className="inline-flex items-center justify-center shrink-0 rounded-lg w-9 h-9" style={{ background: `${color}30` }}><g.icon size={18} /></span>
              <span className="flex-1 min-w-0 truncate text-left">{g.label}</span>
              {hasActive && !expanded && <span className="w-1.5 h-1.5 rounded-full bg-white" aria-label="현재 위치 포함" />}
              <span className="text-[13px] text-white/45 tabular-nums">{g.items.length}</span>
              <ChevronDown size={16} className={`shrink-0 text-white/60 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
              <div className="ml-[30px] pl-2 border-l border-white/12 mt-0.5 mb-1.5 space-y-0.5 fade-in">
                {g.items.map((x) => row(x, true))}
              </div>
            )}
          </div>
        );
      })}
      {extras.length > 0 && (
        <div className="pt-3 mt-2 border-t border-white/10">
          <div className="px-3 pb-1.5 text-[13px] font-semibold text-white/45">샘플 안내</div>
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {extras.map((x) => {
              const on = isActiveHref(pathname, x.href);
              return (
                <Link key={x.href} href={x.href} aria-current={on ? "page" : undefined}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 min-h-[44px] text-[15px] font-medium whitespace-nowrap transition-colors duration-150 ${on ? "bg-white text-shell" : "bg-white/[0.06] text-white/75 hover:bg-white/10 hover:text-white"}`}>
                  <x.icon size={16} className="shrink-0" />{x.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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


/**
 * 모바일 표 → 카드 변환용: 표의 열 제목을 각 칸의 data-label로 복사한다.
 * 화면·드로어에서 표가 새로 그려질 때마다(행 추가·필터 변경) 다시 붙인다. 속성 변경은 감시하지 않으므로 무한 반복 없음.
 */
function useStackedTables() {
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      document.querySelectorAll<HTMLTableElement>(".table-wrap > table").forEach((t) => {
        const heads = Array.from(t.querySelectorAll("thead th")).map((th) => (th.textContent ?? "").trim());
        const titleIdx = heads.findIndex((h) => h);
        t.querySelectorAll(":scope > tbody > tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            const l = heads[i] ?? "";
            if (td.getAttribute("data-label") !== l) td.setAttribute("data-label", l);
            if (i === titleIdx) { if (!td.hasAttribute("data-title")) td.setAttribute("data-title", ""); } else if (td.hasAttribute("data-title")) td.removeAttribute("data-title");
          });
        });
        t.parentElement?.classList.add("stackable");
      });
    };
    apply();
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(apply); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
}

export default function AxShell({ children, title, subtitle, actions }: { children: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; tour?: boolean }) {
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
  const closeMenu = useCallback(() => setMenu(false), []);
  useStackedTables();

  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => { if (hydrated && !tutorialDone && pathname === "/ax" && !inIframe) { const t = setTimeout(() => setTutorial(true), 800); return () => clearTimeout(t); } }, [hydrated, tutorialDone, pathname, inIframe]);
  // role guard: if current route not allowed for role, go to dashboard
  useEffect(() => { if (!hydrated) return; const item = AX_NAV.find((n) => isActiveHref(pathname, n.href)); if (item && !item.roles.includes(role)) router.replace("/ax"); }, [role, pathname, hydrated, router]);

  const themeDef = THEMES.find((t) => t.key === theme) ?? THEMES[4];

  const Brand = (
    <div className="h-16 flex items-center gap-2.5 px-4">
      <span className="w-9 h-9 rounded-xl bg-white/12 font-black flex items-center justify-center shrink-0">N</span>
      <div className="leading-tight min-w-0"><div className="font-black tracking-tight">NEXMART</div><div className="text-[13px] text-white/60 font-semibold">AX 운영화면</div></div>
    </div>
  );
  const Meta = (
    <div className="px-4 py-2.5 text-[13px] text-white/60 flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5">진행 단계 <span className="badge bg-white/15 text-white">{STAGE_LABEL[stage]}</span></span>
      <Link href="/ax/settings?tab=tech" className="text-white/80 hover:text-white underline underline-offset-2 min-h-[32px] inline-flex items-center">기술·사업화 자산</Link>
    </div>
  );
  const toCustomer = (
    <Link href="/" className="flex items-center justify-between gap-2 w-full min-h-[52px] rounded-xl bg-white px-4 text-[17px] font-bold text-shell hover:bg-white/90 transition-colors duration-150">
      <span className="inline-flex items-center gap-2"><Store size={19} />고객 플랫폼 보기</span><ArrowRight size={18} />
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-mist">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 sticky top-0 h-screen text-white" style={{ background: "var(--t-shell)" }}>
        <div className="border-b border-white/10 shrink-0">{Brand}</div>
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 px-2.5" data-tour="sidebar" aria-label="AX 메뉴">
          <AxNavTree pathname={pathname} role={role} openActions={openActions} hydrated={hydrated} />
        </nav>
        <div className="border-t border-white/10 shrink-0"><SidebarBridgeCTA /></div>
        <div className="border-t border-white/10 shrink-0">{Meta}</div>
      </aside>

      {/* mobile drawer — 왼쪽에서 열림, 메뉴 영역만 스크롤, 하단 '고객 플랫폼 보기' 고정 */}
      <MobileDrawer open={menu} onClose={closeMenu} label="AX 메뉴" tone="dark"
        header={<div className="flex items-center pr-2">{Brand}<button className="ml-auto w-11 h-11 rounded-xl inline-flex items-center justify-center text-white hover:bg-white/10" onClick={closeMenu} aria-label="메뉴 닫기"><X size={22} /></button></div>}
        footer={<div className="p-3">{toCustomer}</div>}>
        <nav className="py-3 px-2.5" aria-label="AX 메뉴">
          <AxNavTree pathname={pathname} role={role} openActions={openActions} hydrated={hydrated} />
        </nav>
        <div className="border-t border-white/10 pt-1"><SidebarBridgeCTA /></div>
        {Meta}
      </MobileDrawer>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ① DEMO 도구줄 — 시연 관련 조작은 여기로 분리 */}
        {!inIframe && (
          <div className="bg-[#0F1B27] text-white">
            <div className="flex items-center gap-2 px-3 sm:px-5 h-10 text-[14px]">
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-bold tracking-wide bg-orange text-white">DEMO</span>
              <span className="text-white/70 shrink-0"><ClockCompact /></span>
              <span className="hidden lg:inline text-white/55 truncate min-w-0">시연용 AX 운영화면 · 모든 수치는 시뮬레이션입니다</span>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <div className="hidden xl:flex items-center gap-1 mr-1.5 pr-2.5 border-r border-white/15" data-tour="theme" role="group" aria-label="빠른 테마 전환">
                  {THEMES.map((t) => <button key={t.key} title={`테마 ${t.no} ${t.name}`} onClick={() => setTheme(t.key)} className={`w-[18px] h-[18px] rounded-full border ${theme === t.key ? "border-white ring-2 ring-white/70 ring-offset-1 ring-offset-[#0F1B27]" : "border-white/30 hover:border-white/70"}`} style={{ background: `linear-gradient(135deg, ${t.shell} 50%, ${t.primary} 50%)` }} aria-label={`테마 ${t.name}`} aria-pressed={theme === t.key} />)}
                </div>
                <button data-tour="device" onClick={() => setPreview({ src: `${pathname}${pathname.includes("?") ? "&" : "?"}embed=1`, title: "스마트폰 미리보기 — AX 운영화면" })} className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-white/85 hover:bg-white/10"><Smartphone size={15} />스마트폰 미리보기</button>
                <Link data-tour="customer" href="/" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white text-[#0F1B27] font-bold hover:bg-white/90 whitespace-nowrap">고객 플랫폼 보기<ArrowRight size={15} /></Link>
              </div>
            </div>
          </div>
        )}

        {/* ② 메인 헤더 — 메뉴 · 화면 제목 · 역할 · 알림 */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
          <div className="flex items-center gap-2 px-2 sm:px-5 h-14 sm:h-16">
            <button className="lg:hidden w-11 h-11 -ml-0.5 rounded-xl inline-flex items-center justify-center text-ink hover:bg-mist shrink-0" onClick={() => setMenu(true)} aria-label="메뉴 열기" aria-expanded={menu}><Menu size={23} /></button>
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <h1 className="text-[19px] sm:text-xl font-bold truncate">{title}</h1>
              {stage !== "DEMO" && <span className="badge bg-secondary/12 text-secondary hidden sm:inline-flex">{STAGE_LABEL[stage]} 단계</span>}
              {hydrated && <span className="hidden xl:inline-flex ml-1"><Freshness updatedAt={data.generatedAt} /></span>}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {actions}
              <div className="relative">
                <button data-tour="role" onClick={() => setRoleOpen((v) => !v)} className="btn-outline btn-sm !px-2 sm:!px-3" aria-haspopup="menu" aria-expanded={roleOpen} aria-label={`역할: ${ROLE_LABEL[role]}`}><span className="w-7 h-7 rounded-full bg-soft text-shell text-[13px] font-bold flex items-center justify-center">{ROLE_LABEL[role].charAt(0)}</span><span className="hidden sm:inline">{ROLE_LABEL[role]}</span><ChevronDown size={14} /></button>
                {roleOpen && (
                  <div className="absolute right-0 mt-1 w-60 card-raised p-1.5 z-50 fade-up" role="menu" onMouseLeave={() => setRoleOpen(false)}>
                    <div className="px-2 py-1 text-[13px] font-semibold text-muted">역할 전환 (시연용 권한)</div>
                    {(Object.keys(ROLE_LABEL) as RoleKey[]).map((r) => (
                      <button key={r} role="menuitem" onClick={() => { setRole(r); setRoleOpen(false); toast({ title: `${ROLE_LABEL[r]} 화면으로 전환`, body: `${ROLE_PERSON[r]} · 메뉴·KPI·민감정보가 역할에 맞게 바뀝니다.`, tone: "info" }); }} className={`w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-[15px] flex items-center justify-between hover:bg-mist ${r === role ? "font-bold text-primary" : ""}`}>{ROLE_PERSON[r]}{r === role && <span className="text-[13px]">현재</span>}</button>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/ax/actions" className="w-11 h-11 rounded-xl hover:bg-mist relative hidden sm:inline-flex items-center justify-center" aria-label="알림"><Bell size={20} />{hydrated && openActions > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />}</Link>
              {!inIframe && <button onClick={() => setTutorial(true)} className="w-11 h-11 rounded-xl hover:bg-mist hidden sm:inline-flex items-center justify-center" aria-label="사용 안내" title="사용 안내"><HelpCircle size={20} /></button>}
            </div>
          </div>
        </header>

        <main key={pathname} className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1600px] w-full mx-auto page-enter">
          {subtitle && <p className="text-[15px] sm:text-base text-muted mb-3 sm:mb-4 -mt-0.5">{subtitle}</p>}
          {children}
        </main>

        {/* 미래AI랩 공통 CTA 브릿지 — AX 화면 하단 */}
        <div className="px-3 sm:px-5 lg:px-6 pb-5 lg:pb-6"><SampleBridgeCTA surface="ax" /></div>

        <footer className="px-5 py-3 text-[13px] text-muted flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line bg-white">
          <span>NEXMART AX 운영화면 · 시연용 데이터 · 모든 수치는 시뮬레이션</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: themeDef.primary }} />테마 {themeDef.no} {themeDef.name}</span>
          <button onClick={() => setResetOpen(true)} className="ml-auto inline-flex items-center gap-1 min-h-[36px] hover:text-ink"><RotateCcw size={13} />시연 데이터 초기화</button>
          <Link href="/" className="inline-flex items-center gap-1 min-h-[36px] hover:text-ink"><Store size={13} />고객 플랫폼 보기</Link>
        </footer>
      </div>

      {preview && <DevicePreview src={preview.src} title={preview.title} onClose={() => setPreview(null)} />}
      {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
      <Overlay open={resetOpen} onClose={() => setResetOpen(false)} title="시연 데이터 초기화" size="sm" footer={<div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setResetOpen(false)}>취소</button><button className="btn-danger flex-1" onClick={() => { resetDemo(); setResetOpen(false); toast({ title: "시연 데이터를 초기화했습니다", body: "주문·실행·성과 기록·장바구니가 초기 시나리오로 돌아갑니다.", tone: "info" }); router.push("/ax"); }}>초기화</button></div>}>
        <p className="text-[17px]">고객 주문, 실행 처리, 성과 기록, 장바구니 등 시연 중 변경한 모든 상태를 초기 시나리오(A~E)로 되돌립니다. 테마·글자 크기 설정은 유지됩니다.</p>
      </Overlay>
    </div>
  );
}

/** 도구줄용 짧은 날짜·시각 — 모바일 9/29 14:46 · 데스크톱 2026.09.29 (화) 14:46 */
function ClockCompact() {
  const now = useNow(30000);
  if (!now) return <span className="inline-block w-20" />;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <time dateTime={now.toISOString()} className="tabular-nums whitespace-nowrap" suppressHydrationWarning>
      <span className="sm:hidden">{now.getMonth() + 1}/{now.getDate()} {p(now.getHours())}:{p(now.getMinutes())}</span>
      <span className="hidden sm:inline">{now.getFullYear()}.{p(now.getMonth() + 1)}.{p(now.getDate())} ({DOW[now.getDay()]}) {p(now.getHours())}:{p(now.getMinutes())}</span>
    </time>
  );
}
