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
    <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:gap-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 [&>*:nth-child(n+5)]:md:hidden [&>*]:w-[44%] [&>*]:shrink-0 [&>*]:snap-start [&>*]:min-[480px]:w-[34%] [&>*]:md:w-auto">
      {children}
    </div>
  );
}

/**
 * 상품 카드 — 상용 커머스 문법: 테두리 상자 대신 "상품 이미지 타일 + 바로 아래 텍스트".
 * 담기(+)는 이미지 위에 떠 있어 목록에서 바로 담을 수 있고, 가격은 할인율 → 판매가 → 정가 순으로 읽힌다.
 */
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
  const brand = brandById.get(p.brandId)?.name;
  const badge = p.tags.includes("베스트")
    ? "베스트"
    : s.trend > 0.3
      ? "인기급상승"
      : p.tags.includes("반복구매")
        ? "자주 사는"
        : null;

  return (
    <article className="group relative flex min-w-0 flex-col">
      <div className="relative">
        <Link
          href={`/product/${p.id}`}
          className="zoom-hover relative block overflow-hidden rounded-2xl ring-1 ring-inset ring-black/[0.04]"
          // 이미지 링크는 아래 상품명 링크와 같은 곳으로 간다 — 키보드·스크린리더에서 두 번 읽히지 않도록 숨긴다
          tabIndex={-1}
          aria-hidden="true"
        >
          <AssetImage
            assetKey={`product/${p.id}`}
            category={p.categorySlug}
            label={p.name}
            brand={brand}
            seed={parseInt(p.id.slice(2), 10)}
          />
          {s.soldOut && (
            <div className="absolute inset-0 flex items-end justify-center bg-white/55 pb-3">
              <span className="rounded-full bg-ink/85 px-3 py-1 text-[13px] font-semibold text-white">
                {s.promise.kind === "reserve" ? "입고 후 발송" : "일시품절"}
              </span>
            </div>
          )}
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {rank !== undefined && (
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-ink/90 px-1.5 text-[14px] font-bold tabular-nums text-white">
              {rank}
            </span>
          )}
          {s.discountRate > 0 && (
            <span className="rounded-md bg-accent-strong px-1.5 py-0.5 text-[12px] font-bold text-white">
              {s.discountRate}%
            </span>
          )}
          {badge && !rank && (
            <span className="rounded-md bg-white/95 px-1.5 py-0.5 text-[12px] font-semibold text-ink shadow-sm">
              {badge}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggleWishlist(p.id)}
          aria-label={liked ? "찜 해제" : "찜하기"}
          aria-pressed={liked}
          className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink/45 transition-colors hover:text-danger"
        >
          <Heart size={19} className={liked ? "fill-danger text-danger" : "fill-white/70"} />
        </button>
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
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_2px_10px_rgba(16,36,62,0.16)] transition-transform hover:scale-105 active:scale-95"
          >
            <Plus size={20} strokeWidth={2.4} />
          </button>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${size === "sm" ? "pt-2" : "pt-2.5"}`}>
        {brand && <div className="truncate text-[13px] text-muted">{brand}</div>}
        <Link
          href={`/product/${p.id}`}
          className={`line-clamp-2 leading-snug text-ink ${size === "sm" ? "text-[15px]" : "text-[16px]"}`}
        >
          {p.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          {s.discountRate > 0 && <span className="text-[17px] font-bold text-accent">{s.discountRate}%</span>}
          <span className="text-[18px] font-bold tabular-nums tracking-tight">
            {won(s.defaultSku.salePrice)}
          </span>
          {s.discountRate > 0 && (
            <span className="text-[13px] tabular-nums text-muted line-through">{won(s.listPrice)}</span>
          )}
        </div>
        {s.skus.length > 1 && s.discountRate === 0 && s.bestDiscount > 0 && (
          <div className="text-[13px] text-muted">
            묶음 구성 최대 <span className="font-semibold text-accent">{s.bestDiscount}%</span> 할인
          </div>
        )}
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <DeliveryBadge promise={s.promise} compact />
        </div>
        <span className="mt-1 inline-flex items-center gap-1 text-[13px] text-muted">
          <Star size={12} className="fill-highlight text-highlight" />
          <span className="tabular-nums">{p.rating}</span>
          <span className="tabular-nums">({p.reviewCount.toLocaleString()})</span>
        </span>
      </div>
    </article>
  );
}
