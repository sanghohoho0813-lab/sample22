"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";

const STEPS = [
  { target: "sidebar", title: "14개 메뉴, 하나의 흐름", body: "대시보드 → Action → 상품·재고·공급사 → 주문 → 고객 → Evidence. 왼쪽 메뉴는 '무엇이 문제인가'에서 '무엇을 했고 결과가 무엇인가'까지 순서대로 배치되어 있습니다." },
  { target: "brief", title: "Today Brief — 오늘 무엇부터", body: "대표가 10초 안에 '어디서 돈이 새는지, 무엇을 먼저 발주할지, 어떤 주문을 먼저 처리할지'를 보는 곳입니다. 각 항목을 누르면 근거와 Action으로 이어집니다." },
  { target: "kpi", title: "KPI는 클릭하면 Detail로", body: "숫자만 보여주지 않습니다. 품절위험 SKU 16개를 누르면 위험 목록 → SKU 상세 → 추천 근거 → 발주 Action → 공급사 선택까지 내려갑니다." },
  { target: "actions", title: "Action Card — 추천에는 근거가 있다", body: "모든 추천에는 사용 데이터, 핵심 근거 2~4개, 주의사항, 대안이 붙습니다. 승인·실행하면 실제 데이터(발주·재고·주문상태·고객 알림)가 바뀌고 Evidence가 남습니다." },
  { target: "role", title: "역할 전환 — 권한이 다르다", body: "대표·구매담당·운영담당·CS 전환 시 메뉴, KPI, 테이블, 민감정보가 실제로 달라집니다. 실제 운영에서는 로그인 역할과 RLS로 강제됩니다." },
  { target: "customer", title: "고객 화면 ↔ AX 왕복", body: "고객이 주문하면 여기 신규주문 Queue와 재고 예약이 바뀌고, 여기서 출고 처리하면 고객 My Page 상태가 바뀝니다. 한 저장소를 함께 씁니다." },
  { target: "theme", title: "9 Theme · 설정", body: "9개 Theme 전부에서 Sidebar·CTA·Badge·Chart·Modal이 일관되게 바뀝니다. 설정에서 글자 크기, 역할, Demo Reset도 관리합니다." },
];

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const setTutorialDone = useStore((s) => s.setTutorialDone);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  useLayoutEffect(() => {
    // 스크롤은 단계가 바뀔 때 한 번만. 스크롤/리사이즈 리스너는 좌표만 갱신하고 절대 다시 스크롤하지 않는다 (피드백 루프 방지).
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
        setRect(el ? el.getBoundingClientRect() : null);
      });
    };
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const t1 = setTimeout(measure, 400);
    const t2 = setTimeout(measure, 800);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    return () => { clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(raf); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step.target]);

  const finish = () => { setTutorialDone(true); onClose(); };
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); if (e.key === "ArrowRight") setI((x) => Math.min(STEPS.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); }; window.addEventListener("keydown", onKey); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pad = 8;
  const r = rect ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardBelow = r ? r.y + r.h + 240 < vh : true;
  const cardStyle: React.CSSProperties = r
    ? { top: cardBelow ? r.y + r.h + 12 : Math.max(12, r.y - 232), left: Math.min(Math.max(12, r.x), vw - 372) }
    : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

  return createPortal(
    <div className="fixed inset-0 z-[1200]" role="dialog" aria-label="튜토리얼">
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs><mask id="tour-mask"><rect width="100%" height="100%" fill="white" />{r && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={12} fill="black" />}</mask></defs>
        <rect width="100%" height="100%" fill="rgba(8,20,30,0.7)" mask="url(#tour-mask)" onClick={finish} />
        {r && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={12} fill="none" stroke="var(--t-highlight)" strokeWidth={3} />}
      </svg>
      <div className="absolute card-raised p-5 w-[360px] max-w-[calc(100vw-24px)] fade-up" style={cardStyle}>
        <div className="text-xs font-semibold text-muted">{i + 1} / {STEPS.length}</div>
        <div className="text-lg font-bold mt-0.5">{step.title}</div>
        <p className="text-[17px] text-ink/85 mt-1.5 leading-relaxed">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={finish}>건너뛰기</button>
          <div className="ml-auto flex gap-2">
            <button className="btn-outline btn-sm" disabled={i === 0} onClick={() => setI((x) => x - 1)}>이전</button>
            {i < STEPS.length - 1 ? <button className="btn-primary btn-sm" onClick={() => setI((x) => x + 1)} data-autofocus>다음</button> : <button className="btn-primary btn-sm" onClick={finish} data-autofocus>시작하기</button>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
