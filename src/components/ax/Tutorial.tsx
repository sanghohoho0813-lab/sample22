"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";

/** 짧게, 화면에 실제 보이는 것만 말한다. target이 화면에 없으면(예: 휴대폰의 사이드바) fallback을 찾고, 그것도 없으면 그 단계는 건너뛴다 */
const STEPS: { target: string; fallback?: string; title: string; body: string }[] = [
  {
    target: "sidebar",
    fallback: "menu",
    title: "메뉴는 7개로 묶었습니다",
    body: "비슷한 기능끼리 묶여 있어요. 그룹을 누르면 세부 메뉴가 펼쳐집니다.",
  },
  {
    target: "brief",
    title: "오늘의 브리핑부터",
    body: "오늘 먼저 볼 일을 급한 순서로 보여줍니다. 누르면 해당 목록이 바로 열립니다.",
  },
  {
    target: "kpi",
    title: "숫자를 누르면 근거까지",
    body: "KPI를 누르면 위험 목록 → 상품 상세 → 추천 근거 → 발주 실행으로 이어집니다.",
  },
  {
    target: "actions",
    title: "추천에는 근거가 있습니다",
    body: "근거 2~4개와 대안이 함께 붙고, 사람이 승인해야 발주·출고가 실제로 바뀝니다.",
  },
  {
    target: "role",
    title: "역할마다 다르게 보입니다",
    body: "대표·구매·운영·CS로 바꾸면 메뉴와 숫자, 민감정보가 달라집니다.",
  },
  {
    target: "customer",
    title: "고객 화면과 연결돼 있습니다",
    body: "고객이 주문하면 여기 바로 들어오고, 여기서 출고하면 고객 화면이 바뀝니다.",
  },
  {
    target: "theme",
    title: "테마는 9가지",
    body: "색 테마와 글자 크기, 시연 데이터 초기화는 설정에서 바꿀 수 있습니다.",
  },
];
const visible = (el: Element | null) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};
const findTarget = (st: (typeof STEPS)[number]) => {
  const pick = (t?: string) =>
    t
      ? (Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${t}"]`)).find(visible) ?? null)
      : null;
  return pick(st.target) ?? pick(st.fallback);
};

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const setTutorialDone = useStore((s) => s.setTutorialDone);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // 지금 화면에 대상이 있는 단계만 (휴대폰에서는 테마 단계 등이 빠진다)
  const [steps] = useState(() => STEPS.filter((st) => !!findTarget(st)));
  const step = steps[Math.min(i, steps.length - 1)] ?? STEPS[0];

  useLayoutEffect(() => {
    // 스크롤은 단계가 바뀔 때 한 번만. 스크롤/리사이즈 리스너는 좌표만 갱신하고 절대 다시 스크롤하지 않는다 (피드백 루프 방지).
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = findTarget(step);
        setRect(el ? el.getBoundingClientRect() : null);
      });
    };
    const el = findTarget(step);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const t1 = setTimeout(measure, 400);
    const t2 = setTimeout(measure, 800);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.target]);

  const finish = () => {
    setTutorialDone(true);
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pad = 8;
  const r = rect
    ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 }
    : null;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardBelow = r ? r.y + r.h + 240 < vh : true;
  const cardStyle: React.CSSProperties = r
    ? {
        top: cardBelow ? r.y + r.h + 12 : Math.max(12, r.y - 232),
        left: Math.max(12, Math.min(r.x, vw - Math.min(360, vw - 24) - 12)),
      }
    : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

  return createPortal(
    <div className="fixed inset-0 z-[1200]" role="dialog" aria-label="튜토리얼">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {r && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={12} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(8,20,30,0.7)" mask="url(#tour-mask)" onClick={finish} />
        {r && (
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={12}
            fill="none"
            stroke="var(--t-highlight)"
            strokeWidth={3}
          />
        )}
      </svg>
      <div className="card-raised fade-up absolute w-[360px] max-w-[calc(100vw-24px)] p-5" style={cardStyle}>
        <div className="text-[13px] font-semibold text-muted">
          {i + 1} / {steps.length}
        </div>
        <div className="mt-0.5 text-lg font-bold">{step.title}</div>
        <p className="mt-1.5 text-[17px] leading-relaxed text-ink/85">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={finish}>
            건너뛰기
          </button>
          <div className="ml-auto flex gap-2">
            <button className="btn-outline btn-sm" disabled={i === 0} onClick={() => setI((x) => x - 1)}>
              이전
            </button>
            {i < steps.length - 1 ? (
              <button className="btn-primary btn-sm" onClick={() => setI((x) => x + 1)} data-autofocus>
                다음
              </button>
            ) : (
              <button className="btn-primary btn-sm" onClick={finish} data-autofocus>
                시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
