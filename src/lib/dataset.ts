/**
 * 원장 조회 — 저장된 시연 데이터(data)와 같은 생성 시각의 원장을 돌려준다.
 * 원장은 저장하지 않으므로, 메모리에 없으면 같은 시각으로 시드를 다시 만들어 얻는다 (결정적).
 */
import type { DemoData } from "./types";
import type { Ledger } from "./ledger";
import { cachedLedger } from "./ledgerCache";
import { generateDemoData } from "./seed";

export function getLedger(data: DemoData): Ledger {
  const hit = cachedLedger(data.generatedAt);
  if (hit) return hit;
  generateDemoData(new Date(data.generatedAt), { ledgerOnly: true });
  return cachedLedger(data.generatedAt)!;
}
