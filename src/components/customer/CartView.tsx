"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus, Trash2, Heart, ShoppingCart, ArrowRight } from "lucide-react";
import { useData, useLookups } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { deliveryPromise, won } from "@/lib/format";
import AssetImage from "@/components/shared/AssetImage";
import { EmptyState } from "@/components/shared/Bits";
import { DeliveryBadge } from "./ProductCard";
import { useToast } from "@/components/shared/Toast";
import { searchProducts } from "@/lib/catalog";
import ProductCard from "./ProductCard";

export default function CartView() {
  const data = useData();
  const { skuById, productById, invBySku } = useLookups();
  const cart = useStore((s) => s.ui.cart);
  const updateQty = useStore((s) => s.updateCartQty);
  const remove = useStore((s) => s.removeFromCart);
  const toggleSelect = useStore((s) => s.toggleCartSelect);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const toast = useToast();

  const rows = useMemo(() => cart.map((c) => { const sku = skuById.get(c.skuId)!; const product = productById.get(sku.productId)!; const inv = invBySku.get(sku.id); const available = Math.max(0, (inv?.onHand ?? 0) - (inv?.reserved ?? 0)); return { c, sku, product, available, promise: deliveryPromise(product.deliveryType, available, inv?.inboundEta) }; }), [cart, skuById, productById, invBySku]);
  const selected = rows.filter((r) => r.c.selected);
  const subtotal = selected.reduce((a, r) => a + r.sku.salePrice * r.c.qty, 0);
  const shipping = subtotal === 0 ? 0 : subtotal >= 30000 ? 0 : 3000;
  const allSelected = rows.length > 0 && rows.every((r) => r.c.selected);
  const suggestions = searchProducts(data, { sort: "popular" }).filter((s) => !cart.some((c) => c.skuId === s.defaultSku.id)).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">장바구니</h1>
      {rows.length === 0 ? (
        <div className="card mt-4"><EmptyState icon={<ShoppingCart size={22} />} title="장바구니가 비어 있습니다" body="자주 쓰는 생활상품을 담아보세요. 3만원 이상이면 배송비가 무료입니다." action={<div className="flex gap-2"><Link href="/" className="btn-primary btn-sm">쇼핑 계속하기</Link><Link href="/my/repeat" className="btn-outline btn-sm">다시 구매</Link></div>} />
          <div className="px-4 pb-4"><div className="text-sm font-semibold mb-2">지금 많이 찾는 상품</div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{suggestions.map((s) => <ProductCard key={s.product.id} s={s} size="sm" />)}</div></div>
        </div>
      ) : (
        <div className="mt-4 grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="card divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <label className="inline-flex items-center gap-2 font-semibold"><input type="checkbox" className="w-4 h-4 accent-[var(--t-primary)]" checked={allSelected} onChange={(e) => rows.forEach((r) => toggleSelect(r.c.skuId, e.target.checked))} />전체 선택 ({selected.length}/{rows.length})</label>
              <button className="text-muted hover:text-danger" onClick={() => selected.forEach((r) => remove(r.c.skuId))}>선택 삭제</button>
            </div>
            {rows.map(({ c, sku, product, available, promise }) => (
              <div key={c.skuId} className="flex gap-3 p-4">
                <input type="checkbox" className="w-4 h-4 mt-1 accent-[var(--t-primary)]" checked={c.selected} onChange={() => toggleSelect(c.skuId)} aria-label={`${product.name} 선택`} />
                <Link href={`/product/${product.id}`} className="shrink-0"><AssetImage assetKey={`product/${product.id}`} category={product.categorySlug} label={product.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl" ratio="" /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${product.id}`} className="font-semibold leading-snug line-clamp-2">{product.name}</Link>
                  <div className="text-xs text-muted mt-0.5">{sku.name}</div>
                  <div className="mt-1"><DeliveryBadge promise={promise} compact /></div>
                  {available < c.qty && <div className="text-xs text-danger mt-1">재고 {available}개 — 수량을 조정하거나 입고 후 예약됩니다</div>}
                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="inline-flex items-center border border-line rounded-lg">
                      <button className="w-9 h-9 flex items-center justify-center hover:bg-mist rounded-l-lg" aria-label="수량 감소" onClick={() => updateQty(c.skuId, c.qty - 1)}><Minus size={14} /></button>
                      <span className="w-9 text-center text-sm font-bold tabular-nums">{c.qty}</span>
                      <button className="w-9 h-9 flex items-center justify-center hover:bg-mist rounded-r-lg" aria-label="수량 증가" onClick={() => updateQty(c.skuId, c.qty + 1)}><Plus size={14} /></button>
                    </div>
                    <div className="text-right"><div className="font-bold tabular-nums">{won(sku.salePrice * c.qty)}</div>{sku.listPrice > sku.salePrice && <div className="text-xs text-muted line-through">{won(sku.listPrice * c.qty)}</div>}</div>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-muted">
                    <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => { toggleWishlist(product.id); remove(c.skuId); toast({ title: "찜 목록으로 옮겼습니다", tone: "info" }); }}><Heart size={12} />찜으로 이동</button>
                    <button className="inline-flex items-center gap-1 hover:text-danger" onClick={() => remove(c.skuId)}><Trash2 size={12} />삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="card p-5 lg:sticky lg:top-32">
            <div className="font-bold text-lg">주문 예상금액</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">상품금액</dt><dd className="tabular-nums">{won(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">할인</dt><dd className="tabular-nums">-0원</dd></div>
              <div className="flex justify-between"><dt className="text-muted">배송비</dt><dd className="tabular-nums">{shipping === 0 ? "무료" : won(shipping)}</dd></div>
              {subtotal > 0 && subtotal < 30000 && <div className="text-xs text-primary bg-soft rounded-lg px-2.5 py-1.5">{won(30000 - subtotal)} 더 담으면 무료배송</div>}
              <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold">결제 예정금액</dt><dd className="font-black text-xl tabular-nums">{won(subtotal + shipping)}</dd></div>
            </dl>
            <div className="mt-2 text-xs text-muted">예상 도착: {selected.length ? (selected.some((r) => r.promise.kind !== "fast") ? "일반배송 포함 · 2~3일" : selected[0].promise.text) : "-"}</div>
            <Link href={selected.length ? "/checkout" : "#"} aria-disabled={!selected.length} className={`btn-primary btn-lg w-full mt-4 ${selected.length ? "" : "pointer-events-none opacity-50"}`}>선택 상품 주문하기 <ArrowRight size={16} /></Link>
            <Link href="/" className="btn-ghost w-full mt-2">쇼핑 계속하기</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
