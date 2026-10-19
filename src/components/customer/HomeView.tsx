"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  Plus,
  RotateCcw,
  ShieldCheck,
  Truck,
  Undo2,
  Headset,
  Zap,
} from "lucide-react";
import { useData, useLookups, useNow } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { searchProducts } from "@/lib/catalog";
import { repeatItemsForCustomer } from "@/lib/engines";
import { SearchBox } from "./CustomerShell";
import ProductCard, { ProductRail } from "./ProductCard";
import AssetImage from "@/components/shared/AssetImage";
import ProductArt, { shortName } from "@/components/shared/ProductArt";
import { shipCutdown, won } from "@/lib/format";
import { useToast } from "@/components/shared/Toast";

function Section({
  title,
  sub,
  href,
  more,
  children,
  id,
  className = "",
}: {
  title: string;
  sub?: string;
  href?: string;
  more?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto mt-10 max-w-[1280px] px-4 sm:mt-14 ${className}`}>
      <div className="mb-3.5 flex items-end justify-between gap-3 sm:mb-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[21px] font-bold tracking-tight sm:text-2xl">{title}</h2>
          {sub && <p className="mt-0.5 text-[15px] text-muted">{sub}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-0.5 text-[15px] font-semibold text-muted hover:text-ink"
          >
            {more ?? "전체보기"} <ChevronRight size={17} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function HomeView() {
  const data = useData();
  const { brandById } = useLookups();
  const customerId = useStore((s) => s.ui.customerId);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  const fast = useMemo(() => searchProducts(data, { delivery: "fast", sort: "popular" }).slice(0, 8), [data]);
  const popular = useMemo(() => searchProducts(data, { sort: "popular" }).slice(0, 8), [data]);
  const deals = useMemo(
    () => searchProducts(data, { discountOnly: true, sort: "discount" }).slice(0, 8),
    [data],
  );
  // 카테고리 타일: 그 카테고리에서 가장 많이 팔리는 상품의 이미지로 (사진이 들어오면 category/<slug> 사진 우선)
  const catLead = useMemo(() => {
    const m = new Map<string, string>();
    searchProducts(data, { sort: "popular" }).forEach((s) => {
      if (!m.has(s.product.categorySlug)) m.set(s.product.categorySlug, s.product.name);
    });
    return m;
  }, [data]);
  const repeat = useMemo(() => repeatItemsForCustomer(data, customerId).slice(0, 6), [data, customerId]);
  const together = useMemo(() => {
    const cats = new Set(repeat.map((r) => r.product.categorySlug));
    return searchProducts(data, { sort: "popular" })
      .filter((s) => cats.has(s.product.categorySlug) && !repeat.some((r) => r.product.id === s.product.id))
      .slice(0, 4);
  }, [data, repeat]);
  const me = data.customers.find((c) => c.id === customerId);
  const now = useNow(30000);
  const cut = useMemo(() => (now ? shipCutdown(now) : null), [now]);
  const bestDeal = deals[0];
  const dueCount = repeat.filter((r) => r.dueInDays <= 3).length;

  return (
    <div className="pb-6">
      {/* 첫 화면: 누구에게 · 어디로 · 언제 도착 → 검색 (행동 중심) */}
      <section className="border-b border-line/70 bg-white">
        <div className="mx-auto max-w-[1280px] px-4 pb-5 pt-4 sm:pb-7 sm:pt-7">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <Link
              href="/my"
              className="inline-flex min-h-[36px] min-w-0 items-center gap-1.5 text-[15px] text-muted hover:text-ink"
            >
              <MapPin size={16} className="shrink-0 text-primary" />
              <span className="truncate">
                {me?.address.label ?? "우리집"} · {me?.address.line1 ?? "배송지 설정"}
              </span>
              <ChevronRight size={15} className="shrink-0" />
            </Link>
            <span className="hidden text-[14px] text-muted sm:inline">
              3만원 이상 무료배송 · 7일 이내 교환·반품
            </span>
          </div>
          <h1 className="mt-2 text-[26px] font-bold leading-[1.3] tracking-tight sm:text-[34px]">
            {me ? `${me.name}님, ` : ""}
            {cut ? (
              cut.beforeCutoff ? (
                <>
                  지금 주문하면 <span className="text-primary">{cut.arriveLabel}</span> 도착
                </>
              ) : (
                <>
                  오늘 마감 · <span className="text-primary">{cut.arriveLabel}</span> 도착
                </>
              )
            ) : (
              "필요한 생활상품, 한 번에"
            )}
          </h1>
          <div className="mt-4 max-w-3xl">
            <SearchBox size="lg" label="메인 상품 검색" />
          </div>
        </div>
      </section>

      {/* 프로모션 — 모바일은 옆으로 넘기기, 태블릿 이상은 한 줄 3칸 */}
      <section aria-label="오늘의 혜택" className="mx-auto mt-5 max-w-[1280px] sm:mt-7 sm:px-4">
        <div className="hide-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0">
          <Promo
            href="/fast"
            tone="primary"
            eyebrow={
              <>
                <Zap size={14} className="fill-current" /> 빠른배송
              </>
            }
            title={
              cut?.beforeCutoff ? `${cut.remain} 안에 주문하면 내일 도착` : "15:00 전 주문하면 내일 도착"
            }
            sub={`빠른배송 상품 ${fast.length}종 이상`}
            arts={fast.slice(0, 3).map((s) => s.product.name)}
          />
          <Promo
            href="/deals"
            tone="accent"
            eyebrow="이번 주 특가"
            title={
              bestDeal
                ? `${shortName(bestDeal.product.name)} 최대 ${Math.max(bestDeal.bestDiscount, bestDeal.discountRate)}% 할인`
                : "묶음 구성 할인"
            }
            sub="묶음 구성 할인 포함"
            arts={deals.slice(0, 3).map((s) => s.product.name)}
          />
          <Promo
            href="/my/repeat"
            tone="shell"
            eyebrow={
              <>
                <RotateCcw size={14} /> 다시 구매
              </>
            }
            title={dueCount ? `다시 살 때가 된 상품 ${dueCount}개` : "자주 사는 상품 한 번에 담기"}
            sub="구매주기에 맞춰 수량까지 추천"
            arts={repeat.slice(0, 3).map((r) => r.product.name)}
          />
        </div>
      </section>

      {/* 카테고리 — 글자 아이콘 대신 대표 상품 이미지 */}
      <section aria-label="카테고리" className="mx-auto mt-7 max-w-[1280px] px-4 sm:mt-10">
        <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-8 sm:gap-x-4">
          {data.categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/category/${c.slug}`} className="group flex flex-col items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="block w-full max-w-[84px] overflow-hidden rounded-[22px] transition-transform duration-150 group-hover:-translate-y-0.5"
                >
                  <AssetImage assetKey={`category/${c.slug}`} category={c.slug} label={catLead.get(c.slug)} />
                </span>
                <span className="text-[15px] font-medium">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {repeat.length > 0 && (
        <Section
          title="다시 살 때예요"
          sub={`${me?.name ?? "고객"}님의 구매주기 기준`}
          href="/my/repeat"
          more="한 번에 담기"
        >
          <div className="hide-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {repeat.map((r) => {
              const sku = r.altSku ?? r.sku;
              const due = r.dueInDays <= 0 ? "지금 살 때" : `${r.dueInDays}일 후`;
              return (
                <div
                  key={r.product.id}
                  className="flex w-[82%] shrink-0 snap-start items-center gap-3 rounded-2xl border border-line bg-white p-3 xs:w-[300px] lg:w-auto"
                >
                  <Link
                    href={`/product/${r.product.id}`}
                    className="shrink-0"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <AssetImage
                      assetKey={`product/${r.product.id}`}
                      category={r.product.categorySlug}
                      label={r.product.name}
                      brand={brandById.get(r.product.brandId)?.name}
                      className="h-[72px] w-[72px] rounded-xl"
                      ratio=""
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-[13px] font-semibold ${r.dueInDays <= 0 ? "text-accent" : "text-muted"}`}
                    >
                      {due} · {r.avgCycleDays}일 주기
                    </span>
                    <Link
                      href={`/product/${r.product.id}`}
                      className="line-clamp-1 text-[16px] font-semibold"
                    >
                      {r.product.name}
                    </Link>
                    <div className="text-[14px] text-muted">
                      {sku.name} · <b className="tabular-nums text-ink">{won(sku.salePrice)}</b>
                      {r.altSku && <span className="text-accent"> · 대체구성</span>}
                    </div>
                  </div>
                  <button
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-primary transition-colors hover:bg-primary hover:text-white"
                    aria-label={`${r.product.name} 다시 담기`}
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
                    <Plus size={20} strokeWidth={2.4} />
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="내일 도착 빠른배송" sub="오늘 15:00 전 주문 시" href="/fast">
        <ProductRail>
          {fast.slice(0, 8).map((s) => (
            <ProductCard key={s.product.id} s={s} />
          ))}
        </ProductRail>
      </Section>

      <Section title="지금 많이 찾는 상품" sub="최근 7일 주문 기준" href="/search?q=">
        <ProductRail>
          {popular.slice(0, 8).map((s, i) => (
            <ProductCard key={s.product.id} s={s} rank={i + 1} />
          ))}
        </ProductRail>
      </Section>

      {/* 특가는 띠 배경으로 구분 — 스크롤 중 섹션 리듬 */}
      <div className="mt-10 bg-accent/[0.07] pb-8 pt-1 sm:mt-14 sm:pb-12">
        <Section
          title="이번 주 특가"
          sub="할인율 높은 순 · 묶음 구성 포함"
          href="/deals"
          className="!mt-6 sm:!mt-9"
        >
          <ProductRail>
            {deals.slice(0, 8).map((s) => (
              <ProductCard key={s.product.id} s={s} />
            ))}
          </ProductRail>
        </Section>
      </div>

      {together.length > 0 && (
        <Section title="함께 사면 좋은 상품" sub="자주 구매한 카테고리에서 골랐습니다">
          <ProductRail>
            {together.map((s) => (
              <ProductCard key={s.product.id} s={s} />
            ))}
          </ProductRail>
        </Section>
      )}

      {/* 신뢰 — 한 줄 안내 */}
      <section id="trust" className="mx-auto mt-12 max-w-[1280px] px-4 sm:mt-16">
        <h2 className="sr-only">배송·교환 안내</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-6 md:grid-cols-4">
          {[
            { icon: Truck, t: "도착일 미리 안내", d: "구매 전 도착 예정일, 지연 시 사전 알림" },
            { icon: Undo2, t: "7일 이내 교환·반품", d: "마이페이지에서 바로 신청" },
            { icon: ShieldCheck, t: "계약 공급사 상품", d: "입고 시 검수 후 출고" },
            { icon: Headset, t: "고객센터 09~18시", d: "주문·배송·반품 문의 (시연용)" },
          ].map((x) => (
            <li key={x.t} className="flex gap-2.5">
              <x.icon size={20} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{x.t}</div>
                <div className="mt-0.5 text-[13px] leading-snug text-muted">{x.d}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** 프로모션 배너 — 브랜드 색 면 + 실제 상품 이미지 3개 */
function Promo({
  href,
  tone,
  eyebrow,
  title,
  sub,
  arts,
}: {
  href: string;
  tone: "primary" | "accent" | "shell";
  eyebrow: React.ReactNode;
  title: string;
  sub: string;
  arts: string[];
}) {
  const bg = { primary: "bg-primary-strong", accent: "bg-accent-strong", shell: "bg-shell" }[tone];
  return (
    <Link
      href={href}
      className={`group relative flex h-[168px] w-[84%] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] p-5 text-white xs:w-[340px] sm:h-[184px] sm:w-auto ${bg}`}
    >
      <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-white">{eyebrow}</span>
      <span className="mt-1.5 max-w-[60%] text-[19px] font-bold leading-snug tracking-tight sm:max-w-[64%] sm:text-[21px]">
        {title}
      </span>
      <span className="mt-auto inline-flex items-center gap-1 text-[14px] text-white">
        {sub} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
      <span aria-hidden="true" className="absolute bottom-0 right-0 h-full w-[40%]">
        {arts.slice(0, 2).map((n, i) => (
          <span
            key={n}
            className={`absolute rounded-full bg-white/95 shadow-[0_6px_18px_rgba(0,0,0,0.18)] ${
              i === 0
                ? "bottom-4 right-4 h-[88px] w-[88px]"
                : "right-3 top-4 h-[56px] w-[56px] sm:right-24 sm:top-6"
            }`}
          >
            <ProductArt name={n} className="h-full w-full" />
          </span>
        ))}
      </span>
    </Link>
  );
}
