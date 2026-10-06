import { test as base, expect, type Page } from "@playwright/test";

export const STORE_KEY = "nexmart-demo-v1";

/**
 * 모든 테스트 공통:
 * - 외부 요청(웹폰트 CDN 등)은 막는다 — 네트워크 상태와 무관하게 같은 결과
 * - 첫 방문 튜토리얼은 끈 상태로 시작 (튜토리얼 자체는 별도 테스트)
 * - 페이지 오류·콘솔 오류를 모아 테스트 끝에 0건인지 확인
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text();
        if (t.includes("Failed to load resource") || t.includes("ERR_FAILED")) return; // 막아둔 외부 요청
        errors.push(`${page.url()} :: ${t.slice(0, 300)}`);
      });
      await use(errors);
      expect(errors, "페이지·콘솔 오류가 없어야 한다").toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    await page.route("**/*", (r) => {
      const url = new URL(r.request().url());
      return url.hostname === "localhost" ? r.continue() : r.abort();
    });
    await page.addInitScript((key) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify({ state: { ui: { tutorialDone: true } }, version: 3 }));
    }, STORE_KEY);
    await use(page);
  },
});

export { expect };

/** 화면이 그려지고 React가 이벤트를 받을 수 있을 때까지(하이드레이션) 기다린다 */
export async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html[data-hydrated]")).toHaveCount(1);
  await expect(page.locator("main#main")).toBeVisible();
}

export const CUSTOMER_ROUTES = [
  "/",
  "/category",
  "/category/living",
  "/search?q=%EB%AC%BC%ED%8B%B0%EC%8A%88",
  "/product/p-001",
  "/cart",
  "/checkout",
  "/my",
  "/my/repeat",
  "/track",
  "/fast",
  "/deals",
];

export const AX_ROUTES = [
  "/ax",
  "/ax/actions",
  "/ax/sales",
  "/ax/products",
  "/ax/inventory",
  "/ax/suppliers",
  "/ax/fulfillment",
  "/ax/customers",
  "/ax/promotions",
  "/ax/returns",
  "/ax/evidence",
  "/ax/why",
  "/ax/presentation",
  "/ax/settings",
];

export const ALL_ROUTES = [...CUSTOMER_ROUTES, ...AX_ROUTES];
