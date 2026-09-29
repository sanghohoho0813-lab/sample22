/**
 * 화면 표기 사전 (Korean UI Glossary)
 * ────────────────────────────────────────────────────────────
 * 데이터 값(키·상태 코드)은 그대로 두고, 화면에 보이는 이름만 여기서 한글로 바꾼다.
 * 새 화면을 만들 때도 이 사전의 표기를 그대로 쓴다. (한 화면 안에서 한/영 혼용 금지)
 *
 *  Business AX → AX 운영화면      Customer Platform → 고객 플랫폼
 *  Action → 실행                  Action Center → 실행 센터
 *  Evidence → 성과 기록           Evidence Pack → 성과 보고서
 *  Baseline → 기준값              Owner → 책임자
 *  Fulfillment → 주문·출고        Control Tower → 출고 관제
 *  Radar → 재고·발주 레이더       Today Brief → 오늘의 브리핑
 *  Repeat Basket → 다시 구매      Presentation Mode → 시연 모드
 *  NEXT → 예정                    READY → 연결 준비          Preview → 미리보기
 *  Demo Reset → 시연 데이터 초기화  Theme → 테마              Stage → 진행 단계
 */

export type StageKey = "DEMO" | "PILOT" | "PRODUCTION";
export const STAGE_LABEL: Record<StageKey, string> = { DEMO: "시연", PILOT: "실증", PRODUCTION: "운영" };

export const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  BASELINE: "기준값",
  ACTION: "실행",
  RESULT: "결과",
  ADOPTION: "사용 정착",
  CUSTOMER: "고객",
  EFFICIENCY: "효율",
  REVENUE: "매출",
  SCALE: "확장성",
  RISK: "위험",
  EXCEPTION: "예외",
};

export const EVIDENCE_MODE_LABEL: Record<string, string> = {
  "Demo Evidence": "시연 기록",
  Simulation: "시뮬레이션",
  "실증 준비": "실증 준비",
};

export const BASELINE_GROUP_LABEL: Record<"COST" | "REVENUE" | "SCALE", string> = { COST: "비용", REVENUE: "매출", SCALE: "확장성" };

/** 서비스 상태 표기 — 프로젝트 전체에서 이 네 가지로 통일 */
export const SERVICE_STATUS_LABEL: Record<string, string> = { LIVE: "작동 중", DEMO: "시연", READY: "연결 준비", NEXT: "예정", PILOT: "실증" };

/** AI·규칙 계산 방식 표기 */
export const METHOD_LABEL: Record<string, string> = {
  "RULE + STATISTICAL + OPTIMIZATION": "규칙 + 통계 + 최적화",
  "RULE + STATISTICAL": "규칙 + 통계",
  "RULE + OPTIMIZATION": "규칙 + 최적화",
};

/** 오류비용 수준 */
export const RISK_LEVEL_LABEL: Record<string, string> = { LOW: "낮음", "LOW~MID": "낮음~중간", MID: "중간", HIGH: "높음" };
