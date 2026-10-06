"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Zap, RotateCcw, ShieldCheck, Truck, Undo2, Headset } from "lucide-react";
import { useData, useNow } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { searchProducts } from "@/lib/catalog";
import { repeatItemsForCustomer } from "@/lib/engines";
import { SearchBox } from "./CustomerShell";
import ProductCard, { ProductRail } from "./ProductCard";
import AssetImage from "@/components/shared/AssetImage";
import { shipCutdown, todayLabel, won } from "@/lib/format";
import { useToast } from "@/components/shared/Toast";

const CAT_ICON: Record<string, string> = {
  food: "🍚",
  living: "🧻",
  kitchen: "🧽",
  home: "🛋️",
  digital: "🔌",
  pet: "🐾",
  baby: "🍼",
  health: "💊",
};

function Section({
  title,
  sub,
  href,
  more,
  children,
  id,
}: {
  title: string;
  sub?: string;
  href?: string;
  more?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mx-auto mt-9 max-w-[1280px] px-4 sm:mt-14">
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1 text-[15px] font-semibold text-primary hover:underline"
          >
            {more ?? "전체보기"} <ArrowRight size={15} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function HomeView() {
  const data = useData();
  const customerId = useStore((s) => s.ui.customerId);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  const fast = useMemo(() => searchProducts(data, { delivery: "fast", sort: "popular" }).slice(0, 8), [data]);
  const popular = useMemo(() => searchProducts(data, { sort: "popular" }).slice(0, 8), [data]);
  const deals = useMemo(
    () => searchProducts(data, { discountOnly: true, sort: "discount" }).slice(0, 8),
    [data],
  );
  const repeat = useMemo(() => repeatItemsForCustomer(data, customerId).slice(0, 4), [data, customerId]);
  const together = useMemo(() => {
    const cats = new Set(repeat.map((r) => r.product.categorySlug));
    return searchProducts(data, { sort: "popular" })
      .filter((s) => cats.has(s.product.categorySlug) && !repeat.some((r) => r.product.id === s.product.id))
      .slice(0, 4);
  }, [data, repeat]);
  const me = data.customers.find((c) => c.id === customerId);
  const now = useNow(30000);
  const cut = useMemo(() => (now ? { ...shipCutdown(now), now } : null), [now]);

  return (
    <div className="pb-6">
      {/* Hero + Search */}
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-[1280px] items-center gap-8 px-4 pb-12 pt-7 sm:pb-14 sm:pt-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-sm font-semibold tracking-wide text-teal-bright">
              생활에 필요한 모든 것, 한 번에
            </p>
            <h1 className="mt-2 text-balance text-[32px] font-black leading-[1.2] tracking-tight sm:text-[54px]">
              찾고, 배송일 확인하고,
              <br className="hidden sm:block" /> 오늘 바로 주문하세요
            </h1>
            <p className="mt-3 max-w-xl text-[17px] text-white/75 sm:text-[19px]">
              재고와 도착일을 구매 전에 확인하고, 자주 쓰는 상품은 한 번에 다시 담으세요.
            </p>
            <div className="mt-6 max-w-2xl text-ink">
              <SearchBox size="lg" label="메인 상품 검색" />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
              <li className="inline-flex items-center gap-1.5 lg:hidden">
                <Zap size={15} className="fill-teal text-teal-bright" />
                {cut
                  ? cut.beforeCutoff
                    ? `오늘 15:00까지 ${cut.remain} 남음 · ${cut.arriveLabel} 도착`
                    : `지금 주문 시 ${cut.arriveLabel} 도착`
                  : "15:00 전 주문 시 내일 도착"}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Truck size={15} className="text-teal-bright" />
                3만원 이상 무료배송
              </li>
              <li className="hidden items-center gap-1.5 sm:inline-flex">
                <RotateCcw size={15} className="text-teal-bright" />
                다시 구매 한 번에 담기
              </li>
            </ul>
          </div>
          <div className="relative hidden lg:block">
            <AssetImage
              assetKey="hero-01"
              category="living"
              variant="hero"
              ratio="aspect-[4/3.6] sm:aspect-[4/3]"
              className="rounded-3xl border border-white/10 bg-white/10"
            />
            {/* 사진 자산이 들어오기 전에도 비어 보이지 않도록: 실시간 배송 현황 오버레이 */}
            <div className="absolute left-4 right-4 top-4">
              <div className="rounded-2xl bg-white/95 px-4 py-3 text-ink shadow-card">
                <div className="text-[13px] font-semibold text-muted">
                  {cut ? todayLabel(cut.now, false) : "오늘"} 빠른배송
                </div>
                {cut?.beforeCutoff ? (
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black tabular-nums text-navy sm:text-3xl">
                      {cut.remain}
                    </span>
                    <span className="text-sm font-semibold text-muted">남음</span>
                  </div>
                ) : (
                  <div className="mt-0.5 text-xl font-black text-navy">오늘 마감</div>
                )}
                <div className="mt-0.5 text-xs text-muted">
                  지금 주문 시 <b className="text-teal">{cut?.arriveLabel ?? "-"}</b> 도착 예정
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
              {[
                ["카테고리 8", "생활 필수품 중심"],
                ["배송예정", "구매 전 확인"],
                ["재구매 추천", "구매주기 기반"],
              ].map(([a, b]) => (
                <div key={a} className="rounded-xl bg-white/95 px-2.5 py-2 text-ink">
                  <div className="whitespace-nowrap text-[15px] font-bold sm:text-sm">{a}</div>
                  <div className="mt-0.5 text-[12px] leading-tight text-muted sm:text-[13px]">{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category quick action */}
      <section className="mx-auto -mt-6 max-w-[1280px] px-4">
        <div className="card-raised stagger grid grid-cols-4 gap-1 p-3 sm:grid-cols-8 sm:gap-2 sm:p-4">
          {data.categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-mist"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-soft text-2xl"
                aria-hidden
              >
                {CAT_ICON[c.slug]}
              </span>
              <span className="text-sm font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <Section title="빠른배송 상품" sub="오늘 15:00 전 주문하면 내일 도착" href="/fast">
        <ProductRail>
          {fast.slice(0, 8).map((s) => (
            <ProductCard key={s.product.id} s={s} />
          ))}
        </ProductRail>
      </Section>

      {repeat.length > 0 && (
        <Section
          title="다시 구매할 때"
          sub={`${me?.name ?? "고객"}님의 구매주기에 맞춘 상품`}
          href="/my/repeat"
          more="한 번에 담기"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="card divide-y divide-line">
              {repeat.map((r) => {
                const sku = r.altSku ?? r.sku;
                const due = r.dueInDays <= 0 ? "지금 주문할 때" : `${r.dueInDays}일 후 필요`;
                return (
                  <div key={r.product.id} className="flex items-center gap-3 p-3">
                    <Link href={`/product/${r.product.id}`} className="shrink-0">
                      <AssetImage
                        assetKey={`product/${r.product.id}`}
                        category={r.product.categorySlug}
                        label={r.product.name}
                        className="h-16 w-16 rounded-xl"
                        ratio=""
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${r.product.id}`}
                        className="line-clamp-1 text-[17px] font-semibold"
                      >
                        {r.product.name}
                      </Link>
                      <div className="mt-0.5 line-clamp-1 text-[13px] text-muted">
                        {sku.name} ·{" "}
                        <span className={r.dueInDays <= 0 ? "font-semibold text-orange" : ""}>{due}</span>
                        {r.altSku && <span className="text-orange"> · 대체구성</span>}
                      </div>
                      <div className="mt-0.5 font-bold tabular-nums">{won(sku.salePrice)}</div>
                    </div>
                    <button
                      className="btn-outline btn-sm"
                      onClick={() => {
                        addToCart(sku.id, r.suggestedQty);
                        toast({
                          title: "다시 담았습니다",
                          body: `${r.product.name} ×${r.suggestedQty}`,
                          tone: "success",
                          action: { label: "장바구니 보기", href: "/cart" },
                        });
                      }}
                    >
                      다시 담기
                    </button>
                  </div>
                );
              })}
            </div>
            <Link
              href="/my/repeat"
              className="hidden flex-col justify-between rounded-2xl bg-shell p-5 text-white transition hover:brightness-110 lg:flex"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-highlight">
                  <RotateCcw size={16} />
                  다시 구매
                </div>
                <div className="mt-2 text-xl font-bold leading-snug">
                  자주 사는 {repeat.length}개 상품,
                  <br />한 번에 다시 담기
                </div>
                <p className="mt-2 text-sm text-white/70">구매주기와 현재 재고를 확인해 수량을 추천합니다.</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 font-semibold">
                바로 가기 <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </Section>
      )}

      <Section title="지금 많이 찾는 상품" sub="최근 7일 주문 기준" href="/search?q=">
        <ProductRail>
          {popular.slice(0, 8).map((s, i) => (
            <ProductCard key={s.product.id} s={s} rank={i + 1} />
          ))}
        </ProductRail>
      </Section>

      {together.length > 0 && (
        <Section title="함께 사면 좋은 상품" sub="자주 구매한 카테고리에서 골랐습니다">
          <ProductRail>
            {together.map((s) => (
              <ProductCard key={s.product.id} s={s} />
            ))}
          </ProductRail>
        </Section>
      )}

      <Section title="이번 주 특가" sub="할인율 높은 순" href="/deals">
        <ProductRail>
          {deals.slice(0, 8).map((s) => (
            <ProductCard key={s.product.id} s={s} />
          ))}
        </ProductRail>
      </Section>

      {/* Trust */}
      <section id="trust" className="mx-auto mt-10 max-w-[1280px] px-4 sm:mt-14">
        <h2 className="sr-only">배송·교환 안내</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Truck, t: "배송예정 사전 안내", d: "구매 전 도착 예정일 표시, 지연 시 사전 알림" },
            { icon: Undo2, t: "7일 이내 교환·반품", d: "단순 변심 포함, 마이페이지에서 바로 신청" },
            { icon: ShieldCheck, t: "정품·검수 상품", d: "계약 공급사 상품만 취급, 입고 시 검수" },
            { icon: Headset, t: "고객센터 09~18시", d: "주문·배송·반품 문의 (시연용)" },
          ].map((x) => (
            <div
              key={x.t}
              className="flex flex-col gap-2 rounded-2xl bg-mist p-3.5 sm:flex-row sm:gap-3 sm:p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
                <x.icon size={19} />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{x.t}</div>
                <div className="mt-0.5 text-[13px] leading-snug text-muted">{x.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
