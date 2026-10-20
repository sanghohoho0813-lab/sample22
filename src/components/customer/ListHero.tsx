"use client";
/**
 * 빠른배송·특가 목록 상단 — "이 목록이 나에게 무슨 의미인지"를 사실로만 요약한다.
 * 빠른배송: 실제 출고 마감(15:00)까지 남은 시간과 도착일 · 특가: 지금 목록의 최대·평균 할인율과 상품 수.
 * 가짜 카운트다운·한정 수량 같은 긴박감 연출은 쓰지 않는다.
 */
import { useMemo, type ReactNode } from "react";
import { BadgePercent, Clock3, PackageCheck, Truck, Zap } from "lucide-react";
import { useData, useNow, useShippingRule } from "@/lib/hooks";
import { searchProducts } from "@/lib/catalog";
import { shipCutdown, won } from "@/lib/format";
import ProductArt from "@/components/shared/ProductArt";

export type ListHeroKind = "fast" | "deals";

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/80 px-3 py-2.5 sm:px-3.5">
      <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-primary sm:flex">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] text-muted">{label}</span>
        <span className="block whitespace-nowrap text-[15px] font-bold tabular-nums">{value}</span>
      </span>
    </div>
  );
}

export default function ListHero({
  kind,
  title,
  subtitle,
}: {
  kind: ListHeroKind;
  title: string;
  subtitle?: string;
}) {
  const data = useData();
  const ship = useShippingRule();
  const now = useNow(30000);
  const cut = useMemo(() => (now ? shipCutdown(now) : null), [now]);
  const list = useMemo(
    () =>
      kind === "fast"
        ? searchProducts(data, { delivery: "fast", sort: "popular" })
        : searchProducts(data, { discountOnly: true, sort: "discount" }),
    [data, kind],
  );
  const maxOff = list.reduce((a, s) => Math.max(a, s.bestDiscount), 0);
  const avgOff = list.length ? Math.round(list.reduce((a, s) => a + s.bestDiscount, 0) / list.length) : 0;
  const art = list.slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-soft px-4 py-5 sm:px-8 sm:py-8">
      <div className="relative z-[1] max-w-[640px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[13px] font-bold text-primary">
          {kind === "fast" ? <Zap size={13} className="fill-current" /> : <BadgePercent size={13} />}
          {kind === "fast" ? "빠른배송" : "특가"}
        </span>
        <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[34px]">{title}</h1>
        {kind === "fast" ? (
          <p className="mt-1.5 text-[16px] sm:text-[17px]">
            {!cut ? (
              (subtitle ?? "")
            ) : cut.beforeCutoff ? (
              <>
                오늘 15:00 출고 마감까지 <b className="tabular-nums text-primary">{cut.remain}</b> · 지금
                주문하면 <b>{cut.arriveLabel}</b> 도착
              </>
            ) : (
              <>
                오늘 출고는 마감됐어요 · 지금 주문하면 <b>{cut.arriveLabel}</b> 도착
              </>
            )}
          </p>
        ) : (
          subtitle && <p className="mt-1.5 text-[16px] sm:text-[17px]">{subtitle}</p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {kind === "fast" ? (
            <>
              <Fact icon={<Clock3 size={16} />} label="출고 마감" value="매일 15:00" />
              <Fact icon={<PackageCheck size={16} />} label="빠른배송 상품" value={`${list.length}개`} />
              <Fact
                icon={<Truck size={16} />}
                label="무료배송"
                value={`${ship.threshold % 10000 === 0 ? `${ship.threshold / 10000}만원` : won(ship.threshold)} 이상`}
              />
            </>
          ) : (
            <>
              <Fact icon={<BadgePercent size={16} />} label="최대 할인" value={`${maxOff}%`} />
              <Fact icon={<BadgePercent size={16} />} label="평균 할인" value={`${avgOff}%`} />
              <Fact icon={<PackageCheck size={16} />} label="할인 상품" value={`${list.length}개`} />
            </>
          )}
        </div>
        {kind === "deals" && (
          <p className="mt-3 text-[13px] text-muted">
            할인율은 정가 대비 판매가 기준이며, 묶음 구성 할인을 포함합니다.
          </p>
        )}
      </div>
      {/* 오른쪽 장식 — 목록 상위 상품 3개의 포장 그림을 겹쳐 보여준다 (넓은 화면만) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 bottom-0 top-0 hidden w-[380px] lg:block"
      >
        {art.map((s, i) => (
          <div
            key={s.product.id}
            className="absolute w-[140px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-12px_rgba(15,23,32,0.35)]"
            style={{
              right: [36, 168, 96][i],
              top: ["10%", "18%", "38%"][i],
              transform: `rotate(${[6, -5, 2][i]}deg)`,
              zIndex: [1, 2, 3][i],
            }}
          >
            <ProductArt
              name={s.product.name}
              category={s.product.categorySlug}
              brand={data.brands.find((b) => b.id === s.product.brandId)?.name}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
