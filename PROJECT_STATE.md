# PROJECT_STATE.md — NEXMART 현재 공사 진행상황

> 갱신: 2026-10-06 · First Build ~ R7 + **R8 (개발 완성도: 품질 게이트·테스트·접근성)**

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

## 2026-09-18 R4 — 미래AI랩 공통 CTA 브릿지 (전 샘플 공용)

- [x] `src/lib/brand.ts` 신규: `MIRAE_LINKS`(상담/다른 샘플/홈) · `BRIDGE_COPY`(배지·헤드라인·소개·메인 CTA·서브·안내) **단일 Source of Truth**
- [x] `src/components/shared/SampleBridgeCTA.tsx` 신규: ① 미래AI랩 소개 ② 메인 CTA "**우리 회사도 만들어보기**" ③ 다른 샘플·홈페이지 이동. `surface="customer" | "ax"`로 고객 고정 팔레트 / AX Theme Token 자동 전환
- [x] `SidebarBridgeCTA`(같은 파일): AX 사이드바 좌측 하단 초소형 3버튼 버전
- [x] 배치: `CustomerShell`·`AxShell`의 `</main>` 직후 1회 → **25 라우트 전부 상속**. Checkout(주문 진행)만 제외
- [x] 모션(globals.css): 4~6s 주기 라이트 스윕(6s, 1.4s 지연) · hover 리프트 2px + 글로우 · 배지 점 3.6s 페이드. `prefers-reduced-motion`에서 전부 정지. 점멸·네온·광고배너 톤 없음
- [x] 접근성: `<section aria-labelledby>` · 링크는 `<a>` · 터치 타깃 58px(메인) / 48px(서브) · focus ring 유지
- [x] QA: 25 라우트 노출 검증(Checkout 제외 확인) · 390px 모바일 overflow 0 · Theme 07에서 재착색 확인 · 콘솔 오류 0 · tsc/build 통과
- [ ] (의도적 보류) 모바일 스티키 미니 CTA — 사용자가 "선택" 항목으로 지정, 하단 섹션 우선. 하단 내비와 중첩 위험도 있어 요청 시 추가

## 2026-09-29 R5 — UI/UX 안정화 (SAMPLE UI/UX STABILIZATION MASTER PROMPT v1.0)

**원칙: 기능 삭제 0 · URL 변경 0 · 저장 로직/계산식 변경 0 — "노출 구조"만 정리**

- [x] **AX 메뉴 IA 재분류**: 14개 평면 → 상위 7개 + 샘플 안내(2). 경영 대시보드 · 실행 센터 · 상품·재고(상품·SKU/재고·발주/공급사·구매) · 주문·배송(주문·출고/반품·문의) · 고객·마케팅(고객·재구매/프로모션) · 경영분석(매출·마진/AX 성과 기록) · 설정 / 샘플 안내: 기획 의도 · 시연 모드. 현재 위치가 속한 그룹 자동 펼침, 펼침 상태 기억
- [x] **햄버거 왼쪽 통일 + 공통 Drawer** (`components/shared/MobileDrawer.tsx`): 왼쪽에서 열림 · 86vw/최대 380px · dim · 메뉴 영역만 독립 스크롤 · 배경 스크롤 잠금 · Esc/뒤로가기/배경 탭 닫힘. AX·고객 플랫폼 동일 컴포넌트
- [x] **고객 플랫폼에 햄버거 신설**: 쇼핑하기(홈·카테고리·빠른배송·특가) / 내 쇼핑(다시 구매·주문·배송조회·장바구니·마이페이지) + 배송·교환 안내. 하단 고정 "AX 운영화면 보기 →"(시연 전용)
- [x] **전환 명칭 통일**: AX → "고객 플랫폼 보기"(DEMO 도구줄 + 드로어 하단 전폭 CTA + 푸터), 고객 → "AX 운영화면 보기"(드로어 하단 + 데스크톱 메뉴줄 + 푸터 + 시연 안내 시트)
- [x] **AX 헤더 2층 분리**: ① DEMO 도구줄(시각 · 테마 · 스마트폰 미리보기 · 고객 플랫폼 보기) ② 메인 헤더(메뉴 · 제목 · 역할 · 알림 · 사용 안내). 부제는 스크롤되는 본문으로 이동
- [x] **한글 UI 통일**: 약 320곳. 표기 사전 `lib/labels.ts`. 상태 표기 통일(시연 · 실증 · 연결 준비 · 예정 · 작동 중). 성과 보고서(.md) 문서도 한글화
- [x] **세로 글자 깨짐 근본 수정**: 전역 `overflow-wrap: anywhere` → `break-word`, 패널 헤더 줄바꿈 구조, 숫자 줄바꿈 금지
- [x] **타이포 정리**: 필터 칩 13→15px, 사이드바 CTA 11/12→13/14px, 시간 단위 "h" → "시간", KPI 보조문구 2줄 허용
- [x] **모바일 hover 잔상 제거**: Tailwind `hoverOnlyWhenSupported`
- [x] 사진 자리표시 라벨에서 내부 슬롯 키(hero-01 등) 노출 제거 — `data-asset-slot` 속성으로만 유지
- [x] QA: 아래 QA_REPORT R5 참고

## 2026-10-06 R6 — UI/UX 고도화 + 기능 안정화 (자율 진단)

진단 결과 가장 큰 문제는 "모바일에서 길고, 핵심 버튼이 묻히고, 표가 안 보인다" — 정보량 추가 없이 구조만 정리
- [x] 고객 홈 모바일 길이 9,086px → 4,477px: 상품 묶음 가로 스와이프(4개 섹션), 중복 마감 카운트다운·'오늘의 추천'·'일하는 방식' 섹션 제거, 사진 없는 히어로 이미지 모바일 숨김, 신뢰 안내 2×2 압축, "시연(시연)" 오타 문구 제거
- [x] 상품 카드: 배송 문구 한 줄("내일 도착"), 구성 표기 단순화, 담기 버튼 40px
- [x] 상품 상세: 하단 탭바 숨김 → 주문 바 하나만, 빈 썸네일 4개·빈 상세사진·개발용 문구("자산 슬롯…") 제거, 관련상품 스와이프
- [x] 장바구니·주문서·다시 구매: 모바일 하단 고정 주문 바(금액 포함), "할인 -0원" 제거, 체크박스·수량 버튼 확대, 수량 1에서 감소 비활성
- [x] 주문서 입력 검증: 칸별 오류·첫 오류 포커스·휴대폰 번호 자동 하이픈
- [x] 마이페이지: 숫자 3개를 바로가기로(중복 버튼 4개 제거), 주문 카드 헤더 재구성(줄바꿈 깨짐 해소), "같은 상품 다시 담기" → "다시 담기", `?tab=` 링크 동작
- [x] 다시 구매: 항목당 정보 4칸 → 한 줄("지금 필요 · 내일 도착")
- [x] 모바일 푸터 중복 바로가기 제거(햄버거 메뉴와 중복)
- [x] AX 실행 카드: 배지 4개 → 1개(긴급도), 시나리오 라벨 제거 / 필터: 유형·담당을 선택 상자로 + 필터 초기화 / 상태 코드 영문 나열 제거, 안내 패널 접기
- [x] AX 대시보드: 중복 부제 제거, 모바일 브리핑 3건 + 더 보기
- [x] AX 표 → 모바일 카드 자동 변환(전 화면), 재고 레이더 설명·범례 축소, 주문·출고 보조 KPI 데스크톱 전용·구역 2열·단계 안내 접기, 설정 테마 2열, 성과 기록 필터 한 줄 스크롤
- [x] 버그: 발주수량 NaN, 주문조회 빈 입력, 기준값 음수/100% 초과/미래 날짜

## 2026-10-06 R8 — 개발 완성도 (품질 게이트·테스트·접근성)

"개발자가 봐도 신경 쓴 결과물"을 목표로 코드 품질과 검증 체계를 저장소에 고정
- [x] ESLint(next/core-web-vitals + TS)·Prettier(+Tailwind 정렬)·EditorConfig 도입, 전체 포맷 · 미사용 import 정리 · `npm run check`
- [x] 린트로 찾은 실제 버그: 상품 상세 `useRef`가 early return 뒤에서 호출(훅 순서 위반) → 수정
- [x] 시간대 버그: UTC 일자 키 → `dateKey()` (주문번호·오늘 매출·성과 기록 날짜·입고 예정일·오늘 출고 수) · 저장소 v3
- [x] 시드 재현성: "시연 초기화" 후 데이터가 처음과 달라지던 문제 → 생성 시 시드 재설정
- [x] 하드코딩 정리: 브리핑 재구매 수치를 고객 세그먼트와 연결(근거 없는 "전환율 31%" 제거) · 처리량 가정치를 이름 있는 상수로
- [x] Vitest 단위 테스트 79개 (`src/lib` 라인 커버리지 82%, 계산 모듈 85~100%)
- [x] Playwright E2E 116개 (26화면 × 데스크톱/모바일 · 핵심 주문 여정 · 바로 주문 격리 · 결제 연타 · 키보드)
- [x] 접근성: axe WCAG 2.1 AA serious/critical **406곳 → 0** (잉크 색 토큰, 본문 바로가기, 포커스 표시, 스크롤 표 키보드 접근, 랜드마크·라벨·머리글)
- [x] E2E가 찾은 버그: 재고 화면 데스크톱 가로 넘침 226px, 모바일 상단 배송 띠 잘림(도착일 안 보임)
- [x] GitHub Actions CI (품질 → 빌드·E2E, 실패 시 trace 보관) · 웹 앱 매니페스트 · 폰트 CDN preconnect
- [x] README 개발 섹션(스크립트·데이터 흐름·테스트 범위·규칙)

## 2026-10-06 R7 — 2차 고도화 (처음 사용자 흐름 재점검)

고객·AX 흐름을 처음 방문자처럼 단계별 캡처로 따라가며 발견한 문제 위주로 수정
- [x] 흐름 버그: '바로 주문'이 장바구니의 다른 상품까지 주문하던 문제 → 그 상품만 주문서로(다른 상품 유지), 이미 담긴 상품은 수량 맞춤, 연타 방지
- [x] 이중 행동 방지: 다시 구매 '한 번에 주문' 연타 이중 주문 방지 (주문서는 기존 방지 유지 확인)
- [x] 공용 뒤로·앞으로 버튼: 튜토리얼 '다음' 버튼을 가려 진행 불가하던 문제 → 화면 변경 시 재배치·모달 위에서 숨김·후보 줄 추가
- [x] 담기 알림에 '장바구니 보기' · 알림은 휴대폰 상단·최대 2개
- [x] 상세 화면 모바일 헤더 ← 뒤로 (상품·주문서·주문상세·다시 구매)
- [x] 오늘의 브리핑 → 해당 목록 바로 열기 (긴급 실행만 / 지연위험 탭)
- [x] 시각 문구: "마감까지 0분" → "1분 미만", "출고마감까지 0.0시간" → "출고 마감 시각 지남", 지난 기한 "마감 4분 전" → "기한 지남"
- [x] 특가: 묶음 할인도 포함(1개 → 27개), 카드에 "묶음 최대 12%↓"
- [x] 튜토리얼: 짧고 정확한 문구(잘못된 숫자 제거), 휴대폰은 ☰ 가리킴·없는 대상 단계 건너뜀, 360px에서 카드가 화면 밖으로 나가던 위치 계산 수정
- [x] 실행 상세 드로어 머리줄 정리(5줄 → 2줄), '확인·검토중' → '검토 시작'
- [x] 화면 제목 통일(반품·VOC → 반품·문의), 중복 제목 정리, 패널 제목 아이콘 정렬
- [x] 카테고리 타일 세로 글자 깨짐 해소, 주문 완료 화면 버튼 이름("주문 상세·배송조회")·시연 안내 박스 간결화, 결제수단 버튼 한 줄
- [x] 시연 모드: 휴대폰에서 현재 단계·'화면 열기'를 먼저, 18단계 목록은 아래로
- [x] 로딩 자리표시를 화면 모양에 맞춤(AX: KPI+패널 / 고객: 상품 카드)
- [x] 조사 오류 수정("표시과" → "표시와", "초기화은" → "초기화는")
