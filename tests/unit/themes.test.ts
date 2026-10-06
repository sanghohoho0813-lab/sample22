import { describe, expect, it } from "vitest";
import { STATIC_INK, THEMES, contrastRatio, inkFor, themeCssVars } from "@/lib/themes";

const hexOf = (rgbVar: string) =>
  "#" +
  rgbVar
    .split(" ")
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("");

describe("contrastRatio", () => {
  it("검정/흰색은 21:1, 같은 색은 1:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("inkFor", () => {
  it("이미 충분히 진한 색은 그대로", () => {
    expect(inkFor("#15202B")).toBe("#15202B");
  });
  it("연한 브랜드 색은 AA를 넘을 때까지 진하게", () => {
    const ink = inkFor("#0FAF9A");
    expect(contrastRatio("#0FAF9A", "#FFFFFF")).toBeLessThan(4.5);
    expect(contrastRatio(ink, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("9개 테마 모두 글자색이 WCAG AA 충족", () => {
  it.each(THEMES.map((t) => [t.name, t] as const))("%s", (_, t) => {
    const v = themeCssVars(t);
    for (const key of ["--t-primary-ink-rgb", "--t-secondary-ink-rgb", "--t-accent-ink-rgb"]) {
      const ink = hexOf(v[key]);
      expect(contrastRatio(ink, t.soft), `${key} on soft`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ink, "#FFFFFF"), `${key} on white`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("고정 색(teal·orange·danger·muted) 잉크도 AA 충족", () => {
    for (const [name, hex] of Object.entries(STATIC_INK)) {
      expect(contrastRatio(hex, "#FFFFFF"), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
