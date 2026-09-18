/**
 * 미래AI랩 브랜드 · 샘플 브릿지 CTA 설정
 * ────────────────────────────────────────────────────────────
 * 링크를 바꾸려면 MIRAE_LINKS만 수정하세요. (컴포넌트 props로도 덮어쓸 수 있습니다)
 * 문구를 바꾸려면 BRIDGE_COPY만 수정하세요.
 * 이 파일 한 곳이 고객 화면·Business AX 양쪽 CTA의 Source of Truth입니다.
 */

export const MIRAE_LINKS = {
  /** 메인 CTA — "우리 회사도 만들어보기" */
  consult: "https://miraeailab.com/business-diagnosis",
  /** 다른 샘플 더 보기 */
  samples: "https://miraeailab.com/business-services",
  /** 미래AI랩 홈페이지 */
  home: "https://miraeailab.com/",
} as const;

export const BRIDGE_COPY = {
  badge: "MIRAE AI LAB",
  /** 섹션 헤드라인 */
  headline: "이 샘플이 마음에 드셨다면, 대표님 회사도 이렇게 설계해볼 수 있습니다.",
  /** 미래AI랩 소개 — 2~3줄 이내 */
  intro: "이 샘플은 미래AI랩이 기획·제작했습니다.",
  description:
    "미래AI랩은 평범한 회사를 기술·데이터·AI 기반의 성장형 기업으로 바꾸는 AX / MVP / 플랫폼 기획·개발을 진행합니다.",
  /** 메인 CTA — 전 샘플 공통 문구 (변경 금지 요청) */
  primary: "우리 회사도 만들어보기",
  /** 서브 액션 */
  samples: "다른 샘플 더 보기",
  home: "미래AI랩 홈페이지",
  /** 보조 안내 (작고 은은하게) */
  note: "상담은 회사 상황 진단부터 시작합니다. 현재 업무·데이터 상태만 알려주셔도 됩니다.",
} as const;
