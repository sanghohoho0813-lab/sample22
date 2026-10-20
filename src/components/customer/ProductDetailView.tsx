"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Star,
  Truck,
  Undo2,
  ShieldCheck,
  Zap,
  Store,
  PackageCheck,
  Bell,
} from "lucide-react";
import { useData, useLedger, useLookups, useShippingRule } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { coPurchased, searchProducts, summarize, type ProductSummary } from "@/lib/catalog";
import { deliveryPromise, won } from "@/lib/format";
import AssetImage, { hasAsset } from "@/components/shared/AssetImage";
import ProductCard, { ProductRail } from "./ProductCard";
import { EmptyState } from "@/components/shared/Bits";
import { BundleBox, Gallery, OptionCards, ReviewCard, ReviewSummary, SectionNav } from "./ProductDetailParts";
import { useToast } from "@/components/shared/Toast";

const REVIEWS = [
  {
    name: "김*연",
    rating: 5,
    text: "항상 쓰던 건데 여기서 사면 배송이 빨라서 좋아요. 예정일 그대로 왔습니다.",
    date: "3일 전",
  },
  {
    name: "박*민",
    rating: 5,
    text: "묶음으로 사니 단가가 확실히 저렴하네요. 재구매 의사 있습니다.",
    date: "1주 전",
  },
  {
    name: "이*호",
    rating: 4,
    text: "품질은 만족. 포장이 조금 컸어요. 배송예정일 표시가 정확해서 계획 세우기 편합니다.",
    date: "2주 전",
  },
];

export default function ProductDetailView({ productId }: { productId: string }) {
  const ship = useShippingRule();
  const data = useData();
  const router = useRouter();
  const { brandById, categoryBySlug, invBySku, supplierById } = useLookups();
  const product = data.products.find((p) => p.id === productId);
  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.ui.wishlist);
  const pushRecentView = useStore((s) => s.pushRecentView);
  const requestRestock = useStore((s) => s.requestRestock);
  const myId = useStore((s) => s.ui.customerId);
  const alerts = useStore((s) => s.data.restockAlerts);
  const toast = useToast();
  const summary = useMemo(() => (product ? summarize(data, product) : null), [data, product]);
  const [skuId, setSkuId] = useState<string>("");
  const [qty, setQty] = useState(1);
  // 바로 주문 연타 방지 — 훅은 early return 이전에 선언해야 렌더마다 순서가 유지된다
  const buying = useRef(false);
  // 함께 구매한 상품 — 실제 주문(시연 원장 90일 + 이후 주문)에서 이 상품과 한 주문에 같이 담긴 횟수 기준.
  // 근거가 약한(3건 미만) 조합은 보여주지 않는다 — 인기순으로 채워 "함께 샀다"고 말하지 않기 위해
  const ledger = useLedger();
  const together = useMemo(() => {
    if (!product) return [];
    const baskets = [
      ...data.orders.map((o) => o.items.map((i) => i.productId)),
      ...(ledger?.orders.map((o) => o.lines.map((l) => l.productId)) ?? []),
    ];
    const byId = new Map(searchProducts(data, {}).map((s) => [s.product.id, s]));
    return coPurchased(product.id, baskets)
      .filter((c) => c.count >= 3)
      .map((c) => ({ s: byId.get(c.productId), count: c.count }))
      .filter((x): x is { s: ProductSummary; count: number } => !!x.s && !x.s.soldOut)
      .slice(0, 4);
  }, [data, ledger, product]);

  useEffect(() => {
    if (product) pushRecentView(product.id); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
  useEffect(() => {
    if (summary && !skuId) setSkuId(summary.defaultSku.id);
  }, [summary, skuId]);

  if (!product || !summary)
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-10">
        <EmptyState
          art="search"
          title="상품을 찾을 수 없습니다"
          action={
            <Link href="/" className="btn-primary btn-sm">
              홈으로
            </Link>
          }
        />
      </div>
    );

  const sku = summary.skus.find((s) => s.id === skuId) ?? summary.defaultSku;
  const inv = invBySku.get(sku.id);
  const available = Math.max(0, (inv?.onHand ?? 0) - (inv?.reserved ?? 0));
  const promise = deliveryPromise(product.deliveryType, available, inv?.inboundEta);
  const soldOut = available <= 0;
  const reserveOk = soldOut && !!inv?.inboundEta;
  const liked = wishlist.includes(product.id);
  const related = searchProducts(data, { category: product.categorySlug, sort: "popular" })
    .filter((s) => s.product.id !== product.id)
    .slice(0, 4);
  const supplier = supplierById.get(sku.primarySupplierId);
  const discount = sku.listPrice > 0 ? Math.round((1 - sku.salePrice / sku.listPrice) * 100) : 0;
  const unit = sku.bundleQty > 1 ? `개당 ${won(Math.round(sku.salePrice / sku.bundleQty))}` : null;

  const add = () => {
    addToCart(sku.id, qty);
    toast({
      title: "장바구니에 담았습니다",
      body: `${product.name} · ${sku.name} ×${qty}`,
      tone: "success",
      action: { label: "장바구니 보기", href: "/cart" },
    });
  };
  // 바로 주문: 이 상품만 주문서로 (장바구니의 다른 상품은 남겨두고 선택만 해제)
  const buyNow = () => {
    if (buying.current) return;
    buying.current = true;
    const st = useStore.getState();
    // 이미 담겨 있던 상품이면 수량을 더하지 않고 지금 고른 수량으로 맞춘다
    if (st.ui.cart.some((c) => c.skuId === sku.id)) st.updateCartQty(sku.id, qty);
    else addToCart(sku.id, qty);
    useStore.getState().ui.cart.forEach((c) => st.toggleCartSelect(c.skuId, c.skuId === sku.id));
    router.push("/checkout");
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-4 sm:py-6">
      <nav className="mb-3 hidden items-center gap-1 text-xs text-muted sm:flex" aria-label="경로">
        <Link href="/" className="hover:text-ink">
          홈
        </Link>
        <ChevronRight size={12} />
        <Link href={`/category/${product.categorySlug}`} className="hover:text-ink">
          {categoryBySlug.get(product.categorySlug)?.name}
        </Link>
        <ChevronRight size={12} />
        <span className="truncate">{product.name}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:gap-12">
        {/* gallery — 휴대폰은 화면 폭을 꽉 채운 정사각 상품컷, 데스크톱은 스크롤해도 따라오는 고정 이미지 */}
        <div className="-mx-4 -mt-4 sm:mx-0 sm:mt-0 lg:sticky lg:top-32 lg:self-start">
          <Gallery
            product={product}
            brand={brandById.get(product.brandId)?.name}
            sku={sku}
            infoLines={[
              ["배송", promise.text],
              [
                "구매 주기",
                product.isRepeatable
                  ? `평균 ${product.avgRepeatCycleDays}일마다 다시 구매`
                  : "필요할 때 구매",
              ],
              [
                "브랜드",
                `${brandById.get(product.brandId)?.name ?? "-"} (${brandById.get(product.brandId)?.origin ?? "-"})`,
              ],
            ]}
          />
        </div>

        {/* buy box */}
        <div>
          <div className="text-[15px] text-muted">
            <span className="font-semibold text-ink">{brandById.get(product.brandId)?.name}</span> ·{" "}
            {categoryBySlug.get(product.categorySlug)?.name}
          </div>
          <h1 className="mt-1 text-balance text-[24px] font-bold leading-snug tracking-tight sm:text-[30px]">
            {product.name}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star size={15} className="fill-highlight text-highlight" />
              {product.rating}
            </span>
            <button
              onClick={() => {
                const el = document.getElementById("pd-review");
                if (el)
                  window.scrollTo({
                    top: el.getBoundingClientRect().top + window.scrollY - 128,
                    behavior: "smooth",
                  });
              }}
              className="text-muted underline underline-offset-2"
            >
              리뷰 {product.reviewCount.toLocaleString()}개
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            {discount > 0 && <span className="text-[26px] font-bold text-accent">{discount}%</span>}
            <span className="text-[30px] font-extrabold tabular-nums tracking-tight">
              {won(sku.salePrice)}
            </span>
            {discount > 0 && (
              <span className="tabular-nums text-muted line-through">{won(sku.listPrice)}</span>
            )}
          </div>
          {unit && <div className="mt-0.5 text-sm text-muted">{unit}</div>}

          {/* delivery promise — 언제 받는가 */}
          <div className="mt-5 rounded-2xl bg-mist p-4">
            <div className="flex items-center gap-2.5 text-[18px] font-bold">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${promise.kind === "fast" ? "bg-teal-strong text-white" : promise.kind === "reserve" ? "bg-orange-strong text-white" : promise.kind === "soldout" ? "bg-danger text-white" : "bg-white text-muted"}`}
              >
                {promise.kind === "fast" ? <Zap size={16} className="fill-current" /> : <Truck size={16} />}
              </span>
              {promise.text}
            </div>
            <div className="mt-1 pl-[42px] text-sm text-muted">
              {promise.kind === "fast" && promise.note}
              {promise.kind === "standard" && "일반배송 · 출고 후 2~3일"}
              {promise.kind === "reserve" &&
                `현재 재고가 없어 입고 후 순차 출고됩니다 (입고예정 ${inv?.inboundEta}).`}
              {promise.kind === "soldout" && "재입고 일정이 확정되면 알려드립니다."}
            </div>
            {(promise.kind === "soldout" || promise.kind === "reserve") &&
              (alerts?.some((x) => x.skuId === sku.id && x.customerId === myId) ? (
                <p className="mt-2 inline-flex items-center gap-1.5 pl-[42px] text-sm font-semibold text-primary">
                  <Bell size={15} /> 재입고 알림 신청됨 — 입고되면 알림으로 알려드려요
                </p>
              ) : (
                <button
                  className="btn-outline btn-sm ml-[42px] mt-2"
                  onClick={() => {
                    requestRestock(sku.id);
                    toast({
                      title: "재입고 알림을 신청했습니다",
                      body: "입고되면 알림함으로 알려드려요.",
                      tone: "success",
                    });
                  }}
                >
                  <Bell size={15} /> 재입고 알림 신청
                </button>
              ))}
            <div className="mt-2 inline-flex items-center gap-1 pl-[42px] text-xs text-muted">
              <PackageCheck size={13} />
              {available > 0 ? (available <= 20 ? `남은 재고 ${available}개` : "재고 충분") : "재고 없음"} ·
              배송비{" "}
              {ship.feeFor(sku.salePrice * qty) === 0
                ? "무료"
                : `${ship.fee.toLocaleString()}원 (${(ship.threshold / 10000).toLocaleString()}만원 이상 무료)`}
            </div>
          </div>

          {/* options */}
          <div className="mt-4">
            <div className="mb-2 text-[15px] font-bold">구성 선택</div>
            <OptionCards
              skus={summary.skus}
              selected={sku.id}
              invBySku={invBySku}
              onPick={(id) => {
                setSkuId(id);
                setQty(1);
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-3 py-2">
            <span className="text-sm font-semibold">수량</span>
            <div className="inline-flex items-center gap-1">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-mist"
                aria-label="수량 감소"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-bold tabular-nums">{qty}</span>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-mist"
                aria-label="수량 증가"
                onClick={() => setQty((q) => Math.min(Math.max(1, available || 5), q + 1))}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">총 상품금액</span>
            <span className="text-xl font-black tabular-nums">{won(sku.salePrice * qty)}</span>
          </div>

          <div className="mt-4 hidden grid-cols-[52px_1fr_1fr] gap-2 lg:grid">
            <button
              onClick={() => toggleWishlist(product.id)}
              aria-label="찜"
              className={`btn-outline !min-h-[52px] !px-0 ${liked ? "text-danger" : ""}`}
            >
              <Heart size={20} className={liked ? "fill-danger" : ""} />
            </button>
            <button
              onClick={add}
              disabled={soldOut && !reserveOk}
              className="btn-outline btn-lg border-primary text-primary"
            >
              {reserveOk ? "예약 담기" : "장바구니"}
            </button>
            <button onClick={buyNow} disabled={soldOut && !reserveOk} className="btn-primary btn-lg">
              {reserveOk ? "예약 주문" : "바로 주문"}
            </button>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-muted">
            <li className="flex items-start gap-2">
              <Store size={15} className="mt-0.5 shrink-0" />
              <span>
                판매·공급: (주)넥스마트 직매입 · 공급사 {supplier?.name ?? "-"} (계약 공급사, 입고 검수)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Undo2 size={15} className="mt-0.5 shrink-0" />
              <span>배송완료 후 7일 이내 교환·반품 가능 (식품·위생용품은 미개봉 시)</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <span>시연 주문: 실제 결제는 이루어지지 않습니다</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 롱폼 상세 — 탭을 눌러 숨기는 대신 한 번에 읽히고, 구간 내비가 현재 위치를 따라간다 */}
      <div className="mt-10">
        <SectionNav
          items={[
            { id: "pd-info", label: "상품정보" },
            { id: "pd-review", label: "리뷰", count: product.reviewCount },
            { id: "pd-ship", label: "배송·교환" },
          ]}
        />
        <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="min-w-0 space-y-12">
            <section id="pd-info" aria-labelledby="pd-info-h" className="scroll-mt-32">
              <h2 id="pd-info-h" className="text-[21px] font-bold tracking-tight">
                상품정보
              </h2>
              <p className="mt-3 text-[18px] leading-relaxed">{product.description}</p>
              <dl className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line text-[15px]">
                {[
                  [
                    "브랜드",
                    `${brandById.get(product.brandId)?.name ?? "-"} · ${brandById.get(product.brandId)?.origin ?? "-"}`,
                  ],
                  ["구성", summary.skus.map((s) => s.name).join(" / ")],
                  [
                    "배송",
                    product.deliveryType === "fast"
                      ? "빠른배송 — 15시 전 주문 시 다음날 도착"
                      : "일반배송 — 출고 후 2~3일",
                  ],
                  [
                    "구매 주기",
                    product.isRepeatable ? `평균 ${product.avgRepeatCycleDays}일마다 다시 구매` : "-",
                  ],
                  ["판매·공급", `(주)넥스마트 직매입 · ${supplier?.name ?? "-"} (계약 공급사, 입고 검수)`],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[96px_1fr] gap-3 px-4 py-3 sm:grid-cols-[120px_1fr]">
                    <dt className="text-muted">{k}</dt>
                    <dd className="min-w-0">{v}</dd>
                  </div>
                ))}
              </dl>
              {hasAsset(`detail/${product.id}`) && (
                <AssetImage
                  assetKey={`detail/${product.id}`}
                  category={product.categorySlug}
                  label={product.name}
                  variant="photo"
                  ratio="aspect-[16/7]"
                  seed={9}
                  className="mt-5 rounded-2xl"
                />
              )}
            </section>

            <section id="pd-review" aria-labelledby="pd-review-h" className="scroll-mt-32">
              <h2 id="pd-review-h" className="text-[21px] font-bold tracking-tight">
                리뷰 <span className="text-muted">{product.reviewCount.toLocaleString()}</span>
              </h2>
              <p className="mt-1 text-[13px] text-muted">시연용 가상 리뷰 — 실제 구매 후기가 아닙니다</p>
              <div className="mt-4">
                <ReviewSummary rating={product.rating} count={product.reviewCount} />
              </div>
              <div className="mt-2">
                {REVIEWS.map((r, i) => (
                  <ReviewCard key={i} r={r} />
                ))}
              </div>
            </section>

            <section id="pd-ship" aria-labelledby="pd-ship-h" className="scroll-mt-32">
              <h2 id="pd-ship-h" className="text-[21px] font-bold tracking-tight">
                배송·교환·반품
              </h2>
              <ul className="mt-4 space-y-3 text-[16px] leading-relaxed">
                {[
                  [
                    Truck,
                    "배송",
                    `빠른배송 상품은 오후 3시 이전 주문 시 다음날 도착(도서산간 제외). 일반배송은 출고 후 2~3일. ${(ship.threshold / 10000).toLocaleString()}만원 이상 무료배송.`,
                  ],
                  [
                    Undo2,
                    "교환·반품",
                    "배송완료 후 7일 이내 마이페이지에서 신청. 상품 불량·오배송·파손은 배송비 없이 처리, 단순 변심은 왕복 배송비 고객 부담.",
                  ],
                  [
                    PackageCheck,
                    "품절·입고",
                    "재고가 없는 구성은 입고예정일이 표시되며, 재입고 알림을 신청하면 입고 시 알려드립니다.",
                  ],
                ].map(([Icon, t, d]) => {
                  const I = Icon as typeof Truck;
                  return (
                    <li key={t as string} className="flex gap-3 rounded-2xl bg-mist p-4">
                      <I size={20} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <div className="font-semibold">{t as string}</div>
                        <p className="mt-0.5 text-[15px] text-muted">{d as string}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* 데스크톱 오른쪽: 함께 담기 (휴대폰은 상품정보 아래) */}
          {together[0] && (
            <aside className="lg:sticky lg:top-[180px] lg:self-start">
              <BundleBox
                base={product}
                baseSku={sku}
                partner={together[0].s}
                note={`최근 주문 중 ${together[0].count.toLocaleString()}건에 이 상품과 함께 담겼어요`}
                onAdd={(withPartner) => {
                  addToCart(sku.id, 1);
                  if (withPartner) addToCart(together[0].s.defaultSku.id, 1);
                  toast({
                    title: withPartner ? "2개 상품을 담았습니다" : "장바구니에 담았습니다",
                    body: withPartner ? `${product.name} + ${together[0].s.product.name}` : product.name,
                    tone: "success",
                    action: { label: "장바구니 보기", href: "/cart" },
                  });
                }}
              />
            </aside>
          )}
        </div>
      </div>

      <section className="mt-6 border-t border-line pt-8">
        <h2 className="mb-4 text-[21px] font-bold tracking-tight">같은 카테고리 인기상품</h2>
        <ProductRail>
          {related.map((s) => (
            <ProductCard key={s.product.id} s={s} />
          ))}
        </ProductRail>
      </section>
      {together.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[21px] font-bold tracking-tight">함께 구매한 상품</h2>
          <p className="mb-4 mt-0.5 text-[14px] text-muted">이 상품과 같은 주문에 자주 담긴 순서예요</p>
          <ProductRail>
            {together.map(({ s }) => (
              <ProductCard key={s.product.id} s={s} />
            ))}
          </ProductRail>
        </section>
      )}

      {/* mobile sticky CTA */}
      <div className="bg-white/97 safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line px-3 pb-2 pt-1.5 shadow-[0_-6px_20px_rgba(16,36,62,0.06)] backdrop-blur lg:hidden">
        {/* 지금 고른 구성·수량·금액 — 버튼을 누르기 전에 확인 */}
        <div className="flex items-center justify-between gap-2 px-1 pb-1.5 text-[13px]">
          <span className="min-w-0 truncate text-muted">
            {sku.name} · {qty}개
          </span>
          <span className="shrink-0 font-bold tabular-nums">{won(sku.salePrice * qty)}</span>
        </div>
        <div className="grid grid-cols-[48px_1fr_1fr] gap-2">
          <button
            onClick={() => toggleWishlist(product.id)}
            aria-label="찜"
            className={`btn-outline !min-h-[48px] !px-0 ${liked ? "text-danger" : ""}`}
          >
            <Heart size={20} className={liked ? "fill-danger" : ""} />
          </button>
          <button
            onClick={add}
            disabled={soldOut && !reserveOk}
            className="btn-outline !min-h-[48px] border-primary text-primary"
          >
            {reserveOk ? "예약 담기" : "장바구니"}
          </button>
          <button onClick={buyNow} disabled={soldOut && !reserveOk} className="btn-primary !min-h-[48px]">
            {reserveOk ? "예약 주문" : "바로 주문"}
          </button>
        </div>
      </div>
      <div className="h-24 lg:hidden" />
    </div>
  );
}
