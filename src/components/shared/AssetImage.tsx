"use client";
import { useState } from "react";
import type { CategorySlug } from "@/lib/types";
import manifest from "@/lib/assets.generated.json";
import ProductArt from "./ProductArt";

const AVAILABLE = manifest as Record<string, string>;
/** 실제 사진 파일이 있는 슬롯인지 — 없으면 빈 자리표시를 여러 개 늘어놓지 않기 위해 사용 */
export const hasAsset = (key: string) => !!AVAILABLE[key];

const CAT_HUE: Record<CategorySlug, number> = {
  food: 24,
  living: 190,
  kitchen: 150,
  home: 210,
  digital: 250,
  pet: 35,
  baby: 330,
  health: 120,
};
const CAT_LABEL: Record<CategorySlug, string> = {
  food: "식품",
  living: "생활",
  kitchen: "주방",
  home: "리빙",
  digital: "디지털",
  pet: "반려",
  baby: "유아",
  health: "건강",
};

interface Props {
  /** asset key e.g. "product/p-001", "hero-01", "category/living" */
  assetKey?: string;
  category?: CategorySlug;
  label?: string;
  /** 상품 일러스트에 표기할 (가상) 브랜드명 */
  brand?: string;
  className?: string;
  ratio?: string; // e.g. "aspect-square"
  variant?: "product" | "hero" | "photo";
  seed?: number;
  sizes?: string;
  priority?: boolean;
}

/**
 * Photo slot. Tries /assets/<key>.jpg; when the asset is not present (photos pending),
 * renders a clean category-toned placeholder instead of a broken image.
 */
export default function AssetImage({
  assetKey,
  category = "living",
  label,
  className = "",
  ratio = "aspect-square",
  variant = "product",
  seed = 0,
  brand,
}: Props) {
  const [failed, setFailed] = useState(false);
  const hue = CAT_HUE[category] ?? 200;
  const ext = assetKey ? AVAILABLE[assetKey] : undefined;
  const showImg = !!assetKey && !!ext && !failed;
  const angle = 120 + ((seed * 37) % 60);
  // 상품: 사진이 있으면 사진, 없으면 패키지 일러스트 — 밝은 중립 배경 위에 (상용 커머스의 누끼 상품컷 문법)
  if (variant === "product")
    return (
      <div
        className={`relative overflow-hidden ${ratio} ${className}`}
        style={{ background: `linear-gradient(165deg, hsl(${hue} 22% 97.5%), hsl(${hue} 16% 92.5%))` }}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/assets/${assetKey}${ext}`}
            alt={label ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : label ? (
          <ProductArt
            name={label}
            brand={brand}
            category={category}
            className="absolute inset-[6%] h-[88%] w-[88%]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-[13px] font-medium"
            style={{ color: `hsl(${hue} 35% 35%)` }}
          >
            {CAT_LABEL[category]}
          </div>
        )}
      </div>
    );
  return (
    <div
      className={`relative overflow-hidden ${ratio} ${className}`}
      style={{ background: `linear-gradient(${angle}deg, hsl(${hue} 45% 92%), hsl(${hue} 40% 82%))` }}
    >
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/${assetKey}${ext}`}
          alt={label ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {!showImg && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="pattern-dots absolute inset-0" />
          {/* 사진 슬롯 키는 화면에 노출하지 않고 data 속성으로만 남긴다 (public/assets/README.md 참고) */}
          <span
            data-asset-slot={assetKey ?? "photo"}
            className="relative rounded-md bg-white/70 px-2 py-0.5 text-[13px] font-semibold"
            style={{ color: `hsl(${hue} 35% 30%)` }}
          >
            사진 준비 중
          </span>
        </div>
      )}
    </div>
  );
}
