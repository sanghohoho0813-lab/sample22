"use client";
import Link from "next/link";
import { Heart, Plus, Zap, Star } from "lucide-react";
import type { ProductSummary } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { won } from "@/lib/format";
import AssetImage from "@/components/shared/AssetImage";
import { useToast } from "@/components/shared/Toast";

export function DeliveryBadge({ promise, compact = false }: { promise: ProductSummary["promise"]; compact?: boolean }) {
  if (promise.kind === "fast") return <span className={`inline-flex items-center gap-1 font-semibold text-teal ${compact ? "text-xs" : "text-sm"}`}><Zap size={compact ? 12 : 14} className="fill-teal" />{promise.text}</span>;
  if (promise.kind === "reserve") return <span className={`inline-flex items-center gap-1 font-semibold text-[#B84F1A] ${compact ? "text-xs" : "text-sm"}`}>{promise.text}</span>;
  if (promise.kind === "soldout") return <span className={`inline-flex items-center gap-1 font-semibold text-danger ${compact ? "text-xs" : "text-sm"}`}>일시품절</span>;
  return <span className={`inline-flex items-center gap-1 text-muted ${compact ? "text-xs" : "text-sm"}`}>{promise.text}</span>;
}

export default function ProductCard({ s, size = "md", rank }: { s: ProductSummary; size?: "sm" | "md"; rank?: number }) {
  const { brandById } = useLookups();
  const wishlist = useStore((st) => st.ui.wishlist);
  const toggleWishlist = useStore((st) => st.toggleWishlist);
  const addToCart = useStore((st) => st.addToCart);
  const toast = useToast();
  const liked = wishlist.includes(s.product.id);
  const p = s.product;
  const badge = p.tags.includes("베스트") ? "베스트" : s.trend > 0.3 ? "인기급상승" : p.tags.includes("반복구매") ? "반복구매" : null;

  return (
    <article className="group card overflow-hidden flex flex-col lift relative">
      <Link href={`/product/${p.id}`} className="block relative overflow-hidden zoom-hover" aria-label={p.name}>
        <AssetImage assetKey={`product/${p.id}`} category={p.categorySlug} label={p.name} seed={parseInt(p.id.slice(2), 10)} className="rounded-none" />
        {rank !== undefined && <span className="absolute left-2 top-2 w-7 h-7 rounded-lg bg-navy text-white text-sm font-bold flex items-center justify-center">{rank}</span>}
        {badge && <span className="absolute left-2 bottom-2 badge bg-white/95 text-navy shadow-sm">{badge}</span>}
        {s.soldOut && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="badge bg-ink text-white text-sm px-3 py-1">{s.promise.kind === "reserve" ? "입고예정" : "일시품절"}</span></div>}
      </Link>
      <button type="button" onClick={() => toggleWishlist(p.id)} aria-label={liked ? "찜 해제" : "찜하기"} aria-pressed={liked} className="absolute right-2 top-2 w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-muted hover:text-danger transition-colors">
        <Heart size={18} className={liked ? "fill-danger text-danger" : ""} />
      </button>
      <div className={`flex flex-col flex-1 ${size === "sm" ? "p-2.5" : "p-3"}`}>
        <div className="text-xs text-muted">{brandById.get(p.brandId)?.name}</div>
        <Link href={`/product/${p.id}`} className={`font-semibold leading-snug line-clamp-2 mt-0.5 ${size === "sm" ? "text-[16px]" : "text-[17px]"}`}>{p.name}</Link>
        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
          {s.discountRate > 0 && <span className="text-orange font-bold">{s.discountRate}%</span>}
          <span className="font-bold text-[19px] tabular-nums">{won(s.defaultSku.salePrice)}</span>
          {s.discountRate > 0 && <span className="text-xs text-muted line-through tabular-nums">{won(s.listPrice)}</span>}
        </div>
        {s.skus.length > 1 && <div className="text-xs text-muted mt-0.5">{s.defaultSku.name} · 묶음 {s.skus.length}종</div>}
        <div className="mt-1.5"><DeliveryBadge promise={s.promise} compact /></div>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-muted"><Star size={12} className="fill-highlight text-highlight" />{p.rating} <span>({p.reviewCount.toLocaleString()})</span></span>
          {!s.soldOut && (
            <button type="button" onClick={() => { addToCart(s.defaultSku.id, 1); toast({ title: "장바구니에 담았습니다", body: `${p.name} · ${s.defaultSku.name}`, tone: "success" }); }} aria-label="장바구니 담기" className="w-9 h-9 rounded-full border border-line bg-white hover:bg-soft hover:border-primary text-ink flex items-center justify-center transition-colors">
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
