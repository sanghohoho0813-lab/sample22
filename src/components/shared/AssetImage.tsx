"use client";
import { useState } from "react";
import type { CategorySlug } from "@/lib/types";
import manifest from "@/lib/assets.generated.json";

const AVAILABLE = manifest as Record<string, string>;

const CAT_HUE: Record<CategorySlug, number> = { food: 24, living: 190, kitchen: 150, home: 210, digital: 250, pet: 35, baby: 330, health: 120 };
const CAT_LABEL: Record<CategorySlug, string> = { food: "식품", living: "생활", kitchen: "주방", home: "리빙", digital: "디지털", pet: "반려", baby: "유아", health: "건강" };

interface Props {
  /** asset key e.g. "product/p-001", "hero-01", "category/living" */
  assetKey?: string;
  category?: CategorySlug;
  label?: string;
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
export default function AssetImage({ assetKey, category = "living", label, className = "", ratio = "aspect-square", variant = "product", seed = 0 }: Props) {
  const [failed, setFailed] = useState(false);
  const hue = CAT_HUE[category] ?? 200;
  const ext = assetKey ? AVAILABLE[assetKey] : undefined;
  const showImg = !!assetKey && !!ext && !failed;
  const initial = (label ?? CAT_LABEL[category] ?? "N").trim().charAt(0);
  const angle = 120 + ((seed * 37) % 60);
  return (
    <div className={`relative overflow-hidden ${ratio} ${className}`} style={{ background: `linear-gradient(${angle}deg, hsl(${hue} 45% 92%), hsl(${hue} 40% 82%))` }}>
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/assets/${assetKey}${ext}`} alt={label ?? ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      )}
      {!showImg && (
        <div className="absolute inset-0 flex items-center justify-center">
          {variant === "product" ? (
            <div className="flex flex-col items-center gap-1 select-none">
              <div className="rounded-2xl w-[38%] aspect-square min-w-10 flex items-center justify-center font-bold text-white/95 shadow-sm" style={{ background: `hsl(${hue} 42% 52%)`, fontSize: "clamp(16px, 2.4vw, 28px)" }}>{initial}</div>
              <span className="text-[13px] font-medium" style={{ color: `hsl(${hue} 35% 35%)` }}>{CAT_LABEL[category]}</span>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 pattern-dots" />
              <span className="absolute left-3 top-3 rounded-md bg-white/70 px-2 py-0.5 text-[13px] font-semibold" style={{ color: `hsl(${hue} 35% 30%)` }}>사진 준비 중 · {assetKey ?? "photo"}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
