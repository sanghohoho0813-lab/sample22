"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  PackageSearch,
  ArrowRight,
  ChevronRight,
  Truck,
  Bell,
  Clock3,
  MapPin,
  User,
  RotateCcw,
  ChevronLeft,
  LayoutDashboard,
} from "lucide-react";
import { useData, useForecast, useLookups, useIsInIframe, useShippingRule } from "@/lib/hooks";
import { isPreShip } from "@/lib/fulfillment";
import { CUSTOMER_STAGE_LABEL, useStore } from "@/lib/store";
import { fmtDate, relTime, won } from "@/lib/format";
import type { Order, OrderStage } from "@/lib/types";
import AssetImage from "@/components/shared/AssetImage";
import Overlay from "@/components/shared/Overlay";
import { EmptyState, Tabs } from "@/components/shared/Bits";
import { useToast } from "@/components/shared/Toast";
import { repeatItemsForCustomer } from "@/lib/engines";
import { searchProducts } from "@/lib/catalog";
import ProductCard from "./ProductCard";
import { DeliveryBadge } from "./ProductCard";
import { deliveryPromise } from "@/lib/format";

const STEPS: { key: string; label: string; stages: OrderStage[] }[] = [
  { key: "received", label: "주문접수", stages: ["new", "confirmed"] },
  { key: "prep", label: "상품준비", stages: ["picking_wait", "picking", "packing_wait", "ship_wait"] },
  { key: "shipped", label: "출고완료", stages: ["shipped"] },
  { key: "transit", label: "배송중", stages: ["in_transit"] },
  { key: "done", label: "배송완료", stages: ["delivered"] },
];

/** 주문 상태에 맞는 날짜 문구 — 진행중이면 도착예정, 완료면 실제 완료일 */
export function deliveryNote(order: Order) {
  if (order.stage === "cancelled") return `${fmtDate(order.updatedAt, "md")} 취소`;
  if (order.stage === "return") return `${fmtDate(order.updatedAt, "md")} 반품·교환 접수`;
  if (order.stage === "delivered") {
    const at = order.history.find((h) => h.stage === "delivered")?.at ?? order.updatedAt;
    return `${fmtDate(at, "md")} 배송완료`;
  }
  // 예정일이 지났는데 아직 배송 중이면 "예정"이라고 하지 않는다
  if (new Date(order.promisedAt).getTime() < Date.now())
    return `예정일(${fmtDate(order.promisedAt, "md")}) 지나 배송 중`;
  return `${fmtDate(order.promisedAt, "md")} 도착 예정`;
}

export function OrderProgress({ order }: { order: Order }) {
  if (order.stage === "cancelled") return <div className="badge bg-mist text-muted">취소된 주문</div>;
  if (order.stage === "return") return <div className="badge bg-danger/10 text-danger">반품·교환 진행중</div>;
  const idx = STEPS.findIndex((s) => s.stages.includes(order.stage));
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="배송 진행 단계">
      {STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s.key} className="flex flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <div
                className={`h-1 flex-1 rounded-full ${i === 0 ? "opacity-0" : done ? "bg-primary" : "bg-line"}`}
              />
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-primary text-white" : "bg-line text-muted"}`}
              >
                {done ? <CheckCircle2 size={16} /> : <span className="text-xs">{i + 1}</span>}
              </div>
              <div
                className={`h-1 flex-1 rounded-full ${i === STEPS.length - 1 ? "opacity-0" : i < idx ? "bg-primary" : "bg-line"}`}
              />
            </div>
            <span
              className={`text-[13px] sm:text-xs ${i === idx ? "font-bold text-primary" : done ? "text-ink" : "text-muted"}`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderCompleteView({ orderId }: { orderId: string }) {
  const data = useData();
  const { productById } = useLookups();
  const inIframe = useIsInIframe();
  const order = data.orders.find((o) => o.id === orderId);
  if (!order)
    return (
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <EmptyState
          art="box"
          title="주문을 찾을 수 없습니다"
          action={
            <Link href="/my" className="btn-primary btn-sm">
              주문내역
            </Link>
          }
        />
      </div>
    );
  const promise = fmtDate(order.promisedAt, "md");
  return (
    <div className="mx-auto max-w-[720px] px-4 py-8">
      <div className="text-center">
        <div className="pop-in relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-strong text-white shadow-[0_10px_30px_rgba(8,115,123,0.28)]">
          <CheckCircle2 size={40} strokeWidth={2.2} />
          <span aria-hidden="true" className="ring-pulse absolute inset-0 rounded-full" />
        </div>
        <h1 className="mt-5 text-[26px] font-bold tracking-tight sm:text-3xl">주문이 접수되었습니다</h1>
        <p className="mt-2 text-[17px]">
          <b className="text-primary">{promise}</b> 도착 예정
        </p>
        <p className="mt-1 text-[14px] text-muted">
          주문번호 <span className="font-semibold tabular-nums text-ink">{order.id}</span> · 시연 주문(실제
          결제 없음)
        </p>
      </div>
      <div className="card mt-7 p-5">
        <OrderProgress order={order} />
        <ul className="mt-5 divide-y divide-line">
          {order.items.map((it) => {
            const p = productById.get(it.productId)!;
            return (
              <li key={it.skuId} className="flex items-center gap-3 py-3">
                <AssetImage
                  assetKey={`product/${p.id}`}
                  category={p.categorySlug}
                  label={p.name}
                  className="h-14 w-14 shrink-0 rounded-lg"
                  ratio=""
                />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-[15px] font-semibold">{it.name}</div>
                  <div className="text-[13px] text-muted">
                    {it.skuName} × {it.qty}
                  </div>
                </div>
                <div className="text-[15px] font-bold tabular-nums">{won(it.unitPrice * it.qty)}</div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">
            결제 예정금액 (배송비 {order.shippingFee ? won(order.shippingFee) : "무료"})
          </span>
          <b className="text-lg tabular-nums">{won(order.total)}</b>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href={`/my/orders/${order.id}`} className="btn-primary btn-lg">
          주문 상세·배송조회 <ArrowRight size={16} />
        </Link>
        <Link href="/" className="btn-outline btn-lg">
          쇼핑 계속하기
        </Link>
      </div>
      {/* 시연용 연결 — 방금 주문이 운영 화면에 바로 들어간 것을 보여준다 */}
      {!inIframe && (
        <Link
          href={`/ax/fulfillment?order=${order.id}`}
          className="mt-5 flex items-center gap-3 rounded-2xl bg-mist px-4 py-3.5 hover:brightness-[0.98]"
        >
          <LayoutDashboard size={20} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">운영 화면에도 방금 들어왔어요</span>
            <span className="block text-[14px] text-muted">
              AX 운영화면의 주문·출고에서 이 주문 확인 (시연)
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted" />
        </Link>
      )}
    </div>
  );
}

/** 주문 상태 칩 — 진행 중은 브랜드색, 완료는 회색, 취소·반품은 경고색 */
function StageChip({ stage }: { stage: OrderStage }) {
  const done = stage === "delivered";
  const bad = stage === "cancelled" || stage === "return";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[14px] font-bold ${bad ? "bg-danger/10 text-danger" : done ? "bg-mist text-muted" : "bg-soft text-primary"}`}
    >
      {!done && !bad && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      {CUSTOMER_STAGE_LABEL[stage]}
    </span>
  );
}

export function MyPageView() {
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const wishlist = useStore((s) => s.ui.wishlist);
  const recentViews = useStore((s) => s.ui.recentViews);
  const { customerById, productById } = useLookups();
  const me = customerById.get(customerId)!;
  const orders = data.orders.filter((o) => o.customerId === customerId);
  const notes = data.notifications.filter((n) => n.customerId === customerId);
  const [tab, setTab] = useState<"orders" | "wish" | "recent" | "noti" | "inquiry">("orders");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && ["orders", "wish", "recent", "noti", "inquiry"].includes(t)) setTab(t as typeof tab);
  }, []);
  const repeat = useMemo(() => repeatItemsForCustomer(data, customerId), [data, customerId]);
  const due = repeat.filter((r) => r.dueInDays <= 3).length;
  const active = orders.filter((o) => !["delivered", "cancelled", "return"].includes(o.stage)).length;

  const tiles = [
    { key: "orders" as const, label: "배송 진행", value: active, href: "/track" },
    { key: "noti" as const, label: "새 알림", value: notes.filter((n) => !n.read).length },
    { key: "repeat" as const, label: "다시 살 때", value: due, href: "/my/repeat", accent: true },
    { key: "wish" as const, label: "찜", value: wishlist.length },
  ];
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:py-8">
      {/* 왼쪽(데스크톱 고정): 프로필 + 바로가기 숫자 */}
      <aside className="lg:sticky lg:top-32">
        <div className="rounded-[22px] bg-shell p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <User size={24} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[21px] font-bold">
                <span className="sr-only">마이페이지 — </span>
                {me.name}님
              </h1>
              <div className="inline-flex max-w-full items-center gap-1 text-[14px] text-white/85">
                <MapPin size={13} className="shrink-0" />
                <span className="truncate">
                  {me.address.line1} {me.address.line2}
                </span>
              </div>
            </div>
          </div>
          {/* 숫자 4개가 곧 바로가기 — 같은 기능의 버튼을 따로 두지 않는다 */}
          <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
            {tiles.map((t) => {
              const body = (
                <>
                  <div
                    className={`text-[20px] font-bold tabular-nums ${t.accent && t.value ? "text-highlight" : ""}`}
                  >
                    {t.value}
                  </div>
                  <div className="text-[12px] text-white/85">{t.label}</div>
                </>
              );
              const cls = "rounded-xl bg-white/10 px-1 py-2.5 transition-colors hover:bg-white/15";
              return t.href ? (
                <Link key={t.key} href={t.href} className={cls}>
                  {body}
                </Link>
              ) : (
                <button key={t.key} type="button" onClick={() => setTab(t.key as typeof tab)} className={cls}>
                  {body}
                </button>
              );
            })}
          </div>
        </div>
        <nav
          aria-label="마이페이지 메뉴"
          className="mt-3 hidden overflow-hidden rounded-2xl border border-line bg-white lg:block"
        >
          {(
            [
              ["orders", "주문내역", orders.length],
              ["wish", "찜한 상품", wishlist.length],
              ["recent", "최근 본 상품", recentViews.length],
              ["noti", "알림", notes.length],
              ["inquiry", "문의·반품", null],
            ] as const
          ).map(([k, l, n]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-current={tab === k ? "page" : undefined}
              className={`flex w-full items-center justify-between border-b border-line px-4 py-3 text-left text-[15px] last:border-b-0 ${tab === k ? "bg-soft font-bold text-primary" : "hover:bg-mist"}`}
            >
              {l}
              <span className="inline-flex items-center gap-1 text-[14px] text-muted">
                {n !== null && <span className="tabular-nums">{n}</span>}
                <ChevronRight size={15} />
              </span>
            </button>
          ))}
        </nav>
        <Link
          href="/my/repeat"
          className="mt-3 hidden items-center gap-3 rounded-2xl border border-line bg-white p-4 hover:bg-mist lg:flex"
        >
          <RotateCcw size={20} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">다시 구매</span>
            <span className="block text-[13px] text-muted">구매주기에 맞춰 한 번에 담기</span>
          </span>
          <ChevronRight size={16} className="text-muted" />
        </Link>
      </aside>

      <div className="min-w-0">
        <Tabs
          className="mt-5 lg:mt-0"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "orders", label: "주문내역", count: orders.length },
            { key: "wish", label: "찜", count: wishlist.length },
            { key: "recent", label: "최근 본 상품", count: recentViews.length },
            { key: "noti", label: "알림", count: notes.length },
            { key: "inquiry", label: "문의·반품" },
          ]}
        />

        <div className="mt-4">
          {tab === "orders" &&
            (orders.length ? (
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li key={o.id} className="card p-4 sm:p-5">
                    <Link
                      href={`/my/orders/${o.id}`}
                      className="-m-1 flex items-center justify-between gap-2 rounded-lg p-1 hover:bg-mist/60"
                    >
                      <span className="sr-only">주문 {o.id} —</span>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <StageChip stage={o.stage} />
                        <span className="text-[15px] tabular-nums text-muted">
                          {fmtDate(o.createdAt, "md")} 주문
                        </span>
                        {o.customerNotified && (
                          <span className="badge bg-orange/15 text-orange">배송 안내</span>
                        )}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[15px] text-muted">
                        상세
                        <ChevronRight size={16} />
                      </span>
                    </Link>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex -space-x-3">
                        {o.items.slice(0, 3).map((it) => {
                          const p = productById.get(it.productId)!;
                          return (
                            <AssetImage
                              key={it.skuId}
                              assetKey={`product/${p.id}`}
                              category={p.categorySlug}
                              label={p.name}
                              className="h-16 w-16 rounded-xl ring-2 ring-white"
                              ratio=""
                            />
                          );
                        })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-[16px] font-semibold">
                          {o.items[0].name}
                          {o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ""}
                        </div>
                        <div className="text-[14px] text-muted">
                          <b className="font-semibold tabular-nums text-ink">{won(o.total)}</b> ·{" "}
                          {deliveryNote(o)}
                        </div>
                        <div className="text-[13px] tabular-nums text-muted">주문번호 {o.id}</div>
                      </div>
                      <div className="hidden shrink-0 gap-2 sm:flex">
                        <Link href={`/my/orders/${o.id}`} className="btn-outline btn-sm">
                          배송조회
                        </Link>
                        <RebuyButton order={o} />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                      <Link href={`/my/orders/${o.id}`} className="btn-outline btn-sm">
                        배송조회
                      </Link>
                      <RebuyButton order={o} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card">
                <EmptyState
                  art="box"
                  title="주문내역이 없습니다"
                  action={
                    <Link href="/" className="btn-primary btn-sm">
                      쇼핑하기
                    </Link>
                  }
                />
              </div>
            ))}

          {tab === "wish" &&
            (wishlist.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {wishlist.map((pid) => {
                  const p = productById.get(pid);
                  if (!p) return null;
                  const s = searchProducts(data, { q: p.name }).find((x) => x.product.id === pid);
                  return s ? <ProductCard key={pid} s={s} size="sm" /> : null;
                })}
              </div>
            ) : (
              <div className="card">
                <EmptyState
                  art="heart"
                  title="찜한 상품이 없습니다"
                  body="상품 카드의 하트를 누르면 여기에 모입니다."
                />
              </div>
            ))}

          {tab === "recent" &&
            (recentViews.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {recentViews.map((pid) => {
                  const p = productById.get(pid);
                  if (!p) return null;
                  const s = searchProducts(data, { q: p.name }).find((x) => x.product.id === pid);
                  return s ? <ProductCard key={pid} s={s} size="sm" /> : null;
                })}
              </div>
            ) : (
              <div className="card">
                <EmptyState icon={<Clock3 size={22} />} title="최근 본 상품이 없습니다" />
              </div>
            ))}

          {tab === "noti" &&
            (notes.length ? (
              <ul className="card divide-y divide-line">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-3 p-4">
                    <Bell size={18} className={`mt-0.5 shrink-0 ${n.read ? "text-muted" : "text-primary"}`} />
                    <div>
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="text-sm text-muted">{n.body}</div>
                      <div className="mt-1 text-xs text-muted">{relTime(n.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card">
                <EmptyState
                  art="bell"
                  title="알림이 없습니다"
                  body="출고·배송 상태가 바뀌면 여기에 표시됩니다."
                />
              </div>
            ))}

          {tab === "inquiry" && (
            <div className="space-y-3">
              <div className="card p-4">
                <div className="font-semibold">취소·반품·교환</div>
                <p className="mt-1 text-sm text-muted">
                  주문상세에서 신청할 수 있습니다. 주문접수 상태는 즉시 취소, 배송완료 후 7일 이내 반품·교환이
                  가능합니다.
                </p>
              </div>
              <div className="card p-4">
                <div className="font-semibold">고객문의</div>
                <p className="mt-1 text-sm text-muted">
                  1588-0000 (시연) · 평일 09:00~18:00. 시연 환경에서는 문의 접수가 저장되지 않습니다.
                </p>
                <div className="mt-2 text-xs text-muted">
                  내 반품 요청: {data.returns.filter((r) => orders.some((o) => o.id === r.orderId)).length}건
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RebuyButton({ order }: { order: Order }) {
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  return (
    <button
      className="btn-primary btn-sm whitespace-nowrap"
      onClick={() => {
        order.items.forEach((it) => addToCart(it.skuId, it.qty));
        toast({
          title: "장바구니에 다시 담았습니다",
          body: `${order.items.length}개 상품`,
          tone: "success",
          action: { label: "장바구니 보기", href: "/cart" },
        });
      }}
    >
      다시 담기
    </button>
  );
}

/** 출고 전 주문의 예상 출고 시각 — 운영 화면의 출고 시뮬레이션과 같은 계산 (인력 재배치·우선처리가 바로 반영) */
function ShipEta({ order, forecast }: { order: Order; forecast: ReturnType<typeof useForecast> }) {
  const p = forecast.orders.find((x) => x.order.id === order.id);
  if (!p) return null;
  const sameDay = p.shipAt.toDateString() === new Date().toDateString();
  const text =
    p.status === "blocked"
      ? "일부 상품 입고를 기다리고 있어요. 입고되는 대로 출고합니다."
      : p.status === "late" || p.status === "overdue"
        ? `주문이 몰려 다음 출고 회차(${fmtDate(p.shipAt.toISOString(), "md")} ${fmtDate(p.shipAt.toISOString(), "time")}경)에 출고될 예정이에요.`
        : `${sameDay ? "오늘" : fmtDate(p.shipAt.toISOString(), "md")} ${fmtDate(p.cutoffAt.toISOString(), "time")} 출고 마감 전에 출고될 예정이에요.`;
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-mist px-3 py-2 text-sm">
      <Truck size={15} className="mt-0.5 shrink-0 text-primary" />
      <span>{text}</span>
    </p>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const data = useData();
  const { productById, customerById, brandById } = useLookups();
  const cancelOrder = useStore((s) => s.cancelOrder);
  const requestReturn = useStore((s) => s.requestReturn);
  const toast = useToast();
  const [ret, setRet] = useState<{ skuId: string } | null>(null);
  const [reason, setReason] = useState("change_mind");
  const forecast = useForecast();
  const order = data.orders.find((o) => o.id === orderId);
  if (!order)
    return (
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <EmptyState
          art="box"
          title="주문을 찾을 수 없습니다"
          action={
            <Link href="/my" className="btn-primary btn-sm">
              주문내역
            </Link>
          }
        />
      </div>
    );
  const canCancel = ["new", "confirmed"].includes(order.stage);
  const canReturn = order.stage === "delivered";
  const me = customerById.get(order.customerId);
  // 고객용 진행 기록: 내부 단계(피킹대기·피킹 등)가 같은 고객 단계로 묶이면 처음 들어간 시각 하나만 (안내 메모가 있는 기록은 유지)
  const timeline = [...order.history]
    .reverse()
    .filter(
      (h, i, arr) =>
        i === arr.length - 1 ||
        !!h.note ||
        CUSTOMER_STAGE_LABEL[arr[i + 1].stage] !== CUSTOMER_STAGE_LABEL[h.stage],
    );
  const deliveredAt = order.history.find((h) => h.stage === "delivered")?.at;
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-5 lg:py-8">
      <Link
        href="/my"
        className="inline-flex min-h-[36px] items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft size={14} />
        주문내역
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-[24px] font-bold tracking-tight">주문상세</h1>
        <div className="text-[14px] tabular-nums text-muted">
          {order.id} · {fmtDate(order.createdAt, "datetime")} 주문
        </div>
      </div>

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="space-y-4">
          {/* 상태 — 지금 어디쯤이고 언제 오는가 */}
          <section className="card p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <StageChip stage={order.stage} />
                <p className="mt-2 text-[22px] font-bold tracking-tight">
                  {order.stage === "delivered"
                    ? `${fmtDate(deliveredAt ?? order.updatedAt, "md")} 배송완료`
                    : order.stage === "cancelled"
                      ? "취소된 주문입니다"
                      : order.stage === "return"
                        ? "반품·교환 진행 중"
                        : new Date(order.promisedAt).getTime() < Date.now()
                          ? "도착이 늦어지고 있어요"
                          : `${fmtDate(order.promisedAt, "md")} 도착 예정`}
                </p>
                {!["delivered", "cancelled", "return"].includes(order.stage) &&
                  new Date(order.promisedAt).getTime() < Date.now() && (
                    <p className="mt-0.5 text-[14px] text-muted">
                      원래 예정일 {fmtDate(order.promisedAt, "md")} · 곧 도착합니다. 불편을 드려 죄송합니다.
                    </p>
                  )}
              </div>
            </div>
            <div className="mt-5">
              <OrderProgress order={order} />
            </div>
            {isPreShip(order.stage) && <ShipEta order={order} forecast={forecast} />}
            {order.customerNotified && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-orange/10 px-3 py-2.5 text-sm text-orange">
                <Bell size={15} className="mt-0.5 shrink-0" />
                <span>
                  {[...order.history]
                    .reverse()
                    .find((h) => h.note?.startsWith("출고 지연 안내"))
                    ?.note?.replace("출고 지연 안내 · ", "") ?? "배송이 지연될 수 있어"}
                  {" — "}출고가 늦어져 미리 안내드립니다. 불편을 드려 죄송합니다.
                </span>
              </div>
            )}
            <details className="group mt-5 border-t border-line pt-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-semibold">
                진행 기록
                <ChevronRight size={16} className="text-muted transition-transform group-open:rotate-90" />
              </summary>
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
                {timeline.map((h, i) => (
                  <li key={i} className="relative text-sm">
                    <span
                      className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${i === 0 ? "bg-primary" : "bg-line"}`}
                    />
                    <div className={i === 0 ? "font-bold" : "font-semibold text-ink/80"}>
                      {CUSTOMER_STAGE_LABEL[h.stage]}
                    </div>
                    <div className="text-[13px] text-muted">
                      {fmtDate(h.at, "datetime")}
                      {h.note ? ` · ${h.note}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          </section>

          <section className="card p-5">
            <h2 className="text-[17px] font-bold">주문 상품 {order.items.length}개</h2>
            <ul className="mt-2 divide-y divide-line">
              {order.items.map((it) => {
                const p = productById.get(it.productId)!;
                return (
                  <li key={it.skuId} className="flex items-center gap-3 py-3">
                    <Link href={`/product/${p.id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                      <AssetImage
                        assetKey={`product/${p.id}`}
                        category={p.categorySlug}
                        label={p.name}
                        brand={brandById.get(p.brandId)?.name}
                        className="h-16 w-16 rounded-xl"
                        ratio=""
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${p.id}`} className="line-clamp-1 text-[15px] font-semibold">
                        {it.name}
                      </Link>
                      <div className="text-[13px] text-muted">
                        {it.skuName} × {it.qty}
                      </div>
                      <div className="text-[15px] font-bold tabular-nums">{won(it.unitPrice * it.qty)}</div>
                    </div>
                    {canReturn && (
                      <button
                        className="btn-outline btn-sm shrink-0"
                        onClick={() => setRet({ skuId: it.skuId })}
                      >
                        반품·교환
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-5 text-[15px]">
            <h2 className="text-[17px] font-bold">받는 분</h2>
            <dl className="mt-2 space-y-1.5">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted">이름</dt>
                <dd>{me?.name ?? "-"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted">주소</dt>
                <dd className="min-w-0">{me ? `${me.address.line1} ${me.address.line2 ?? ""}` : "-"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted">요청사항</dt>
                <dd>{order.history[0]?.note ?? "문 앞에 놓아주세요"}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* 결제 요약 + 행동 — 데스크톱은 오른쪽에 고정 */}
        <aside className="mt-4 space-y-3 lg:sticky lg:top-32 lg:mt-0">
          <section className="card p-5">
            <h2 className="text-[17px] font-bold">결제 정보</h2>
            <dl className="mt-3 space-y-1.5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-muted">상품금액</dt>
                <dd className="tabular-nums">{won(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">할인</dt>
                  <dd className="tabular-nums text-accent">−{won(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">배송비</dt>
                <dd className="tabular-nums">{order.shippingFee ? won(order.shippingFee) : "무료"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-semibold">결제금액</dt>
                <dd className="text-[22px] font-bold tabular-nums">{won(order.total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[13px] text-muted">시연 주문 — 실제 결제는 이루어지지 않았습니다.</p>
          </section>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <RebuyButton order={order} />
            {canCancel ? (
              <button
                className="btn-outline btn-sm"
                onClick={() => {
                  cancelOrder(order.id);
                  toast({ title: "주문을 취소했습니다", body: "예약 재고가 해제되었습니다.", tone: "info" });
                }}
              >
                주문 취소
              </button>
            ) : (
              <p className="flex items-center text-[13px] leading-snug text-muted">
                {order.stage === "delivered"
                  ? "받은 날부터 7일 이내 반품·교환 가능"
                  : "상품 준비가 시작되어 취소할 수 없어요"}
              </p>
            )}
          </div>
        </aside>
      </div>

      <Overlay
        open={!!ret}
        onClose={() => setRet(null)}
        title="반품·교환 신청"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => setRet(null)}>
              취소
            </button>
            <button
              className="btn-primary flex-1"
              onClick={() => {
                if (ret) {
                  requestReturn(order.id, ret.skuId, reason);
                  toast({
                    title: "반품·교환을 신청했습니다",
                    body: "CS 담당자가 확인 후 안내드립니다.",
                    tone: "success",
                  });
                  setRet(null);
                }
              }}
            >
              신청
            </button>
          </div>
        }
      >
        <div className="space-y-2 text-sm">
          <p className="text-muted">사유를 선택해 주세요. 불량·파손·오배송은 배송비 없이 처리됩니다.</p>
          {(
            [
              ["defect", "상품불량"],
              ["damaged", "파손"],
              ["wrong_item", "오배송"],
              ["delay", "배송지연"],
              ["info_mismatch", "상품정보 차이"],
              ["missing", "구성 누락"],
              ["change_mind", "단순 변심"],
              ["other", "기타"],
            ] as const
          ).map(([k, l]) => (
            <label
              key={k}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 ${reason === k ? "border-primary bg-soft" : "border-line"}`}
            >
              <input
                type="radio"
                name="reason"
                checked={reason === k}
                onChange={() => setReason(k)}
                className="accent-[var(--t-primary)]"
              />
              {l}
            </label>
          ))}
        </div>
      </Overlay>
    </div>
  );
}

export function RepeatBasketView() {
  const ship = useShippingRule();
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const placeOrder = useStore((s) => s.placeOrder);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  const items = useMemo(() => repeatItemsForCustomer(data, customerId), [data, customerId]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Order | null>(null);
  const rows = items.map((r) => ({
    ...r,
    useSku: r.altSku ?? r.sku,
    q: qty[r.product.id] ?? r.suggestedQty,
  }));
  const active = rows.filter((r) => !excluded.has(r.product.id) && r.useSku);
  const total = active.reduce((a, r) => a + r.useSku.salePrice * r.q, 0);
  const shipping = ship.feeFor(total);

  const [ordering, setOrdering] = useState(false);
  const orderAll = () => {
    if (ordering || !active.length) return; // 연타로 두 번 주문되지 않게
    setOrdering(true);
    const order = placeOrder({
      isRepeat: true,
      itemsOverride: active.map((r) => ({ skuId: r.useSku.id, qty: r.q, selected: true })),
    });
    if (order) {
      setDone(order);
      toast({
        title: "재구매 주문이 접수되었습니다",
        body: `${order.id} · 다음 구매주기가 갱신됩니다.`,
        tone: "success",
      });
    } else setOrdering(false);
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <RotateCcw className="text-primary" />
            다시 구매
          </h1>
          <p className="mt-1 text-muted">구매주기에 맞춰 수량을 추천했어요. 확인하고 한 번에 주문하세요.</p>
        </div>
      </div>

      {done ? (
        <div className="card mt-5 p-6 text-center">
          <div className="pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-strong text-white">
            <CheckCircle2 size={32} />
          </div>
          <div className="mt-3 text-xl font-bold">재구매 주문 완료 · {done.id}</div>
          <p className="mt-1 text-muted">
            다음 구매주기가 오늘 기준으로 갱신되었습니다. 내부 AX에는 재구매 성과 기록이 기록됩니다.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/my/orders/${done.id}`} className="btn-primary btn-sm">
              배송조회
            </Link>
            <Link href="/" className="btn-outline btn-sm">
              홈으로
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-5">
          <EmptyState
            art="cart"
            title="아직 반복구매 이력이 없습니다"
            body="생활용품을 두 번 이상 구매하면 여기에 구매주기와 함께 표시됩니다."
            action={
              <Link href="/category/living" className="btn-primary btn-sm">
                생활용품 보기
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card divide-y divide-line">
            {rows.map((r) => {
              const ex = excluded.has(r.product.id);
              const dueText =
                r.dueInDays <= 0
                  ? r.dueInDays < 0
                    ? `지금 필요 · ${-r.dueInDays}일 지남`
                    : "지금 필요"
                  : `${r.dueInDays}일 후 필요`;
              return (
                <div
                  key={r.product.id}
                  className={`flex gap-3 p-4 transition-opacity ${ex ? "opacity-55" : ""}`}
                >
                  {/* 포함/제외는 장바구니와 같은 체크박스 문법 */}
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--t-primary)]"
                    checked={!ex}
                    onChange={() =>
                      setExcluded((st) => {
                        const n = new Set(st);
                        if (n.has(r.product.id)) n.delete(r.product.id);
                        else n.add(r.product.id);
                        return n;
                      })
                    }
                    aria-label={`${r.product.name} 다시 주문에 포함`}
                  />
                  <Link href={`/product/${r.product.id}`} className="shrink-0">
                    <AssetImage
                      assetKey={`product/${r.product.id}`}
                      category={r.product.categorySlug}
                      label={r.product.name}
                      className="h-16 w-16 rounded-xl sm:h-20 sm:w-20"
                      ratio=""
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${r.product.id}`}
                          className="text-[17px] font-semibold leading-snug"
                        >
                          {r.product.name}
                        </Link>
                        <div className="mt-0.5 text-[14px] text-muted">
                          {r.useSku.name}
                          {r.altSku && (
                            <span className="font-semibold text-orange">
                              {" "}
                              · 대체구성 (원래 {r.sku.name} 재고 부족)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 판단에 필요한 것만 한 줄로: 언제 필요한가 · 언제 오는가 (구매일·주기는 보조 정보) */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[13px] font-bold ${r.dueInDays <= 0 ? "bg-accent/10 text-accent" : "bg-mist text-ink"}`}
                      >
                        {dueText}
                      </span>
                      <DeliveryBadge promise={deliveryPromise(r.product.deliveryType, r.available)} compact />
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {fmtDate(r.lastOrderedAt, "md")} 구매 · 평균 {r.avgCycleDays}일마다
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-lg border border-line">
                        <button
                          className="flex h-10 w-10 items-center justify-center hover:bg-mist disabled:opacity-40"
                          aria-label="수량 감소"
                          disabled={ex || r.q <= 1}
                          onClick={() => setQty((q) => ({ ...q, [r.product.id]: Math.max(1, r.q - 1) }))}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-[16px] font-bold tabular-nums">{r.q}</span>
                        <button
                          className="flex h-10 w-10 items-center justify-center hover:bg-mist disabled:opacity-40"
                          aria-label="수량 증가"
                          disabled={ex || r.q >= 99}
                          onClick={() => setQty((q) => ({ ...q, [r.product.id]: Math.min(99, r.q + 1) }))}
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[17px] font-bold tabular-nums">
                          {won(r.useSku.salePrice * r.q)}
                        </span>
                        <button
                          className="btn-outline btn-sm"
                          disabled={ex}
                          onClick={() => {
                            addToCart(r.useSku.id, r.q);
                            toast({
                              title: "장바구니에 담았습니다",
                              body: `${r.product.name} ×${r.q}`,
                              tone: "success",
                              action: { label: "장바구니 보기", href: "/cart" },
                            });
                          }}
                        >
                          담기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <aside className="card hidden p-5 lg:sticky lg:top-32 lg:block">
            <div className="text-lg font-bold">한 번에 다시 주문</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">상품 {active.length}종</dt>
                <dd className="tabular-nums">{won(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">배송비</dt>
                <dd>{shipping ? won(shipping) : "무료"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3">
                <dt className="font-semibold">결제 예정</dt>
                <dd className="text-xl font-black tabular-nums">{won(total + shipping)}</dd>
              </div>
            </dl>
            <button
              className="btn-primary btn-lg mt-4 w-full"
              disabled={!active.length || ordering}
              onClick={orderAll}
            >
              {ordering ? "주문 처리 중…" : "한 번에 다시 주문 (시연)"}
            </button>
            <button
              className="btn-outline mt-2 w-full"
              disabled={!active.length}
              onClick={() => {
                active.forEach((r) => addToCart(r.useSku.id, r.q));
                toast({
                  title: "장바구니에 모두 담았습니다",
                  tone: "success",
                  action: { label: "장바구니 보기", href: "/cart" },
                });
              }}
            >
              장바구니에 모두 담기
            </button>
            <p className="mt-3 text-[13px] text-muted">정기배송(자동 반복주문)은 예정 기능입니다.</p>
          </aside>
          {/* 모바일: 주요 행동(한 번에 주문)을 항상 화면 아래에 */}
          <div className="bg-white/97 safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line px-4 pb-3 pt-2.5 shadow-[0_-6px_20px_rgba(16,36,62,0.06)] backdrop-blur lg:hidden">
            <div className="flex items-center justify-between text-[14px] text-muted">
              <span>
                {active.length}종 · 배송비 {shipping ? won(shipping) : "무료"}
              </span>
              <button
                className="min-h-[32px] font-semibold text-primary"
                disabled={!active.length}
                onClick={() => {
                  active.forEach((r) => addToCart(r.useSku.id, r.q));
                  toast({
                    title: "장바구니에 모두 담았습니다",
                    tone: "success",
                    action: { label: "장바구니 보기", href: "/cart" },
                  });
                }}
              >
                장바구니에 모두 담기
              </button>
            </div>
            <button
              className="btn-primary mt-1.5 !min-h-[52px] w-full text-[17px]"
              disabled={!active.length || ordering}
              onClick={orderAll}
            >
              {active.length ? `${won(total + shipping)} 한 번에 주문` : "주문할 상품을 포함해 주세요"}
            </button>
          </div>
          <div className="h-24 lg:hidden" />
        </div>
      )}
    </div>
  );
}

/** 배송조회 카드 — 무엇이 · 지금 어디 · 언제 오는지를 한 장에 */
function TrackCard({
  order,
  autoFocus = false,
  highlight = false,
}: {
  order: Order;
  autoFocus?: boolean;
  highlight?: boolean;
}) {
  const { productById } = useLookups();
  const last = order.history[order.history.length - 1];
  const ref = useRef<HTMLElement>(null);
  // 조회 결과는 화면 아래에 나타나므로 포커스를 옮겨 바로 읽히고 보이게 한다 (key로 새 결과마다 1회)
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <article
      ref={ref}
      className={`card overflow-hidden outline-none transition-shadow ${highlight ? "ring-2 ring-primary" : ""}`}
      tabIndex={autoFocus ? -1 : undefined}
      aria-label={`주문 ${order.id}`}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="flex shrink-0 -space-x-3">
          {order.items.slice(0, 2).map((it) => {
            const p = productById.get(it.productId);
            return p ? (
              <AssetImage
                key={it.skuId}
                assetKey={`product/${p.id}`}
                category={p.categorySlug}
                label={p.name}
                className="h-14 w-14 rounded-xl ring-2 ring-white sm:h-16 sm:w-16"
                ratio=""
              />
            ) : null;
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StageChip stage={order.stage} />
            <span className="text-[14px] font-semibold">{deliveryNote(order)}</span>
          </div>
          <div className="mt-1 line-clamp-1 text-[16px] font-semibold">
            {order.items[0].name}
            {order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ""}
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            <span className="tabular-nums">{order.id}</span> · {fmtDate(order.createdAt, "md")} 주문
          </div>
        </div>
        <Link
          href={`/my/orders/${order.id}`}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-0.5 text-[14px] font-semibold text-primary"
        >
          상세
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="border-t border-line px-3 py-4 sm:px-5">
        <OrderProgress order={order} />
      </div>
      {last && (
        <div className="flex items-center gap-1.5 bg-mist/60 px-4 py-2.5 text-[13px] text-muted sm:px-5">
          <Clock3 size={13} aria-hidden="true" />
          최근 업데이트 {relTime(last.at)} · {CUSTOMER_STAGE_LABEL[last.stage]}
        </div>
      )}
    </article>
  );
}

export function TrackView() {
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Order | null | undefined>(undefined);
  const [emptyQ, setEmptyQ] = useState(false);
  const mineAll = data.orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const mine = mineAll.filter((o) => !["delivered", "cancelled", "return"].includes(o.stage));
  const inList = !!result && mine.some((o) => o.id === result.id);
  const lookup = (id: string) => {
    if (!id.trim()) {
      setEmptyQ(true);
      setResult(undefined);
      return;
    }
    setEmptyQ(false);
    const o = data.orders.find((x) => x.id.toLowerCase() === id.trim().toLowerCase());
    setResult(o ?? null);
  };
  return (
    <div className="mx-auto max-w-[900px] px-4 py-5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">주문·배송조회</h1>
      <p className="mt-1 text-[15px] text-muted">주문번호로 지금 어디쯤 왔는지 확인하세요.</p>
      <form
        className="card mt-4 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(q);
        }}
        noValidate
      >
        <div className="flex gap-2">
          <label className="relative block flex-1">
            <PackageSearch
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              className={`input !min-h-[48px] pl-11 text-[16px] ${emptyQ ? "!border-danger" : ""}`}
              placeholder="주문번호 입력 (예: NX260908-0001)"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (emptyQ) setEmptyQ(false);
              }}
              aria-label="주문번호"
              aria-invalid={emptyQ}
              aria-describedby={emptyQ ? "track-err" : undefined}
            />
          </label>
          <button className="btn-primary !min-h-[48px] shrink-0 px-5">조회</button>
        </div>
        {emptyQ && (
          <p id="track-err" className="mt-2 text-[14px] text-danger">
            주문번호를 입력해 주세요.
          </p>
        )}
        {mineAll.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[13px] text-muted">내 최근 주문</span>
            {mineAll.slice(0, 3).map((o) => (
              <button
                key={o.id}
                type="button"
                className="chip !min-h-[32px] text-[13px] tabular-nums"
                onClick={() => {
                  setQ(o.id);
                  lookup(o.id);
                }}
              >
                {o.id}
              </button>
            ))}
          </div>
        )}
      </form>
      {result === null && (
        <div className="card mt-3">
          <EmptyState
            art="search"
            title="주문을 찾을 수 없습니다"
            body="주문번호를 다시 확인해 주세요. 로그인 상태에서는 아래 진행 중 주문에서 바로 확인할 수 있습니다."
          />
        </div>
      )}
      {/* 조회한 주문이 아래 진행 중 목록에 있으면 같은 카드를 두 번 그리지 않고 그 카드를 강조한다 */}
      {result && !inList && (
        <div className="mt-3">
          <TrackCard key={result.id} order={result} autoFocus />
        </div>
      )}
      <h2 className="section-title mb-3 mt-8">
        진행 중인 주문 {mine.length > 0 && <span className="text-primary">{mine.length}</span>}
      </h2>
      {mine.length ? (
        <ul className="space-y-3">
          {mine.map((o) => (
            <li key={o.id}>
              <TrackCard
                key={inList && result?.id === o.id ? `hit-${o.id}` : o.id}
                order={o}
                highlight={inList && result?.id === o.id}
                autoFocus={inList && result?.id === o.id}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState art="box" title="진행 중인 주문이 없습니다" />
        </div>
      )}
    </div>
  );
}
