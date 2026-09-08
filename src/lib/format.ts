export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
export const wonShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
  if (abs >= 10000) return `${Math.round(n / 10000).toLocaleString("ko-KR")}만원`;
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
};
export const pct = (r: number, digits = 1) => `${(r * 100).toFixed(digits)}%`;
export const signedPct = (r: number, digits = 0) => `${r >= 0 ? "+" : ""}${(r * 100).toFixed(digits)}%`;
export const num = (n: number) => Math.round(n).toLocaleString("ko-KR");

export const fmtDate = (s: string | Date, opts: "date" | "datetime" | "time" | "md" = "date") => {
  const d = typeof s === "string" ? new Date(s) : s;
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (opts === "date") return date;
  if (opts === "md") return md;
  if (opts === "time") return time;
  return `${date} ${time}`;
};

export const relTime = (s: string, now = new Date()) => {
  const diff = now.getTime() - new Date(s).getTime();
  const m = Math.round(diff / 60000);
  if (Math.abs(m) < 1) return "방금";
  if (m < 60 && m > 0) return `${m}분 전`;
  if (m < 0 && m > -60) return `${-m}분 후`;
  const h = Math.round(m / 60);
  if (h < 24 && h > 0) return `${h}시간 전`;
  if (h < 0 && h > -24) return `${-h}시간 후`;
  const d = Math.round(h / 24);
  return d > 0 ? `${d}일 전` : `${-d}일 후`;
};

export const DOW = ["일", "월", "화", "수", "목", "금", "토"];

/** 빠른배송 출고마감(15:00) 기준 카운트다운 */
export function shipCutdown(now: Date, cutoffHour = 15) {
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, 0, 0, 0);
  const beforeCutoff = now.getTime() < cutoff.getTime();
  if (!beforeCutoff) cutoff.setDate(cutoff.getDate() + 1);
  const ms = cutoff.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const arrive = new Date(now.getTime() + (beforeCutoff ? 1 : 2) * 86400000);
  return {
    beforeCutoff,
    hours: h,
    minutes: m,
    /** "3시간 12분" */
    remain: h > 0 ? `${h}시간 ${m}분` : `${m}분`,
    /** "9/9(수)" */
    arriveLabel: `${arrive.getMonth() + 1}/${arrive.getDate()}(${DOW[arrive.getDay()]})`,
    arrive,
    urgent: beforeCutoff && ms < 3 * 3600000,
  };
}

export function todayLabel(now: Date, withTime = true) {
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DOW[now.getDay()]})`;
  return withTime ? `${date} ${p(now.getHours())}:${p(now.getMinutes())}` : date;
}

export function deliveryPromise(type: "fast" | "standard" | "reserve", available: number, inboundEta?: string, now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const addD = (n: number) => new Date(now.getTime() + n * 86400000);
  const label = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`;
  if (available <= 0) {
    if (inboundEta) {
      const eta = new Date(inboundEta);
      const arrive = new Date(eta.getTime() + 2 * 86400000);
      return { kind: "reserve" as const, text: `입고예정 · ${label(arrive)} 도착 예약`, short: "예약배송", eta: arrive };
    }
    return { kind: "soldout" as const, text: "일시품절", short: "품절", eta: undefined };
  }
  if (type === "fast") {
    const beforeCutoff = now.getHours() < 15;
    const eta = addD(beforeCutoff ? 1 : 2);
    return { kind: "fast" as const, text: `${beforeCutoff ? "내일" : "모레"} ${label(eta)} 도착 예정`, short: "빠른배송", eta, note: beforeCutoff ? `오늘 15:00 전 주문 시 (현재 ${p(now.getHours())}:${p(now.getMinutes())})` : undefined };
  }
  const eta = addD(3);
  return { kind: "standard" as const, text: `${label(eta)} 도착 예정`, short: "일반배송", eta };
}
