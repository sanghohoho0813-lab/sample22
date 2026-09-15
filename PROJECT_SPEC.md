# PROJECT_SPEC.md — NEXMART 종합유통 AX + Customer Platform

> Source of Truth: 미래AI랩 Unified v3.0 (2026-09-02) + NEXMART 마스터 프롬프트. 본 문서는 PASS 1 전략·제품 잠금 결과이며, 이후 모든 고도화의 기준이다.
> Delivery Stage: **DEMO** · First Build (One-Shot 75 Gate 목표 70~80%)

---

## 0. HYBRID STRATEGY LOCK (PASS 1-A)

| 항목 | 잠금 내용 |
|---|---|
| **AX VERDICT** | **FULL / GO** — 다수 SKU 반복판매, 주문·재고·입고·출고·배송 Event 상시 발생, 공급사별 조건 상이, 품절·과잉 동시 발생, 고객 행동 데이터가 수요판단에 활용 가능 |
| **CAPITAL INDEPENDENCE TEST** | **YES** — 정책자금·보증·투자 없이도 품절 매출손실 감소, 과잉재고 감소, 긴급발주·급송비 감소, 공급사 비교시간 감소, 배송지연 감소, 재구매 증가, 동일 인력 처리량 증가라는 경제적 이유가 있음 |
| **PRIMARY CONSTRAINT** | 고객의 검색·조회·장바구니·주문 데이터와 상품별 재고·공급사·발주·입고·배송 데이터가 연결되지 않아, 운영자와 대표가 무엇을 언제 얼마나 발주하고 어떤 주문을 먼저 처리할지 늦게 판단하면서 품절 매출손실·과잉재고·긴급발주·배송지연·마진손실이 동시에 발생하는 구조 |
| **CORE VALUE 1 (Cost)** | 재고·발주 분석 및 공급사 비교 시간 감소, 긴급발주·배송지연·반복보고 감소 |
| **CORE VALUE 2 (Revenue)** | 품절 가능 상품과 재구매 시점 고객을 먼저 발견, 배송상태 투명 제공 |
| **CORE VALUE 3 (Scale)** | SKU·주문이 늘어도 동일 인력으로 관리 가능한 표준 운영구조 |
| **CUSTOMER PRIMARY CONVERSION** | 검색·탐색 → 배송예정·구성 확인 → 장바구니 → 주문정보 → DEMO 주문 완료 |
| **SECONDARY GOAL** | ① Repeat Basket으로 한 번에 재주문 ② My Page에서 배송상태 직접 확인 |
| **PROCESS REDESIGN** | ELIMINATE(중복 확인·수기전달) → STANDARDIZE(상품·SKU·공급사·주문·배송·Action 상태) → DIGITIZE(고객행동·운영결과 Event) → AUTOMATE(계산·상태반영·알림·우선순위) → AI(복합판단·예측·설명만) |
| **CUSTOMER JOB-TO-BE-DONE** | 필요한 생활상품을 빠르게 찾고, 언제 받는지 알고, 자주 사는 것은 한 번에 다시 사기 |
| **SHARED DATA ASSET** | 단일 Demo Repository(Zustand + localStorage). Customer/AX 동일 Store. Entity 34종 |
| **CUSTOMER EVENT → AX MAP** | 검색/조회/담기 → DemandSignal(SKU별 7d 카운터) · 주문 → Order + Inventory.reserved + dailySales + Evidence · 재구매 → RepeatPrediction 갱신 · 반품 → ReturnRequest |
| **AI METHOD MATRIX** | 5 Engine (§6) — 4개 LIVE(규칙·통계), 1개 READY(LLM) · 자동발주 L4 미구현 |
| **PROOF PLAN** | Baseline 측정지점 11개 입력 화면(AX Evidence > 실증 준비) · AX Owner · Pilot 전환 게이트 · 12주 실증 계획 · Evidence Log 10 Type · Evidence Pack Markdown 생성 |
| **PORTAL / PLATFORM READINESS** | **MID** — 고객 커머스와 내부 운영 연결이 우선. Industry Platform·대형 Marketplace 과장 금지 |
| **FUTURE EXPANSION 3~6** | 정기배송 · B2B 대량구매 · 공급사 Portal · 다창고 · 고급 수요예측 · (파트너 입점) — 모두 NEXT 표시 |
| **MOAT CANDIDATE** | Proprietary Data(SKU 수요신호·공급사 실납기·고객 구매주기) · Workflow(KPI→Action→Evidence) · Decision Logic(4 엔진 가중치) |
| **RISK** | Demo/Live 혼동 · Baseline 없는 개선율 · 규칙을 AI로 포장 — 모두 UI에서 명시 차단 |
| **NOT BUILDING** | 실제 PG · 택배 API · 외부 Marketplace · 자동발주 L4 · 공급사 정산 · 다창고 최적화 · 입점센터 · 광고입찰 · WMS · 자체 ML 학습 · Native App · 실제 개인정보 · 타사 UI 복제 · 정책자금용 가짜 성과 |

## 1. Project Signature (4)

| # | Signature | 구현 위치 | 화면만 보고 인식 가능 |
|---|---|---|---|
| 1 | **Smart Discovery** | `/search`, `/category/[slug]` — 통합검색·자동완성·최근검색·필터(가격/브랜드/평점/할인/배송/재고)·정렬·상태(Initial/Loading/Result/Empty/Error/Filter Applied) | ✅ |
| 2 | **Repeat Basket** | `/my/repeat` + 홈 "다시 구매할 때" — 마지막 구매·평균주기·필요시점·추천수량·대체구성·한 번에 다시 주문 | ✅ |
| 3 | **Stock & Purchase Radar** | `/ax/inventory` — 상태 10종, 예상 소진, 수요 14일 Sparkline, 검색·장바구니 추세, 입고예정, 리드타임, 추천수량, 우선순위 | ✅ |
| 4 | **Fulfillment Control Tower** | `/ax/fulfillment` — 구역 적체 Meter, 상태 보드 6열, 지연위험 점수·원인, 우선처리, 단계 변경 → 고객 반영 | ✅ |

## 2. KPI Contract

| 구분 | KPI | 계산 (kpi.ts) | Baseline |
|---|---|---|---|
| Cost | 긴급발주 비중, 재고·발주 분석시간, 공급사 비교시간, 주문상태 확인시간 | 측정지점만 정의 | UNKNOWN / REQUIRED |
| Revenue | 구매 전환율, 장바구니→주문, 품절률, 재구매율, Repeat Basket 전환, 프로모션 실질마진 | `orderers ÷ detailVisitors`, `stockout SKU ÷ active SKU`, `revenue − cogs − discount − shipping` | Demo Simulation |
| Scale | 구매담당 1인당 SKU, 운영직원 1인당 주문, Portal Self-Service 비율, AX Action 처리비율 | `done ÷ created` | 측정지점 정의 |

`BASELINE STATUS: UNKNOWN / REQUIRED · TARGET: DO NOT INVENT · CURRENT NUMBERS: DEMO SIMULATION ONLY`

## 3. Customer Platform IA

- Desktop Nav: 홈 · 카테고리 · 빠른배송 · 특가 · 다시 구매 · 주문조회 · (검색·장바구니·마이)
- Mobile Bottom Nav: 홈 · 카테고리 · 검색 · 장바구니 · 마이
- 카테고리 8: 식품·생활·주방·리빙·디지털·반려·유아·건강
- Routes: `/`, `/category`, `/category/[slug]`, `/search`, `/fast`, `/deals`, `/product/[id]`, `/cart`, `/checkout`, `/order/complete/[id]`, `/my`, `/my/orders/[id]`, `/my/repeat`, `/track`
- 홈 섹션: Header → 통합검색(Hero 내) → Category Quick Action → Hero → 빠른배송 → 다시 구매할 때 → 오늘의 추천 → 지금 많이 찾는 → 함께 사면 좋은 → 이번 주 특가 → Brand Story → 배송·교환 Trust → Footer
- 관리자 진입: Desktop Footer "관리자 Demo — Business AX" 링크만 (iframe 내에서는 숨김)

## 4. Business AX IA (Sidebar 14)

01 경영 대시보드 · 02 Growth & Action Center · 03 매출·마진 · 04 상품·SKU · 05 재고·발주 · 06 공급사·구매 · 07 주문·Fulfillment · 08 고객·재구매 · 09 프로모션 · 10 반품·VOC · 11 AX Evidence · 12 기획의도 · 13 Presentation Mode · 14 설정

역할별 노출: 대표(전체) · 구매담당(01·02·04·05·06·09·11~14) · 운영담당(01·02·05·07·10·11~14) · CS(01·02·07·08·10·11~14). 허용되지 않은 라우트는 `/ax`로 리다이렉트. 원가·마진·연락처·주소는 역할별 마스킹.

## 5. Shared Data Model (types.ts)

Category · Brand · Product · SKU · Supplier · SupplierProduct · Warehouse · Inventory · InventoryMovement · PurchaseOrder · Customer · DemandSignal · DailySalesPoint · CategorySales · Order · OrderItem · OrderHistoryEntry · ReturnRequest · Promotion · AXAction · EvidenceLog · Notification · CartItem · aggregates

핵심 Record 공통: `id · status · createdAt · updatedAt · source(demo|live)`. Provenance는 Evidence.dataSource / mode(Demo Evidence · Simulation · 실증 준비).

## 6. AI / Logic Method Matrix (engines.ts)

| Engine | Question | Method | Level | Error Cost | 상태 |
|---|---|---|---|---|---|
| Demand & Purchase | 어떤 SKU를 언제 얼마나 발주 검토 | RULE + STATISTICAL + OPTIMIZATION | L3 (사람 승인) | MID | LIVE |
| Supplier Decision | 어떤 공급사가 유리한가 | RULE + OPTIMIZATION (상황별 가중: 긴급=납기, 과잉=MOQ·단가) | L2/L3 | MID | LIVE |
| Fulfillment Risk | 어떤 주문이 약속을 못 지키나 | RULE + STATISTICAL (마감·약속·적체·재고예외) | L2 | MID | LIVE |
| Repeat Opportunity | 누구에게 무엇을 다시 제안 | RULE + STATISTICAL (구매주기 평균) | L2 | LOW~MID | LIVE |
| Executive Briefing | 대표가 오늘 무엇부터 | Structured Rule (+LLM) | L1 | LOW | READY (AI READY 마커) |

Explainability: 모든 Action = 추천 → 사용데이터 → 근거 2~4 → 주의 → 대안(공급사 비교) → 승인주체 → 다음 Action.

## 7. Closed Data Loops (4개 설계, 4개 Demo 작동)

| Loop | 경로 | 검증 |
|---|---|---|
| 1 수요증가→발주 | DemandSignal → Radar 품절위험 → **Action 생성(임의 SKU)** 또는 act-001 → 공급사 비교 → 승인 → PO 생성·입고예정 → 상품 상세 배송예정 → 입고 처리 → Evidence | ✅ QA 통과 (R2: 시드 없이도 작동) |
| 2 주문→출고·배송 | Customer DEMO 주문 → Order·reserved·dailySales → 신규주문 Queue → 단계 변경 → 재고 차감 → 고객 알림·My Page 상태 → Evidence | ✅ QA 통과 |
| 3 공급사 지연→대체판단 | PO-2609-018 지연 → RISK Evidence → act-002 대체공급 → 승인 → 대체 PO → 입고예정 반영 | ✅ (Action 승인 경로 동일) |
| 4 구매주기→재구매 | 구매이력 → RepeatPrediction → 홈/Repeat Basket 노출 → 한 번에 다시 주문 → 주기 갱신 → CUSTOMER Evidence | ✅ QA 통과 |

## 8. Roles

대표 정유통(owner) · 구매담당 김구매(buyer) · 운영담당 박운영(ops) · CS담당 이CS(cs) · 고객 김서연(c-001, Customer 로그인 고객). Demo Role Switcher는 AX 헤더. Customer에는 노출하지 않음.

## 9. Visual Reference Map

```
Reference Status: PENDING (이미지 자산 미제공 — 추후 적용)
Overall Mood: 밝고 빠른 한국형 종합유통 커머스 / 신뢰감 있는 배송·구매 / AX는 KPI·위험·Action 중심
Layout: Customer = Search + Product 중심 (max 1280) / AX = Sidebar 272 + Dashboard + Drawer Detail
Typography: Pretendard Variable · Hero 34~52 · Body 16~17 · AX 큰 숫자 · Font Large 옵션(+12%)
Color: Deep Navy #10243E · Commerce Teal #0FAF9A · Signal Orange #F47A3C · Pure White · Soft Gray #F3F6F8 (Customer 고정) / AX = Canonical 9 Theme Token
Card Geometry: Customer 14~20px · AX 12~18px · Pure White Raised Surface
Density: Customer 상품 탐색 밀도 / AX 판단 데이터 우선
Must Preserve: 큰 통합검색 · 빠른배송·다시 구매 · Today Brief · Radar · Supplier Decision · Control Tower · PC/모바일 재배치
Adapt: Route · Component · 반응형 · 상태변화 · Demo Data · Role · Theme · Data Bridge
Do Not Copy: 타사 로고·문구·아이콘·색상조합
Asset Slots: public/assets/README.md (hero-01, photo-01/02, flow-01, product/<id>, category/<slug>) — 파일 추가 시 코드 수정 없이 반영
```

## 10. Demo Data (seed.ts, 시드 고정 20260908)

카테고리 8 · 브랜드 12 · 상품 66 · SKU 98 · 공급사 11 · 물류구역 5 · 고객 상세 24 + 집계 612 · 90일 일매출 · 상세 주문 ~80 + 집계 ~1,400/90d · 반품 93 · 프로모션 7 · Action 17 · Evidence 12 (+ 실행 시 자동 누적)

시나리오 A(물티슈 20팩 수요급증) · B(주방세제 리필 공급 지연) · C(미니가습기 저회전·마진주의) · D(C구역 마감임박 12건) · E(김서연 재구매 주기) 모두 시드에 내장.

## 11. Current / Ready / Next

- **CURRENT**: 상품검색·카테고리·필터·상세·구성선택·배송예정·장바구니·DEMO 주문·주문조회·Repeat Basket·Dashboard·상품·SKU·재고·발주·공급사 비교·주문·Fulfillment·고객·재구매·프로모션·반품·Action Lifecycle·Evidence·Role·Theme 9·Device Preview·Surface Switch·Tutorial·Presentation·Why AX·Demo Reset
- **READY**: Supabase · Auth/RLS · AI API · 결제 · 택배 API · 알림 · 외부 채널 · CSV Import · Analytics
- **NEXT**: 정기배송 · B2B · 공급사 Portal · 파트너 입점 · 다창고 · 고급 수요예측 · 자동발주 · Native App · 광고

## 12. CORE / CONDITIONAL / PLUS

- CORE (완료): Shared Foundation · Customer Primary+Repeat Journey · Business 핵심 Flow · Data Bridge · Demo Repository · KPI→Detail→Insight→Action→Result→Evidence · Role · Theme · Device · Surface · Why AX · Presentation · Responsive · Interaction Integrity · Data Freshness · Demo Reset
- CONDITIONAL (조건 미충족 → 미구현): 실제 이미지 자산 · Supabase · Auth/RLS · AI API 1개 · CSV Import · 외부 API
- PLUS (미착수): 추가 카테고리 · 추가 공급사 분석 · 추가 세그먼트 · 프로모션 고도화 · Export · Partner Preview · 고급 Motion

## 13. Acceptance Test (§58 Journey)

Fresh Load → DEMO 확인 → Home → 검색 → 카테고리 → 필터 → Detail → 구성 → 배송예정 → 장바구니 → Checkout → 완료 → AX 반영 → Today Brief → Radar → SKU Detail → 근거 → 공급사 비교 → Action 승인 → 입고예정 → Fulfillment → 단계변경 → 고객 상태 반영 → Repeat Basket → 재주문 → Evidence → Why AX → Presentation → Role → Theme 9 → Preview → Settings → Demo Reset → 초기상태. **QA_REPORT.md 참조 — 전 구간 자동화 통과.**
