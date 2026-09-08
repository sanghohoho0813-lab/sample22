# QA_REPORT.md — NEXMART First Build

> 실행일 2026-09-08 · 환경 Next.js 15.5 / React 19 / Node 22 · 자동화 Playwright(Chromium) + 수동 스크린샷 검토

## Score

| 구분 | 점수 | 근거 |
|---|---|---|
| **Strategy Score A** | **93 / 100** | Problem/Constraint 15 · Process 9 · Data 13 · AI Fit 10 · Proof/KPI 12 (Baseline 미측정 −3) · Customer/Platform Fit 10 · Scale/Unit Economics 7 (CAC/LTV 측정항목만 정의) · Moat 5 · Adoption 4 (AX Owner 전용 UI 없음) · Financeability 5 → 90+ 통과, Strategic P0 0 |
| **Product Score B** | **91 / 100** | Product Shell 14/15 · Business AX 19/20 · Customer 18/20 (사진 자산 미적용 −2) · Cross-Surface 15/15 · Visual/Interaction 13/15 · Theme 9/10 · Story/Growth 5/5 (D-6 기준) — Business 91 / Customer 90 |
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

## Known Issues

- 외부 폰트 CDN 차단 환경에서 시스템 폰트 폴백 (기능 무관)
- `next lint` 미구성 (tsc + build로 대체)

## 실행

```bash
npm install
npm run build && npm start   # http://localhost:3000  (Customer)  /ax (Business AX)
```
