"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Rocket,
  TrendingUp,
  Package,
  Boxes,
  Factory,
  Truck,
  Users,
  Megaphone,
  Undo2,
  FileCheck2,
  BookOpenText,
  Presentation,
  Settings,
  Menu,
  X,
  Store,
  Smartphone,
  ChevronDown,
  HelpCircle,
  Bell,
  RotateCcw,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
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
export const NAV_FAMILY: Record<NavFamily, string> = {
  exec: "#2F6FED",
  supply: "#D9961A",
  ops: "#149C80",
  system: "#6D8899",
};
export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  color: string;
  family: NavFamily;
  roles: RoleKey[];
  badge?: "actions";
}
export interface NavGroup {
  key: string;
  label: string;
  icon: Icon;
  family: NavFamily;
  items: NavItem[];
}
export type NavNode = { type: "item"; item: NavItem } | { type: "group"; group: NavGroup };

const ALL: RoleKey[] = ["owner", "buyer", "ops", "cs"];
const I = {
  dashboard: {
    href: "/ax",
    label: "경영 대시보드",
    icon: LayoutDashboard,
    color: "#2F6FED",
    family: "exec",
    roles: ALL,
  },
  actions: {
    href: "/ax/actions",
    label: "실행 센터",
    icon: Rocket,
    color: "#4A82F0",
    family: "exec",
    roles: ALL,
    badge: "actions",
  },
  products: {
    href: "/ax/products",
    label: "상품·SKU",
    icon: Package,
    color: "#D9961A",
    family: "supply",
    roles: ["owner", "buyer"],
  },
  inventory: {
    href: "/ax/inventory",
    label: "재고·발주",
    icon: Boxes,
    color: "#E5AA3C",
    family: "supply",
    roles: ["owner", "buyer", "ops"],
  },
  suppliers: {
    href: "/ax/suppliers",
    label: "공급사·구매",
    icon: Factory,
    color: "#BF830F",
    family: "supply",
    roles: ["owner", "buyer"],
  },
  fulfillment: {
    href: "/ax/fulfillment",
    label: "주문·출고",
    icon: Truck,
    color: "#149C80",
    family: "ops",
    roles: ["owner", "ops", "cs"],
  },
  returns: {
    href: "/ax/returns",
    label: "반품·문의",
    icon: Undo2,
    color: "#36B596",
    family: "ops",
    roles: ["owner", "ops", "cs"],
  },
  customers: {
    href: "/ax/customers",
    label: "고객·재구매",
    icon: Users,
    color: "#0F8A72",
    family: "ops",
    roles: ["owner", "cs"],
  },
  promotions: {
    href: "/ax/promotions",
    label: "프로모션",
    icon: Megaphone,
    color: "#4CC2A8",
    family: "ops",
    roles: ["owner", "buyer"],
  },
  sales: {
    href: "/ax/sales",
    label: "매출·마진",
    icon: TrendingUp,
    color: "#2459CC",
    family: "exec",
    roles: ["owner"],
  },
  evidence: {
    href: "/ax/evidence",
    label: "AX 성과 기록",
    icon: FileCheck2,
    color: "#5B8FF2",
    family: "exec",
    roles: ALL,
  },
  settings: {
    href: "/ax/settings",
    label: "설정",
    icon: Settings,
    color: "#6D8899",
    family: "system",
    roles: ALL,
  },
  why: {
    href: "/ax/why",
    label: "기획 의도",
    icon: BookOpenText,
    color: "#7D93A3",
    family: "system",
    roles: ALL,
  },
  presentation: {
    href: "/ax/presentation",
    label: "시연 모드",
    icon: Presentation,
    color: "#5E7A8C",
    family: "system",
    roles: ALL,
  },
} satisfies Record<string, NavItem>;

/**
 * AX 메뉴 정보구조 (최대 2단계)
 * 14개 기능을 모두 유지하면서, 처음 보이는 상위 항목은 7개 + 샘플 안내로 줄인다.
 * 기존 URL은 그대로 — 메뉴 위치만 바뀐다.
 */
export const AX_MENU: NavNode[] = [
  { type: "item", item: I.dashboard },
  { type: "item", item: I.actions },
  {
    type: "group",
    group: {
      key: "stock",
      label: "상품·재고",
      icon: Boxes,
      family: "supply",
      items: [I.products, I.inventory, I.suppliers],
    },
  },
  {
    type: "group",
    group: {
      key: "orders",
      label: "주문·배송",
      icon: Truck,
      family: "ops",
      items: [I.fulfillment, I.returns],
    },
  },
  {
    type: "group",
    group: {
      key: "customers",
      label: "고객·마케팅",
      icon: Users,
      family: "ops",
      items: [I.customers, I.promotions],
    },
  },
  {
    type: "group",
    group: {
      key: "analytics",
      label: "경영분석",
      icon: TrendingUp,
      family: "exec",
      items: [I.sales, I.evidence],
    },
  },
  { type: "item", item: I.settings },
];
/** 샘플 안내 — 핵심 업무 메뉴보다 한 단계 낮은 시각적 중요도로 분리 */
export const AX_EXTRA: NavItem[] = [I.why, I.presentation];
/** 역할 가드·검색용 평면 목록 (14개 기능 전부) */
export const AX_NAV: NavItem[] = [
  ...AX_MENU.flatMap((n) => (n.type === "item" ? [n.item] : n.group.items)),
  ...AX_EXTRA,
];

const isActiveHref = (pathname: string, href: string) =>
  href === "/ax" ? pathname === "/ax" : pathname.startsWith(href);
/** 사용자가 펼친 그룹을 페이지 이동 후에도 기억 (세션 내) */
let rememberedOpen: string[] | null = null;

/** 어두운 사이드바/드로어 공용 메뉴 트리 — 현재 위치는 '흰 배경' 한 가지 방식으로만 강조 */
function AxNavTree({
  pathname,
  role,
  openActions,
  hydrated,
}: {
  pathname: string;
  role: RoleKey;
  openActions: number;
  hydrated: boolean;
}) {
  const nodes = useMemo(
    () =>
      AX_MENU.flatMap<NavNode>((n) => {
        if (n.type === "item") return n.item.roles.includes(role) ? [n] : [];
        const items = n.group.items.filter((x) => x.roles.includes(role));
        if (!items.length) return [];
        if (items.length === 1) return [{ type: "item", item: items[0] }]; // 하위 1개뿐이면 그룹 없이 바로 노출
        return [{ type: "group", group: { ...n.group, items } }];
      }),
    [role],
  );
  const activeGroup = nodes.find(
    (n) => n.type === "group" && n.group.items.some((x) => isActiveHref(pathname, x.href)),
  );
  const [open, setOpen] = useState<string[]>(() => {
    const base = rememberedOpen ?? [];
    return activeGroup && activeGroup.type === "group" && !base.includes(activeGroup.group.key)
      ? [...base, activeGroup.group.key]
      : base;
  });
  const toggle = (k: string) =>
    setOpen((o) => {
      const next = o.includes(k) ? o.filter((x) => x !== k) : [...o, k];
      rememberedOpen = next;
      return next;
    });
  const extras = AX_EXTRA.filter((x) => x.roles.includes(role));

  const row = (item: NavItem, sub = false) => {
    const on = isActiveHref(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={on ? "page" : undefined}
        className={`group/nav flex items-center gap-3 rounded-xl transition-colors duration-150 ${sub ? "min-h-[44px] pl-3 pr-3 text-[16px]" : "min-h-[48px] px-3 text-[17px]"} font-semibold ${on ? "bg-white text-shell shadow-card" : "text-white/85 hover:bg-white/10"}`}
      >
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-lg ${sub ? "h-7 w-7" : "h-9 w-9"}`}
          style={{ background: `${item.color}${on ? "1F" : "30"}`, color: on ? item.color : "#fff" }}
        >
          <item.icon size={sub ? 15 : 18} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge === "actions" && hydrated && openActions > 0 && (
          <span className="min-w-[26px] shrink-0 rounded-full bg-accent-strong px-1.5 py-0.5 text-center text-[13px] font-bold tabular-nums text-white">
            {openActions > 99 ? "99+" : openActions}
          </span>
        )}
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
            <button
              type="button"
              onClick={() => toggle(g.key)}
              aria-expanded={expanded}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-[17px] font-semibold text-white/85 transition-colors duration-150 hover:bg-white/10"
            >
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${color}30` }}
              >
                <g.icon size={18} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left">{g.label}</span>
              {hasActive && !expanded && (
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-label="현재 위치 포함" />
              )}
              <span className="text-[13px] tabular-nums text-white/60">{g.items.length}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-white/60 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
            {expanded && (
              <div className="border-white/12 fade-in mb-1.5 ml-[30px] mt-0.5 space-y-0.5 border-l pl-2">
                {g.items.map((x) => row(x, true))}
              </div>
            )}
          </div>
        );
      })}
      {extras.length > 0 && (
        <div className="mt-2 border-t border-white/10 pt-3">
          <div className="px-3 pb-1.5 text-[13px] font-semibold text-white/65">샘플 안내</div>
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {extras.map((x) => {
              const on = isActiveHref(pathname, x.href);
              return (
                <Link
                  key={x.href}
                  href={x.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[15px] font-medium transition-colors duration-150 ${on ? "bg-white text-shell" : "bg-white/[0.06] text-white/75 hover:bg-white/10 hover:text-white"}`}
                >
                  <x.icon size={16} className="shrink-0" />
                  {x.label}
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
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-[900] flex flex-col bg-shell/85 backdrop-blur-sm"
      role="dialog"
      aria-label={title}
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-4 text-white">
        <div className="flex items-center gap-3">
          <Smartphone size={18} />
          <span className="font-semibold">{title}</span>
          <span className="hidden text-sm text-white/60 sm:inline">
            실제 반응형 UI를 {w}px 폭으로 표시합니다
          </span>
        </div>
        <div className="flex items-center gap-2">
          {([360, 390, 430] as const).map((x) => (
            <button
              key={x}
              onClick={() => setW(x)}
              className={`h-9 rounded-lg px-2.5 text-sm font-semibold ${w === x ? "bg-white text-shell" : "bg-white/10 hover:bg-white/20"}`}
            >
              {x}
            </button>
          ))}
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-sm hover:bg-white/20"
          >
            <ExternalLink size={14} />새 탭
          </a>
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-white px-3 text-sm font-bold text-shell"
          >
            <X size={16} />
            닫기 (Esc)
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div className="max-h-full rounded-[36px] bg-black p-2.5 shadow-raised" style={{ width: w + 20 }}>
          <div
            className="relative overflow-hidden rounded-[28px] bg-white"
            style={{ width: w, height: "min(844px, calc(100vh - 110px))" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-6 justify-center">
              <div className="h-5 w-28 rounded-b-2xl bg-black" />
            </div>
            <iframe title={title} src={src} className="h-full w-full border-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 모바일 표 → 카드 변환용: 표의 열 제목을 각 칸의 data-label로 복사한다.
 * 화면·드로어에서 표가 새로 그려질 때마다(행 추가·필터 변경) 다시 붙인다. 속성 변경은 감시하지 않으므로 무한 반복 없음.
 * 같은 자리에서 스크롤되는 표 영역은 키보드로 스크롤할 수 있게 tabindex·이름을 붙인다 (WCAG 2.1.1).
 */
function useStackedTables() {
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      document.querySelectorAll<HTMLTableElement>(".table-wrap > table").forEach((t) => {
        // 스크린리더 전용(.sr-only) 열 이름은 카드 라벨로 보이지 않게 뺀다
        const heads = Array.from(t.querySelectorAll("thead th")).map((th) =>
          Array.from(th.childNodes)
            .filter((n) => !(n instanceof HTMLElement && n.classList.contains("sr-only")))
            .map((n) => n.textContent ?? "")
            .join("")
            .trim(),
        );
        const titleIdx = heads.findIndex((h) => h);
        t.querySelectorAll(":scope > tbody > tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            const l = heads[i] ?? "";
            if (td.getAttribute("data-label") !== l) td.setAttribute("data-label", l);
            if (i === titleIdx) {
              if (!td.hasAttribute("data-title")) td.setAttribute("data-title", "");
            } else if (td.hasAttribute("data-title")) td.removeAttribute("data-title");
          });
        });
        const wrap = t.parentElement;
        if (!wrap) return;
        wrap.classList.add("stackable");
        const scrollable =
          wrap.scrollWidth > wrap.clientWidth + 1 || wrap.scrollHeight > wrap.clientHeight + 1;
        if (scrollable && !wrap.hasAttribute("tabindex")) {
          const heading = wrap.closest("section, [role=dialog]")?.querySelector("h2, h3");
          wrap.setAttribute("tabindex", "0");
          wrap.setAttribute("role", "region");
          wrap.setAttribute("aria-label", `${heading?.textContent?.trim() || "데이터"} 표 (스크롤)`);
        }
      });
    };
    apply();
    const mo = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(apply);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const onResize = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("resize", onResize);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export default function AxShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tour?: boolean;
}) {
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
  const openActions = data.actions.filter(
    (a) => !["done", "dismissed"].includes(a.stage) && (role === "owner" || a.owner === role),
  ).length;
  const closeMenu = useCallback(() => setMenu(false), []);
  useStackedTables();

  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    if (hydrated && !tutorialDone && pathname === "/ax" && !inIframe) {
      const t = setTimeout(() => setTutorial(true), 800);
      return () => clearTimeout(t);
    }
  }, [hydrated, tutorialDone, pathname, inIframe]);
  // role guard: if current route not allowed for role, go to dashboard
  useEffect(() => {
    if (!hydrated) return;
    const item = AX_NAV.find((n) => isActiveHref(pathname, n.href));
    if (item && !item.roles.includes(role)) router.replace("/ax");
  }, [role, pathname, hydrated, router]);

  const themeDef = THEMES.find((t) => t.key === theme) ?? THEMES[4];

  const Brand = (
    <div className="flex h-16 items-center gap-2.5 px-4">
      <span className="bg-white/12 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black">
        N
      </span>
      <div className="min-w-0 leading-tight">
        <div className="font-black tracking-tight">NEXMART</div>
        <div className="text-[13px] font-semibold text-white/60">AX 운영화면</div>
      </div>
    </div>
  );
  const Meta = (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-[13px] text-white/60">
      <span className="inline-flex items-center gap-1.5">
        진행 단계 <span className="badge bg-white/15 text-white">{STAGE_LABEL[stage]}</span>
      </span>
      <Link
        href="/ax/settings?tab=tech"
        className="inline-flex min-h-[32px] items-center text-white/80 underline underline-offset-2 hover:text-white"
      >
        기술·사업화 자산
      </Link>
    </div>
  );
  const toCustomer = (
    <Link
      href="/"
      className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl bg-white px-4 text-[17px] font-bold text-shell transition-colors duration-150 hover:bg-white/90"
    >
      <span className="inline-flex items-center gap-2">
        <Store size={19} />
        고객 플랫폼 보기
      </span>
      <ArrowRight size={18} />
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-mist">
      <a href="#main" className="skip-link">
        본문 바로가기
      </a>
      {/* desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col text-white lg:flex"
        style={{ background: "var(--t-shell)" }}
      >
        <div className="shrink-0 border-b border-white/10">{Brand}</div>
        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3"
          data-tour="sidebar"
          aria-label="AX 메뉴"
        >
          <AxNavTree pathname={pathname} role={role} openActions={openActions} hydrated={hydrated} />
        </nav>
        <div className="shrink-0 border-t border-white/10">
          <SidebarBridgeCTA />
        </div>
        <div className="shrink-0 border-t border-white/10">{Meta}</div>
      </aside>

      {/* mobile drawer — 왼쪽에서 열림, 메뉴 영역만 스크롤, 하단 '고객 플랫폼 보기' 고정 */}
      <MobileDrawer
        open={menu}
        onClose={closeMenu}
        label="AX 메뉴"
        tone="dark"
        header={
          <div className="flex items-center pr-2">
            {Brand}
            <button
              className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
              onClick={closeMenu}
              aria-label="메뉴 닫기"
            >
              <X size={22} />
            </button>
          </div>
        }
        footer={<div className="p-3">{toCustomer}</div>}
      >
        <nav className="px-2.5 py-3" aria-label="AX 메뉴">
          <AxNavTree pathname={pathname} role={role} openActions={openActions} hydrated={hydrated} />
        </nav>
        <div className="border-t border-white/10 pt-1">
          <SidebarBridgeCTA />
        </div>
        {Meta}
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ① DEMO 도구줄 — 시연 관련 조작은 여기로 분리 */}
        {!inIframe && (
          <section aria-label="시연 환경 안내" className="bg-[#0F1B27] text-white">
            <div className="flex h-10 items-center gap-2 px-3 text-[14px] sm:px-5">
              <span className="shrink-0 rounded bg-orange-strong px-1.5 py-0.5 text-[12px] font-bold tracking-wide text-white">
                DEMO
              </span>
              <span className="shrink-0 text-white/70">
                <ClockCompact />
              </span>
              <span className="hidden min-w-0 truncate text-white/55 lg:inline">
                시연용 AX 운영화면 · 모든 수치는 시뮬레이션입니다
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <div
                  className="mr-1.5 hidden items-center gap-1 border-r border-white/15 pr-2.5 xl:flex"
                  data-tour="theme"
                  role="group"
                  aria-label="빠른 테마 전환"
                >
                  {THEMES.map((t) => (
                    <button
                      key={t.key}
                      title={`테마 ${t.no} ${t.name}`}
                      onClick={() => setTheme(t.key)}
                      className={`h-[18px] w-[18px] rounded-full border ${theme === t.key ? "border-white ring-2 ring-white/70 ring-offset-1 ring-offset-[#0F1B27]" : "border-white/30 hover:border-white/70"}`}
                      style={{ background: `linear-gradient(135deg, ${t.shell} 50%, ${t.primary} 50%)` }}
                      aria-label={`테마 ${t.name}`}
                      aria-pressed={theme === t.key}
                    />
                  ))}
                </div>
                <button
                  data-tour="device"
                  onClick={() =>
                    setPreview({
                      src: `${pathname}${pathname.includes("?") ? "&" : "?"}embed=1`,
                      title: "스마트폰 미리보기 — AX 운영화면",
                    })
                  }
                  className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-white/85 hover:bg-white/10 md:inline-flex"
                >
                  <Smartphone size={15} />
                  스마트폰 미리보기
                </button>
                <Link
                  data-tour="customer"
                  href="/"
                  className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-3 font-bold text-[#0F1B27] hover:bg-white/90"
                >
                  고객 플랫폼 보기
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ② 메인 헤더 — 메뉴 · 화면 제목 · 역할 · 알림 */}
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-2 sm:h-16 sm:px-5">
            <button
              data-tour="menu"
              className="-ml-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-mist lg:hidden"
              onClick={() => setMenu(true)}
              aria-label="메뉴 열기"
              aria-expanded={menu}
            >
              <Menu size={23} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h1 className="truncate text-[19px] font-bold sm:text-xl">{title}</h1>
              {stage !== "DEMO" && (
                <span className="badge bg-secondary/12 hidden text-secondary sm:inline-flex">
                  {STAGE_LABEL[stage]} 단계
                </span>
              )}
              {hydrated && (
                <span className="ml-1 hidden xl:inline-flex">
                  <Freshness updatedAt={data.generatedAt} />
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {actions}
              <div className="relative">
                <button
                  data-tour="role"
                  onClick={() => setRoleOpen((v) => !v)}
                  className="btn-outline btn-sm !px-2 sm:!px-3"
                  aria-haspopup="menu"
                  aria-expanded={roleOpen}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-soft text-[13px] font-bold text-shell"
                  >
                    {ROLE_LABEL[role].charAt(0)}
                  </span>
                  <span className="sr-only">역할: </span>
                  <span className="sr-only sm:not-sr-only">{ROLE_LABEL[role]}</span>
                  <ChevronDown size={14} />
                </button>
                {roleOpen && (
                  <div
                    className="card-raised fade-up absolute right-0 z-50 mt-1 w-60 p-1.5"
                    role="menu"
                    onMouseLeave={() => setRoleOpen(false)}
                  >
                    <div className="px-2 py-1 text-[13px] font-semibold text-muted">
                      역할 전환 (시연용 권한)
                    </div>
                    {(Object.keys(ROLE_LABEL) as RoleKey[]).map((r) => (
                      <button
                        key={r}
                        role="menuitem"
                        onClick={() => {
                          setRole(r);
                          setRoleOpen(false);
                          toast({
                            title: `${ROLE_LABEL[r]} 화면으로 전환`,
                            body: `${ROLE_PERSON[r]} · 메뉴·KPI·민감정보가 역할에 맞게 바뀝니다.`,
                            tone: "info",
                          });
                        }}
                        className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[15px] hover:bg-mist ${r === role ? "font-bold text-primary" : ""}`}
                      >
                        {ROLE_PERSON[r]}
                        {r === role && <span className="text-[13px]">현재</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/ax/actions"
                className="relative hidden h-11 w-11 items-center justify-center rounded-xl hover:bg-mist sm:inline-flex"
                aria-label="알림"
              >
                <Bell size={20} />
                {hydrated && openActions > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
                )}
              </Link>
              {!inIframe && (
                <button
                  onClick={() => setTutorial(true)}
                  className="hidden h-11 w-11 items-center justify-center rounded-xl hover:bg-mist sm:inline-flex"
                  aria-label="사용 안내"
                  title="사용 안내"
                >
                  <HelpCircle size={20} />
                </button>
              )}
            </div>
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          key={pathname}
          className="page-enter mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-5 lg:p-6"
        >
          {subtitle && <p className="-mt-0.5 mb-3 text-[15px] text-muted sm:mb-4 sm:text-base">{subtitle}</p>}
          {children}
        </main>

        {/* 미래AI랩 공통 CTA 브릿지 — AX 화면 하단 */}
        <div className="px-3 pb-5 sm:px-5 lg:px-6 lg:pb-6">
          <SampleBridgeCTA surface="ax" />
        </div>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line bg-white px-5 py-3 text-[13px] text-muted">
          <span>NEXMART AX 운영화면 · 시연용 데이터 · 모든 수치는 시뮬레이션</span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ background: themeDef.primary }} />
            테마 {themeDef.no} {themeDef.name}
          </span>
          <button
            onClick={() => setResetOpen(true)}
            className="ml-auto inline-flex min-h-[36px] items-center gap-1 hover:text-ink"
          >
            <RotateCcw size={13} />
            시연 데이터 초기화
          </button>
          <Link href="/" className="inline-flex min-h-[36px] items-center gap-1 hover:text-ink">
            <Store size={13} />
            고객 플랫폼 보기
          </Link>
        </footer>
      </div>

      {preview && <DevicePreview src={preview.src} title={preview.title} onClose={() => setPreview(null)} />}
      {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
      <Overlay
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="시연 데이터 초기화"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => setResetOpen(false)}>
              취소
            </button>
            <button
              className="btn-danger flex-1"
              onClick={() => {
                resetDemo();
                setResetOpen(false);
                toast({
                  title: "시연 데이터를 초기화했습니다",
                  body: "주문·실행·성과 기록·장바구니가 초기 시나리오로 돌아갑니다.",
                  tone: "info",
                });
                router.push("/ax");
              }}
            >
              초기화
            </button>
          </div>
        }
      >
        <p className="text-[17px]">
          고객 주문, 실행 처리, 성과 기록, 장바구니 등 시연 중 변경한 모든 상태를 초기 시나리오(A~E)로
          되돌립니다. 테마·글자 크기 설정은 유지됩니다.
        </p>
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
    <time dateTime={now.toISOString()} className="whitespace-nowrap tabular-nums" suppressHydrationWarning>
      <span className="sm:hidden">
        {now.getMonth() + 1}/{now.getDate()} {p(now.getHours())}:{p(now.getMinutes())}
      </span>
      <span className="hidden sm:inline">
        {now.getFullYear()}.{p(now.getMonth() + 1)}.{p(now.getDate())} ({DOW[now.getDay()]}){" "}
        {p(now.getHours())}:{p(now.getMinutes())}
      </span>
    </time>
  );
}
