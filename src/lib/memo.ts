/**
 * 마지막 호출 결과를 재사용 — 같은 데이터·같은 시각으로 여러 화면이 같은 분석을 부를 때 한 번만 계산한다.
 * (데이터는 불변 객체로 교체되므로 참조 비교로 충분하다. Date는 시각 값으로 비교)
 */
export function memoLast<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let lastArgs: A | null = null;
  let last: R;
  const same = (a: unknown, b: unknown) =>
    a === b || (a instanceof Date && b instanceof Date && a.getTime() === b.getTime());
  return (...args: A) => {
    if (lastArgs && lastArgs.length === args.length && args.every((a, i) => same(a, lastArgs![i])))
      return last;
    last = fn(...args);
    lastArgs = args;
    return last;
  };
}
