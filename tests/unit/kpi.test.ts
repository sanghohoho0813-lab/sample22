import { describe, expect, it } from "vitest";
import { safeDiv } from "@/lib/kpi";

describe("safeDiv", () => {
  it("0으로 나누면 0 (NaN·Infinity가 화면에 나가지 않도록)", () => {
    expect(safeDiv(5, 0)).toBe(0);
    expect(safeDiv(6, 3)).toBe(2);
  });
});
