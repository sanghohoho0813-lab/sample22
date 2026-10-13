/**
 * 결정적 난수 — 같은 시드면 항상 같은 수열.
 * 시연 데이터(시드·원장)는 이 생성기만 써서 "시연 초기화" 후에도 같은 데이터가 나온다.
 */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function next() {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof makeRng>;

/** 자주 쓰는 분포 도우미를 한 생성기에 묶는다 */
export function makeRng(seed: number) {
  const next = mulberry32(seed);
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const float = (min: number, max: number) => next() * (max - min) + min;
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];
  const chance = (p: number) => next() < p;
  /** 가중치 배열에서 인덱스 하나 (가중치 합이 0이면 -1) */
  const weighted = (weights: readonly number[]) => {
    let total = 0;
    for (const w of weights) total += w;
    if (total <= 0) return -1;
    let r = next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };
  return { next, int, float, pick, chance, weighted };
}

/** 누적 가중치 + 이분 탐색 — 수천 명 중 가중 추출을 빠르게 */
export function makeSampler(weights: readonly number[]) {
  const cum = new Float64Array(weights.length);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += Math.max(0, weights[i]);
    cum[i] = acc;
  }
  return (u: number) => {
    const target = u * acc;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
}
