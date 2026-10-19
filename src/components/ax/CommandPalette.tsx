"use client";
/**
 * 운영 화면 전역 검색 (⌘K / Ctrl+K) — 화면·SKU·주문·고객·공급사·발주·실행을 한 입력창에서 찾아 바로 연다.
 * 역할이 볼 수 없는 화면으로 가는 결과는 보여주지 않는다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCustomerName, useData, useLedger } from "@/lib/hooks";
import { ACTION_STAGE_LABEL, ORDER_STAGE_LABEL, useStore } from "@/lib/store";
import { actionTypeLabel } from "@/lib/engines";
import Overlay from "@/components/shared/Overlay";
import { AX_NAV } from "./AxShell";

type Hit = { group: string; label: string; sub?: string; href: string };
const LIMIT = 5;

export function CommandButton({ onOpen }: { onOpen: () => void }) {
  // 넓은 화면: 입력창 모양(업무 시스템 관례) · 좁은 화면: 아이콘 버튼
  return (
    <button
      onClick={onOpen}
      className="btn-ghost btn-sm !px-2 text-muted sm:!px-3 xl:w-64 xl:justify-start xl:border xl:border-line xl:bg-mist/70 xl:hover:bg-white"
      title="검색 (Ctrl+K)"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search size={18} aria-hidden="true" />
      <span className="sr-only text-[14px] font-normal xl:not-sr-only">검색</span>
      <span className="hidden text-[13px] font-normal text-muted xl:inline">상품·주문·고객·실행</span>
      <span className="kbd ml-auto hidden xl:inline-flex" aria-hidden="true">
        ⌘K
      </span>
    </button>
  );
}

export function useCommandHotkey(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const data = useData();
  const ledger = useLedger();
  const role = useStore((s) => s.ui.role);
  const name = useCustomerName();
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setCur(0);
    }
  }, [open]);

  const can = (href: string) => {
    const path = href.split("?")[0];
    const item = AX_NAV.find((n) => (n.href === "/ax" ? path === "/ax" : path.startsWith(n.href)));
    return !item || item.roles.includes(role);
  };

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    const out: Hit[] = [];
    const push = (h: Hit) => can(h.href) && out.push(h);
    const pages = AX_NAV.filter((n) => n.roles.includes(role) && (!t || n.label.toLowerCase().includes(t)));
    pages.slice(0, t ? LIMIT : 8).forEach((n) => push({ group: "화면", label: n.label, href: n.href }));
    if (!t) return out;
    const products = new Map(data.products.map((p) => [p.id, p]));
    data.skus
      .filter((s) => `${products.get(s.productId)?.name} ${s.name} ${s.id}`.toLowerCase().includes(t))
      .slice(0, LIMIT)
      .forEach((s) =>
        push({
          group: "상품·SKU",
          label: `${products.get(s.productId)?.name} · ${s.name}`,
          sub: s.id,
          href: `/ax/inventory?sku=${s.id}`,
        }),
      );
    data.orders
      .filter(
        (o) => o.id.toLowerCase().includes(t) || (role !== "buyer" && name(o.customerId).includes(q.trim())),
      )
      .slice(0, LIMIT)
      .forEach((o) =>
        push({
          group: "주문",
          label: o.id,
          sub: `${role === "buyer" ? "" : `${name(o.customerId)} · `}${ORDER_STAGE_LABEL[o.stage]}`,
          href: `/ax/fulfillment?tab=list&order=${o.id}`,
        }),
      );
    if (role !== "buyer") {
      const seen = new Set<string>();
      const custs = [
        ...data.customers.map((c) => ({ id: c.id, name: c.name, kind: "개인" })),
        ...(ledger?.customers.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind === "business" ? "기업·단체" : "개인",
        })) ?? []),
      ];
      for (const c of custs) {
        if (out.filter((h) => h.group === "고객").length >= LIMIT) break;
        if (seen.has(c.id) || !c.name.toLowerCase().includes(t)) continue;
        seen.add(c.id);
        push({ group: "고객", label: c.name, sub: c.kind, href: `/ax/customers?customer=${c.id}` });
      }
    }
    data.suppliers
      .filter((s) => s.name.toLowerCase().includes(t))
      .slice(0, LIMIT)
      .forEach((s) =>
        push({
          group: "공급사",
          label: s.name,
          sub: `리드타임 ${s.leadTimeDays}일`,
          href: `/ax/suppliers?supplier=${s.id}`,
        }),
      );
    data.purchaseOrders
      .filter((p) => p.id.toLowerCase().includes(t))
      .slice(0, LIMIT)
      .forEach((p) =>
        push({
          group: "발주",
          label: p.id,
          sub: `${data.suppliers.find((s) => s.id === p.supplierId)?.name ?? ""} · ${p.qty.toLocaleString()}개`,
          href: `/ax/suppliers?supplier=${p.supplierId}`,
        }),
      );
    data.actions
      .filter((a) => `${a.title} ${a.id}`.toLowerCase().includes(t))
      .slice(0, LIMIT)
      .forEach((a) =>
        push({
          group: "실행",
          label: a.title,
          sub: `${actionTypeLabel(a.type)} · ${ACTION_STAGE_LABEL[a.stage]}`,
          href: `/ax/actions?id=${a.id}`,
        }),
      );
    return out;
    // can은 role에만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, data, ledger, role, name]);

  useEffect(() => setCur(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${cur}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cur]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    router.push(h.href);
  };
  const groups = hits.reduce<Record<string, { h: Hit; i: number }[]>>((acc, h, i) => {
    (acc[h.group] ??= []).push({ h, i });
    return acc;
  }, {});

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="검색"
      subtitle="화면·상품·주문·고객·공급사·발주·실행"
      size="md"
    >
      <div className="-mt-1">
        <label className="relative block">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            data-autofocus
            className="input pl-10"
            placeholder="예: 물티슈, NX2610, 그린키친, 긴급발주"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCur((c) => Math.min(hits.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCur((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(hits[cur]);
              }
            }}
            role="combobox"
            aria-expanded
            aria-controls="cmd-results"
            aria-activedescendant={hits[cur] ? `cmd-${cur}` : undefined}
            aria-label="검색어"
          />
        </label>
        {hits.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">‘{q}’에 맞는 결과가 없습니다.</p>
        ) : (
          <ul
            ref={listRef}
            id="cmd-results"
            role="listbox"
            aria-label="검색 결과"
            className="mt-3 max-h-[52vh] overflow-y-auto"
          >
            {Object.entries(groups).map(([g, items]) => (
              <li key={g} role="presentation" className="mb-2">
                <div className="px-2 py-1 text-[12px] font-bold text-muted">{g}</div>
                <ul role="presentation">
                  {items.map(({ h, i }) => (
                    <li
                      key={`${h.href}-${i}`}
                      id={`cmd-${i}`}
                      data-idx={i}
                      role="option"
                      aria-selected={i === cur}
                      onMouseEnter={() => setCur(i)}
                      onClick={() => go(h)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[15px] ${i === cur ? "bg-soft" : ""}`}
                    >
                      <span className="min-w-0 truncate font-semibold">{h.label}</span>
                      {h.sub && <span className="shrink-0 text-[13px] text-muted">{h.sub}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 hidden text-[12px] text-muted sm:block">↑↓ 이동 · Enter 열기 · Esc 닫기</p>
      </div>
    </Overlay>
  );
}
