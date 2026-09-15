# PROJECT_STATE.md — NEXMART 현재 공사 진행상황

> 갱신: 2026-09-15 · First Build + R2 + **R3 (안정성·가독성·모션 전면 업데이트)**

## STRATEGIC GATES

| Gate | 상태 |
|---|---|
| AX VERDICT | FULL / GO ✅ |
| Capital Independence | YES ✅ |
| PRIMARY CONSTRAINT STATUS | 잠금 ✅ — 핵심 기능 4 Signature + Action 7종 모두 Constraint 직결 |
| MONEY KPI / BASELINE | KPI 3종 정의 ✅ · Baseline UNKNOWN/REQUIRED (실측 전, 숫자 미발명) |
| DATA FOUNDATION | SSOT = Shared Demo Repository ✅ · Adapter 전환점 분리 ✅ |
| AI / LOGIC STATUS | 4 엔진 LIVE(규칙·통계) · 1 READY(LLM) · L4 없음 ✅ |
| PROOF STATUS | Evidence Log 작동 · **Evidence Pack Markdown 생성 가능** · Baseline 입력 화면 · 12주 계획 — 실증 준비 단계 (실측값은 회사 입력 대기) |
| ADOPTION READINESS | 역할별 이익 정의 · **AX Owner 지정 UI** · Pilot 전환 체크리스트 5항목 (Owner·Baseline 자동판정) ✅ |
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
- [x] **Insight → Action 생성**: Radar 행/SKU Drawer에서 발주·보류 검토 Action 생성(근거·추천수량·공급사 대안 자동 포함), Control Tower 지연위험에서 우선처리 Action 생성 — 시드 Action 없이도 Closed Loop 완성
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

## 2026-09-15 고도화 R2 (§23 "다음 단계" 해석 순서로 진단 → 갭 3개만 구현)

- [x] **Insight → Action 생성** (Closed Loop 갭): `createActionFromSku` / `createPriorityAction` — Radar 표 마지막 열 "발주 검토 Action" 버튼, SKU Drawer 버튼, Fulfillment 지연위험 탭 "Action 생성". 진행 중 Action이 있으면 중복 생성 차단. 생성 시 RISK/EXCEPTION Evidence 자동 기록
- [x] **실증 준비 · Pilot Readiness** (PROOF·ADOPTION 게이트): AX Evidence > "실증 준비" 탭 — AX Owner 지정(역할 선택 또는 직접 입력) · Baseline 측정지점 11개(Cost 4 · Revenue 4 · Scale 3) 값·측정일 입력 · 전환 체크리스트 5 · **PILOT 단계 전환**(Owner + 그룹별 Baseline 1개 이상일 때만 활성, BASELINE Evidence 기록) · DEMO 되돌리기. 대표 권한만 편집
- [x] **Evidence Pack 생성**: `lib/evidencePack.ts` — Baseline 표 · Action→결과 표 · KPI Delta · Timeline · Adoption · Provenance를 Markdown으로 내려받기/복사. Demo 수치는 "Simulation" 명시
- [x] 저장소 호환: `persist.merge`로 이전 localStorage 형태(pilot 없음)도 안전 로드
- [x] QA: 신규 흐름 자동화(Action 생성→승인→입고예정 반영 / 우선처리 Action→실행중 / Owner+Baseline 3→PILOT→헤더 배지 / Pack 다운로드 내용 검증 / 구형 상태 재로드 / Reset→DEMO) + 전체 회귀 오류 0 · overflow 0
- [ ] 사진 자산: Drive 폴더 "샘플 22. 유통 플랫폼"이 비어 있음 — 파일 업로드 후 다음 라운드

## 2026-09-15 R3 — 안정성 · 사이드바 그룹핑 · 글자 크기 · 모션 (사용자 피드백)

**"메뉴 이것저것 누르다 다운" 원인 조사**
- 헤드리스 재현(튜토리얼 열린 채 28회 연속 내비, Presentation iframe 열고 역할 전환): 프리즈 미재현, heap 14MB. 코드 상 취약점 3곳을 확인해 모두 방어:
  1. **Tutorial 스크롤 피드백 루프** — 스크롤 이벤트마다 `scrollIntoView(smooth)`를 다시 호출해 스크롤이 스크롤을 부르는 구조 + 이벤트마다 setState → 스크롤 가능한 환경(모바일 등)에서 렌더 폭주 가능. 스크롤은 단계 전환 시 1회, 리스너는 rAF로 좌표만 갱신
  2. **탭/iframe 간 localStorage 재수화 왕복** — 다른 창 storage 이벤트 → rehydrate → 재기록 → 상대 창 이벤트 … 같은 값이면 무시 + 150ms 디바운스, localStorage 예외(용량·Private 모드)는 메모리 폴백
  3. **에러 경계 부재** — 예외 시 흰 화면. `app/error.tsx`·`global-error.tsx` 추가: 다시 시도 / Demo 데이터 초기화 후 홈 / AX 이동
  4. 부수: DevicePreview 이펙트가 매 렌더 재등록되던 문제(onClose ref), 모바일 Presentation은 iframe 대신 단계 화면으로 직접 이동(앱 안의 앱 메모리 제거), 사진 슬롯 404 폭주 제거(`scripts/gen-assets.mjs` 매니페스트 — 있는 파일만 요청)
- [x] **사이드바 그룹핑**: 경영·판단(대시보드·Action Center·매출마진, 블루) / 상품·재고·공급(앰버) / 주문·고객·운영(틸) / 실증·스토리(바이올렛) / 시스템(슬레이트). 그룹 = 같은 색 계열, 항목 = 톤만 다름. 활성 항목 좌측 컬러 바
- [x] **글자 크기 전면 상향** (Executive Readability First): Tailwind 스케일 재정의 xs 13 · sm 15 · base 17 · lg 19 · xl 22 · 2xl 26 · 3xl 32, 하드코딩 px 22개 파일 +2px, 본문 17px, 사이드바 16px·288px, 아이콘 36px. "크게" 옵션은 root font-size에 적용되어 전체 UI가 함께 커짐. 한국어 어절 단위 줄바꿈(keep-all)
- [x] **모션 시스템** (MD 규칙: 140~180ms ease-out 기본, Bounce·Pulse·Neon·큰 Scale 금지): 페이지 진입 rise-in, KPI·카드·Brief 순차 등장(stagger), KPI 숫자 카운트업(650ms 감속), Drawer 우측 슬라이드·Sheet 상향 슬라이드, 차트 라인 draw-in·막대 grow·Meter grow, 카드 hover 리프트, 상품 이미지 소폭 zoom, 사이드바 hover 이동·아이콘 scale, `prefers-reduced-motion` 존중
- [x] QA: 21 라우트 × 8 폭 overflow 0(초기 4페이지 overflow → grid `min-w-0` 전역 규칙·overflow-wrap로 해결) · 오류 0 · 전체 Journey 회귀 통과 · 프리즈 재현 스크립트 응답 2ms

## USER ACTION QUEUE

1. **사진 자산** (Drive 폴더 현재 비어 있음): `public/assets/README.md` 규칙대로 hero-01 / photo-01 / photo-02 / flow-01 / product/<id> / category/<slug> jpg 추가 (Google Drive 원본 활용 예정). 추가 즉시 placeholder → 실사진 자동 전환.
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

1. 사진 자산 적용 (Drive 업로드 대기) → Visual Density 60~80% (Customer) / 30~50% (AX)
2. **실제 유통사 대표 1명에게 Presentation Mode 시연** → "돈 낼 만한가" 피드백 (기능 추가보다 우선)
3. 피드백 있을 때만: CSV Import 마법사(상품·재고·주문) → Supabase Adapter — Pilot 진입의 실데이터 경로
4. Front Reference 도착 후 Hero/Card/Nav 재해석
