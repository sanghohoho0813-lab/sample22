"use client";
import { ArrowRight, ArrowUpRight, LayoutGrid, Globe } from "lucide-react";
import { BRIDGE_COPY, MIRAE_LINKS } from "@/lib/brand";

export interface SampleBridgeCTAProps {
  /** customer = 고객용 화면(브랜드 고정 팔레트) · ax = Business AX(Theme Token 연동) */
  surface?: "customer" | "ax";
  consultHref?: string;
  samplesHref?: string;
  homeHref?: string;
  className?: string;
}

/**
 * 샘플 페이지 공통 CTA 브릿지.
 * 1) 미래AI랩 소개  2) "우리 회사도 만들어보기" 상담 CTA  3) 다른 샘플·홈페이지 이동
 * 고객 화면과 Business AX 모두에서 페이지 하단에 동일한 구조로 노출됩니다.
 */
export default function SampleBridgeCTA({
  surface = "customer",
  consultHref = MIRAE_LINKS.consult,
  samplesHref = MIRAE_LINKS.samples,
  homeHref = MIRAE_LINKS.home,
  className = "",
}: SampleBridgeCTAProps) {
  const isAx = surface === "ax";
  // 고객 화면은 브랜드 고정색, AX는 9 Theme Token을 따라간다.
  const accent = isAx ? "var(--t-primary)" : "#0FAF9A";
  const accentRgb = isAx ? "var(--t-primary-rgb)" : "15 175 154";
  const deep = isAx ? "var(--t-shell)" : "#10243E";

  return (
    <section
      aria-labelledby="mirae-bridge-title"
      className={`mx-auto w-full ${isAx ? "max-w-[1600px] px-0" : "max-w-[1280px] px-4"} ${className}`}
      style={{ ["--cta-accent" as string]: accent, ["--cta-rgb" as string]: accentRgb, ["--cta-deep" as string]: deep }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-line bg-white shadow-card">
        {/* 좌측 브랜드 레일 + 은은한 배경 그라데이션 */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: `linear-gradient(180deg, var(--cta-accent), var(--cta-deep))` }} />
        <span aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-[0.07]" style={{ background: `radial-gradient(circle, var(--cta-accent), transparent 68%)` }} />

        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:p-10">
          {/* ── 1. 미래AI랩 소개 ── */}
          <div className="min-w-0">
            <span className="cta-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-bold tracking-[0.14em]" style={{ borderColor: "rgb(var(--cta-rgb) / 0.32)", color: "var(--cta-deep)", background: "rgb(var(--cta-rgb) / 0.07)" }}>
              <span aria-hidden className="cta-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--cta-accent)" }} />
              {BRIDGE_COPY.badge}
            </span>

            <h2 id="mirae-bridge-title" className="mt-3 text-[22px] sm:text-[26px] lg:text-[28px] font-bold leading-snug tracking-tight text-balance" style={{ color: "var(--cta-deep)" }}>
              {BRIDGE_COPY.headline}
            </h2>

            <p className="mt-3 text-[17px] leading-relaxed text-ink/80 max-w-2xl">
              <b className="font-bold text-ink">{BRIDGE_COPY.intro}</b>{" "}
              {BRIDGE_COPY.description}
            </p>
            <p className="mt-2 text-sm text-muted">{BRIDGE_COPY.note}</p>
          </div>

          {/* ── 2. 메인 CTA + 3. 서브 액션 ── */}
          <div className="flex flex-col gap-3 lg:w-[300px] lg:shrink-0">
            <a
              href={consultHref}
              target="_blank"
              rel="noreferrer"
              className="cta-primary cta-sweep group relative inline-flex min-h-[58px] items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 text-[18px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: "var(--cta-deep)", backgroundImage: "linear-gradient(135deg, rgb(var(--cta-rgb) / 0) 30%, rgb(var(--cta-rgb) / 0.45) 100%)" }}
            >
              <span className="relative z-10">{BRIDGE_COPY.primary}</span>
              <ArrowRight size={19} className="relative z-10 transition-transform duration-150 group-hover:translate-x-0.5" />
            </a>

            <div className="grid grid-cols-2 gap-2">
              <a href={samplesHref} target="_blank" rel="noreferrer" className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-mist hover:border-muted/40">
                <LayoutGrid size={16} style={{ color: "var(--cta-accent)" }} />
                {BRIDGE_COPY.samples}
              </a>
              <a href={homeHref} target="_blank" rel="noreferrer" className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-mist hover:border-muted/40">
                <Globe size={16} style={{ color: "var(--cta-accent)" }} />
                {BRIDGE_COPY.home}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** AX 사이드바 하단용 초소형 버전 — 같은 링크 3개를 작게 노출 */
export function SidebarBridgeCTA({
  consultHref = MIRAE_LINKS.consult,
  samplesHref = MIRAE_LINKS.samples,
  homeHref = MIRAE_LINKS.home,
}: Omit<SampleBridgeCTAProps, "surface" | "className">) {
  return (
    <div className="px-2.5 pb-2.5 pt-1">
      <div className="rounded-xl border border-white/12 bg-white/[0.06] p-2">
        <div className="px-1 pb-1.5 text-[11px] font-bold tracking-[0.12em] text-white/50">{BRIDGE_COPY.badge}</div>
        <a
          href={consultHref}
          target="_blank"
          rel="noreferrer"
          className="cta-sweep relative flex min-h-[40px] items-center justify-between gap-1 overflow-hidden rounded-lg bg-white px-2.5 text-[14px] font-bold text-shell transition-transform duration-150 hover:-translate-y-px"
        >
          <span className="relative z-10 truncate">{BRIDGE_COPY.primary}</span>
          <ArrowRight size={15} className="relative z-10 shrink-0" />
        </a>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <a href={samplesHref} target="_blank" rel="noreferrer" className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-lg bg-white/10 px-1.5 text-[12px] font-semibold text-white/85 transition-colors hover:bg-white/20">
            다른 샘플 <ArrowUpRight size={12} />
          </a>
          <a href={homeHref} target="_blank" rel="noreferrer" className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-lg bg-white/10 px-1.5 text-[12px] font-semibold text-white/85 transition-colors hover:bg-white/20">
            홈페이지 <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
