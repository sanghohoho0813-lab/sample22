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

| Surface | URL | 설명 |
|---|---|---|
| Customer Platform | `/` | 검색 → 상세 → 배송예정 → 장바구니 → DEMO 주문 → 배송조회 → Repeat Basket |
| Business AX | `/ax` | Today Brief → KPI → Stock & Purchase Radar → 공급사 비교 → Action 승인 → Fulfillment Control Tower → Evidence |
| Why AX | `/ax/why` | 기획의도 16 섹션 |
| Presentation | `/ax/presentation` | 18 step Guided Journey (실제 화면) |

## 구조

```
src/lib/        types · seed(Demo Data, 시나리오 A~E) · engines(규칙/통계 엔진 5) · kpi · store(공유 Store) · themes(9) · catalog · format · hooks
src/components/ shared(Overlay·Charts·Badge·Toast·AssetImage·Bits) · customer(Shell·Home·List·Detail·Cart·Checkout·Orders) · ax(Shell·Tutorial·Drawers·14 View)
src/app/        Customer 14 routes · /ax 14 routes
public/assets/  사진 자산 슬롯 (README 참조 — 파일 추가만으로 반영)
```

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
