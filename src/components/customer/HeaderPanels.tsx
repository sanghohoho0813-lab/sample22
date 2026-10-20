"use client";
/**
 * 고객 헤더 패널 — 알림 센터(벨)와 데스크톱 카테고리 메뉴.
 * 둘 다 "페이지를 떠나지 않고 훑어보고, 필요할 때만 이동"하는 상용 커머스 문법.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronRight, LayoutGrid, PackageCheck, RotateCcw, Truck, X } from "lucide-react";
import { useData, useHydrated } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { searchProducts } from "@/lib/catalog";
import { relTime, won } from "@/lib/format";
import AssetImage from "@/components/shared/AssetImage";
import Overlay from "@/components/shared/Overlay";
import EmptyArt from "@/components/shared/EmptyArt";
import type { Notification as AppNotification } from "@/lib/types";

/** 알림 제목·본문에서 관련 주문번호를 찾아 상세로 연결 */
const orderOf = (n: AppNotification) => /NX\d{6}-\d{4}/.exec(`${n.title} ${n.body}`)?.[0];
const iconOf = (n: AppNotification) =>
  /재입고/.test(n.title) ? PackageCheck : /다시 살|구매 주기/.test(n.title + n.body) ? RotateCcw : Truck;

function NotificationList({ items, onPick }: { items: AppNotification[]; onPick: () => void }) {
  if (!items.length)
    return (
      <div className="px-5 py-10 text-center">
        <EmptyArt kind="bell" />
        <p className="mt-3 text-[15px] font-semibold">새 알림이 없어요</p>
        <p className="mt-1 text-[14px] text-muted">출고·배송 상태가 바뀌면 여기에 알려드려요.</p>
      </div>
    );
  return (
    <ul className="divide-y divide-line">
      {items.map((n) => {
        const oid = orderOf(n);
        const Icon = iconOf(n);
        const body = (
          <>
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.read ? "bg-mist text-muted" : "bg-soft text-primary"}`}
            >
              <Icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className={`text-[15px] leading-snug ${n.read ? "font-medium" : "font-bold"}`}>
                  {n.title}
                </span>
                {!n.read && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-strong"
                    aria-label="새 알림"
                  />
                )}
              </span>
              <span className="mt-0.5 block text-[14px] leading-snug text-muted">{n.body}</span>
              <span className="mt-1 block text-[12px] text-muted">{relTime(n.createdAt)}</span>
            </span>
          </>
        );
        return (
          <li key={n.id}>
            {oid ? (
              <Link
                href={`/my/orders/${oid}`}
                onClick={onPick}
                className="flex gap-3 px-4 py-3.5 hover:bg-mist"
              >
                {body}
              </Link>
            ) : (
              <div className="flex gap-3 px-4 py-3.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationBell() {
  const data = useData();
  const hydrated = useHydrated();
  const customerId = useStore((s) => s.ui.customerId);
  const markRead = useStore((s) => s.markNotificationsRead);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () =>
      data.notifications
        .filter((n) => n.customerId === customerId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 20),
    [data.notifications, customerId],
  );
  const unread = items.filter((n) => !n.read).length;
  // 닫을 때 읽음 처리 — 열려 있는 동안은 무엇이 새 알림이었는지 보이도록
  const close = () => {
    setOpen(false);
    if (unread) markRead(customerId);
  };
  useEffect(() => {
    if (!open || mobile) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
    // close는 매 렌더 새로 만들어지지만 열림 상태에서만 등록한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mobile, unread]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        className="btn-ghost relative !px-2.5"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setMobile(window.matchMedia("(max-width: 639px)").matches);
          if (open) close();
          else setOpen(true);
        }}
      >
        <Bell size={22} aria-hidden="true" />
        {/* 이름은 숨김 글자로 — 보이는 숫자 배지와 aria-label이 어긋나지 않게 */}
        <span className="sr-only">알림{hydrated && unread ? ` 새 알림 ${unread}개` : ""}</span>
        {hydrated && unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-strong px-1 text-[11px] font-bold tabular-nums text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && !mobile && (
        <div
          role="dialog"
          aria-label="알림"
          className="card-raised fade-up absolute right-0 top-[calc(100%+8px)] z-50 w-[380px] overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[16px] font-bold">
              알림 {unread > 0 && <span className="text-accent">{unread}</span>}
            </h2>
            <button type="button" className="btn-ghost btn-sm !px-2" onClick={close} aria-label="알림 닫기">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <NotificationList items={items} onPick={close} />
          </div>
          <Link
            href="/my?tab=noti"
            onClick={close}
            className="flex items-center justify-center gap-1 border-t border-line py-3 text-[14px] font-semibold text-primary hover:bg-mist"
          >
            마이페이지에서 전체 보기 <ChevronRight size={15} />
          </Link>
        </div>
      )}
      {mobile && (
        <Overlay
          open={open}
          onClose={close}
          variant="sheet"
          title={`알림${unread ? ` ${unread}` : ""}`}
          subtitle="닫으면 모두 읽음으로 표시됩니다"
        >
          <div className="-mx-5 -mt-1">
            <NotificationList items={items} onPick={close} />
          </div>
        </Overlay>
      )}
    </div>
  );
}

/** 데스크톱 카테고리 메뉴 — 마우스를 올리거나 눌러서 8개 카테고리와 인기 상품을 한 번에 */
export function CategoryMenu({ active }: { active: boolean }) {
  const data = useData();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const top = useMemo(() => (open ? searchProducts(data, { sort: "popular" }) : []), [data, open]);
  const leadOf = (slug: string) => top.find((s) => s.product.categorySlug === slug)?.product.name;
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 140);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div ref={wrap} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <Link
        href="/category"
        aria-expanded={open}
        onFocus={show}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[17px] font-semibold transition-colors ${active || open ? "bg-soft text-primary" : "text-ink hover:bg-mist"}`}
      >
        <LayoutGrid size={16} />
        카테고리
      </Link>
      {open && (
        <div
          className="card-raised fade-up absolute left-0 top-[calc(100%+6px)] z-50 grid w-[860px] grid-cols-[1fr_260px] gap-0 overflow-hidden"
          onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node) && setOpen(false)}
        >
          <ul className="grid grid-cols-4 gap-2 p-4">
            {data.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl p-2 hover:bg-mist"
                >
                  <span aria-hidden="true" className="block w-full overflow-hidden rounded-2xl">
                    <AssetImage assetKey={`category/${c.slug}`} category={c.slug} label={leadOf(c.slug)} />
                  </span>
                  <span className="text-[15px] font-semibold">{c.name}</span>
                  <span className="line-clamp-1 text-center text-[12px] text-muted">{c.description}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-l border-line bg-mist/60 p-4">
            <div className="text-[13px] font-bold text-muted">지금 많이 찾는 상품</div>
            <ol className="mt-2 space-y-1">
              {top.slice(0, 6).map((s, i) => (
                <li key={s.product.id}>
                  <Link
                    href={`/product/${s.product.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-white"
                  >
                    <span className="w-4 text-center text-[13px] font-bold tabular-nums text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{s.product.name}</span>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {won(s.defaultSku.salePrice)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link
              href="/category"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-0.5 text-[14px] font-semibold text-primary"
            >
              전체 카테고리 <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
