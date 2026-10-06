"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PackageSearch, ArrowRight, ChevronRight, Truck, Undo2, Bell, Heart, Clock3, MapPin, User, RotateCcw, ChevronLeft, LayoutDashboard } from "lucide-react";
import { useData, useLookups, useIsInIframe } from "@/lib/hooks";
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
            <div className="w-full flex items-center">
              <div className={`h-1 flex-1 rounded-full ${i === 0 ? "opacity-0" : done ? "bg-primary" : "bg-line"}`} />
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-white" : "bg-line text-muted"}`}>{done ? <CheckCircle2 size={16} /> : <span className="text-xs">{i + 1}</span>}</div>
              <div className={`h-1 flex-1 rounded-full ${i === STEPS.length - 1 ? "opacity-0" : i < idx ? "bg-primary" : "bg-line"}`} />
            </div>
            <span className={`text-[13px] sm:text-xs ${i === idx ? "font-bold text-primary" : done ? "text-ink" : "text-muted"}`}>{s.label}</span>
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
  if (!order) return <div className="mx-auto max-w-[900px] px-4 py-8"><EmptyState title="주문을 찾을 수 없습니다" action={<Link href="/my" className="btn-primary btn-sm">주문내역</Link>} /></div>;
  const promise = fmtDate(order.promisedAt, "md");
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center"><CheckCircle2 size={34} /></div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold">주문이 접수되었습니다</h1>
        <p className="text-muted mt-1">주문번호 <b className="text-ink">{order.id}</b> · {promise} 도착 예정</p>
        <div className="mt-2 badge bg-orange/15 text-[#B84F1A]">시연 주문 — 실제 결제 없음</div>
      </div>
      <div className="card mt-6 p-5">
        <OrderProgress order={order} />
        <ul className="mt-5 divide-y divide-line">
          {order.items.map((it) => { const p = productById.get(it.productId)!; return (
            <li key={it.skuId} className="py-3 flex items-center gap-3"><AssetImage assetKey={`product/${p.id}`} category={p.categorySlug} label={p.name} className="w-14 h-14 rounded-lg shrink-0" ratio="" /><div className="flex-1 min-w-0"><div className="font-semibold text-sm line-clamp-1">{it.name}</div><div className="text-xs text-muted">{it.skuName} × {it.qty}</div></div><div className="font-bold text-sm tabular-nums">{won(it.unitPrice * it.qty)}</div></li>
          ); })}
        </ul>
        <div className="mt-3 flex justify-between text-sm border-t border-line pt-3"><span className="text-muted">결제 예정금액 (배송비 {order.shippingFee ? won(order.shippingFee) : "무료"})</span><b className="text-lg tabular-nums">{won(order.total)}</b></div>
      </div>
      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <Link href={`/my/orders/${order.id}`} className="btn-primary btn-lg">배송조회 <ArrowRight size={16} /></Link>
        <Link href="/" className="btn-outline btn-lg">쇼핑 계속하기</Link>
      </div>
      <div className="mt-6 card p-4 text-sm">
        <div className="font-semibold flex items-center gap-2"><LayoutDashboard size={16} className="text-primary" />이 주문은 지금 내부 시스템에 반영되었습니다</div>
        <p className="text-muted mt-1">재고 예약 → 신규주문 대기열 → 수요신호 갱신. AX 운영화면의 <b>주문·출고</b>와 <b>재고·발주</b> 화면에서 이 주문({order.id})을 확인할 수 있습니다.</p>
        {!inIframe && <Link href={`/ax/fulfillment?order=${order.id}`} className="inline-flex items-center gap-1 text-primary font-semibold mt-2 hover:underline">AX 운영화면에서 확인 (관리자 시연) <ChevronRight size={14} /></Link>}
      </div>
    </div>
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
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab"); if (t && ["orders", "wish", "recent", "noti", "inquiry"].includes(t)) setTab(t as typeof tab); }, []);
  const repeat = useMemo(() => repeatItemsForCustomer(data, customerId), [data, customerId]);
  const due = repeat.filter((r) => r.dueInDays <= 3).length;
  const active = orders.filter((o) => !["delivered", "cancelled", "return"].includes(o.stage)).length;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5">
      <div className="card p-5 flex items-center gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-full bg-soft text-primary flex items-center justify-center"><User size={26} /></div>
        <div className="flex-1 min-w-0"><div className="text-xl font-bold">{me.name}님</div><div className="text-sm text-muted inline-flex items-center gap-1"><MapPin size={13} />{me.address.line1} {me.address.line2}</div></div>
        {/* 숫자 3개가 곧 바로가기 — 같은 기능의 버튼을 따로 두지 않는다 */}
        <div className="grid grid-cols-3 gap-2 text-center w-full sm:w-auto">
          <Link href="/track" className="rounded-xl bg-mist px-3 py-2.5 hover:brightness-95 min-w-[92px]"><div className="font-bold text-xl tabular-nums">{active}</div><div className="text-[13px] text-muted">배송 진행</div></Link>
          <button type="button" onClick={() => setTab("noti")} className="rounded-xl bg-mist px-3 py-2.5 hover:brightness-95 min-w-[92px]"><div className="font-bold text-xl tabular-nums">{notes.filter((n) => !n.read).length}</div><div className="text-[13px] text-muted">새 알림</div></button>
          <Link href="/my/repeat" className="rounded-xl bg-soft px-3 py-2.5 hover:brightness-95 min-w-[92px]"><div className="font-bold text-xl text-primary tabular-nums">{due}</div><div className="text-[13px] text-muted">다시 살 때</div></Link>
        </div>
      </div>

      <Tabs className="mt-5" value={tab} onChange={setTab} tabs={[{ key: "orders", label: "주문내역", count: orders.length }, { key: "wish", label: "찜", count: wishlist.length }, { key: "recent", label: "최근 본 상품", count: recentViews.length }, { key: "noti", label: "알림", count: notes.length }, { key: "inquiry", label: "문의·반품" }]} />

      <div className="mt-4">
        {tab === "orders" && (orders.length ? (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="card p-4">
                <Link href={`/my/orders/${o.id}`} className="flex items-center justify-between gap-2 -m-1 p-1 rounded-lg hover:bg-mist/60" aria-label={`${o.id} 주문상세`}>
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-[17px] ${["delivered", "cancelled"].includes(o.stage) ? "text-ink" : "text-primary"}`}>{CUSTOMER_STAGE_LABEL[o.stage]}</span>
                    <span className="text-[15px] text-muted tabular-nums">{fmtDate(o.createdAt, "md")} 주문</span>
                    {o.customerNotified && <span className="badge bg-orange/15 text-[#B84F1A]">배송 안내</span>}
                  </div>
                  <span className="shrink-0 text-[15px] text-muted inline-flex items-center gap-0.5">상세<ChevronRight size={16} /></span>
                </Link>
                <div className="mt-3 flex gap-3 items-center">
                  <div className="flex -space-x-2">{o.items.slice(0, 3).map((it) => { const p = productById.get(it.productId)!; return <AssetImage key={it.skuId} assetKey={`product/${p.id}`} category={p.categorySlug} label={p.name} className="w-14 h-14 rounded-lg ring-2 ring-white" ratio="" />; })}</div>
                  <div className="min-w-0 flex-1"><div className="font-semibold text-[16px] line-clamp-1">{o.items[0].name}{o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ""}</div><div className="text-[14px] text-muted"><b className="text-ink font-semibold tabular-nums">{won(o.total)}</b> · {deliveryNote(o)}</div><div className="text-[13px] text-muted/80 tabular-nums">주문번호 {o.id}</div></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href={`/my/orders/${o.id}`} className="btn-outline btn-sm">배송조회</Link>
                  <RebuyButton order={o} />
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="card"><EmptyState title="주문내역이 없습니다" action={<Link href="/" className="btn-primary btn-sm">쇼핑하기</Link>} /></div>)}

        {tab === "wish" && (wishlist.length ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{wishlist.map((pid) => { const p = productById.get(pid); if (!p) return null; const s = searchProducts(data, { q: p.name }).find((x) => x.product.id === pid); return s ? <ProductCard key={pid} s={s} size="sm" /> : null; })}</div> : <div className="card"><EmptyState icon={<Heart size={22} />} title="찜한 상품이 없습니다" body="상품 카드의 하트를 누르면 여기에 모입니다." /></div>)}

        {tab === "recent" && (recentViews.length ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{recentViews.map((pid) => { const p = productById.get(pid); if (!p) return null; const s = searchProducts(data, { q: p.name }).find((x) => x.product.id === pid); return s ? <ProductCard key={pid} s={s} size="sm" /> : null; })}</div> : <div className="card"><EmptyState icon={<Clock3 size={22} />} title="최근 본 상품이 없습니다" /></div>)}

        {tab === "noti" && (notes.length ? <ul className="card divide-y divide-line">{notes.map((n) => <li key={n.id} className="p-4 flex gap-3"><Bell size={18} className={`mt-0.5 shrink-0 ${n.read ? "text-muted" : "text-primary"}`} /><div><div className="font-semibold text-sm">{n.title}</div><div className="text-sm text-muted">{n.body}</div><div className="text-xs text-muted mt-1">{relTime(n.createdAt)}</div></div></li>)}</ul> : <div className="card"><EmptyState icon={<Bell size={22} />} title="알림이 없습니다" body="출고·배송 상태가 바뀌면 여기에 표시됩니다." /></div>)}

        {tab === "inquiry" && (
          <div className="space-y-3">
            <div className="card p-4"><div className="font-semibold">취소·반품·교환</div><p className="text-sm text-muted mt-1">주문상세에서 신청할 수 있습니다. 주문접수 상태는 즉시 취소, 배송완료 후 7일 이내 반품·교환이 가능합니다.</p></div>
            <div className="card p-4"><div className="font-semibold">고객문의</div><p className="text-sm text-muted mt-1">1588-0000 (시연) · 평일 09:00~18:00. 시연 환경에서는 문의 접수가 저장되지 않습니다.</p><div className="mt-2 text-xs text-muted">내 반품 요청: {data.returns.filter((r) => orders.some((o) => o.id === r.orderId)).length}건</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

function RebuyButton({ order }: { order: Order }) {
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  return <button className="btn-primary btn-sm whitespace-nowrap" onClick={() => { order.items.forEach((it) => addToCart(it.skuId, it.qty)); toast({ title: "장바구니에 다시 담았습니다", body: `${order.items.length}개 상품`, tone: "success" }); }}>다시 담기</button>;
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const data = useData();
  const { productById, warehouseById } = useLookups();
  const cancelOrder = useStore((s) => s.cancelOrder);
  const requestReturn = useStore((s) => s.requestReturn);
  const toast = useToast();
  const [ret, setRet] = useState<{ skuId: string } | null>(null);
  const [reason, setReason] = useState("change_mind");
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return <div className="mx-auto max-w-[900px] px-4 py-8"><EmptyState title="주문을 찾을 수 없습니다" action={<Link href="/my" className="btn-primary btn-sm">주문내역</Link>} /></div>;
  const canCancel = ["new", "confirmed"].includes(order.stage);
  const canReturn = order.stage === "delivered";
  const wh = warehouseById.get(order.warehouseId);
  return (
    <div className="mx-auto max-w-[900px] px-4 py-5">
      <Link href="/my" className="text-sm text-muted inline-flex items-center gap-1 hover:text-ink"><ChevronLeft size={14} />주문내역</Link>
      <div className="mt-2 flex items-end justify-between gap-2 flex-wrap"><h1 className="text-2xl font-bold">주문상세</h1><div className="text-sm text-muted">{order.id} · {fmtDate(order.createdAt, "datetime")}</div></div>

      <div className="card mt-4 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2"><div className="text-lg font-bold">{CUSTOMER_STAGE_LABEL[order.stage]}</div><div className="text-sm text-muted inline-flex items-center gap-1"><Truck size={14} />{deliveryNote(order)}</div></div>
        <OrderProgress order={order} />
        {order.customerNotified && <div className="mt-4 rounded-xl bg-orange/10 text-[#B84F1A] px-3 py-2 text-sm flex items-start gap-2"><Bell size={15} className="mt-0.5" />물류 사정으로 배송이 하루 지연될 수 있어 미리 안내드립니다. 불편을 드려 죄송합니다.</div>}
        <ol className="mt-5 border-l-2 border-line pl-4 space-y-3">
          {[...order.history].reverse().map((h, i) => (
            <li key={i} className="relative text-sm"><span className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full ${i === 0 ? "bg-primary" : "bg-line"}`} /><div className="font-semibold">{CUSTOMER_STAGE_LABEL[h.stage]}</div><div className="text-xs text-muted">{fmtDate(h.at, "datetime")}{h.note ? ` · ${h.note}` : ""}</div></li>
          ))}
        </ol>
      </div>

      <div className="card mt-4 p-5">
        <div className="font-bold">주문 상품</div>
        <ul className="mt-2 divide-y divide-line">
          {order.items.map((it) => { const p = productById.get(it.productId)!; return (
            <li key={it.skuId} className="py-3 flex items-center gap-3"><AssetImage assetKey={`product/${p.id}`} category={p.categorySlug} label={p.name} className="w-14 h-14 rounded-lg shrink-0" ratio="" /><div className="flex-1 min-w-0"><Link href={`/product/${p.id}`} className="font-semibold text-sm line-clamp-1">{it.name}</Link><div className="text-xs text-muted">{it.skuName} × {it.qty}</div></div><div className="text-right"><div className="font-bold text-sm tabular-nums">{won(it.unitPrice * it.qty)}</div>{canReturn && <button className="text-xs text-primary underline" onClick={() => setRet({ skuId: it.skuId })}>반품·교환</button>}</div></li>
          ); })}
        </ul>
        <dl className="mt-3 space-y-1 text-sm border-t border-line pt-3">
          <div className="flex justify-between"><dt className="text-muted">상품금액</dt><dd className="tabular-nums">{won(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">할인</dt><dd className="tabular-nums">-{won(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">배송비</dt><dd className="tabular-nums">{order.shippingFee ? won(order.shippingFee) : "무료"}</dd></div>
          <div className="flex justify-between text-base"><dt className="font-semibold">결제금액</dt><dd className="font-black tabular-nums">{won(order.total)}</dd></div>
        </dl>
      </div>

      <div className="card mt-4 p-5 text-sm">
        <div className="font-bold">배송지</div>
        <div className="mt-1 text-muted">{order.history[0]?.note ?? "문 앞에 놓아주세요"} · 출고 물류: {wh?.name}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {canCancel ? <button className="btn-outline" onClick={() => { cancelOrder(order.id); toast({ title: "주문을 취소했습니다", body: "예약 재고가 해제되었습니다.", tone: "info" }); }}>주문 취소</button> : <button className="btn-outline" disabled>주문 취소 (상품준비 이후 불가)</button>}
        <RebuyButton order={order} />
      </div>

      <Overlay open={!!ret} onClose={() => setRet(null)} title="반품·교환 신청" size="sm" footer={<div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setRet(null)}>취소</button><button className="btn-primary flex-1" onClick={() => { if (ret) { requestReturn(order.id, ret.skuId, reason); toast({ title: "반품·교환을 신청했습니다", body: "CS 담당자가 확인 후 안내드립니다.", tone: "success" }); setRet(null); } }}>신청</button></div>}>
        <div className="space-y-2 text-sm">
          <p className="text-muted">사유를 선택해 주세요. 불량·파손·오배송은 배송비 없이 처리됩니다.</p>
          {([["defect", "상품불량"], ["damaged", "파손"], ["wrong_item", "오배송"], ["delay", "배송지연"], ["info_mismatch", "상품정보 차이"], ["missing", "구성 누락"], ["change_mind", "단순 변심"], ["other", "기타"]] as const).map(([k, l]) => (
            <label key={k} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer ${reason === k ? "border-primary bg-soft" : "border-line"}`}><input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} className="accent-[var(--t-primary)]" />{l}</label>
          ))}
        </div>
      </Overlay>
    </div>
  );
}

export function RepeatBasketView() {
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const placeOrder = useStore((s) => s.placeOrder);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  const items = useMemo(() => repeatItemsForCustomer(data, customerId), [data, customerId]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Order | null>(null);
  const rows = items.map((r) => ({ ...r, useSku: r.altSku ?? r.sku, q: qty[r.product.id] ?? r.suggestedQty }));
  const active = rows.filter((r) => !excluded.has(r.product.id) && r.useSku);
  const total = active.reduce((a, r) => a + r.useSku.salePrice * r.q, 0);
  const shipping = total >= 30000 || total === 0 ? 0 : 3000;

  const orderAll = () => {
    const order = placeOrder({ isRepeat: true, itemsOverride: active.map((r) => ({ skuId: r.useSku.id, qty: r.q, selected: true })) });
    if (order) { setDone(order); toast({ title: "재구매 주문이 접수되었습니다", body: `${order.id} · 다음 구매주기가 갱신됩니다.`, tone: "success" }); }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight inline-flex items-center gap-2"><RotateCcw className="text-primary" />다시 구매</h1><p className="text-muted mt-1">구매주기에 맞춰 수량을 추천했어요. 확인하고 한 번에 주문하세요.</p></div>
      </div>

      {done ? (
        <div className="card mt-5 p-6 text-center">
          <CheckCircle2 size={36} className="mx-auto text-primary" />
          <div className="mt-2 text-xl font-bold">재구매 주문 완료 · {done.id}</div>
          <p className="text-muted mt-1">다음 구매주기가 오늘 기준으로 갱신되었습니다. 내부 AX에는 재구매 성과 기록이 기록됩니다.</p>
          <div className="mt-4 flex gap-2 justify-center"><Link href={`/my/orders/${done.id}`} className="btn-primary btn-sm">배송조회</Link><Link href="/" className="btn-outline btn-sm">홈으로</Link></div>
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-5"><EmptyState title="아직 반복구매 이력이 없습니다" body="생활용품을 두 번 이상 구매하면 여기에 구매주기와 함께 표시됩니다." action={<Link href="/category/living" className="btn-primary btn-sm">생활용품 보기</Link>} /></div>
      ) : (
        <div className="mt-5 grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="card divide-y divide-line">
            {rows.map((r) => {
              const ex = excluded.has(r.product.id);
              const dueText = r.dueInDays <= 0 ? (r.dueInDays < 0 ? `지금 필요 · ${-r.dueInDays}일 지남` : "지금 필요") : `${r.dueInDays}일 후 필요`;
              return (
                <div key={r.product.id} className={`p-4 flex gap-3 ${ex ? "opacity-50" : ""}`}>
                  <Link href={`/product/${r.product.id}`} className="shrink-0"><AssetImage assetKey={`product/${r.product.id}`} category={r.product.categorySlug} label={r.product.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl" ratio="" /></Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><Link href={`/product/${r.product.id}`} className="font-semibold text-[17px] leading-snug">{r.product.name}</Link><div className="text-[14px] text-muted mt-0.5">{r.useSku.name}{r.altSku && <span className="text-[#B84F1A] font-semibold"> · 대체구성 (원래 {r.sku.name} 재고 부족)</span>}</div></div>
                      <button className="text-[14px] text-muted hover:text-ink whitespace-nowrap min-h-[32px] px-1" onClick={() => setExcluded((s) => { const n = new Set(s); if (n.has(r.product.id)) n.delete(r.product.id); else n.add(r.product.id); return n; })}>{ex ? "다시 포함" : "제외"}</button>
                    </div>
                    {/* 판단에 필요한 것만 한 줄로: 언제 필요한가 · 언제 오는가 (구매일·주기는 보조 정보) */}
                    <div className="mt-1.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-[14px]">
                      <span className={`font-semibold ${r.dueInDays <= 0 ? "text-[#C2501A]" : "text-ink"}`}>{dueText}</span>
                      <span className="text-line">|</span>
                      <DeliveryBadge promise={deliveryPromise(r.product.deliveryType, r.available)} compact />
                    </div>
                    <div className="text-[13px] text-muted mt-0.5">{fmtDate(r.lastOrderedAt, "md")} 구매 · 평균 {r.avgCycleDays}일마다</div>
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="inline-flex items-center border border-line rounded-lg"><button className="w-10 h-10 flex items-center justify-center hover:bg-mist disabled:opacity-40" aria-label="수량 감소" disabled={ex || r.q <= 1} onClick={() => setQty((q) => ({ ...q, [r.product.id]: Math.max(1, r.q - 1) }))}>−</button><span className="w-8 text-center text-[16px] font-bold tabular-nums">{r.q}</span><button className="w-10 h-10 flex items-center justify-center hover:bg-mist disabled:opacity-40" aria-label="수량 증가" disabled={ex || r.q >= 99} onClick={() => setQty((q) => ({ ...q, [r.product.id]: Math.min(99, r.q + 1) }))}>+</button></div>
                      <div className="flex items-center gap-2"><span className="font-bold text-[17px] tabular-nums">{won(r.useSku.salePrice * r.q)}</span><button className="btn-outline btn-sm" disabled={ex} onClick={() => { addToCart(r.useSku.id, r.q); toast({ title: "장바구니에 담았습니다", body: `${r.product.name} ×${r.q}`, tone: "success" }); }}>담기</button></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <aside className="hidden lg:block card p-5 lg:sticky lg:top-32">
            <div className="font-bold text-lg">한 번에 다시 주문</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">상품 {active.length}종</dt><dd className="tabular-nums">{won(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">배송비</dt><dd>{shipping ? won(shipping) : "무료"}</dd></div>
              <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">결제 예정</dt><dd className="font-black text-xl tabular-nums">{won(total + shipping)}</dd></div>
            </dl>
            <button className="btn-primary btn-lg w-full mt-4" disabled={!active.length} onClick={orderAll}>한 번에 다시 주문 (시연)</button>
            <button className="btn-outline w-full mt-2" disabled={!active.length} onClick={() => { active.forEach((r) => addToCart(r.useSku.id, r.q)); toast({ title: "장바구니에 모두 담았습니다", tone: "success" }); }}>장바구니에 모두 담기</button>
            <p className="text-[13px] text-muted mt-3">정기배송(자동 반복주문)은 예정 기능입니다.</p>
          </aside>
          {/* 모바일: 주요 행동(한 번에 주문)을 항상 화면 아래에 */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/97 backdrop-blur border-t border-line px-4 pt-2.5 pb-3 safe-bottom shadow-[0_-6px_20px_rgba(16,36,62,0.06)]">
            <div className="flex items-center justify-between text-[14px] text-muted"><span>{active.length}종 · 배송비 {shipping ? won(shipping) : "무료"}</span><button className="font-semibold text-primary min-h-[32px]" disabled={!active.length} onClick={() => { active.forEach((r) => addToCart(r.useSku.id, r.q)); toast({ title: "장바구니에 모두 담았습니다", tone: "success" }); }}>장바구니에 모두 담기</button></div>
            <button className="btn-primary w-full !min-h-[52px] mt-1.5 text-[17px]" disabled={!active.length} onClick={orderAll}>{active.length ? `${won(total + shipping)} 한 번에 주문` : "주문할 상품을 포함해 주세요"}</button>
          </div>
          <div className="lg:hidden h-24" />
        </div>
      )}
    </div>
  );
}

export function TrackView() {
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Order | null | undefined>(undefined);
  const [emptyQ, setEmptyQ] = useState(false);
  const mine = data.orders.filter((o) => o.customerId === customerId && !["delivered", "cancelled", "return"].includes(o.stage));
  return (
    <div className="mx-auto max-w-[900px] px-4 py-5">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight inline-flex items-center gap-2"><PackageSearch className="text-primary" />주문·배송조회</h1>
      <form className="card mt-4 p-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!q.trim()) { setEmptyQ(true); setResult(undefined); return; } setEmptyQ(false); const o = data.orders.find((x) => x.id.toLowerCase() === q.trim().toLowerCase()); setResult(o ?? null); }} noValidate>
        <input className={`input ${emptyQ ? "!border-danger" : ""}`} placeholder="주문번호 입력 (예: NX260908-0001)" value={q} onChange={(e) => { setQ(e.target.value); if (emptyQ) setEmptyQ(false); }} aria-label="주문번호" aria-invalid={emptyQ} />
        <button className="btn-primary shrink-0">조회</button>
      </form>
      {emptyQ && <p className="mt-2 text-[14px] text-danger">주문번호를 입력해 주세요.</p>}
      {result === null && <div className="card mt-3"><EmptyState title="주문을 찾을 수 없습니다" body="주문번호를 다시 확인해 주세요. 로그인 상태에서는 아래 진행 중 주문에서 바로 확인할 수 있습니다." /></div>}
      {result && <div className="card mt-3 p-5"><div className="flex items-center justify-between mb-3"><div className="font-bold">{result.id}</div><Link href={`/my/orders/${result.id}`} className="text-primary text-sm font-semibold">상세보기</Link></div><OrderProgress order={result} /></div>}
      <h2 className="section-title mt-8 mb-3">진행 중인 주문</h2>
      {mine.length ? <ul className="space-y-3">{mine.map((o) => <li key={o.id} className="card p-4"><div className="flex items-center justify-between text-sm mb-3"><div><b>{o.items[0].name}</b>{o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ""}<span className="text-muted"> · {o.id}</span></div><Link href={`/my/orders/${o.id}`} className="text-primary font-semibold">상세</Link></div><OrderProgress order={o} /></li>)}</ul> : <div className="card"><EmptyState title="진행 중인 주문이 없습니다" /></div>}
    </div>
  );
}
