import type { CategorySlug, DemoData, Product, SKU } from "./types";
import { deliveryPromise } from "./format";

export interface ProductSummary {
  product: Product;
  skus: SKU[];
  defaultSku: SKU;
  minPrice: number;
  listPrice: number;
  discountRate: number;
  available: number; // default sku available
  totalAvailable: number;
  inboundEta?: string;
  soldOut: boolean;
  promise: ReturnType<typeof deliveryPromise>;
  popularity: number;
  trend: number;
}

export function summarize(data: DemoData, product: Product, now = new Date()): ProductSummary {
  const skus = data.skus.filter((s) => s.productId === product.id);
  const inv = new Map(data.inventory.map((i) => [i.skuId, i]));
  const demand = new Map(data.demand.map((d) => [d.skuId, d]));
  const availOf = (s: SKU) => Math.max(0, (inv.get(s.id)?.onHand ?? 0) - (inv.get(s.id)?.reserved ?? 0));
  const inStock = skus.filter((s) => availOf(s) > 0);
  const defaultSku = inStock[0] ?? skus[0];
  const minPrice = Math.min(...skus.map((s) => s.salePrice / s.bundleQty)) * defaultSku.bundleQty;
  const totalAvailable = skus.reduce((a, s) => a + availOf(s), 0);
  const available = availOf(defaultSku);
  const inboundEta = skus.map((s) => inv.get(s.id)?.inboundEta).find(Boolean);
  const popularity = skus.reduce((a, s) => a + (demand.get(s.id)?.order7d ?? 0), 0);
  const prev = skus.reduce((a, s) => a + (demand.get(s.id)?.orderPrev7d ?? 0), 0);
  return {
    product, skus, defaultSku,
    minPrice: Math.round(minPrice),
    listPrice: defaultSku.listPrice,
    discountRate: defaultSku.listPrice > 0 ? Math.round((1 - defaultSku.salePrice / defaultSku.listPrice) * 100) : 0,
    available, totalAvailable, inboundEta,
    soldOut: totalAvailable <= 0,
    promise: deliveryPromise(product.deliveryType, totalAvailable, inboundEta, now),
    popularity,
    trend: prev > 0 ? (popularity - prev) / prev : 0,
  };
}

export interface SearchFilters {
  q?: string;
  category?: CategorySlug | "all";
  priceMin?: number;
  priceMax?: number;
  brandIds?: string[];
  minRating?: number;
  discountOnly?: boolean;
  delivery?: "all" | "fast" | "standard" | "reserve";
  stock?: "all" | "in" | "reserve";
  sort?: "popular" | "price_asc" | "price_desc" | "rating" | "new" | "discount";
}

const SYNONYMS: Record<string, string[]> = {
  "물티슈": ["물티슈", "티슈", "wipes"], "세제": ["세제", "세탁", "주방세제"], "생수": ["생수", "물", "워터"], "패드": ["패드", "배변"], "기저귀": ["기저귀"], "커피": ["커피", "드립"], "가습기": ["가습기"], "마스크": ["마스크", "kf94"],
};

export function searchProducts(data: DemoData, f: SearchFilters, now = new Date()): ProductSummary[] {
  const q = (f.q ?? "").trim().toLowerCase();
  const terms = q ? q.split(/\s+/) : [];
  const brandName = new Map(data.brands.map((b) => [b.id, b.name.toLowerCase()]));
  const catName = new Map(data.categories.map((c) => [c.slug, c.name]));
  let list = data.products.filter((p) => p.status === "active").map((p) => summarize(data, p, now));
  if (terms.length) {
    list = list.filter(({ product: p }) => {
      const hay = `${p.name} ${p.description} ${p.tags.join(" ")} ${brandName.get(p.brandId)} ${catName.get(p.categorySlug)}`.toLowerCase();
      return terms.every((t) => hay.includes(t) || (SYNONYMS[t]?.some((s) => hay.includes(s)) ?? false));
    });
  }
  if (f.category && f.category !== "all") list = list.filter((s) => s.product.categorySlug === f.category);
  if (f.priceMin !== undefined) list = list.filter((s) => s.minPrice >= f.priceMin!);
  if (f.priceMax !== undefined) list = list.filter((s) => s.minPrice <= f.priceMax!);
  if (f.brandIds?.length) list = list.filter((s) => f.brandIds!.includes(s.product.brandId));
  if (f.minRating) list = list.filter((s) => s.product.rating >= f.minRating!);
  if (f.discountOnly) list = list.filter((s) => s.discountRate > 0);
  if (f.delivery && f.delivery !== "all") list = list.filter((s) => (f.delivery === "reserve" ? s.promise.kind === "reserve" : s.product.deliveryType === f.delivery && !s.soldOut));
  if (f.stock === "in") list = list.filter((s) => !s.soldOut);
  if (f.stock === "reserve") list = list.filter((s) => s.promise.kind === "reserve");
  const sort = f.sort ?? "popular";
  list.sort((a, b) => {
    if (sort === "price_asc") return a.minPrice - b.minPrice;
    if (sort === "price_desc") return b.minPrice - a.minPrice;
    if (sort === "rating") return b.product.rating - a.product.rating || b.product.reviewCount - a.product.reviewCount;
    if (sort === "new") return b.product.id < a.product.id ? -1 : 1;
    if (sort === "discount") return b.discountRate - a.discountRate;
    return b.popularity - a.popularity;
  });
  return list;
}

export const SUGGESTED_SEARCHES = ["물티슈", "세탁세제", "생수 2L", "배변패드", "기저귀", "즉석밥", "주방세제", "KF94"];

export function autocomplete(data: DemoData, q: string): string[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const names = data.products.map((p) => p.name);
  const cats = data.categories.map((c) => c.name);
  const brands = data.brands.map((b) => b.name);
  return Array.from(new Set([...names, ...cats, ...brands].filter((n) => n.toLowerCase().includes(t)))).slice(0, 8);
}
