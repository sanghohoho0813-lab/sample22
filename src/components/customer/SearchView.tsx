"use client";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ProductListView from "./ProductListView";
import { SearchBox } from "./CustomerShell";
import type { SearchFilters } from "@/lib/catalog";

export default function SearchView() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const base = useMemo<SearchFilters>(() => ({ q, sort: "popular" }), [q]);
  if (!q) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">검색</h1>
        <p className="text-muted mt-1">상품명, 카테고리, 브랜드로 찾아보세요.</p>
        <div className="mt-4 max-w-2xl"><SearchBox size="lg" autoFocus /></div>
        <ProductListView title="전체 상품" base={{ sort: "popular" }} showCategoryChips />
      </div>
    );
  }
  return <ProductListView title={`'${q}' 검색결과`} base={base} emptyHint="비슷한 단어로 다시 검색하거나 카테고리에서 찾아보세요." />;
}
