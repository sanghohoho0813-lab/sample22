# DECISIONS.md — 중요한 설계 결정 (WHY / WHY NOT / REVISIT WHEN)

## D-01 상태 저장소: Zustand + localStorage 단일 Store (Customer·AX 공유)
- **WHY**: 마스터 프롬프트의 "Customer와 AX가 서로 다른 Demo Data를 사용하는 별도 사이트가 되면 실패" 요구. 한 Store에서 주문→재고→Action→고객상태가 즉시 순환해야 Closed Loop가 체감됨. Supabase 없이도 동작해야 함.
- **WHY NOT** 서버 API + DB: 외부 서비스 없이 첫 실행을 끝내야 하고, Demo Reset·iframe Preview·Presentation이 브라우저 내에서 즉시 동작해야 함.
- **REVISIT WHEN**: Pilot 전환 시 `store.ts`의 action 함수를 Supabase adapter로 교체 (Entity·상태 전이 로직은 그대로 이식 가능).

## D-02 차트: 외부 라이브러리 없이 자체 SVG (Sparkline / Bar / Line / Donut / Meter)
- **WHY**: 필요한 차트가 5종뿐이고 Theme Token(CSS 변수) 색상을 직접 써야 함. 의존성 최소화 원칙.
- **WHY NOT** recharts/chart.js: 번들 +100KB, Theme 변수 연동·Hover Tooltip 커스텀 비용이 자체 구현과 비슷.
- **REVISIT WHEN**: 시계열 Zoom·다축 등 고급 분석이 필요해질 때.

## D-03 AI는 규칙·통계 4개 LIVE + LLM 1개 READY
- **WHY**: Unified v3.0 "Rule이면 충분한데 억지 AI 포장" = Strategic P0. 발주·공급사·배송위험·재구매는 설명 가능한 규칙으로 충분히 가치가 나옴. 자동발주 L4는 오류비용 MID 이상이라 사람 승인(L3) 유지.
- **WHY NOT** LLM 즉시 연결: API 키 없음 + 근거 없는 "AI가 추천했습니다" 금지. AI READY 마커로 정직하게 표시.
- **REVISIT WHEN**: API 키 제공 시 Executive Briefing 자연어 설명 1개부터.

## D-04 Presentation Mode = iframe Guided Journey (슬라이드 아님)
- **WHY**: "정적인 슬라이드쇼가 아니라 실제 앱 기능을 따라가는 Guided Journey" 요구. 단계별 실제 라우트를 iframe으로 열고 조작 가능. 같은 localStorage를 공유해 주문·승인이 실제 상태에 반영됨.
- **WHY NOT** 별도 데모 화면 캡처: Demo를 Live처럼 보이게 하는 장식이 됨.
- **REVISIT WHEN**: 발표 환경에서 iframe 제약(CSP 등)이 생기면 새 탭 전환 옵션(이미 제공) 기본화.

## D-05 Device Preview = 실제 라우트 iframe (360/390/430)
- **WHY**: "모바일 Preview는 실제 Responsive UI를 사용하고 가짜 Screenshot으로 대체하지 않는다" P0. storage 이벤트로 Preview 안팎 상태 일치.
- **WHY NOT** CSS zoom 축소: 미디어쿼리가 적용되지 않아 재배치가 보이지 않음.

## D-06 Theme Token: hex + rgb 삼중 변수 (`--t-primary`, `--t-primary-rgb`)
- **WHY**: Tailwind 투명도 수식(`bg-primary/12`)이 CSS 변수 hex로는 동작하지 않음. rgb 트리플렛으로 `<alpha-value>` 지원, 인라인 SVG는 hex 사용.
- **REVISIT WHEN**: Tailwind v4 전환 시 `@theme` 문법으로 단순화 가능.

## D-07 Customer Public에 Theme Picker 미노출, Customer 고정 팔레트 + AX Theme는 Preview에서만 전파
- **WHY**: 마스터 프롬프트 §44. 고객 브랜드 색(Navy/Teal/Orange)은 고정. AX Theme는 관리자용.

## D-08 상품 이미지 placeholder 전략 (카테고리 톤 + "사진 준비 중" 라벨)
- **WHY**: 사용자 지시 "사진은 추후 적용". 깨진 이미지·회색 박스 대신 카테고리 색상 톤으로 상품군을 구분하고, 파일 추가만으로 전환되게 AssetImage에 onError 폴백 구현.
- **REVISIT WHEN**: Drive 원본 사진 수령 즉시 `public/assets/` 배치.

## D-09 Repeat Basket 구매주기 = (관측 평균 + 상품 기본주기) / 2
- **WHY**: 구매 2~3회 데이터로는 관측치가 불안정. 상품 기본주기로 보정해 과도한 "지금 주문" 남발 방지.
- **REVISIT WHEN**: 12개월 데이터 축적 후 고객별 소비속도 학습.

## D-10 공급사 점수 가중치는 상황별 3세트 (긴급/기본/과잉)
- **WHY**: "가장 싼 공급사를 무조건 추천하지 않는다". 긴급 품절위험 = 납기 0.45, 과잉 = 단가 0.45·충족률 0.25.
- **REVISIT WHEN**: 실제 입고 결과(정시·충족·불량) 누적 후 가중치 재보정.

## D-11 범위 제외 (NOT BUILDING THIS PHASE)
| 항목 | 이유 | 재검토 조건 |
|---|---|---|
| 실제 PG 결제 | Demo 단계, 결제 없이 Data Loop 시연 가능 | Pilot 진입 |
| 택배사 API | Shipment/DeliveryEvent Entity만 준비 | 실주문 발생 |
| 외부 Marketplace 연동 | 현재 자사 단일 채널 | 채널 확장 결정 시 |
| 자동발주 L4 | 오류비용 MID, 사람 승인 원칙 | 12주 실증 후 저위험 SKU 한정 검토 |
| 공급사 정산·Portal | 공급사 네트워크 규모 미확인 | Platform Readiness HIGH 시 |
| 다창고 최적화·WMS | 단일 물류 5구역으로 충분 | 2창고 이상 |
| 자체 ML 학습 | 데이터 12개월 미만 | Data Moat Score 9+ |
| Native App | 반응형 Web으로 충분 | 고객 앱 사용률 요구 시 |
| 정기배송 | Repeat Basket 검증 먼저 | Repeat Basket 전환율 실측 후 |
| 타사 UI 복제·실제 브랜드 | 절대 금지 | — |

## D-12 Hydration 전략: 셸은 SSR 기본값 → hydrated 후 persisted 값 적용
- **WHY**: Zustand persist가 클라이언트 첫 렌더에서 localStorage 값을 동기 적용해 SSR HTML과 텍스트가 달라짐(React #418). 데이터 화면은 ClientGate로 스켈레톤 후 렌더, 셸(역할·Theme·Freshness)은 hydrated 플래그로 지연 적용.

## D-13 Pilot 전환은 "라벨 + Evidence" 변경이며 데이터는 Demo 유지
- **WHY**: 실데이터 연결(Supabase·CSV) 없이 Stage만 PILOT으로 바꾸면 Demo 수치가 실증 성과처럼 보일 위험. 전환 확인창과 Evidence Pack에 "Simulation" 명시로 차단. Baseline만 회사 입력값.
- **WHY NOT** 실데이터 연결 전 전환 금지: 컨설턴트가 고객사에서 Owner·Baseline을 잡는 첫 미팅이 곧 Pilot 시작이며, 그 시점에 실데이터가 준비돼 있는 경우는 드묾. 준비 단계를 시스템 안에서 진행하게 하는 편이 Adoption에 유리.
- **REVISIT WHEN**: CSV Import 도입 시 "실데이터 연결됨" 게이트를 전환 조건에 추가.

## D-14 Action 생성은 규칙 결과를 그대로 담고, 중복(진행 중 Action 존재)은 차단
- **WHY**: Radar가 이미 계산한 근거·추천수량·공급사 대안을 사람이 다시 타이핑하는 것은 반복업무. 같은 SKU에 Action이 둘이면 발주가 중복될 위험.
- **WHY NOT** 자동 생성(감지 즉시 Action 발행): Action 폭주로 우선순위가 흐려짐. 사람이 "만들기"를 누르는 지점이 검토의 시작.
- **REVISIT WHEN**: Pilot에서 Action 누락이 반복되면 일 1회 자동 생성 배치 검토(L2).

## D-15 Baseline 측정지점 11개는 고정 목록, 값은 회사가 입력
- **WHY**: Unified v3.0 "Baseline 없는 개선율 금지". 측정지점은 컨설턴트가 표준화하고, 숫자는 고객사가 실측. 화면의 Demo KPI를 Baseline으로 자동 채우지 않음.
- **REVISIT WHEN**: 업종별 템플릿(유통 외) 확장 시 목록을 설정 가능하게.

## D-16 글자 크기는 Tailwind 스케일 자체를 키운다 (개별 클래스 수정 아님)
- **WHY**: MD "Executive Readability First · 작은 글자 남발 금지". 수백 곳의 text-xs/sm을 일일이 바꾸면 누락이 생기고, 새 화면에서 다시 작아진다. 스케일(xs 13 · sm 15 · base 17)을 올리면 이후 코드도 자동으로 기준을 따른다.
- **WHY NOT** body font-size만 키우기: Tailwind 크기는 rem 기준이라 body 크기와 무관. "크게" 옵션이 실제로 전체에 먹지 않던 원인이기도 함 → root(html) font-size에 적용으로 변경.

## D-17 모션은 CSS 클래스 시스템으로, 라이브러리 없이
- **WHY**: 필요한 것은 진입·순차등장·슬라이드·그리기·리프트·카운트업 6종. framer-motion 등은 번들 +40KB와 SSR 이슈. CSS keyframes + 소형 CountUp 컴포넌트로 충분하고 Theme Token과 자연스럽게 결합.
- **REVISIT WHEN**: 레이아웃 전환(공유 요소) 애니메이션이 필요해질 때.

## D-18 프리즈 원인은 "확정"이 아니라 "취약점 제거"로 대응
- **WHY**: 사용자 환경(모바일 Vercel)에서 발생한 다운을 헤드리스에서 재현하지 못함. 재현 여부와 무관하게 스크롤 피드백 루프·저장소 왕복·에러 경계 부재는 실제 다운을 일으킬 수 있는 구조라 모두 제거. 재발 시 error.tsx가 메시지를 보여주므로 다음 진단이 가능해짐.
