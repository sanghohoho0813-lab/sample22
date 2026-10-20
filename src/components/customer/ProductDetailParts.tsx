"use client";
/**
 * 상품 상세 부품 — 갤러리(대표·구성·정보), 구성 선택 카드, 구간 내비(스크롤 연동), 리뷰 요약, 함께 담기.
 * 화면 표현만 담당하고 담기·주문은 기존 저장소 동작을 그대로 쓴다.
 */
import { useEffect, useState } from "react";
import { Check, Plus, Star, ThumbsUp, Zap } from "lucide-react";
import type { Inventory, Product, SKU } from "@/lib/types";
import type { ProductSummary } from "@/lib/catalog";
import { won } from "@/lib/format";
import AssetImage, { hasAsset } from "@/components/shared/AssetImage";
import ProductArt, { splitName } from "@/components/shared/ProductArt";

// ---------- 갤러리 ----------
type View = "front" | "bundle" | "info";

export function Gallery({
  product,
  brand,
  sku,
  infoLines,
}: {
  product: Product;
  brand?: string;
  sku: SKU;
  infoLines: [string, string][];
}) {
  const photo = hasAsset(`product/${product.id}`);
  const views: View[] = photo
    ? ["front"]
    : sku.bundleQty > 1
      ? ["front", "bundle", "info"]
      : ["front", "info"];
  const [view, setView] = useState<View>("front");
  useEffect(() => {
    if (!views.includes(view)) setView("front");
    // 구성이 바뀌면(묶음 ↔ 단품) 보기 목록이 달라질 수 있다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku.id]);
  const LABEL: Record<View, string> = { front: "대표", bundle: "구성", info: "정보" };
  return (
    <div>
      <div className="relative">
        {view === "front" && (
          <AssetImage
            assetKey={`product/${product.id}`}
            category={product.categorySlug}
            label={product.name}
            brand={brand}
            seed={parseInt(product.id.slice(2), 10)}
            className="sm:rounded-3xl"
            ratio="aspect-square"
          />
        )}
        {view === "bundle" && <BundleView product={product} sku={sku} />}
        {view === "info" && <InfoView product={product} lines={infoLines} />}
        {views.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-white">
            {views.indexOf(view) + 1} / {views.length}
          </span>
        )}
      </div>
      {views.length > 1 && (
        <div className="mt-2 flex gap-2 px-4 sm:px-0" role="group" aria-label="이미지 보기">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`relative w-[72px] overflow-hidden rounded-xl border-2 transition-colors ${view === v ? "border-primary" : "border-transparent hover:border-line"}`}
            >
              <span aria-hidden="true" className="block">
                {v === "front" ? (
                  <AssetImage
                    assetKey={`product/${product.id}`}
                    category={product.categorySlug}
                    label={product.name}
                  />
                ) : v === "bundle" ? (
                  <span className="flex aspect-square items-center justify-center bg-mist text-[15px] font-bold text-primary">
                    ×{sku.bundleQty}
                  </span>
                ) : (
                  <span className="flex aspect-square items-center justify-center bg-soft text-[13px] font-bold text-primary">
                    정보
                  </span>
                )}
              </span>
              <span className="sr-only">{LABEL[v]} 보기</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 구성 보기 — 묶음 수량만큼 포장을 늘어놓아 "몇 개가 오는지" 한눈에 */
function BundleView({ product, sku }: { product: Product; sku: SKU }) {
  const shown = Math.min(sku.bundleQty, sku.bundleQty > 6 ? 6 : sku.bundleQty);
  const cols = shown <= 2 ? 2 : shown <= 4 ? 2 : 3;
  return (
    <div className="relative flex aspect-square flex-col items-center justify-center bg-[linear-gradient(165deg,#F8F9F7,#ECEFEA)] p-6 sm:rounded-3xl">
      <div className="grid w-[78%] gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {Array.from({ length: shown }, (_, i) => (
          <ProductArt key={i} name={product.name} className="aspect-square w-full" />
        ))}
      </div>
      <div className="mt-3 rounded-full bg-white px-4 py-1.5 text-[15px] font-bold shadow-sm">
        {sku.name} · 총 {sku.bundleQty}개
        {sku.bundleQty > shown && <span className="font-normal text-muted"> (일부만 표시)</span>}
      </div>
    </div>
  );
}

/** 정보 보기 — 규격·배송·주기를 큰 글씨로 */
function InfoView({ product, lines }: { product: Product; lines: [string, string][] }) {
  const { spec } = splitName(product.name);
  return (
    <div className="flex aspect-square flex-col justify-center gap-4 bg-soft/60 p-8 sm:rounded-3xl">
      {spec && <div className="text-[44px] font-bold leading-none tracking-tight text-primary">{spec}</div>}
      <dl className="space-y-3">
        {lines.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[13px] font-semibold text-muted">{k}</dt>
            <dd className="text-[19px] font-bold leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------- 구성 선택 ----------
export function OptionCards({
  skus,
  selected,
  invBySku,
  onPick,
}: {
  skus: SKU[];
  selected: string;
  invBySku: Map<string, Inventory>;
  onPick: (id: string) => void;
}) {
  const perUnit = (s: SKU) => s.salePrice / s.bundleQty;
  const cheapest = skus.length > 1 ? skus.reduce((a, b) => (perUnit(b) < perUnit(a) ? b : a)).id : null;
  return (
    <div className="grid grid-cols-1 gap-2" role="group" aria-label="구성 선택">
      {skus.map((s) => {
        const i = invBySku.get(s.id);
        const av = Math.max(0, (i?.onHand ?? 0) - (i?.reserved ?? 0));
        const on = s.id === selected;
        const off = s.listPrice > s.salePrice ? Math.round((1 - s.salePrice / s.listPrice) * 100) : 0;
        return (
          <button
            key={s.id}
            aria-pressed={on}
            onClick={() => onPick(s.id)}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${on ? "border-primary bg-soft/70 ring-1 ring-primary/40" : "border-line hover:bg-mist"} ${av <= 0 ? "bg-mist/60" : ""}`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-primary bg-primary-strong text-white" : "border-line bg-white"}`}
            >
              {on && <Check size={12} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 font-semibold">
                {s.name}
                {s.option ? ` · ${s.option}` : ""}
                {cheapest === s.id && (
                  <span className="rounded-md bg-accent-strong px-1.5 py-0.5 text-[11px] font-bold text-white">
                    개당 최저가
                  </span>
                )}
              </span>
              <span className="block text-[13px] text-muted">
                {av <= 0
                  ? i?.inboundEta
                    ? `입고예정 ${i.inboundEta}`
                    : "일시품절"
                  : av <= 20
                    ? `남은 수량 ${av}개`
                    : "재고 충분"}
                {s.bundleQty > 1 ? ` · 개당 ${won(Math.round(perUnit(s)))}` : ""}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-bold tabular-nums">{won(s.salePrice)}</span>
              {off > 0 && <span className="block text-[12px] font-semibold text-accent">{off}% 할인</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- 구간 내비 (스크롤 위치에 따라 현재 구간 표시) ----------
export function SectionNav({ items }: { items: { id: string; label: string; count?: number }[] }) {
  const [cur, setCur] = useState(items[0]?.id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => {
        const vis = es
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setCur(vis[0].target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);
  return (
    <nav
      aria-label="상품 정보 구간"
      className="sticky top-16 z-30 -mx-4 border-b border-line bg-white/95 px-4 backdrop-blur md:top-[108px] md:mx-0 md:px-0"
    >
      <ul className="flex">
        {items.map((it) => (
          <li key={it.id} className="flex-1 sm:flex-none">
            <a
              href={`#${it.id}`}
              aria-current={cur === it.id ? "location" : undefined}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(it.id);
                if (!el) return;
                window.scrollTo({
                  top: el.getBoundingClientRect().top + window.scrollY - 128,
                  behavior: "smooth",
                });
                setCur(it.id);
              }}
              className={`relative flex h-12 items-center justify-center gap-1 px-4 text-[15px] transition-colors sm:px-6 ${cur === it.id ? "font-bold text-ink" : "text-muted hover:text-ink"}`}
            >
              {it.label}
              {it.count !== undefined && (
                <span className="text-[13px] tabular-nums text-muted">{it.count.toLocaleString()}</span>
              )}
              {cur === it.id && (
                <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-ink" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------- 리뷰 ----------
/** 평균 평점과 리뷰 수로 만든 점수 분포 (시연용 — 평균을 중심으로 한 정규 분포 근사) */
export function ratingDistribution(rating: number, count: number) {
  const w = [5, 4, 3, 2, 1].map((k) => Math.exp(-((k - rating) ** 2) / 0.9));
  const sum = w.reduce((a, b) => a + b, 0);
  return [5, 4, 3, 2, 1].map((k, i) => ({ star: k, n: Math.round((w[i] / sum) * count) }));
}

export function ReviewSummary({ rating, count }: { rating: number; count: number }) {
  const dist = ratingDistribution(rating, count);
  const max = Math.max(...dist.map((d) => d.n), 1);
  return (
    <div className="grid gap-5 rounded-2xl bg-mist p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
      <div className="text-center sm:px-4">
        <div className="text-[44px] font-bold tabular-nums leading-none tracking-tight">
          {rating.toFixed(1)}
        </div>
        <div
          className="mt-2 flex justify-center text-highlight"
          role="img"
          aria-label={`5점 만점에 ${rating}점`}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={18} className={i <= Math.round(rating) ? "fill-highlight" : ""} />
          ))}
        </div>
        <div className="mt-1 text-[13px] text-muted">{count.toLocaleString()}개 리뷰</div>
      </div>
      <ul className="space-y-1.5">
        {dist.map((d) => (
          <li key={d.star} className="grid grid-cols-[32px_1fr_56px] items-center gap-2 text-[13px]">
            <span className="text-muted">{d.star}점</span>
            <span className="h-2 overflow-hidden rounded-full bg-white">
              <span
                className="block h-full rounded-full bg-highlight"
                style={{ width: `${(d.n / max) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums text-muted">{d.n.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewCard({ r }: { r: { name: string; rating: number; text: string; date: string } }) {
  const [helped, setHelped] = useState(false);
  return (
    <article className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-center justify-between text-[14px]">
        <span className="inline-flex items-center gap-2">
          <span className="flex text-highlight" role="img" aria-label={`${r.rating}점`}>
            {[1, 2, 3, 4, 5].map((k) => (
              <Star key={k} size={13} className={k <= r.rating ? "fill-highlight" : ""} />
            ))}
          </span>
          <span className="font-semibold">{r.name}</span>
        </span>
        <span className="text-muted">{r.date}</span>
      </div>
      <p className="mt-2 text-[16px] leading-relaxed">{r.text}</p>
      <button
        type="button"
        onClick={() => setHelped((v) => !v)}
        aria-pressed={helped}
        className={`mt-2 inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors ${helped ? "border-primary bg-soft font-semibold text-primary" : "border-line text-muted hover:bg-mist"}`}
      >
        <ThumbsUp size={13} /> 도움돼요
      </button>
    </article>
  );
}

// ---------- 함께 담기 ----------
export function BundleBox({
  base,
  baseSku,
  partner,
  note,
  onAdd,
}: {
  base: Product;
  baseSku: SKU;
  partner: ProductSummary;
  /** 왜 이 상품인지 — 실제 함께 주문된 건수 등 근거 문장 */
  note: string;
  onAdd: (withPartner: boolean) => void;
}) {
  const [withPartner, setWithPartner] = useState(true);
  const total = baseSku.salePrice + (withPartner ? partner.defaultSku.salePrice : 0);
  const item = (p: Product, price: number, label: string, toggle?: () => void, on = true) => (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <button
        type="button"
        disabled={!toggle}
        onClick={toggle}
        aria-pressed={toggle ? on : undefined}
        className={`relative w-full max-w-[150px] overflow-hidden rounded-2xl ${toggle ? "cursor-pointer" : ""} ${on ? "" : "opacity-45"}`}
      >
        <span aria-hidden="true" className="block">
          <AssetImage assetKey={`product/${p.id}`} category={p.categorySlug} label={p.name} />
        </span>
        <span
          className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-primary-strong text-white" : "border-2 border-line bg-white"}`}
        >
          {on && <Check size={14} strokeWidth={3} />}
        </span>
        <span className="sr-only">{label}</span>
      </button>
      <span className="line-clamp-2 text-[14px] leading-snug">{p.name}</span>
      <span className="text-[15px] font-bold tabular-nums">{won(price)}</span>
    </div>
  );
  return (
    <section aria-labelledby="bundle-title" className="rounded-[22px] border border-line p-5">
      <h2 id="bundle-title" className="text-[19px] font-bold tracking-tight">
        함께 사면 좋은 상품
      </h2>
      <p className="mt-0.5 text-[14px] text-muted">{note}</p>
      <div className="mt-4 flex items-start gap-2">
        {item(base, baseSku.salePrice, `${base.name} (기준 상품)`)}
        <span
          aria-hidden="true"
          className="mt-14 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-muted"
        >
          <Plus size={16} />
        </span>
        {item(
          partner.product,
          partner.defaultSku.salePrice,
          `${partner.product.name} 함께 담기 ${withPartner ? "선택됨" : "선택 안 됨"}`,
          () => setWithPartner((v) => !v),
          withPartner,
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-[15px]">
          {withPartner ? "2개 상품" : "1개 상품"} 합계{" "}
          <b className="text-[19px] tabular-nums">{won(total)}</b>
          {partner.promise.kind === "fast" && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-[13px] font-semibold text-teal">
              <Zap size={12} className="fill-current" /> 함께 내일 도착
            </span>
          )}
        </div>
        <button type="button" className="btn-primary" onClick={() => onAdd(withPartner)}>
          {withPartner ? "함께 담기" : "이 상품만 담기"}
        </button>
      </div>
    </section>
  );
}
