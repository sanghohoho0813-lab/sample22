# RECOMMENDATIONS.md — P2 이상 선택적 개선 (무한 확장 금지, 기록만)

우선순위 기준: 고객 확보 > 계약률 > 반복업무 감소 > 만족도 > 모듈 연결 > 확장성.

## 고객 가치 큰 것 (다음 세션 후보)

~~1. Radar → 원클릭 Action 생성~~ ✅ R2 완료
~~2. AX Owner 필드 + Baseline 입력 화면~~ ✅ R2 완료 (AX Evidence > 실증 준비)
3. **사진 자산 적용 후 Visual Density 재점검**: Customer 60~80%, AX 30~50% 규칙 확인. Hero Crop Desktop/Mobile 분리.
4. **Front Reference 재해석**: 12종 Reference 도착 시 Hero composition · Product Card · Nav language 조정 (Signature 4 유지).

## 운영 편의

5. Fulfillment 보드 드래그로 단계 변경 (현재 Drawer 버튼)
6. 발주서 PDF/CSV Export (공급사 전달용)
~~7. Evidence Pack Markdown Export~~ ✅ R2 완료
8. 고객 알림 센터 실시간 배지 (현재 My Page 탭)

## 데이터·AI

9. Executive Briefing LLM 연결 (API 키 시) — 1개 기능만
10. Demand 엔진에 요일·시즌 계수 (90일 데이터로 주간 패턴 반영)
11. 공급사 가중치 실측 보정 UI (설정에서 가중치 슬라이더)

## R2 Red Team P2 (기록만)

- Baseline 입력값 검증(음수·비율 0~100 범위) 및 단위 힌트
- 체크리스트 수동 항목(교육·데이터 정리)에 증빙 메모/파일 첨부
- 생성된 Action의 추천수량을 최소주문수량 배수로 반올림 옵션
- Evidence Pack PDF 변환 (현재 Markdown)

## 확장 (NEXT — 실증 후)

12. 정기배송 (Repeat Basket 전환율 실측 후)
13. B2B 대량구매 견적 요청
14. 공급사 Portal (입고예정 자기입력)
15. CSV Import 마법사 (상품·재고·주문)

## 하지 않을 것 재확인

- 기능 수 늘리기 위한 PLUS 우선 구현
- Demo 수치를 실증 결과처럼 표시
- 자동발주 L4
