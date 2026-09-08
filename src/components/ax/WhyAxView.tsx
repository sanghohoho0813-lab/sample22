"use client";
import Link from "next/link";
import { ArrowRight, Store, LayoutDashboard, Search, ShoppingCart, Boxes, Truck, RotateCcw, Radar, Sparkles, Database, FlaskConical, TrendingDown, Clock3, Repeat } from "lucide-react";
import AssetImage from "@/components/shared/AssetImage";
import { useData, useInsights } from "@/lib/hooks";
import { Term, TERMS } from "@/components/shared/Bits";

function Sec({ no, title, children, id }: { no: string; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id ?? no} className="scroll-mt-24">
      <div className="flex items-baseline gap-3 mb-3"><span className="text-3xl font-black text-primary/40 tabular-nums">{no}</span><h2 className="text-2xl sm:text-[28px] font-bold tracking-tight">{title}</h2></div>
      {children}
    </section>
  );
}
const Big = ({ children }: { children: React.ReactNode }) => <p className="text-[19px] sm:text-[22px] leading-relaxed font-semibold text-balance">{children}</p>;
const Card = ({ title, children, tone = "" }: { title: React.ReactNode; children: React.ReactNode; tone?: string }) => <div className={`card p-4 ${tone}`}><div className="font-bold mb-1">{title}</div><div className="text-sm text-ink/80 leading-relaxed">{children}</div></div>;

const TOC = ["NEXMART의 현재", "종합유통 운영이 어려운 이유", "고객이 상품을 찾고 주문하는 흐름", "내부 주문·재고·발주 흐름", "데이터가 끊기는 지점", "돈이 새는 곳: 품절과 과잉재고", "시간이 새는 곳: 공급사·주문 확인", "매출이 새는 곳: 재구매 누락", "NEXMART에서 AX란 무엇인가", "Customer Platform이 바꾸는 것", "Business AX가 바꾸는 것", "Stock & Purchase Radar", "Fulfillment Control Tower", "AI와 사람이 나누어 맡는 판단", "12개월 후 쌓이는 데이터 자산", "실증과 단계별 확장"];

export default function WhyAxView() {
  const data = useData();
  const insights = useInsights();
  const risk = insights.filter((i) => ["urgent", "stockout", "low"].includes(i.status)).length;
  const slow = insights.filter((i) => ["slow", "overstock"].includes(i.status));
  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start">
      <nav className="hidden lg:block sticky top-24 card p-3 text-sm max-h-[calc(100vh-120px)] overflow-y-auto" aria-label="목차">
        <div className="font-bold px-2 mb-1">기획의도 목차</div>
        <ol className="space-y-0.5">{TOC.map((t, i) => <li key={t}><a href={`#${String(i + 1).padStart(2, "0")}`} className="block px-2 py-1 rounded-md hover:bg-mist text-muted hover:text-ink"><span className="tabular-nums text-xs mr-1.5">{String(i + 1).padStart(2, "0")}</span>{t}</a></li>)}</ol>
      </nav>
      <div className="space-y-12 max-w-4xl min-w-0">
        <header className="rounded-3xl text-white p-6 sm:p-10 relative overflow-hidden" style={{ background: "var(--t-shell)" }}>
          <div className="absolute inset-0 pattern-dots opacity-60" />
          <div className="relative">
            <div className="text-highlight font-semibold text-sm">기획의도 · Why AX</div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black leading-tight text-balance">고객의 검색·장바구니·주문이<br />상품별 수요 데이터가 되고,<br />그 데이터가 발주·출고·배송을 바꾼다</h1>
            <p className="mt-4 text-white/80 max-w-2xl text-[16px] leading-relaxed">NEXMART는 쇼핑몰도, 재고 ERP도 아닙니다. 고객 행동 → 내부 판단 → 결과 → 고객 경험으로 돌아오는 <b className="text-white">닫힌 데이터 순환</b>을 실제로 작동시키는 종합유통 AX+플랫폼입니다.</p>
            <div className="mt-5 flex flex-wrap gap-2"><Link href="/ax/presentation" className="btn bg-white text-shell hover:bg-white/90">Presentation Mode로 보기</Link><Link href="/" className="btn bg-white/15 text-white hover:bg-white/25"><Store size={16} />Customer Platform</Link></div>
          </div>
        </header>

        <Sec no="01" title="NEXMART의 현재">
          <div className="grid sm:grid-cols-[1fr_1.2fr] gap-4 items-center">
            <AssetImage assetKey="photo-01" category="living" variant="photo" ratio="aspect-[4/3]" className="rounded-2xl" />
            <div className="space-y-3 text-[16px] leading-relaxed">
              <p>NEXMART는 국내 공급사로부터 생활·식품·주방·리빙·반려·유아·디지털·건강 상품을 <b>직매입</b>해 자체 물류에서 재고를 보유하고, 자사 Customer Platform에서 판매하는 <b>중소 종합유통사</b>입니다.</p>
              <div className="grid grid-cols-3 gap-2 text-center">{[["8", "카테고리"], [String(data.products.length), "상품"], [String(data.skus.length), "SKU"], [String(data.suppliers.length), "공급사"], ["5", "물류구역"], ["~1.4천", "월 주문 (Demo)"]].map(([v, l]) => <div key={l} className="rounded-xl bg-mist py-2.5"><div className="text-xl font-black">{v}</div><div className="text-xs text-muted">{l}</div></div>)}</div>
              <p className="text-sm text-muted">수익은 매입·판매 마진, 묶음상품, 프로모션에서 나옵니다. 대형 마켓플레이스·광고입찰·글로벌 커머스는 현재 사업이 아닙니다. (가상의 시연 기업)</p>
            </div>
          </div>
        </Sec>

        <Sec no="02" title="종합유통 운영이 어려운 이유">
          <Big>상품은 많고, 판매 속도는 상품마다 다르고, 공급사 조건도 다르며, 배송약속은 매일 돌아옵니다.</Big>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <Card title="판매량과 마진이 따로 움직인다">물티슈는 잘 팔리지만 할인 후 마진이 9%. 가습기는 안 팔리지만 재고는 186개.</Card>
            <Card title="품절과 과잉이 동시에 생긴다">같은 창고 안에서 어떤 SKU는 2.7일치, 어떤 SKU는 465일치.</Card>
            <Card title="사람이 매일 판단해야 한다">무엇을 언제 얼마나 발주할지, 어떤 주문을 먼저 처리할지 — 매일 수십 번.</Card>
          </div>
        </Sec>

        <Sec no="03" title="고객이 상품을 찾고 주문하는 흐름">
          <div className="card p-4 overflow-x-auto"><div className="flex items-center gap-2 min-w-[720px] text-sm">{[["검색·카테고리", Search], ["상품 상세", Store], ["배송예정 확인", Clock3], ["장바구니", ShoppingCart], ["주문", Truck], ["배송조회", Truck], ["다시 구매", RotateCcw]].map(([l, I], i, arr) => { const Icon = I as typeof Search; return <div key={l as string} className="flex items-center gap-2"><div className="rounded-xl bg-soft px-3 py-2 font-semibold inline-flex items-center gap-1.5"><Icon size={15} className="text-primary" />{l as string}</div>{i < arr.length - 1 && <ArrowRight size={14} className="text-muted" />}</div>; })}</div></div>
          <p className="mt-3 text-[16px] leading-relaxed">고객이 각 단계에서 남기는 행동은 모두 <b>수요신호</b>입니다. 검색만 하고 떠난 것, 장바구니에 담고 주문하지 않은 것, 3주마다 같은 물티슈를 사는 것 — 지금까지는 이 신호들이 어디에도 쓰이지 않았습니다.</p>
        </Sec>

        <Sec no="04" title="내부 주문·재고·발주 흐름">
          <div className="card p-4 overflow-x-auto"><div className="flex items-center gap-2 min-w-[760px] text-sm">{["공급사 발주", "입고", "재고", "주문접수", "피킹", "포장", "출고", "배송", "반품·VOC"].map((l, i, arr) => <div key={l} className="flex items-center gap-2"><div className="rounded-xl bg-mist px-3 py-2 font-semibold">{l}</div>{i < arr.length - 1 && <ArrowRight size={14} className="text-muted" />}</div>)}</div></div>
          <p className="mt-3 text-[16px] leading-relaxed">내부에서는 발주·입고·재고·주문·출고·배송이 각각 다른 파일과 화면에서 관리되었습니다. 구매담당자는 판매량 엑셀을, 운영담당자는 주문 리스트를, 대표는 매출 보고서를 따로 봅니다.</p>
        </Sec>

        <Sec no="05" title="데이터가 끊기는 지점">
          <Big>고객 행동 데이터와 내부 운영 데이터가 서로를 모릅니다.</Big>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Card title="① 검색·장바구니 → 발주" tone="border-danger/30">검색이 63% 늘어도 발주는 지난달 판매량 기준. 수요가 보이는데 재고가 못 따라갑니다.</Card>
            <Card title="② 공급사 지연 → 고객 배송예정" tone="border-danger/30">입고가 4일 늦어져도 상품 상세는 '내일 도착'을 보여줍니다.</Card>
            <Card title="③ 출고 상태 → 고객 조회" tone="border-danger/30">피킹이 밀려도 고객은 모릅니다. 지연 문의 전화가 먼저 옵니다.</Card>
            <Card title="④ 구매주기 → 재제안" tone="border-danger/30">3주마다 사는 고객에게 3주째 아무 제안이 없습니다.</Card>
          </div>
        </Sec>

        <Sec no="06" title="돈이 새는 곳: 품절과 과잉재고">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5 border-l-4 border-danger"><div className="text-sm font-semibold text-danger inline-flex items-center gap-1"><TrendingDown size={15} />품절 매출손실</div><div className="text-3xl font-black mt-1">{risk}개 SKU</div><p className="text-sm text-muted mt-1">지금 예상 소진일이 공급 리드타임보다 짧은 SKU. 프리미엄 물티슈 20팩은 2.7일치 남았고 공급은 5일 걸립니다. 품절 5일 × 일 31개 ≈ 150개 판매기회 손실 (Demo).</p></div>
            <div className="card p-5 border-l-4 border-orange"><div className="text-sm font-semibold text-[#B84F1A] inline-flex items-center gap-1"><Boxes size={15} />과잉·저회전 재고자금</div><div className="text-3xl font-black mt-1">{slow.length}개 SKU</div><p className="text-sm text-muted mt-1">재고일수 75일 이상. 재고금액 약 {Math.round(slow.reduce((a, i) => a + i.stockValue, 0) / 10000).toLocaleString()}만원이 창고에 묶여 있습니다. 미니가습기 465일치, 온열매트 280일치.</p></div>
          </div>
          <p className="mt-3 text-sm text-muted">여기에 긴급발주 급송비, 할인으로 재고를 밀어낼 때의 마진 하락이 더해집니다. 실제 금액은 Baseline 측정 후 확정합니다.</p>
        </Sec>

        <Sec no="07" title="시간이 새는 곳: 공급사·주문 확인">
          <div className="grid sm:grid-cols-3 gap-3">
            <Card title="주간 재고·발주 분석">판매 엑셀 + 재고 엑셀 + 공급사 단가표를 붙여 보는 시간. 측정지점: 구매담당 주간 소요시간.</Card>
            <Card title="공급사 비교">동일 상품 2~3개 공급사의 단가·납기·최소수량을 전화·카톡으로 확인. 측정지점: 발주 1건당 비교시간.</Card>
            <Card title="주문상태 확인·전달">"내 주문 어디쯤이에요?" 전화를 받고 물류에 물어보고 다시 답하는 시간. 측정지점: CS 1건당 처리시간.</Card>
          </div>
        </Sec>

        <Sec no="08" title="매출이 새는 곳: 재구매 누락">
          <Big>생활용품은 반복구매 상품입니다. 재구매를 놓치는 것은 신규고객을 놓치는 것보다 비쌉니다.</Big>
          <div className="mt-4 card p-4 text-[15px] leading-relaxed"><b>고객 김서연</b>은 물티슈를 21일, 세제를 35일, 배변패드를 18일마다 삽니다. 주기가 왔을 때 아무 제안이 없으면 다른 곳에서 삽니다. 지금 이런 고객이 <b>42명</b> 주기 도래 상태입니다 (Demo). Repeat Basket 노출 시 지난달 전환율 31%였습니다 — 이 숫자도 실측으로 다시 확인합니다.</div>
        </Sec>

        <Sec no="09" title="NEXMART에서 AX란 무엇인가">
          <Big>AX(AI Transformation)는 AI를 넣는 것이 아니라, 나쁜 업무를 없애고 → 표준화하고 → 데이터로 기록하고 → 반복을 자동화한 뒤 → 복합판단에만 AI를 쓰는 순서입니다.</Big>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-sm">{[["ELIMINATE", "중복 확인·수기전달 제거"], ["STANDARDIZE", "상품·SKU·공급사·주문·Action 상태 표준화"], ["DIGITIZE", "고객행동·운영결과를 Event로 기록"], ["AUTOMATE", "계산·상태반영·알림·우선순위 자동화"], ["AI", "복합판단·예측·설명에만 제한적 적용"]].map(([k, v], i) => <div key={k} className={`rounded-xl p-3 ${i === 4 ? "bg-shell text-white" : "bg-mist"}`}><div className="font-black text-xs tracking-wider">{k}</div><div className={`text-xs mt-1 ${i === 4 ? "text-white/80" : "text-muted"}`}>{v}</div></div>)}</div>
          <p className="mt-3 text-sm text-muted">그래서 이 프로젝트의 AI 기능은 5개뿐이고, 그중 4개는 규칙·통계 계산입니다. 단순 합계·재고일수·정렬은 코드로 처리하며 AI라고 부르지 않습니다.</p>
        </Sec>

        <Sec no="10" title="Customer Platform이 바꾸는 것">
          <div className="grid sm:grid-cols-2 gap-3">
            <Card title={<span className="inline-flex items-center gap-1.5"><Search size={15} className="text-primary" />Smart Discovery</span>}>검색어·카테고리·가격·배송조건·재고상태로 빠르게 찾고, <b>언제 받는지</b>를 구매 전에 봅니다. 품절이면 입고예정과 예약배송을 정직하게 표시합니다.</Card>
            <Card title={<span className="inline-flex items-center gap-1.5"><Repeat size={15} className="text-primary" />Repeat Basket</span>}>최근 구매·구매주기·현재 재고를 보고 수량을 추천, 한 번에 다시 담아 주문합니다. 재고가 없으면 대체 구성을 제안합니다.</Card>
            <Card title="배송예정과 상태 투명성">Business AX에서 출고 처리하면 같은 순간 My Page 상태가 바뀝니다. 지연이 예상되면 사전 안내를 받습니다.</Card>
            <Card title="모든 행동이 수요신호가 된다">검색·조회·담기·주문·재구매는 SKU별 Demand Signal로 집계되어 발주 판단에 쓰입니다. (고객 개인정보가 아닌 집계 신호)</Card>
          </div>
        </Sec>

        <Sec no="11" title="Business AX가 바꾸는 것">
          <div className="grid sm:grid-cols-2 gap-3">
            <Card title="Before">대표는 매출 보고서, 구매는 판매 엑셀, 운영은 주문 리스트를 따로 봅니다. 발주는 경험으로, 우선처리는 전화 순서로 정해집니다.</Card>
            <Card title="After" tone="border-primary/40 bg-soft/40">한 화면에서 매출·마진 → 재고·발주 → 주문·배송 → 고객·재구매 → 오늘의 Action 순서로 봅니다. 모든 추천에 근거 2~4개가 붙고, 사람이 승인하면 발주서·주문상태·고객알림이 실제로 바뀌며 Evidence가 남습니다.</Card>
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><Link href="/ax" className="btn-outline btn-sm"><LayoutDashboard size={14} />대시보드</Link><Link href="/ax/actions" className="btn-outline btn-sm">Action Center</Link><Link href="/ax/evidence" className="btn-outline btn-sm">Evidence</Link></div>
        </Sec>

        <Sec no="12" title="Stock & Purchase Radar">
          <div className="grid sm:grid-cols-[1fr_1fr] gap-4">
            <div className="text-[16px] leading-relaxed space-y-2">
              <p>판매량만 보지 않습니다. <b>검색·조회·장바구니·주문·현재고·예약재고·입고예정·공급기간</b>을 함께 계산해 SKU마다 예상 소진일, 품절위험, 발주 우선순위, 추천 검토수량을 냅니다.</p>
              <p className="text-sm text-muted"><Term term="재고일수" desc={TERMS.daysOfStock}>재고일수</Term> = 가용재고 ÷ 평균 일판매량. <Term term="리드타임" desc={TERMS.leadTime}>리드타임</Term>보다 짧으면 긴급발주 후보입니다.</p>
            </div>
            <div className="card p-4 text-sm space-y-2">
              <div className="font-bold inline-flex items-center gap-1.5"><Radar size={15} className="text-accent" />발주 사례 — 프리미엄 물티슈 20팩</div>
              <ul className="space-y-1">{["최근 7일 판매속도 65% 증가", "가용재고 84개 → 예상 소진 2.7일", "기본 공급기간 5일", "검색 63%·장바구니 70% 증가 (대기수요)"].map((r) => <li key={r} className="flex gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{r}</li>)}</ul>
              <div className="rounded-lg bg-mist p-2.5 text-xs">대안: A공급사 단가 최저·7일 / B공급사 +3%·3일 → 긴급 상황이므로 B 추천. 주의: 긴급발주 반복 시 마진 하락. <b>구매담당자가 승인</b>.</div>
              <Link href="/ax/inventory?status=risk" className="text-primary font-semibold inline-flex items-center gap-1">Radar 열기 <ArrowRight size={14} /></Link>
            </div>
          </div>
        </Sec>

        <Sec no="13" title="Fulfillment Control Tower">
          <div className="grid sm:grid-cols-[1fr_1fr] gap-4">
            <div className="card p-4 text-sm space-y-2">
              <div className="font-bold inline-flex items-center gap-1.5"><Truck size={15} className="text-accent" />배송 사례 — C구역 마감임박 12건</div>
              <ul className="space-y-1">{["오후 3시 출고마감까지 3시간", "C구역 피킹 적체 82% (평균 40%)", "오늘 배송약속 주문 12건이 피킹 이전 단계", "지연 시 고객 사전안내 필요"].map((r) => <li key={r} className="flex gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{r}</li>)}</ul>
              <div className="rounded-lg bg-mist p-2.5 text-xs">Action: A구역 피커 2명 임시 배치 → 12건 우선 피킹 → 출고 → 고객 My Page '출고완료' 반영. 마감을 넘길 4건은 CS가 사전 안내.</div>
              <Link href="/ax/fulfillment?tab=risk" className="text-primary font-semibold inline-flex items-center gap-1">Control Tower 열기 <ArrowRight size={14} /></Link>
            </div>
            <div className="text-[16px] leading-relaxed space-y-2">
              <p><Term term="Fulfillment" desc={TERMS.fulfillment}>Fulfillment</Term>는 주문 이후 상품을 피킹·포장·출고·배송하는 전체 과정입니다. 주문마다 마감시각·배송약속·구역 적체·재고예외로 <b>지연위험 점수</b>를 계산해 무엇을 먼저 처리할지 보여줍니다.</p>
              <p className="text-sm text-muted">여기서 상태를 바꾸면 고객 화면이 함께 바뀝니다. "내 주문 어디쯤이에요?" 전화가 줄어드는 지점입니다.</p>
            </div>
          </div>
        </Sec>

        <Sec no="14" title="AI와 사람이 나누어 맡는 판단">
          <div className="table-wrap"><table className="table"><thead><tr><th>Engine</th><th>Business Question</th><th>Method</th><th>자동화 수준</th><th>오류비용</th></tr></thead><tbody>
            {[["Demand & Purchase", "어떤 SKU를 언제 얼마나 발주 검토해야 하는가", "RULE + STATISTICAL + OPTIMIZATION", "L3 준비 + 사람 승인", "MID"], ["Supplier Decision", "어떤 공급사에서 발주하는 것이 유리한가", "RULE + OPTIMIZATION", "L2~L3", "MID"], ["Fulfillment Risk", "어떤 주문이 배송약속을 못 지킬 가능성이 큰가", "RULE + STATISTICAL", "L2 추천", "MID"], ["Repeat Opportunity", "누구에게 무엇을 다시 제안해야 하는가", "RULE + STATISTICAL", "L2", "LOW~MID"], ["Executive Briefing", "대표가 오늘 무엇부터 확인해야 하는가", "Structured Rule + 선택적 LLM", "L1 Assist", "LOW"]].map((r) => <tr key={r[0]}><td className="font-semibold whitespace-nowrap">{r[0]}</td><td>{r[1]}</td><td className="text-xs">{r[2]}</td><td className="text-xs">{r[3]}</td><td className="text-xs">{r[4]}</td></tr>)}
          </tbody></table></div>
          <p className="mt-3 text-sm text-muted inline-flex items-start gap-1.5"><Sparkles size={15} className="text-secondary mt-0.5 shrink-0" />자동발주(L4)는 만들지 않습니다. 실제 LLM API 연결은 Executive Briefing의 자연어 설명 1개부터 시작하며, 지금은 <b>AI READY</b> 상태로 규칙 기반 Demo가 동작합니다.</p>
        </Sec>

        <Sec no="15" title="12개월 후 쌓이는 데이터 자산">
          <Big>검색·조회·장바구니·주문·발주·입고·배송·반품·재구매 데이터가 12개월 쌓이면, 지금은 못 하는 어떤 판단이 가능해지는가?</Big>
          <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">{["상품별·요일별·시즌별 수요패턴", "품절 가능시점 예측", "SKU별 안전재고 수준", "공급사별 실제 납기와 충족률", "상품별 실질마진 (할인·배송비 반영)", "물류단계별 지연원인", "고객별 반복구매주기", "프로모션 이후 재구매 여부", "카테고리별 교차판매", "SKU 확대·축소 판단"].map((t) => <div key={t} className="rounded-xl border border-line px-3 py-2 inline-flex items-center gap-2"><Database size={14} className="text-primary shrink-0" />{t}</div>)}</div>
          <p className="mt-3 text-sm text-muted">Next.js·Supabase 같은 기술스택은 자산이 아닙니다. 회사에 남는 것은 <b>데이터·워크플로·판단기준</b>입니다.</p>
        </Sec>

        <Sec no="16" title="실증과 단계별 확장">
          <div className="grid sm:grid-cols-3 gap-3">
            <Card title={<span className="inline-flex items-center gap-1.5"><FlaskConical size={15} className="text-primary" />1단계 · 지금 (DEMO)</span>}>고객 Primary Journey, Repeat Basket, Radar, Control Tower, Action·Evidence, 역할·Theme·모바일. 실제 결제·택배·AI API는 READY.</Card>
            <Card title="2단계 · 12주 실증 (PILOT)">Baseline 측정 → 발주·배송 Action 운영 → Repeat Basket → Cost·Revenue·Scale KPI와 Adoption을 Evidence Pack으로.</Card>
            <Card title="3단계 · 확장 (NEXT)">정기배송, B2B 대량구매, 공급사 Portal, 다창고, 고급 수요예측 — 실증 결과가 있을 때만, 현재 기능처럼 말하지 않습니다.</Card>
          </div>
          <div className="mt-4 rounded-xl bg-mist p-4 text-sm"><b>Kill / Redesign 기준 (실운영에서 설정)</b> · 핵심 사용률 지속 저조 · ROI 없음 · 데이터 생성량 부족 · 직원 업무가 오히려 늘어남 — Demo에서 기준값을 지어내지 않습니다.</div>
          <div className="mt-6 flex flex-wrap gap-2"><Link href="/ax" className="btn-primary"><LayoutDashboard size={16} />대시보드로</Link><Link href="/" className="btn-outline"><Store size={16} />Customer Platform으로</Link><Link href="/ax/presentation" className="btn-outline">Presentation Mode</Link></div>
        </Sec>
      </div>
    </div>
  );
}
