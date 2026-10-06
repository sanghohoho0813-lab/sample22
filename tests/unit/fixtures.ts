import { generateDemoData } from "@/lib/seed";

/** 테스트 기준 시각: 2026-10-06(화) 10:00 KST — 출고마감(15:00) 전 */
export const NOW = new Date(2026, 9, 6, 10, 0, 0);

export const demo = () => generateDemoData(NOW);
