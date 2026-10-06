import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_ROUTES, expect, ready, test } from "./fixtures";

const axeSource = readFileSync(join(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8");

type AxeViolation = { id: string; impact: string; help: string; nodes: { target: string[] }[] };

for (const route of ALL_ROUTES) {
  test.describe(route, () => {
    test("렌더링 · 제목 · 가로 넘침 없음", async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await ready(page);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page).toHaveTitle(/NEXMART/);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, "가로 스크롤이 생기면 안 된다").toBeLessThanOrEqual(0);
    });

    test("접근성 (axe · WCAG 2.1 AA) — serious/critical 위반 0건", async ({ page }) => {
      await page.goto(route);
      await ready(page);
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const axe = (
          window as unknown as { axe: { run: (...a: unknown[]) => Promise<{ violations: unknown[] }> } }
        ).axe;
        const r = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
        return r.violations;
      });
      const blocking = (violations as AxeViolation[])
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `${v.id} (${v.nodes.length}) ${v.help} → ${v.nodes[0]?.target.join(" ")}`);
      expect(blocking).toEqual([]);
    });
  });
}
