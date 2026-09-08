# PROJECT_STATE.md — NEXMART 현재 공사 진행상황

> 갱신: 2026-09-08 · First Build 완료 (PASS 0 → 1 → 2 → QA → Red Team 1회)

## STRATEGIC GATES

| Gate | 상태 |
|---|---|
| AX VERDICT | FULL / GO ✅ |
| Capital Independence | YES ✅ |
| PRIMARY CONSTRAINT STATUS | 잠금 ✅ — 핵심 기능 4 Signature + Action 7종 모두 Constraint 직결 |
| MONEY KPI / BASELINE | KPI 3종 정의 ✅ · Baseline UNKNOWN/REQUIRED (실측 전, 숫자 미발명) |
| DATA FOUNDATION | SSOT = Shared Demo Repository ✅ · Adapter 전환점 분리 ✅ |
| AI / LOGIC STATUS | 4 엔진 LIVE(규칙·통계) · 1 READY(LLM) · L4 없음 ✅ |
| PROOF STATUS | Evidence Log 작동 · Evidence Pack 구조 · 12주 계획 — **실증 준비** 단계 |
| ADOPTION READINESS | 역할별 이익 정의(대표/구매/운영/CS) · AX Owner 필드는 Evidence BASELINE에 표기 (전용 필드 UI는 미구현) |
| RISK / GOVERNANCE | Demo/Live 구분 배지 · READY/NEXT 분리 · 근거 없는 추천 0 ✅ |
| PLATFORM READINESS | MID (과장 없음) ✅ |
| EVIDENCE STATUS | 초기 12건 + 실행 시 자동 누적 ✅ |
| RED TEAM FINDINGS | 1회 실행 — P0 3건 수정(Checkout 무한루프, Hydration mismatch, Why AX overflow), P1 2건 수정(select 너비·검색 아이콘 겹침, 음수 rect) — QA_REPORT 참조 |

## SYSTEM CORE

- [x] App Shell (Customer / AX) · [x] Theme 9 · [x] Role Switch + Route Guard · [x] Tutorial (7 step spotlight) · [x] Device Preview (360/390/430 iframe, Esc 탈출) · [x] Surface Switcher · [x] Modal/Drawer/Sheet lifecycle (scroll lock counter, focus restore, Esc, popstate) · [x] Toast · [x] 실시간 시각 · [x] Data Freshness · [x] Demo Reset · [x] 404 · [x] 용어설명(Term) · [x] AI Ready 마커

## CUSTOMER PLATFORM

- [x] Home 12 섹션 · [x] 통합검색(자동완성·최근·추천) · [x] 카테고리 8 · [x] 필터/정렬/상태 6종 · [x] Product Detail (구성 선택·배송예정·재고·Sticky CTA·탭 3) · [x] Cart · [x] DEMO Checkout · [x] 주문완료 → AX 링크 · [x] My Page 5탭 · [x] 주문상세 (진행 5단계·취소·반품) · [x] Repeat Basket · [x] 주문조회 · [x] 빠른배송/특가 · [x] SEO meta/OG · [x] 모바일 Bottom Nav

## BUSINESS AX

- [x] 01 대시보드 (Today Brief 6 + KPI 위계 5 + 차트 + Drill-down) · [x] 02 Action Center (탭·긴급도·유형·담당 필터, Lifecycle 3종) · [x] 03 매출·마진 (일/주/월, 카테고리, 고매출·저마진, 프로모션 전후) · [x] 04 상품·SKU (펼침 SKU 행) · [x] 05 재고·발주 Radar + 발주서 입고처리 · [x] 06 공급사 (비교 카드·목록·Detail Drawer 3탭) · [x] 07 Fulfillment (구역·보드·위험·목록·Order Drawer) · [x] 08 고객·재구매 (세그먼트 7·예측·Customer Drawer) · [x] 09 프로모션 (실질마진·4질문) · [x] 10 반품·VOC · [x] 11 Evidence (10 Type·기간·검색·Pack·12주) · [x] 12 Why AX 16 섹션 · [x] 13 Presentation 18 step (iframe Guided) · [x] 14 설정 7탭

## DATA BRIDGE

- [x] 주문 → reserved/dailySales/DemandSignal/Evidence · [x] 검색·조회·담기 → DemandSignal 카운터 · [x] Action 승인 → PO/inboundExpected/orders/warehouses/promotions · [x] 출고 → onHand 차감 · 고객 알림 · My Page · [x] 입고 처리 → onHand 증가 · 상품 상세 갱신 · [x] Repeat 주문 → 주기 갱신 · [x] Demo Reset 양쪽 동시 · [x] iframe/탭 간 storage 이벤트 동기화

## AI / LOGIC

- [x] buildSkuInsights · compareSuppliers · assessOrderRisks · repeatItemsForCustomer · buildBriefing · buildSegments
- [ ] LLM API 연결 (READY — `ui.aiConnected` 플래그 예약)

## ACTION / EVIDENCE

- [x] Action 17 (시나리오 A~E + 이력) · 7 Type · 8 Stage · [x] 승인 시 실제 데이터 변경 + Evidence · [x] 보류/무시 사유 기록 · [x] Evidence 10 Type · 필터 · Action 역링크

## RESPONSIVE

- [x] 360/390/430/768/1024/1280/1440/1920 자동 검증 · 가로 overflow 0 · [x] Sticky CTA ↔ Bottom Nav 비중첩 · [x] Table → overflow-x wrap · [x] Board → 1/3/6열 · [x] Drawer → 모바일 Bottom Sheet

## QA

- QA_REPORT.md 참조. 자동화 스크립트: Playwright (scratchpad qa.mjs — 저장소 외부)

## 2026-09-08 추가 (모바일 시연 피드백 반영)

- [x] **모바일 AX 진입 경로**: 헤더 `DEMO` 배지를 Demo 컨트롤 버튼으로 전환 → Bottom Sheet에서 Business AX / Presentation Mode / 기획의도 이동. 데스크톱 상단 메뉴 우측과 모바일 Footer에도 동일 진입점 추가 (기존에는 `hidden md:block` Footer에만 있어 모바일에서 접근 불가)
- [x] **실시간 날짜·시각 (Customer)**: 전 페이지 상단에 Delivery Strip — 오늘 날짜·시각(30초 갱신) + 빠른배송 15:00 출고마감 카운트다운 + 도착예정일. 마감 3시간 이내는 오렌지 강조, 마감 후에는 익일 도착 안내로 전환
- [x] **Hero 실시간 카드**: 사진 자산 도착 전에도 비어 보이지 않도록 Hero에 "오늘 마감까지 N시간 M분 · 도착예정" 카드 오버레이
- [x] **모바일 Footer 신설**: 주문·배송조회 / 다시 구매 / 빠른배송 / 취소·반품 바로가기 + 관리자 Demo 버튼 + 회사 고지 (Bottom Nav와 비중첩 검증)
- [x] **주문 날짜 문구 보정**: 배송완료·취소·반품 건에서 " · " 뒤가 비던 문제 → `deliveryNote()`로 완료일/취소일 표시

## USER ACTION QUEUE

1. **사진 자산**: `public/assets/README.md` 규칙대로 hero-01 / photo-01 / photo-02 / flow-01 / product/<id> / category/<slug> jpg 추가 (Google Drive 원본 활용 예정). 추가 즉시 placeholder → 실사진 자동 전환.
2. **Front Design Reference** 12종 제공 시 PROJECT_SPEC §9 Visual Reference Map을 PROVIDED로 갱신하고 Mood/Hierarchy 재해석.
3. **Supabase 프로젝트** (선택): `.env.example` 참고 — 연결 시 store → adapter 교체.
4. **AI API 키** (선택): Executive Briefing 자연어 설명 1개부터 연결.
5. **배포**: Vercel `npm run build` 통과 확인됨. 환경변수 없음.

## KNOWN ISSUES

- Pretendard 웹폰트는 CDN(jsdelivr) 의존 — 오프라인/차단 환경에서는 시스템 폰트로 폴백 (기능 영향 없음).
- 상품 이미지는 카테고리 톤 placeholder — 사진 적용 전까지 "사진 준비 중" 라벨 표시.
- Presentation Mode는 iframe 기반이라 iframe 내부 Preview 버튼은 숨김 처리 (이중 iframe 방지).
- `next lint` 설정 파일 없음 (typecheck + build로 대체).

## NEXT PRIORITY

1. 사진 자산 적용 → Visual Density 60~80% (Customer) / 30~50% (AX) 확인
2. Front Reference 도착 후 Hero/Card/Nav 언어 재해석 (Project Signature 유지)
3. Red Team P2 → RECOMMENDATIONS.md 항목 중 고객 가치 큰 것부터 (선택)
4. Pilot 전환 시: Baseline 측정 UI (AX Owner 필드 · 측정지점 입력) → Supabase Adapter
