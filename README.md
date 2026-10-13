# NEXMART — 종합유통 AX + Customer Platform (DEMO)

수요 → 재고 → 발주 → 공급사 → 입고 → 주문 → 출고 → 배송 → 반품 → 재구매 → 마진을 **하나의 데이터로** 잇는 종합유통 Distribution Operations AX + 고객 플랫폼 시연. 고객 화면의 주문이 곧바로 예약재고·출고 예측·위험 판단이 되고, 운영자의 승인(발주·재배치·고객 안내)이 다시 고객 화면에 반영됩니다.

> NEXMART는 시연을 위해 만든 가상의 한국형 종합유통 기업입니다. 실제 결제·배송·AI API는 연결되어 있지 않으며(READY), 모든 수치는 Demo Simulation입니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
# 또는
npm run build && npm start
```

| 화면 | URL | 설명 |
|---|---|---|
| 고객 플랫폼 | `/` | 검색 → 상세 → 배송예정 → 장바구니 → 시연 주문 → 배송조회 → 다시 구매 |
| AX 운영화면 | `/ax` | 컨트롤 타워(예외 큐) → 재고·발주(왜 이 수량인가) → 공급사 총비용 비교 → 실행 승인 → 출고 시뮬레이션 → 매출·이익 → 반품 원인 → 재구매 → 성과 측정 |
| 기획 의도 | `/ax/why` | 16개 섹션 |
| 시연 모드 | `/ax/presentation` | 18단계 단계별 시연 (실제 화면) |

AX 메뉴 구조(최대 2단계): 컨트롤 타워 · 실행 센터 · 상품·재고 ▸(상품·SKU / 재고·발주 / 공급사·구매) · 주문·배송 ▸(주문·출고 / 반품·문의) · 고객·마케팅 ▸(고객·재구매 / 프로모션) · 경영분석 ▸(매출·이익 / AX 성과 기록) · 설정(비용 기준 포함) — 샘플 안내: 기획 의도 · 시연 모드. 어느 화면에서든 Ctrl/⌘+K로 화면·SKU·주문·고객·공급사·발주·실행 검색.
화면 표기 사전은 `src/lib/labels.ts`, 미래AI랩 CTA 링크·문구는 `src/lib/brand.ts`.

## 구조

```
src/lib/        데이터: rng(결정적 난수) · ledger(90일 주문 원장) · seed(시드 → DemoData) · dataset/ledgerCache(원장 재생성·캐시)
                판단: engines(재고·발주량·공급사 총비용) · fulfillment(출고 시뮬레이션) · costs/margin(공헌이익) · procurement(공급사 실적)
                      returns(반품 원인 신호) · repeat(재구매 주기) · control(예외 큐) · actionFactory(예외 → 실행 초안) · lifecycle(실행 단계·성과 측정)
                기타: store(공유 저장소·실행 부수효과) · hooks · labels · brand · types · themes(9) · catalog · format
src/components/ shared(Overlay·MobileDrawer·Charts·Badge·Toast·AssetImage·Bits·SampleBridgeCTA) · customer(Shell·Home·List·Detail·Cart·Checkout·Orders) · ax(Shell·CommandPalette·OpsUi·ActionDrawer·ExceptionDrawer·14 View)
src/app/        Customer 14 routes · /ax 14 routes
public/assets/  사진 자산 슬롯 (README 참조 — 파일 추가만으로 반영)
```

## 개발

### 스크립트

| 명령 | 내용 |
|---|---|
| `npm run dev` | 개발 서버 (사진 자산 색인 `assets` 자동 실행) |
| `npm run check` | **커밋 전 한 번에**: 타입체크 → ESLint → Prettier 검사 → 단위 테스트 |
| `npm test` / `npm run test:coverage` | Vitest 단위 테스트 (KST 고정) / `src/lib` 커버리지 |
| `npm run build && npm run test:e2e` | Playwright E2E — 데스크톱(1280)·모바일(390) 두 프로젝트 |
| `npm run lint` · `npm run format` | ESLint(next/core-web-vitals + TS) · Prettier(+ Tailwind 클래스 정렬) |

CI(`.github/workflows/ci.yml`)는 push·PR마다 같은 순서로 돌고, E2E 실패 시 trace·리포트를 아티팩트로 남깁니다.

### 데이터 흐름

```
seed.ts ── ledger.ts: 90일 주문 원장 (약 2.4만 건 · 1.5만 고객 · 채널 4 · 반품은 주문 라인에 연결 · 발주 이력)
   │        └─ 일별 매출 · 14일 수요신호 · 반품 · 재구매 주기 · 공헌이익 · 공급사 납기 실적이 모두 여기서 계산됨
   └─ 오늘 출고 파이프라인 (구역 인원·작업시간으로 처리한 상태) → 예약재고 = 미출고 수량
        ▼
store.ts (Zustand + localStorage, 원장은 저장하지 않고 generatedAt으로 재생성)
   ├─ 고객 행동: 담기·주문·취소·반품·재입고 알림 → 수요신호 · 예약재고 · 증빙
   └─ 실행 승인: 발주서·입고예정 · 우선처리 · 인원 이동 · 고객 안내(새 도착 예정) · 할인율 · 공급사 상태
        ▼
판단 엔진 (순수 함수, LLM 없음)
   engines · fulfillment · margin · returns · repeat · procurement
        └─▶ control.ts 예외 8종 큐 ──▶ actionFactory 실행 초안(근거·대상·기준값) ──▶ lifecycle 같은 지표 재측정
```

- 모든 계산은 `src/lib`의 **순수 함수**(인자 `data`, `ledger`, `now`)라 UI 없이 테스트됩니다.
- 시드 고정: "시연 초기화"를 눌러도 같은 데이터. 엔진은 시드에 심은 상황(품절·공급 지연·C구역 결원·불량 로트·상세정보 불일치 등)을 모르고 데이터만으로 찾습니다(테스트로 확인).
- 금액 절감액은 만들지 않습니다 — 성과는 실행 전 기준값과 같은 지표를 다시 잰 값으로만 보여줍니다.

### 테스트가 지키는 것

| 층 | 위치 | 주요 검증 |
|---|---|---|
| 단위 (108) | `tests/unit` | 원장 = 수요신호 = 일별 매출 · 예약재고 = 미출고 · 발주량 공식·재고 투영 · 공급사 총비용 · 출고 시뮬레이션·재배치 효과 · 공헌이익 항등식 · 반품 신호 탐지(유의성) · 재구매 · 예외 8종 · **폐쇄 루프 10**(주문→출고, 발주→입고→측정, 지연 안내, 재입고 알림, 재구매 측정, 비용 기준) · KST 일자 키 · 9개 테마 명암비 |
| E2E (124) | `tests/e2e` | 26개 화면 × 2기기: 렌더링·`h1`·가로 넘침 0·**axe WCAG 2.1 AA serious/critical 0건** / **폐쇄 루프**: 고객 주문→예약재고→출고 예측→출고→고객 상태, 컨트롤 타워→발주 승인→입고→성과 측정, 알림 신청→입고→고객 알림 / 검색→주문 / 바로 주문 격리 / 결제 연타 1건 / 키보드 |

### 규칙

- **날짜 키는 `dateKey()`** — `toISOString().slice(0, 10)`은 UTC라 KST 00~09시에 전날이 된다.
- **글자색은 잉크 토큰** — `text-primary`·`text-teal` 등은 `tailwind.config.ts`의 `textColor`가 명암비 4.5:1 이상인 진한 색으로 바꿔 렌더링합니다(테마 색은 `themes.ts`의 `inkFor()`가 계산). 어두운 배경 위 글자는 `text-*-bright`, 흰 글자를 올리는 채움은 `bg-*-strong`.
- **화면 문구는 한국어 사전(`labels.ts`)에서**, 데이터 키는 영어 유지.
- 시연 수치는 Live로 표시하지 않는다(`source: "demo"`, `mode: "Demo Evidence"` — 테스트로 확인).

## 프로젝트 메모리

- `PROJECT_SPEC.md` — 전략·제품·Data Bridge·Visual Reference 잠금
- `PROJECT_STATE.md` — 진행상황 · USER ACTION QUEUE · Known Issues
- `DECISIONS.md` — 설계 결정 WHY / WHY NOT / REVISIT
- `QA_REPORT.md` — Strategy/Product Score · P0 · Journey · Responsive · Red Team
- `RECOMMENDATIONS.md` — P2 선택 개선

## Demo 사용 팁

- AX 헤더: 검색(Ctrl/⌘+K) · 고객 화면 보기 · 스마트폰 미리보기 · 역할 전환(대표/구매/운영/CS — 큐 순서·권한이 바뀜) · ? 튜토리얼
- 설정 > Theme: Canonical 9 Theme · 글자 크게 · Demo Reset
- 심어 둔 운영 상황: 물티슈 수요 급증·품절 위험 · 주방세제 공급 지연 통보 · C구역 결원 + 대형 기업 주문(출고 병목) · KF94 마스크 소진·주문 보류 · 공급사 불량 로트 · 물걸레 청소포 상세정보 불일치 · 미니가습기 저회전 · 재구매 주기 도래
- 시연 흐름 예: 고객 주문 → 컨트롤 타워 품절 위험 → 실행 → 담당자 확인 → 발주 승인 → 입고 처리 → 성과 측정 → 고객 상품 재고 반영
