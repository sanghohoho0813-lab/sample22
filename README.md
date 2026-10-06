# NEXMART — 종합유통 AX + Customer Platform (DEMO)

고객의 검색·조회·장바구니·주문·재구매 행동을 상품별 수요신호로 전환하고, 이를 재고·공급사·발주·출고·배송 판단에 연결하여 품절과 과잉재고, 배송지연과 마진손실을 줄이는 **종합유통 AX+플랫폼** First Build.

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
| AX 운영화면 | `/ax` | 오늘의 브리핑 → KPI → 재고·발주 레이더 → 공급사 비교 → 실행 승인 → 출고 관제 → 성과 기록 |
| 기획 의도 | `/ax/why` | 16개 섹션 |
| 시연 모드 | `/ax/presentation` | 18단계 단계별 시연 (실제 화면) |

AX 메뉴 구조(최대 2단계): 경영 대시보드 · 실행 센터 · 상품·재고 ▸(상품·SKU / 재고·발주 / 공급사·구매) · 주문·배송 ▸(주문·출고 / 반품·문의) · 고객·마케팅 ▸(고객·재구매 / 프로모션) · 경영분석 ▸(매출·마진 / AX 성과 기록) · 설정 — 샘플 안내: 기획 의도 · 시연 모드.
화면 표기 사전은 `src/lib/labels.ts`, 미래AI랩 CTA 링크·문구는 `src/lib/brand.ts`.

## 구조

```
src/lib/        labels(한글 표기 사전) · brand(CTA 링크·문구) · types · seed(Demo Data, 시나리오 A~E) · engines(규칙/통계 엔진 5) · kpi · store(공유 Store) · themes(9) · catalog · format · hooks
src/components/ shared(Overlay·MobileDrawer·Charts·Badge·Toast·AssetImage·Bits·SampleBridgeCTA) · customer(Shell·Home·List·Detail·Cart·Checkout·Orders) · ax(Shell·Tutorial·Drawers·14 View)
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
seed.ts (결정적 시드 → DemoData)
   └─▶ store.ts (Zustand + localStorage 영속, 버전 마이그레이션) ── 고객 화면과 AX 화면이 같은 저장소를 공유
          ├─ 고객 행동(담기·주문·조회) ─▶ demand(수요신호)·inventory(예약)·evidence(증빙 로그) 갱신
          └─▶ engines.ts (재고 레이더·공급사 비교·출고 위험·재구매·브리핑 — 전부 규칙/통계, LLM 없음)
                 └─▶ kpi.ts ─▶ AX 화면
```

- 모든 계산 로직은 `src/lib`의 **순수 함수**(인자로 `data`, `now`)라 UI 없이 테스트됩니다.
- 시연 데이터는 시드 고정이라 "시연 초기화"를 눌러도 같은 데이터가 나옵니다(테스트로 보장).

### 테스트가 지키는 것

| 층 | 위치 | 주요 검증 |
|---|---|---|
| 단위 (79) | `tests/unit` | 출고마감 15:00 경계·"1분 미만", KST 일자 키, 검색 필터/정렬/동의어, 시드 참조 무결성·재현성, 공급사 점수·출고 위험 등급, 장바구니·주문·취소·재고 예약, 9개 테마 글자색 명암비 |
| E2E (116) | `tests/e2e` | 26개 화면 × 2기기: 렌더링·`h1`·가로 넘침 0·**axe WCAG 2.1 AA serious/critical 0건** / 검색→주문→마이페이지→AX 출고 반영 / 바로 주문 격리 / 결제 연타 1건 / 본문 바로가기·Esc 포커스 복귀 |

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

- AX 헤더: 고객 화면 보기 · 스마트폰 Preview · 역할 전환(대표/구매/운영/CS) · ? 튜토리얼
- 설정 > Theme: Canonical 9 Theme · 글자 크게 · Demo Reset
- 시나리오: A 물티슈 20팩 긴급발주 · B 주방세제 공급 지연 · C 미니가습기 저회전 · D C구역 마감임박 12건 · E 김서연 재구매
