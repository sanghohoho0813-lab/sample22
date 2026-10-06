import { describe, expect, it } from "vitest";
import { dateKey, deliveryPromise, pct, relTime, shipCutdown, signedPct, won, wonShort } from "@/lib/format";

/** KST 기준 로컬 시각 (테스트는 TZ=Asia/Seoul로 실행된다) */
const kst = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);

describe("금액·비율 포맷", () => {
  it("원 단위는 반올림 후 천 단위 구분", () => {
    expect(won(12345.6)).toBe("12,346원");
    expect(won(0)).toBe("0원");
  });
  it("큰 금액은 만원·억원으로 축약", () => {
    expect(wonShort(9_999)).toBe("9,999원");
    expect(wonShort(125_000)).toBe("13만원");
    expect(wonShort(250_000_000)).toBe("2.5억원");
    expect(wonShort(-30_000)).toBe("-3만원");
  });
  it("비율과 부호 있는 비율", () => {
    expect(pct(0.1234)).toBe("12.3%");
    expect(signedPct(0.05)).toBe("+5%");
    expect(signedPct(-0.05)).toBe("-5%");
    expect(signedPct(0)).toBe("+0%");
  });
});

describe("relTime", () => {
  const now = kst(2026, 10, 6, 12, 0);
  it.each([
    [kst(2026, 10, 6, 11, 59, 50), "방금"],
    [kst(2026, 10, 6, 11, 30), "30분 전"],
    [kst(2026, 10, 6, 12, 20), "20분 후"],
    [kst(2026, 10, 6, 9, 0), "3시간 전"],
    [kst(2026, 10, 4, 12, 0), "2일 전"],
    [kst(2026, 10, 9, 12, 0), "3일 후"],
  ])("%s → %s", (at, expected) => {
    expect(relTime(at.toISOString(), now)).toBe(expected);
  });
});

describe("dateKey", () => {
  it("로컬 날짜를 쓴다 — KST 새벽에도 UTC 전날로 밀리지 않는다", () => {
    const earlyMorning = kst(2026, 10, 6, 0, 30);
    expect(earlyMorning.toISOString().slice(0, 10)).toBe("2026-10-05"); // 기존 방식의 함정
    expect(dateKey(earlyMorning)).toBe("2026-10-06");
  });
  it("월·일은 두 자리로 채운다", () => {
    expect(dateKey(kst(2026, 1, 2))).toBe("2026-01-02");
  });
});

describe("shipCutdown (출고마감 15:00)", () => {
  it("오전에는 오늘 마감까지 남은 시간과 내일 도착", () => {
    const r = shipCutdown(kst(2026, 10, 6, 9, 0)); // 화요일
    expect(r.beforeCutoff).toBe(true);
    expect(r.remain).toBe("6시간 0분");
    expect(r.arriveLabel).toBe("10/7(수)");
    expect(r.urgent).toBe(false);
  });
  it("마감 3시간 이내면 urgent", () => {
    expect(shipCutdown(kst(2026, 10, 6, 12, 30)).urgent).toBe(true);
  });
  it("마감 직전에는 '0분' 대신 '1분 미만'", () => {
    const r = shipCutdown(kst(2026, 10, 6, 14, 59, 30));
    expect(r.remain).toBe("1분 미만");
  });
  it("정각 15:00부터는 다음 날 마감 기준, 모레 도착", () => {
    const r = shipCutdown(kst(2026, 10, 6, 15, 0));
    expect(r.beforeCutoff).toBe(false);
    expect(r.remain).toBe("24시간 0분");
    expect(r.arriveLabel).toBe("10/8(목)");
    expect(r.urgent).toBe(false);
  });
});

describe("deliveryPromise", () => {
  const morning = kst(2026, 10, 6, 10, 5);
  const evening = kst(2026, 10, 6, 18, 0);
  it("빠른배송은 마감 전 내일, 마감 후 모레", () => {
    expect(deliveryPromise("fast", 5, undefined, morning)).toMatchObject({
      kind: "fast",
      text: "내일 10/7(수) 도착 예정",
      note: "오늘 15:00 전 주문 시 (현재 10:05)",
    });
    const late = deliveryPromise("fast", 5, undefined, evening);
    expect(late.text).toBe("모레 10/8(목) 도착 예정");
    expect(late.note).toBeUndefined();
  });
  it("일반배송은 3일 후", () => {
    expect(deliveryPromise("standard", 5, undefined, morning).text).toBe("10/9(금) 도착 예정");
  });
  it("재고가 없으면 입고 예정일 기준 예약배송, 예정이 없으면 일시품절", () => {
    expect(deliveryPromise("fast", 0, "2026-10-08", morning)).toMatchObject({
      kind: "reserve",
      short: "예약배송",
    });
    expect(deliveryPromise("fast", 0, undefined, morning)).toMatchObject({
      kind: "soldout",
      text: "일시품절",
    });
  });
});
