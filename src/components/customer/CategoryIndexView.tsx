"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, Zap } from "lucide-react";
import { useData } from "@/lib/hooks";
import { searchProducts } from "@/lib/catalog";
import AssetImage from "@/components/shared/AssetImage";

/** 카테고리 목록 — 카테고리마다 실제 상품 이미지 3개와 상품 수·빠른배송 수를 함께 보여준다 */
export default function CategoryIndexView() {
  const data = useData();
  const byCat = useMemo(() => {
    const all = searchProducts(data, { sort: "popular" });
    return new Map(
      data.categories.map((c) => {
        const items = all.filter((s) => s.product.categorySlug === c.slug);
        return [c.slug, { items, fast: items.filter((s) => s.promise.kind === "fast").length }] as const;
      }),
    );
  }, [data]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:py-8">
      <h1 className="text-[26px] font-bold tracking-tight sm:text-3xl">카테고리</h1>
      <p className="mt-1 text-[15px] text-muted">
        생활 필수품 {data.categories.length}개 카테고리 · 인기 상품 순
      </p>
      <ul className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
        {data.categories.map((c) => {
          const info = byCat.get(c.slug);
          const top = info?.items.slice(0, 3) ?? [];
          return (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="group flex items-center gap-4 rounded-[22px] border border-line bg-white p-3 transition-colors hover:border-primary/40 sm:p-4"
              >
                <span
                  aria-hidden="true"
                  className="grid shrink-0 grid-cols-[64px_40px] grid-rows-2 gap-1.5 sm:grid-cols-[80px_48px]"
                >
                  {top[0] && (
                    <AssetImage
                      assetKey={`category/${c.slug}`}
                      category={c.slug}
                      label={top[0].product.name}
                      className="row-span-2 rounded-2xl"
                      ratio="aspect-[64/86] sm:aspect-[80/102]"
                    />
                  )}
                  {top.slice(1, 3).map((s) => (
                    <AssetImage
                      key={s.product.id}
                      assetKey={`product/${s.product.id}`}
                      category={c.slug}
                      label={s.product.name}
                      className="rounded-xl"
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[19px] font-bold">
                    {c.name}
                    <ChevronRight
                      size={18}
                      className="text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-[14px] text-muted">{c.description}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                    <span className="tabular-nums text-ink">상품 {info?.items.length ?? 0}개</span>
                    {!!info?.fast && (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-teal">
                        <Zap size={12} className="fill-current" /> 빠른배송 {info.fast}개
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
