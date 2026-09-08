"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Zap, RotateCcw, ShieldCheck, Truck, Undo2, Headset, Clock3 } from "lucide-react";
import { useData, useNow } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { searchProducts, summarize } from "@/lib/catalog";
import { repeatItemsForCustomer } from "@/lib/engines";
import { SearchBox } from "./CustomerShell";
import ProductCard from "./ProductCard";
import AssetImage from "@/components/shared/AssetImage";
import { shipCutdown, todayLabel, won } from "@/lib/format";
import { useToast } from "@/components/shared/Toast";

const CAT_ICON: Record<string, string> = { food: "🍚", living: "🧻", kitchen: "🧽", home: "🛋️", digital: "🔌", pet: "🐾", baby: "🍼", health: "💊" };

function Section({ title, sub, href, children, id }: { title: string; sub?: string; href?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-[1280px] px-4 mt-10 sm:mt-14">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div><h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>{sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}</div>
        {href && <Link href={href} className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline shrink-0">전체보기 <ArrowRight size={14} /></Link>}
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
  const deals = useMemo(() => searchProducts(data, { discountOnly: true, sort: "discount" }).slice(0, 8), [data]);
  const recommended = useMemo(() => searchProducts(data, { sort: "rating" }).filter((s) => !s.soldOut).slice(0, 4), [data]);
  const repeat = useMemo(() => repeatItemsForCustomer(data, customerId).slice(0, 4), [data, customerId]);
  const together = useMemo(() => {
    const cats = new Set(repeat.map((r) => r.product.categorySlug));
    return searchProducts(data, { sort: "popular" }).filter((s) => cats.has(s.product.categorySlug) && !repeat.some((r) => r.product.id === s.product.id)).slice(0, 4);
  }, [data, repeat]);
  const me = data.customers.find((c) => c.id === customerId);
  const now = useNow(30000);
  const cut = useMemo(() => (now ? { ...shipCutdown(now), now } : null), [now]);

  return (
    <div className="pb-6">
      {/* Hero + Search */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-10 sm:pt-12 sm:pb-14 grid lg:grid-cols-[1.15fr_1fr] gap-8 items-center">
          <div>
            <p className="text-teal font-semibold text-sm tracking-wide">생활에 필요한 모든 것, 한 번에</p>
            <h1 className="mt-2 text-[34px] leading-[1.15] sm:text-[52px] font-black tracking-tight text-balance">찾고, 배송일 확인하고,<br className="hidden sm:block" /> 오늘 바로 주문하세요</h1>
            <p className="mt-3 text-white/75 text-[17px] max-w-xl">식품·생활·주방·리빙·디지털·반려·유아·건강. 재고와 배송예정일을 구매 전에 확인하고, 자주 쓰는 상품은 한 번에 다시 담습니다.</p>
            <div className="mt-6 max-w-2xl text-ink"><SearchBox size="lg" /></div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
              <li className="inline-flex items-center gap-1.5"><Zap size={15} className="text-teal fill-teal" />{cut ? (cut.beforeCutoff ? `오늘 15:00까지 ${cut.remain} 남음 · ${cut.arriveLabel} 도착` : `지금 주문 시 ${cut.arriveLabel} 도착`) : "15:00 전 주문 시 내일 도착"}</li>
              <li className="inline-flex items-center gap-1.5"><Truck size={15} className="text-teal" />3만원 이상 무료배송</li>
              <li className="inline-flex items-center gap-1.5"><RotateCcw size={15} className="text-teal" />다시 구매 한 번에 담기</li>
            </ul>
          </div>
          <div className="relative">
            <AssetImage assetKey="hero-01" category="living" variant="hero" ratio="aspect-[4/3.6] sm:aspect-[4/3]" className="rounded-3xl bg-white/10 border border-white/10" />
            {/* 사진 자산이 들어오기 전에도 비어 보이지 않도록: 실시간 배송 현황 오버레이 */}
            <div className="absolute left-4 top-4 right-4">
              <div className="rounded-2xl bg-white/95 text-ink px-4 py-3 shadow-card">
                <div className="text-[11px] font-semibold text-muted">{cut ? todayLabel(cut.now, false) : "오늘"} 빠른배송</div>
                {cut?.beforeCutoff ? (
                  <div className="mt-0.5 flex items-baseline gap-1.5"><span className="text-2xl sm:text-3xl font-black tabular-nums text-navy">{cut.remain}</span><span className="text-sm font-semibold text-muted">남음</span></div>
                ) : (
                  <div className="mt-0.5 text-xl font-black text-navy">오늘 마감</div>
                )}
                <div className="text-xs text-muted mt-0.5">지금 주문 시 <b className="text-teal">{cut?.arriveLabel ?? "-"}</b> 도착 예정</div>
              </div>
            </div>
            <div className="absolute left-4 bottom-4 right-4 grid grid-cols-3 gap-2">
              {[["카테고리 8", "생활 필수품 중심"], ["배송예정", "구매 전 확인"], ["재구매 추천", "구매주기 기반"]].map(([a, b]) => (
                <div key={a} className="rounded-xl bg-white/95 text-ink px-2.5 py-2"><div className="font-bold text-[13px] sm:text-sm whitespace-nowrap">{a}</div><div className="text-[10px] sm:text-[11px] text-muted leading-tight mt-0.5">{b}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category quick action */}
      <section className="mx-auto max-w-[1280px] px-4 -mt-6">
        <div className="card-raised p-3 sm:p-4 grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-2">
          {data.categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-mist transition-colors">
              <span className="w-12 h-12 rounded-2xl bg-soft flex items-center justify-center text-2xl" aria-hidden>{CAT_ICON[c.slug]}</span>
              <span className="text-sm font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <Section title="빠른배송 상품" sub="오늘 15:00 전 주문하면 내일 도착" href="/fast">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">{fast.slice(0, 4).map((s) => <ProductCard key={s.product.id} s={s} />)}</div>
      </Section>

      {repeat.length > 0 && (
        <Section title="다시 구매할 때" sub={`${me?.name ?? "고객"}님의 구매주기에 맞춘 상품`} href="/my/repeat">
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <div className="card divide-y divide-line">
              {repeat.map((r) => {
                const sku = r.altSku ?? r.sku;
                const due = r.dueInDays <= 0 ? "지금 주문할 때" : `${r.dueInDays}일 후 필요`;
                return (
                  <div key={r.product.id} className="flex items-center gap-3 p-3">
                    <Link href={`/product/${r.product.id}`} className="shrink-0"><AssetImage assetKey={`product/${r.product.id}`} category={r.product.categorySlug} label={r.product.name} className="w-16 h-16 rounded-xl" ratio="" /></Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${r.product.id}`} className="font-semibold text-[15px] line-clamp-1">{r.product.name}</Link>
                      <div className="text-xs text-muted mt-0.5">{sku.name} · 평균 {r.avgCycleDays}일마다 · <span className={r.dueInDays <= 0 ? "text-orange font-semibold" : ""}>{due}</span>{r.altSku && <span className="text-[#B84F1A]"> · 대체구성</span>}</div>
                      <div className="font-bold mt-0.5 tabular-nums">{won(sku.salePrice)}</div>
                    </div>
                    <button className="btn-outline btn-sm" onClick={() => { addToCart(sku.id, r.suggestedQty); toast({ title: "다시 담았습니다", body: `${r.product.name} ×${r.suggestedQty}`, tone: "success" }); }}>다시 담기</button>
                  </div>
                );
              })}
            </div>
            <Link href="/my/repeat" className="rounded-2xl bg-shell text-white p-5 flex flex-col justify-between hover:brightness-110 transition">
              <div><div className="inline-flex items-center gap-1.5 text-highlight font-semibold text-sm"><RotateCcw size={16} />Repeat Basket</div><div className="mt-2 text-xl font-bold leading-snug">자주 사는 {repeat.length}개 상품,<br />한 번에 다시 담기</div><p className="text-white/70 text-sm mt-2">구매주기와 현재 재고를 확인해 수량을 추천합니다.</p></div>
              <div className="mt-4 inline-flex items-center gap-1 font-semibold">바로 가기 <ArrowRight size={16} /></div>
            </Link>
          </div>
        </Section>
      )}

      <Section title="오늘의 추천" sub="평점이 높고 재고가 넉넉한 상품">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">{recommended.map((s) => <ProductCard key={s.product.id} s={s} />)}</div>
      </Section>

      <Section title="지금 많이 찾는 상품" sub="최근 7일 주문 기준" href="/search?q=">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">{popular.slice(0, 8).map((s, i) => <ProductCard key={s.product.id} s={s} rank={i + 1} />)}</div>
      </Section>

      {together.length > 0 && (
        <Section title="함께 사면 좋은 상품" sub="자주 구매한 카테고리에서 골랐습니다">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">{together.map((s) => <ProductCard key={s.product.id} s={s} />)}</div>
        </Section>
      )}

      <Section title="이번 주 특가" sub="할인율 높은 순" href="/deals">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">{deals.slice(0, 4).map((s) => <ProductCard key={s.product.id} s={s} />)}</div>
      </Section>

      {/* Brand story */}
      <section className="mx-auto max-w-[1280px] px-4 mt-14">
        <div className="grid md:grid-cols-2 gap-4 items-stretch">
          <AssetImage assetKey="photo-01" category="home" variant="photo" ratio="aspect-[16/10] md:aspect-auto md:min-h-[260px]" className="rounded-3xl" />
          <div className="rounded-3xl bg-soft p-6 sm:p-8 flex flex-col justify-center">
            <p className="text-sm font-semibold text-primary">NEXMART가 일하는 방식</p>
            <h3 className="mt-2 text-2xl font-bold leading-snug">품절 없이, 늦지 않게.<br />검색부터 배송까지 한 흐름으로</h3>
            <p className="mt-3 text-muted leading-relaxed">고객이 무엇을 찾고 담는지가 곧 우리의 발주 기준이 됩니다. 그래서 자주 찾는 상품은 미리 채워두고, 배송예정일은 구매 전에 정직하게 보여드립니다.</p>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="mx-auto max-w-[1280px] px-4 mt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Truck, t: "배송예정 사전 안내", d: "구매 전 도착 예정일 표시, 지연 시 사전 알림" },
            { icon: Undo2, t: "7일 이내 교환·반품", d: "단순 변심 포함, 마이페이지에서 바로 신청" },
            { icon: ShieldCheck, t: "정품·검수 상품", d: "계약 공급사 상품만 취급, 입고 시 검수" },
            { icon: Headset, t: "고객센터 09~18시", d: "주문·배송·반품 문의 (시연용)" },
          ].map((x) => (
            <div key={x.t} className="card p-4 flex gap-3"><span className="w-10 h-10 rounded-xl bg-soft text-primary flex items-center justify-center shrink-0"><x.icon size={20} /></span><div><div className="font-semibold text-sm">{x.t}</div><div className="text-xs text-muted mt-0.5">{x.d}</div></div></div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted inline-flex items-center gap-1"><Clock3 size={12} />본 사이트는 시연(DEMO)입니다. 실제 결제·배송은 연결되지 않으며, 주문·재고·배송 Data Loop를 보여주기 위한 가상 서비스입니다.</p>
      </section>
    </div>
  );
}
