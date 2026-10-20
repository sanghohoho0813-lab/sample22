"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus, Trash2, Heart, ArrowRight, Truck, Zap } from "lucide-react";
import { useData, useLookups, useShippingRule } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { deliveryPromise, won } from "@/lib/format";
import AssetImage from "@/components/shared/AssetImage";
import { EmptyState } from "@/components/shared/Bits";
import { DeliveryBadge } from "./ProductCard";
import { useToast } from "@/components/shared/Toast";
import { searchProducts } from "@/lib/catalog";
import ProductCard, { ProductRail } from "./ProductCard";

export default function CartView() {
  const ship = useShippingRule();
  const data = useData();
  const { skuById, productById, invBySku, brandById } = useLookups();
  const cart = useStore((s) => s.ui.cart);
  const updateQty = useStore((s) => s.updateCartQty);
  const remove = useStore((s) => s.removeFromCart);
  const toggleSelect = useStore((s) => s.toggleCartSelect);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const toast = useToast();

  const rows = useMemo(
    () =>
      cart.map((c) => {
        const sku = skuById.get(c.skuId)!;
        const product = productById.get(sku.productId)!;
        const inv = invBySku.get(sku.id);
        const available = Math.max(0, (inv?.onHand ?? 0) - (inv?.reserved ?? 0));
        return {
          c,
          sku,
          product,
          available,
          promise: deliveryPromise(product.deliveryType, available, inv?.inboundEta),
        };
      }),
    [cart, skuById, productById, invBySku],
  );
  const selected = rows.filter((r) => r.c.selected);
  const subtotal = selected.reduce((a, r) => a + r.sku.salePrice * r.c.qty, 0);
  const shipping = ship.feeFor(subtotal);
  const allSelected = rows.length > 0 && rows.every((r) => r.c.selected);
  const groups = [
    {
      key: "fast",
      label: `빠른배송 · ${rows.find((r) => r.promise.kind === "fast")?.promise.text.replace(/ 예정$/, "") ?? "내일 도착"}`,
      items: rows.filter((r) => r.promise.kind === "fast"),
    },
    { key: "rest", label: "일반배송 · 예약배송", items: rows.filter((r) => r.promise.kind !== "fast") },
  ];
  // 무료배송까지 남은 금액을 채우는 상품 — 남은 금액 이상 중 가장 가까운 가격 순 (장바구니에 없는 인기 상품)
  const remaining = subtotal > 0 ? ship.threshold - subtotal : 0;
  const fillers =
    remaining > 0
      ? searchProducts(data, { sort: "popular" })
          .filter((s) => !s.soldOut && !cart.some((c) => skuById.get(c.skuId)?.productId === s.product.id))
          .sort(
            (a, b) =>
              (a.defaultSku.salePrice >= remaining ? 0 : 1) - (b.defaultSku.salePrice >= remaining ? 0 : 1) ||
              Math.abs(a.defaultSku.salePrice - remaining) - Math.abs(b.defaultSku.salePrice - remaining),
          )
          .slice(0, 4)
      : [];
  const suggestions = searchProducts(data, { sort: "popular" })
    .filter((s) => !cart.some((c) => c.skuId === s.defaultSku.id))
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">장바구니</h1>
      {rows.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            art="cart"
            title="장바구니가 비어 있습니다"
            body="자주 쓰는 생활상품을 담아보세요. 3만원 이상이면 배송비가 무료입니다."
            action={
              <div className="flex gap-2">
                <Link href="/" className="btn-primary btn-sm">
                  쇼핑 계속하기
                </Link>
                <Link href="/my/repeat" className="btn-outline btn-sm">
                  다시 구매
                </Link>
              </div>
            }
          />
          <div className="px-4 pb-4">
            <div className="mb-2 text-[16px] font-semibold">지금 많이 찾는 상품</div>
            <ProductRail>
              {suggestions.map((s) => (
                <ProductCard key={s.product.id} s={s} size="sm" />
              ))}
            </ProductRail>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--t-primary)]"
                  checked={allSelected}
                  onChange={(e) => rows.forEach((r) => toggleSelect(r.c.skuId, e.target.checked))}
                />
                전체 선택 ({selected.length}/{rows.length})
              </label>
              <button
                className="min-h-[36px] text-muted hover:text-danger disabled:opacity-40"
                disabled={!selected.length}
                onClick={() => {
                  const n = selected.length;
                  selected.forEach((r) => remove(r.c.skuId));
                  toast({ title: `${n}개 상품을 삭제했습니다`, tone: "info" });
                }}
              >
                선택 삭제
              </button>
            </div>
            {subtotal > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 text-[14px]">
                  {subtotal >= ship.threshold ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-teal">
                      <Truck size={15} /> 무료배송 조건을 채웠어요
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Truck size={15} className="text-primary" />
                      <b className="tabular-nums text-primary">{won(ship.threshold - subtotal)}</b> 더 담으면
                      무료배송
                    </span>
                  )}
                  <span className="tabular-nums text-muted">{won(ship.threshold)} 기준</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist"
                  role="progressbar"
                  aria-label="무료배송까지"
                  aria-valuemin={0}
                  aria-valuemax={ship.threshold}
                  aria-valuenow={Math.min(subtotal, ship.threshold)}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${subtotal >= ship.threshold ? "bg-teal" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (subtotal / ship.threshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {/* 배송 유형별로 묶어 "언제 오는지"를 먼저 보여준다 */}
            {groups.map((g) =>
              g.items.length ? (
                <div key={g.key} className="divide-y divide-line">
                  <div className="flex items-center gap-1.5 bg-mist/60 px-4 py-2 text-[13px] font-bold">
                    {g.key === "fast" ? (
                      <Zap size={13} className="fill-teal text-teal" />
                    ) : (
                      <Truck size={13} className="text-muted" />
                    )}
                    {g.label}
                    <span className="font-normal text-muted">· {g.items.length}개</span>
                  </div>
                  {g.items.map(({ c, sku, product, available, promise }) => (
                    <div key={c.skuId} className="flex gap-3 p-4">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0 accent-[var(--t-primary)]"
                        checked={c.selected}
                        onChange={() => toggleSelect(c.skuId)}
                        aria-label={`${product.name} 선택`}
                      />
                      <Link href={`/product/${product.id}`} className="shrink-0">
                        <AssetImage
                          assetKey={`product/${product.id}`}
                          category={product.categorySlug}
                          label={product.name}
                          brand={brandById.get(product.brandId)?.name}
                          className="h-20 w-20 rounded-xl sm:h-24 sm:w-24"
                          ratio=""
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${product.id}`}
                          className="line-clamp-2 font-semibold leading-snug"
                        >
                          {product.name}
                        </Link>
                        <div className="mt-0.5 text-[14px] text-muted">{sku.name}</div>
                        <div className="mt-1">
                          <DeliveryBadge promise={promise} compact />
                        </div>
                        {available < c.qty && (
                          <div className="mt-1 text-[13px] text-danger">
                            재고 {available}개 — 수량을 조정하거나 입고 후 예약됩니다
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-lg border border-line">
                            <button
                              className="flex h-10 w-10 items-center justify-center rounded-l-lg hover:bg-mist disabled:opacity-40"
                              aria-label="수량 감소"
                              disabled={c.qty <= 1}
                              onClick={() => updateQty(c.skuId, c.qty - 1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-9 text-center text-sm font-bold tabular-nums">{c.qty}</span>
                            <button
                              className="flex h-10 w-10 items-center justify-center rounded-r-lg hover:bg-mist disabled:opacity-40"
                              aria-label="수량 증가"
                              disabled={c.qty >= 99}
                              onClick={() => updateQty(c.skuId, c.qty + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="font-bold tabular-nums">{won(sku.salePrice * c.qty)}</div>
                            {sku.listPrice > sku.salePrice && (
                              <div className="text-xs text-muted line-through">
                                {won(sku.listPrice * c.qty)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex gap-4 text-[14px] text-muted">
                          <button
                            className="inline-flex min-h-[36px] items-center gap-1 hover:text-ink"
                            onClick={() => {
                              toggleWishlist(product.id);
                              remove(c.skuId);
                              toast({ title: "찜 목록으로 옮겼습니다", tone: "info" });
                            }}
                          >
                            <Heart size={14} />
                            찜으로 이동
                          </button>
                          <button
                            className="inline-flex min-h-[36px] items-center gap-1 hover:text-danger"
                            onClick={() => remove(c.skuId)}
                          >
                            <Trash2 size={14} />
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null,
            )}
          </div>
          {fillers.length > 0 && (
            <section aria-labelledby="fill-title" className="lg:col-start-1">
              <h2 id="fill-title" className="text-[18px] font-bold tracking-tight">
                <span className="tabular-nums text-primary">{won(remaining)}</span> 더 담으면 무료배송
              </h2>
              <p className="mt-0.5 text-[14px] text-muted">하나만 더하면 배송비 {won(ship.fee)}이 사라져요</p>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
                {fillers.map((s) => (
                  <ProductCard key={s.product.id} s={s} size="sm" />
                ))}
              </div>
            </section>
          )}
          <aside className="card hidden p-5 lg:sticky lg:top-32 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block">
            <div className="text-lg font-bold">주문 예상금액</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">상품금액</dt>
                <dd className="tabular-nums">{won(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">배송비</dt>
                <dd className="tabular-nums">{shipping === 0 ? "무료" : won(shipping)}</dd>
              </div>

              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-semibold">결제 예정금액</dt>
                <dd className="text-xl font-black tabular-nums">{won(subtotal + shipping)}</dd>
              </div>
            </dl>
            <div className="mt-2 text-xs text-muted">
              예상 도착:{" "}
              {selected.length
                ? selected.some((r) => r.promise.kind !== "fast")
                  ? "일반배송 포함 · 2~3일"
                  : selected[0].promise.text
                : "-"}
            </div>
            <Link
              href={selected.length ? "/checkout" : "#"}
              aria-disabled={!selected.length}
              className={`btn-primary btn-lg mt-4 w-full ${selected.length ? "" : "pointer-events-none opacity-50"}`}
            >
              선택 상품 주문하기 <ArrowRight size={16} />
            </Link>
            <Link href="/" className="btn-ghost mt-2 w-full">
              쇼핑 계속하기
            </Link>
          </aside>
          {/* 모바일: 금액과 주문 버튼을 하단 탭바 바로 위에 고정 */}
          <div className="bg-white/97 fixed inset-x-0 bottom-16 z-40 border-t border-line px-4 pb-2.5 pt-2 shadow-[0_-6px_20px_rgba(16,36,62,0.06)] backdrop-blur lg:hidden">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-muted">
                {selected.length}개 · 배송비 {shipping === 0 ? "무료" : won(shipping)}
              </span>
              {subtotal > 0 && subtotal < ship.threshold && (
                <span className="font-semibold text-primary">
                  {won(ship.threshold - subtotal)} 더 담으면 무료배송
                </span>
              )}
            </div>
            <Link
              href={selected.length ? "/checkout" : "#"}
              aria-disabled={!selected.length}
              className={`btn-primary mt-1.5 !min-h-[50px] w-full text-[17px] ${selected.length ? "" : "pointer-events-none opacity-50"}`}
            >
              {selected.length ? `${won(subtotal + shipping)} 주문하기` : "주문할 상품을 선택해 주세요"}
            </Link>
          </div>
          <div className="h-20 lg:hidden" />
        </div>
      )}
    </div>
  );
}
