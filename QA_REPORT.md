# QA_REPORT.md — NEXMART First Build

> 실행일 2026-09-08 (First Build) · 2026-09-15 (고도화 R2 재검증) · 환경 Next.js 15.5 / React 19 / Node 22 · 자동화 Playwright(Chromium) + 수동 스크린샷 검토

## Score

| 구분 | 점수 | 근거 |
|---|---|---|
| **Strategy Score A** | **95 / 100** (R2, 93→95) | Problem/Constraint 15 · Process 9 · Data 13 · AI Fit 10 · Proof/KPI 13 (Baseline 입력 화면·Evidence Pack 완성, 실측값 대기 −2) · Customer/Platform Fit 10 · Scale/Unit Economics 7 · Moat 5 · Adoption 5 (AX Owner UI·체크리스트) · Financeability 5 → Strategic P0 0 |
| **Product Score B** | **92 / 100** (R2, 91→92) | Product Shell 14/15 · Business AX 20/20 (Insight→Action 생성으로 KPI→Detail→Insight→Action 전 구간 완성) · Customer 18/20 (사진 자산 미적용 −2) · Cross-Surface 15/15 · Visual/Interaction 13/15 · Theme 9/10 · Story/Growth 5/5 |
| **Strategic P0** | **0** | 13항목 전수 확인 (아래) |
| **Product P0 / P1** | **0 / 0** (수정 완료) | Red Team 발견 P0 3 · P1 2 → 모두 수정 후 재검증 |
| **One-Shot 75 Gate** | **PASS** | 회사 맞춤성·첫인상·핵심 Journey·모바일·데이터/AI/Action 논리·Story·Growth·QA 모두 존재, Placeholder Route 0 |

## Strategic P0 Checklist

| 항목 | 결과 |
|---|---|
| Primary Constraint 없음 | ✅ 잠금 |
| 핵심 기능이 Constraint와 단절 | ✅ 4 Signature·7 Action Type 모두 연결 |
| Cost/Revenue/Scale KPI 설계 없음 | ✅ 3종 정의 |
| Demo Data를 Live처럼 표현 | ✅ DEMO 배지·Simulation/Demo Evidence 모드·Checkout 고지 |
| Baseline 없는 개선율 | ✅ "UNKNOWN / REQUIRED · DO NOT INVENT" 표기, 개선율은 "(Demo)" 명시 |
| 고객행동이 내부 Workflow와 단절 | ✅ 4 Loop 작동 |
| Rule이면 충분한데 AI 포장 | ✅ AI READY 마커, 규칙 명시 |
| 주요 AI Action 근거 없음 | ✅ 모든 Action 근거 2~4 |
| High Risk AI 사람 승인 없음 | ✅ L3, L4 없음 |
| Data Source/Provenance 불명 | ✅ Evidence.dataSource·mode |
| Future/NEXT를 현재처럼 | ✅ NEXT 배지, 정기배송 Preview 안내 |
| 정책자금·투자 보장 표현 | ✅ 없음 (기술자산 탭에 "보장 표현 금지" 명시) |
| Capital Independence 실패 상태 추진 | ✅ YES |

## Primary Journey — 자동화 결과 (Fresh Load, 1440×900)

| Step | 결과 |
|---|---|
| Home 로드 · 제목 · 가로 overflow 0 | ✅ |
| 검색 "물티슈" → 결과 3 | ✅ |
| Product p-001 → 구성 3종(단품/10/20) → 20팩 선택 → 배송예정 표시 | ✅ |
| 장바구니 1행 → 주문하기 → Checkout → DEMO 주문 → 완료 페이지 (NX260908-0080) | ✅ |
| AX Fulfillment 목록에 해당 주문 존재 | ✅ |
| Order Drawer → 다음 단계 ×2 → 피킹대기 · Esc 닫힘 · body overflow 복구 | ✅ |
| Action act-001 → 승인·발주요청 → 상태 "발주요청" · PO 생성 표시 | ✅ |
| Inventory: 물티슈 20팩 → 입고예정/발주진행 상태 전환 | ✅ |
| Customer My Page에 주문 표시 · 상세에서 "상품준비" 반영 | ✅ |
| Repeat Basket 7종 → 한 번에 다시 주문 → 완료 | ✅ |
| Evidence 30일 27건 (초기 12 + 실행 누적) | ✅ |
| 역할 전환 운영담당 → 메뉴 9개 · /ax/sales 접근 시 /ax 리다이렉트 | ✅ |
| Theme 9개 순차 적용 · `--t-primary` 9종 모두 상이 | ✅ |
| Why AX 16 섹션 | ✅ |
| Presentation Mode iframe 로드 | ✅ |
| Device Preview iframe 열림 · Esc 닫힘 | ✅ |
| Demo Reset → 주문 소멸 · 초기 상태 | ✅ |
| Console/Page Error | **0** (외부 폰트 CDN 차단 제외) |

## Responsive — 8폭 × 8라우트 (`/`, `/product/p-001`, `/cart`, `/my/repeat`, `/ax`, `/ax/inventory`, `/ax/fulfillment`, `/ax/why`)

| 폭 | 360 | 390 | 430 | 768 | 1024 | 1280 | 1440 | 1920 |
|---|---|---|---|---|---|---|---|---|
| 가로 overflow | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Sticky CTA와 Bottom Nav 비중첩(product 390 확인) · Drawer→Bottom Sheet 전환 · Table overflow-x 래핑 · Fulfillment 보드 1/3/6열.

## Theme 9 상태

| # | Theme | Sidebar | CTA | Active Nav | KPI Bar | Chart | Badge | Modal/Drawer | Mobile |
|---|---|---|---|---|---|---|---|---|---|
| 01~09 | 전부 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

07 Burgundy Slate 대시보드·Customer Preview 스크린샷 검토: Accent 잔존 0, Error Red는 위험/오류에만 사용, Neutral 본문 가독성 유지.

## Interaction Integrity

Hover/Pressed/Selected/Focus(ring) · Loading(skeleton) · Empty(검색/장바구니/알림/Action) · Error(404) · Success(toast) · Undo(보류·취소) · Escape · Browser Back(popstate로 overlay 닫힘) · Focus restoration · Overlay cleanup(lock counter) — 코드 및 자동화 확인.

## Red Team (PASS 3, 1회) — 발견 및 조치

| 등급 | 관점 | 발견 | 조치 |
|---|---|---|---|
| P0 | QA | Checkout 페이지 클라이언트 예외 (Zustand 셀렉터 새 배열 → 무한 렌더) | useMemo로 파생 → 수정·재검증 |
| P0 | QA | /ax 전 페이지 React #418 Hydration mismatch (persisted role/theme/generatedAt) | 셸에서 hydrated 후 적용 → 오류 0 |
| P0 | UX | Why AX 페이지 전 폭 가로 overflow (grid min-width auto) | `min-w-0` → overflow 0 |
| P1 | UX | 커스텀 CSS가 유틸리티를 덮어 select 전폭·검색 아이콘 겹침 | `@layer components` 이동 |
| P1 | QA | 매출 차트 음수 마진 시 SVG rect 음수 높이 | clamp 0 |
| P2 | 구매담당 | Radar에서 바로 발주 Action 생성 버튼 없음 (SKU Drawer 경유) | RECOMMENDATIONS |
| P2 | 대표 | AX Owner 지정 전용 필드 UI 없음 (Evidence BASELINE 텍스트만) | RECOMMENDATIONS |
| P2 | 고객 | 상품 사진 placeholder (자산 미제공) | USER ACTION QUEUE |
| P2 | 투자자 | CAC/LTV/Payback은 측정항목만, 화면 없음 (의도적 — 숫자 발명 금지) | Pilot 후 |

## 고도화 R2 (2026-09-15) — 신규 흐름 자동화 결과

| Step | 결과 |
|---|---|
| Radar 품절위험 행 → "발주 검토 Action" → Drawer(근거 3·공급사 대안 2·추천수량 30) → 승인 → 발주요청 · Action 17→18 · 해당 SKU 상태 입고예정 | ✅ |
| Control Tower 지연위험 → "Action 생성" → 우선처리 Action → 승인 → 실행중 | ✅ |
| 실증 준비: 전환 버튼 초기 비활성 → Owner(김구매) + Baseline 3(Cost/Revenue/Scale) 입력 → 활성 → PILOT 전환 → 헤더 Stage 배지 PILOT · BASELINE Evidence 생성 | ✅ |
| Evidence Pack Markdown 다운로드 (6.4KB · Baseline 표 · 입력값 반영 · Simulation 표기) | ✅ |
| 이전 localStorage 형태(pilot 없음) 재로드 | ✅ (merge 기본값) |
| Demo Reset → DEMO 복귀 | ✅ |
| 360/390/768 overflow (pilot·inventory·fulfillment) | 0 (초기 pilot 탭 +595px → `min-w-0` 수정 후 0) |
| 전체 Journey 회귀 (주문→AX→승인→출고→고객→Repeat→Reset) | ✅ 오류 0 |

Red Team R2: P1 1건(pilot 탭 grid overflow) 수정. P2 — Baseline 입력값 검증(음수·범위) 없음, 체크리스트 수동 항목 근거 첨부 없음 → RECOMMENDATIONS.

## R3 (2026-09-15) — 안정성·가독성·모션

| 항목 | 결과 |
|---|---|
| 프리즈 재현 (튜토리얼 열린 채 28회 연속 내비 / Presentation iframe + 역할 전환) | 응답 2ms · heap 14MB · localStorage 재기록 1회 (왕복 없음) |
| 21 라우트 × 360/390/430/768/1024/1280/1440/1920 가로 overflow | 0 (초기 sales·customers·returns·settings 발견 → grid `min-w-0`·overflow-wrap 수정) |
| 페이지 오류 (모든 라우트·폭) | 0 |
| 전체 Journey 회귀 (주문→AX→승인→출고→고객→Repeat→Reset) | ✅ |
| body font-size | 17px (이전 16px) · 사이드바 16px · 표 15px · 배지 13px |
| 사이드바 5그룹·톤 색상·활성 바 | 스크린샷 확인 |

## R4 (2026-09-18) — 미래AI랩 공통 CTA 브릿지

| 항목 | 결과 |
|---|---|
| 25 라우트 CTA 노출 (Checkout 제외 의도) | PASS |
| 메인 CTA 문구 = "우리 회사도 만들어보기" (본문·사이드바 동일) | ✅ |
| 사이드바 미니 CTA 링크 3개 | ✅ |
| 메인 버튼 대비 (배경 rgb(16,36,62) / 글자 #fff · 높이 58px) | ✅ |
| 390px 모바일 CTA 폭·높이 (308~316 × 58) · 가로 overflow | 0 |
| Theme 07 Burgundy에서 Accent 자동 재착색 | ✅ (스크린샷) |
| 콘솔/페이지 오류 | **0** |
| prefers-reduced-motion | 스윕·점멸 정지, 리프트 없음 |

## R5 (2026-09-29) — UI/UX 안정화

| 항목 | 결과 |
|---|---|
| 햄버거 1차 노출 메뉴 (AX, 대표 기준) | 14 → **7 + 샘플 안내 2** (기능 14개 전부 도달 가능, 링크 14/14 = 200) |
| 햄버거 위치 · 크기 | AX·고객 모두 왼쪽 · 44×44px |
| Drawer | 폭 335px@390 (86vw) · X/Esc/배경 탭 닫힘 · 배경 스크롤 잠금 · 내부 독립 스크롤 · 하단 CTA 항상 보임 |
| 역할별 메뉴 | 구매·운영·CS 모두 정상, 하위 1개 그룹은 단일 항목으로 표시 |
| AX ↔ 고객 플랫폼 이동 | 양방향 PASS |
| Bottom Navigation | 5개(홈·카테고리·검색·장바구니·마이) · 현재 위치 표시 |
| 내부 링크 전수 | 113개 · 깨진 링크 0 |
| 레이아웃 자동 검사 (26 라우트 × 360/390/412/430/1280/1440) | 세로 글자 깨짐 0 · 숫자 줄바꿈 0 · 화면 밖 넘침 0 |
| 긴 데이터 스트레스 (긴 고객명·상품명·공급사명, 25억 금액, 장바구니 150 → 99+) | 360/412/1280 · 이상 0 (초기 1건 — 섹션 제목 min-w-0 수정) |
| 전체 Journey 회귀 (검색→주문→AX 출고→실행 승인→발주→고객 반영→재구매→초기화) | PASS · 오류 0 · 8폭 overflow 0 |
| 튜토리얼 7단계 | PASS (새 메뉴·도구줄 대상) |
| 미래AI랩 CTA 브릿지 회귀 | PASS (25 라우트, Checkout 제외) |
| 콘솔/페이지 오류 | 0 |
| Build / TypeScript | PASS / PASS · `next lint` 미구성(tsc+build로 대체) |

발견·수정: ① 360px 패널 제목 세로 깨짐(전역 overflow-wrap) ② 성과 기록 필터 360px 7px 넘침 ③ 1440px 떠 있는 테마 선택기가 푸터 버튼을 가림(클릭 실패로 발견) → 도구줄로 이동 ④ 1280×800 사이드바 하단 가림 → 짧은 화면에서 CTA 압축 ⑤ 스트레스 데이터에서 홈 섹션 제목 1px 넘침.

## R6 (2026-10-06) — UI/UX 고도화 + 기능 안정화

| 항목 | 결과 |
|---|---|
| 고객 홈 모바일 높이 | 9,086px → 4,477px |
| 상품 상세 모바일 높이 | 4,992px → 3,602px · 하단 바 1개 |
| 카드 배송 문구 한 줄 | 21개 카드 전부 ("내일 도착") |
| 장바구니·다시 구매·주문서 하단 고정 주문 바 | 표시 · 동작 PASS |
| 주문서 검증 (빈 이름·잘못된 번호 → 칸별 오류, 첫 칸 포커스, 하이픈 자동) | PASS |
| 주문조회 빈 입력 안내 · 마이페이지 `?tab=` | PASS |
| 기준값 150% → 100, -5 → 0 | PASS |
| 실행 센터 유형 선택 → 2건, 필터 초기화 → 11건 | PASS |
| AX 표 모바일 카드 변환 (머리줄 숨김·제목 칸·가로 넘침 0) | PASS |
| 전체 Journey 회귀 (검색→주문→AX 출고→발주 승인→고객 반영→재구매→초기화) | PASS · 오류 0 |
| 26 라우트 × 360/390/412/430/1280/1440 레이아웃 (세로 깨짐·숫자 줄바꿈·넘침) | 0건 |
| 긴 데이터 스트레스 (긴 상품명·고객명·25억·99+) | 0건 (초기 발견: 카드형 표 제목 칸 nowrap 넘침, 프로모션 퍼널 숫자 줄바꿈 → 수정) |
| 내비 · 드로어 · 내부 링크 111개 · CTA 브릿지 | PASS · 깨진 링크 0 |
| 데스크톱 홈 높이 | 5,711px → 4,670px (묶음당 한 줄 4개) |
| Build / TypeScript / 콘솔 오류 | PASS / PASS / 0 |

## R7 (2026-10-06) — 2차 고도화 · 처음 사용자 흐름 재점검

| 항목 | 결과 |
|---|---|
| 고객 흐름 단계별 캡처 (홈→검색→상품→담기→장바구니→주문서→완료→주문상세→카테고리·특가·빈 검색·404) | 25단계 · 오류 0 |
| AX 흐름 단계별 캡처 (시연 안내→첫 방문 튜토리얼→브리핑→실행 승인→재고 레이더→실행 생성→각 화면) | 22단계 · 오류 0 (수정 전: 튜토리얼 '다음'이 가려져 진행 불가) |
| 바로 주문 + 장바구니에 다른 상품 | 주문서 1건만 · 다른 상품은 장바구니 유지(선택 해제) |
| 주문서 연타 / 다시 구매 연타 | 주문 1건씩만 생성 |
| 장바구니 선택 없음 / 전부 삭제 | "주문할 상품을 선택해 주세요" / 빈 장바구니 화면 |
| 특가 | 1개 → 27개 (묶음 할인 표기 26개) |
| 레이더에서 실행 생성 | 1건 생성, 중복 생성 차단 유지 |
| 마감 직전 시각 (14:58:10 / 14:59:30 / 15:00:30, KST) | "1분" / "1분 미만" / "오늘 마감·다음날+1 도착" |
| 튜토리얼 360px | 카드 화면 안(x=12, 오른쪽 348) · 휴대폰 6단계 |
| 26 라우트 × 6폭 레이아웃 · 긴 데이터 스트레스 | 0건 / 0건 |
| 전체 Journey 회귀 · R6 기능 25항목 · 내비(링크 112개, 깨짐 0) · CTA | PASS · 콘솔 오류 0 |
| Build / TypeScript | PASS / PASS |

## Known Issues

- 외부 폰트 CDN 차단 환경에서 시스템 폰트 폴백 (기능 무관)
- `next lint` 미구성 (tsc + build로 대체)

## 실행

```bash
npm install
npm run build && npm start   # http://localhost:3000  (Customer)  /ax (Business AX)
```
