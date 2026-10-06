"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X, SearchX, ChevronRight } from "lucide-react";
import { useData } from "@/lib/hooks";
import { searchProducts, type SearchFilters } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import ProductCard from "./ProductCard";
import Overlay from "@/components/shared/Overlay";
import { EmptyState } from "@/components/shared/Bits";
import type { CategorySlug } from "@/lib/types";

const SORTS: { key: NonNullable<SearchFilters["sort"]>; label: string }[] = [
  { key: "popular", label: "인기순" },
  { key: "price_asc", label: "낮은 가격" },
  { key: "price_desc", label: "높은 가격" },
  { key: "rating", label: "평점순" },
  { key: "discount", label: "할인율" },
  { key: "new", label: "신상품" },
];
const PRICE_BANDS = [
  { label: "1만원 이하", min: 0, max: 10000 },
  { label: "1~3만원", min: 10000, max: 30000 },
  { label: "3~5만원", min: 30000, max: 50000 },
  { label: "5만원 이상", min: 50000, max: undefined },
];

export default function ProductListView({
  title,
  subtitle,
  base,
  lockCategory = false,
  showCategoryChips = true,
  emptyHint,
}: {
  title: string;
  subtitle?: string;
  base: SearchFilters;
  lockCategory?: boolean;
  showCategoryChips?: boolean;
  emptyHint?: string;
}) {
  const data = useData();
  const recordEvent = useStore((s) => s.recordEvent);
  const [f, setF] = useState<SearchFilters>({
    sort: "popular",
    category: "all",
    delivery: "all",
    stock: "all",
    ...base,
  });
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [priceBand, setPriceBand] = useState<number | null>(null);

  useEffect(() => {
    setF((s) => ({ ...s, ...base }));
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 220);
    return () => clearTimeout(t);
  }, [base]);
  useEffect(() => {
    if (base.q) {
      const hit = searchProducts(data, { q: base.q });
      hit.slice(0, 3).forEach((h) => recordEvent("search_product", h.defaultSku.id));
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.q]);

  const results = useMemo(() => searchProducts(data, f), [data, f]);
  const brandsInScope = useMemo(() => {
    const ids = new Set(searchProducts(data, { ...f, brandIds: undefined }).map((r) => r.product.brandId));
    return data.brands.filter((b) => ids.has(b.id));
  }, [data, f]);

  const activeCount = [
    f.category && f.category !== "all" && !lockCategory,
    priceBand !== null,
    f.brandIds?.length,
    f.minRating,
    f.discountOnly,
    f.delivery !== "all",
    f.stock !== "all",
  ].filter(Boolean).length;
  const reset = () => {
    setF({
      sort: "popular",
      category: lockCategory ? f.category : "all",
      delivery: "all",
      stock: "all",
      q: base.q,
    });
    setPriceBand(null);
  };
  const setBand = (i: number | null) => {
    setPriceBand(i);
    setF((s) => ({
      ...s,
      priceMin: i === null ? undefined : PRICE_BANDS[i].min,
      priceMax: i === null ? undefined : PRICE_BANDS[i].max,
    }));
  };
  const toggleBrand = (id: string) =>
    setF((s) => {
      const cur = s.brandIds ?? [];
      return { ...s, brandIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  const Filters = (
    <div className="space-y-5">
      {!lockCategory && (
        <div>
          <div className="mb-2 text-sm font-semibold">카테고리</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              className={`chip ${f.category === "all" ? "chip-on" : ""}`}
              onClick={() => setF((s) => ({ ...s, category: "all" }))}
            >
              전체
            </button>
            {data.categories.map((c) => (
              <button
                key={c.slug}
                className={`chip ${f.category === c.slug ? "chip-on" : ""}`}
                onClick={() => setF((s) => ({ ...s, category: c.slug as CategorySlug }))}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="mb-2 text-sm font-semibold">가격</div>
        <div className="flex flex-wrap gap-1.5">
          <button className={`chip ${priceBand === null ? "chip-on" : ""}`} onClick={() => setBand(null)}>
            전체
          </button>
          {PRICE_BANDS.map((b, i) => (
            <button
              key={b.label}
              className={`chip ${priceBand === i ? "chip-on" : ""}`}
              onClick={() => setBand(i)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold">배송</div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "전체"],
              ["fast", "빠른배송 가능"],
              ["standard", "일반배송"],
              ["reserve", "예약배송·입고예정"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              className={`chip ${f.delivery === k ? "chip-on" : ""}`}
              onClick={() => setF((s) => ({ ...s, delivery: k }))}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold">재고상태</div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "전체"],
              ["in", "바로 구매 가능"],
              ["reserve", "입고예정만"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              className={`chip ${f.stock === k ? "chip-on" : ""}`}
              onClick={() => setF((s) => ({ ...s, stock: k }))}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold">브랜드 · 공급유형</div>
        <div className="flex flex-wrap gap-1.5">
          {brandsInScope.map((b) => (
            <button
              key={b.id}
              className={`chip ${f.brandIds?.includes(b.id) ? "chip-on" : ""}`}
              onClick={() => toggleBrand(b.id)}
            >
              {b.name}
              <span className="text-xs text-muted">{b.origin}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          className={`chip ${f.minRating ? "chip-on" : ""}`}
          onClick={() => setF((s) => ({ ...s, minRating: s.minRating ? undefined : 4.5 }))}
        >
          평점 4.5 이상
        </button>
        <button
          className={`chip ${f.discountOnly ? "chip-on" : ""}`}
          onClick={() => setF((s) => ({ ...s, discountOnly: !s.discountOnly }))}
        >
          할인상품만
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5">
      <nav className="mb-2 flex items-center gap-1 text-xs text-muted" aria-label="경로">
        <Link href="/" className="hover:text-ink">
          홈
        </Link>
        <ChevronRight size={12} />
        <span>{title}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        <div className="text-sm text-muted">
          검색결과 <b className="text-ink">{results.length}</b>개
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-32 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold">
                <SlidersHorizontal size={16} />
                필터
              </div>
              {activeCount > 0 && (
                <button onClick={reset} className="text-xs font-semibold text-primary">
                  초기화
                </button>
              )}
            </div>
            {Filters}
          </div>
        </aside>
        <section>
          <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <button className="chip shrink-0 lg:hidden" onClick={() => setSheet(true)}>
              <SlidersHorizontal size={14} />
              필터
              {activeCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[12px] text-white">
                  {activeCount}
                </span>
              )}
            </button>
            {showCategoryChips && !lockCategory && (
              <div className="flex shrink-0 gap-1.5 lg:hidden">
                {data.categories.map((c) => (
                  <button
                    key={c.slug}
                    className={`chip ${f.category === c.slug ? "chip-on" : ""}`}
                    onClick={() =>
                      setF((s) => ({
                        ...s,
                        category: s.category === c.slug ? "all" : (c.slug as CategorySlug),
                      }))
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex shrink-0 gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  className={`h-9 whitespace-nowrap rounded-lg px-2.5 text-sm ${f.sort === s.key ? "bg-soft font-bold text-primary" : "text-muted hover:text-ink"}`}
                  onClick={() => setF((x) => ({ ...x, sort: s.key }))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {activeCount > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">적용된 필터</span>
              {f.delivery !== "all" && (
                <span className="chip chip-on !min-h-[34px] text-sm">
                  {{ fast: "빠른배송", standard: "일반배송", reserve: "예약배송" }[f.delivery!]}
                  <X size={12} onClick={() => setF((s) => ({ ...s, delivery: "all" }))} />
                </span>
              )}
              {priceBand !== null && (
                <span className="chip chip-on !min-h-[34px] text-sm">
                  {PRICE_BANDS[priceBand].label}
                  <X size={12} onClick={() => setBand(null)} />
                </span>
              )}
              {f.brandIds?.map((id) => (
                <span key={id} className="chip chip-on !min-h-[34px] text-sm">
                  {data.brands.find((b) => b.id === id)?.name}
                  <X size={12} onClick={() => toggleBrand(id)} />
                </span>
              ))}
              <button onClick={reset} className="text-xs text-muted underline">
                전체 해제
              </button>
            </div>
          )}

          {loading ? (
            <div
              className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
              aria-busy="true"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton aspect-[3/4.4]" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="card mt-4">
              <EmptyState
                icon={<SearchX size={22} />}
                title={base.q ? `'${base.q}'에 맞는 상품이 없습니다` : "조건에 맞는 상품이 없습니다"}
                body={emptyHint ?? "철자를 확인하거나 필터를 줄여보세요. 아래 인기 상품도 확인해 보세요."}
                action={
                  <div className="flex gap-2">
                    <button className="btn-outline btn-sm" onClick={reset}>
                      필터 초기화
                    </button>
                    <Link href="/" className="btn-primary btn-sm">
                      홈으로
                    </Link>
                  </div>
                }
              />
              <div className="px-4 pb-4">
                <div className="mb-2 text-sm font-semibold">지금 많이 찾는 상품</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {searchProducts(data, { sort: "popular" })
                    .slice(0, 4)
                    .map((s) => (
                      <ProductCard key={s.product.id} s={s} size="sm" />
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="fade-up mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {results.map((s) => (
                <ProductCard key={s.product.id} s={s} />
              ))}
            </div>
          )}
        </section>
      </div>

      <Overlay
        open={sheet}
        onClose={() => setSheet(false)}
        variant="sheet"
        title="필터"
        footer={
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={reset}>
              초기화
            </button>
            <button className="btn-primary flex-1" onClick={() => setSheet(false)}>
              {results.length}개 상품 보기
            </button>
          </div>
        }
      >
        {Filters}
      </Overlay>
    </div>
  );
}
