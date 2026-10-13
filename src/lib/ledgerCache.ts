import type { Ledger } from "./ledger";

/** 원장은 저장하지 않고 생성 시각별로 메모리에만 둔다 (같은 생성 시각 → 같은 원장) */
const cache = new Map<string, Ledger>();

export function rememberLedger(generatedAt: string, ledger: Ledger) {
  if (cache.size > 2) cache.clear();
  cache.set(generatedAt, ledger);
}

export const cachedLedger = (generatedAt: string) => cache.get(generatedAt);
