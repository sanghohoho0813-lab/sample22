"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Heart, Plus, Zap, Star } from "lucide-react";
import type { ProductSummary } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { won } from "@/lib/format";
import AssetImage from "@/components/shared/AssetImage";
import { useToast } from "@/components/shared/Toast";

export function DeliveryBadge({
  promise,
  compact = false,
}: {
  promise: ProductSummary["promise"];
  compact?: boolean;
}) {
  // 카드에서는 짧게 한 줄로: "내일 10/7(수) 도착 예정" → "내일 도착", "10/9(금) 도착 예정" → "10/9(금) 도착"
  const text = compact
    ? promise.text.replace(/^(내일|모레) \d+\/\d+\([^)]*\)/, "$1").replace(/ 예정$/, "")
    : promise.text;
  if (promise.kind === "fast")
    return (
      <span
        className={`inline-flex max-w-full items-center gap-1 font-semibold text-teal ${compact ? "text-[13px]" : "text-sm"}`}
      >
        <Zap size={compact ? 12 : 14} className="shrink-0 fill-teal" />
        <span className="truncate">{text}</span>
      </span>
    );
  if (promise.kind === "reserve")
    return (
      <span
        className={`inline-flex max-w-full items-center gap-1 font-semibold text-orange ${compact ? "text-[13px]" : "text-sm"}`}
      >
        <span className="truncate">{compact ? "입고 후 예약배송" : text}</span>
      </span>
    );
  if (promise.kind === "soldout")
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold text-danger ${compact ? "text-xs" : "text-sm"}`}
      >
        일시품절
      </span>
    );
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 text-muted ${compact ? "text-[13px]" : "text-sm"}`}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}

/** 상품 묶음: 모바일은 옆으로 넘기는 한 줄(스크롤 스냅), 태블릿 이상은 4열 그리드 — 홈·상세 페이지 길이를 크게 줄인다 */
export function ProductRail({ children }: { children: ReactNode }) {
  return (
    <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:gap-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 [&>*:nth-child(n+5)]:md:hidden [&>*]:w-[44%] [&>*]:shrink-0 [&>*]:snap-start [&>*]:min-[480px]:w-[34%] [&>*]:md:w-auto">
      {children}
    </div>
  );
}

export default function ProductCard({
  s,
  size = "md",
  rank,
}: {
  s: ProductSummary;
  size?: "sm" | "md";
  rank?: number;
}) {
  const { brandById } = useLookups();
  const wishlist = useStore((st) => st.ui.wishlist);
  const toggleWishlist = useStore((st) => st.toggleWishlist);
  const addToCart = useStore((st) => st.addToCart);
  const toast = useToast();
  const liked = wishlist.includes(s.product.id);
  const p = s.product;
  const badge = p.tags.includes("베스트")
    ? "베스트"
    : s.trend > 0.3
      ? "인기급상승"
      : p.tags.includes("반복구매")
        ? "반복구매"
        : null;

  return (
    <article className="card lift group relative flex flex-col overflow-hidden">
      <Link
        href={`/product/${p.id}`}
        className="zoom-hover relative block overflow-hidden"
        // 이미지 링크는 아래 상품명 링크와 같은 곳으로 간다 — 키보드·스크린리더에서 두 번 읽히지 않도록 숨긴다
        tabIndex={-1}
        aria-hidden="true"
      >
        <AssetImage
          assetKey={`product/${p.id}`}
          category={p.categorySlug}
          label={p.name}
          seed={parseInt(p.id.slice(2), 10)}
          className="rounded-none"
        />
        {rank !== undefined && (
          <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
            {rank}
          </span>
        )}
        {badge && (
          <span className="badge absolute bottom-2 left-2 bg-white/95 text-navy shadow-sm">{badge}</span>
        )}
        {s.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="badge bg-ink px-3 py-1 text-sm text-white">
              {s.promise.kind === "reserve" ? "입고예정" : "일시품절"}
            </span>
          </div>
        )}
      </Link>
      <button
        type="button"
        onClick={() => toggleWishlist(p.id)}
        aria-label={liked ? "찜 해제" : "찜하기"}
        aria-pressed={liked}
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-muted shadow-sm transition-colors hover:text-danger"
      >
        <Heart size={18} className={liked ? "fill-danger text-danger" : ""} />
      </button>
      <div className={`flex flex-1 flex-col ${size === "sm" ? "p-2.5" : "p-3"}`}>
        <div className="truncate text-[13px] text-muted">{brandById.get(p.brandId)?.name}</div>
        <Link
          href={`/product/${p.id}`}
          className={`mt-0.5 line-clamp-2 font-semibold leading-snug ${size === "sm" ? "text-[16px]" : "text-[17px]"}`}
        >
          {p.name}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          {s.discountRate > 0 && <span className="font-bold text-orange">{s.discountRate}%</span>}
          <span className="text-[19px] font-bold tabular-nums">{won(s.defaultSku.salePrice)}</span>
          {s.discountRate > 0 && (
            <span className="text-xs tabular-nums text-muted line-through">{won(s.listPrice)}</span>
          )}
        </div>
        {s.skus.length > 1 && (
          <div className="mt-0.5 text-[13px] text-muted">
            구성 {s.skus.length}종
            {s.discountRate === 0 && s.bestDiscount > 0 && (
              <>
                {" "}
                · <span className="font-semibold text-orange">묶음 최대 {s.bestDiscount}%↓</span>
              </>
            )}
          </div>
        )}
        <div className="mt-1.5 flex min-w-0">
          <DeliveryBadge promise={s.promise} compact />
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="inline-flex items-center gap-1 text-[13px] text-muted">
            <Star size={13} className="fill-highlight text-highlight" />
            {p.rating} <span>({p.reviewCount.toLocaleString()})</span>
          </span>
          {!s.soldOut && (
            <button
              type="button"
              onClick={() => {
                addToCart(s.defaultSku.id, 1);
                toast({
                  title: "장바구니에 담았습니다",
                  body: `${p.name} · ${s.defaultSku.name}`,
                  tone: "success",
                  action: { label: "장바구니 보기", href: "/cart" },
                });
              }}
              aria-label="장바구니 담기"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-primary hover:bg-soft"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
