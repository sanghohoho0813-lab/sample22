"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Play, Maximize2, Minimize2 } from "lucide-react";
import { Panel } from "./Widgets";

const STEPS: { title: string; body: string; src: string; surface: "customer" | "ax" }[] = [
  { title: "현재 유통운영의 문제", body: "품절과 과잉재고가 동시에 생기고, 고객 행동 데이터와 발주·배송이 연결되지 않습니다. 기획의도 05~08을 함께 보세요.", src: "/ax/why#05", surface: "ax" },
  { title: "Customer Home", body: "3초 안에 '여러 생활상품을 사는 곳, 검색이 중심, 배송예정과 다시 구매'가 보입니다.", src: "/", surface: "customer" },
  { title: "검색·카테고리", body: "'물티슈'를 검색합니다. 필터·정렬·배송조건·재고상태까지 실제로 동작합니다.", src: "/search?q=%EB%AC%BC%ED%8B%B0%EC%8A%88", surface: "customer" },
  { title: "Product Detail", body: "무엇을 사는가 · 얼마인가 · 언제 받는가. 구성 선택(단품/10팩/20팩)과 재고상태가 함께 보입니다.", src: "/product/p-001", surface: "customer" },
  { title: "배송예정 확인", body: "20팩 구성은 재고가 적어 '남은 수량'이 표시됩니다. 품절 구성은 입고예정·예약배송으로 정직하게 표시합니다.", src: "/product/p-001", surface: "customer" },
  { title: "DEMO 주문", body: "장바구니 → 주문정보 → DEMO Checkout. 실제 결제 없이 주문이 생성되고 재고 예약·수요신호가 즉시 반영됩니다.", src: "/cart", surface: "customer" },
  { title: "Business AX 반영", body: "방금 주문이 신규주문 Queue와 KPI에 들어옵니다. 같은 저장소를 쓰기 때문에 별도 동기화가 없습니다.", src: "/ax/fulfillment", surface: "ax" },
  { title: "Today Brief", body: "대표가 오늘 확인할 순서: 긴급 Action → 품절위험 → 배송지연 → 공급사 지연 → 저회전 → 재구매.", src: "/ax", surface: "ax" },
  { title: "Stock & Purchase Radar", body: "판매량+검색+장바구니+재고+리드타임으로 품절위험과 발주 우선순위를 계산합니다. 물티슈 20팩이 최상단입니다.", src: "/ax/inventory?status=risk", surface: "ax" },
  { title: "공급사 비교", body: "긴급 상황에서는 단가보다 납기가 중요합니다. 3일 납기 공급사가 추천되고 이유가 표시됩니다.", src: "/ax/suppliers", surface: "ax" },
  { title: "발주 Action 승인", body: "Action Center에서 '프리미엄 물티슈 20팩 긴급발주 검토'를 열어 공급사·수량을 확인하고 승인합니다. 발주서가 생성되고 입고예정이 반영됩니다.", src: "/ax/actions?id=act-001", surface: "ax" },
  { title: "Fulfillment Control Tower", body: "C구역 적체 82%, 마감임박 배송약속 주문 12건. 지연위험 탭에서 우선처리합니다.", src: "/ax/fulfillment?tab=risk", surface: "ax" },
  { title: "출고상태 변경", body: "주문을 열어 '다음 단계'를 눌러 피킹→포장→출고로 진행합니다. 재고가 차감되고 고객 알림이 생성됩니다.", src: "/ax/fulfillment", surface: "ax" },
  { title: "Customer 배송상태 반영", body: "고객 My Page에서 같은 주문의 상태가 '출고완료'로 바뀌어 있습니다.", src: "/my", surface: "customer" },
  { title: "Repeat Basket", body: "구매주기가 도래한 상품을 수량 추천과 함께 한 번에 다시 담아 주문합니다. 재고 부족 구성은 대체 구성을 제안합니다.", src: "/my/repeat", surface: "customer" },
  { title: "Evidence", body: "지금까지의 주문·승인·발주·출고가 Evidence Log에 시간순으로 남았습니다. 12주 실증 후 Evidence Pack이 됩니다.", src: "/ax/evidence", surface: "ax" },
  { title: "Why AX", body: "기획의도 16개 섹션 — 문제, 데이터가 끊기는 지점, Radar, Control Tower, AI와 사람의 역할, 12개월 데이터 자산.", src: "/ax/why", surface: "ax" },
  { title: "확장방향", body: "정기배송·B2B·공급사 Portal·다창고는 NEXT. 현재 기능처럼 말하지 않고, 실증 결과가 있을 때 확장합니다.", src: "/ax/why#16", surface: "ax" },
];

export default function PresentationView() {
  const sp = useSearchParams();
  const router = useRouter();
  const [i, setI] = useState(Math.min(STEPS.length - 1, Math.max(0, Number(sp.get("step") ?? 1) - 1)));
  const [full, setFull] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => { const mq = window.matchMedia("(min-width: 768px)"); const on = () => setIsDesktop(mq.matches); on(); mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); }, []);
  const step = STEPS[i];
  useEffect(() => { router.replace(`/ax/presentation?step=${i + 1}`, { scroll: false }); }, [i, router]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setI((x) => Math.min(STEPS.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); if (e.key === "Escape") setFull(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);

  return (
    <div className={full ? "fixed inset-0 z-[850] bg-mist p-3 flex flex-col" : "space-y-4"}>
      <div className={`grid gap-4 ${full ? "flex-1 min-h-0 lg:grid-cols-[340px_1fr]" : "lg:grid-cols-[340px_1fr]"} items-start`}>
        <Panel className={full ? "h-full overflow-y-auto" : ""} title={<span className="inline-flex items-center gap-2"><Play size={16} className="text-accent" />3~5분 Guided Journey</span>} sub="정적 슬라이드가 아니라 실제 앱 화면을 순서대로 따라갑니다. ← → 키로 이동" right={<button className="btn-ghost btn-sm !px-2" onClick={() => setFull((v) => !v)} aria-label="전체화면">{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>}>
          <ol className="space-y-1 max-h-[46vh] lg:max-h-none overflow-y-auto pr-1">
            {STEPS.map((s, k) => <li key={k}><button onClick={() => setI(k)} className={`w-full text-left rounded-lg px-2.5 py-2 text-sm flex items-center gap-2 ${k === i ? "bg-soft text-shell font-bold" : "hover:bg-mist text-muted"}`}><span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${k === i ? "bg-primary text-white" : k < i ? "bg-line text-ink" : "bg-mist"}`}>{k + 1}</span><span className="truncate">{s.title}</span><span className={`ml-auto text-[12px] font-semibold ${s.surface === "customer" ? "text-teal" : "text-secondary"}`}>{s.surface === "customer" ? "고객" : "AX"}</span></button></li>)}
          </ol>
        </Panel>
        <div className={`flex flex-col gap-3 ${full ? "h-full min-h-0" : ""}`}>
          <div className="card p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary text-white font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <div className="min-w-0 flex-1"><div className="font-bold text-lg leading-tight">{step.title}</div><p className="text-sm text-ink/80 mt-1">{step.body}</p></div>
            <div className="flex gap-1.5 shrink-0"><button className="btn-outline btn-sm !px-2.5" disabled={i === 0} onClick={() => setI((x) => x - 1)} aria-label="이전"><ChevronLeft size={16} /></button><button className="btn-primary btn-sm !px-2.5" disabled={i === STEPS.length - 1} onClick={() => setI((x) => x + 1)} aria-label="다음"><ChevronRight size={16} /></button></div>
          </div>
          {/* 모바일: 앱 안에 앱을 띄우지 않고(메모리·터치 문제) 해당 단계 화면으로 바로 이동 */}
          <div className="md:hidden card p-4">
            <a href={step.src} className="btn-primary btn-lg w-full"><ExternalLink size={18} />이 단계 화면 열기</a>
            <p className="text-sm text-muted mt-2">모바일에서는 각 단계를 실제 화면으로 이동해 진행합니다. 뒤로가기로 이 목록에 돌아옵니다.</p>
          </div>
          <div className={`hidden md:block card overflow-hidden relative ${full ? "flex-1 min-h-0" : "h-[62vh] min-h-[420px]"}`}>
            <div className="absolute top-2 right-2 z-10 flex gap-1"><a href={step.src} target="_blank" rel="noreferrer" className="btn-outline btn-sm bg-white/95"><ExternalLink size={14} />새 탭에서 열기</a></div>
            {isDesktop && <iframe key={step.src} title={step.title} src={step.src} className="w-full h-full border-0" />}
          </div>
          <div className="hidden md:block text-xs text-muted">화면 안에서 직접 클릭·조작할 수 있습니다. 여기서 만든 주문·승인은 실제 Demo 상태에 반영됩니다. Demo Reset은 설정 또는 하단 링크에서.</div>
        </div>
      </div>
    </div>
  );
}
