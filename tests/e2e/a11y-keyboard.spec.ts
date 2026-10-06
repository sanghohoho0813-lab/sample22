import { expect, ready, test } from "./fixtures";

test.describe("키보드 사용", () => {
  for (const route of ["/", "/ax"]) {
    test(`${route}: 첫 Tab은 '본문 바로가기', Enter로 본문에 포커스`, async ({ page, isMobile }) => {
      test.skip(isMobile, "키보드 시나리오는 데스크톱에서만");
      await page.goto(route);
      await ready(page);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "본문 바로가기" });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press("Enter");
      await expect(page.locator("main#main")).toBeFocused();
    });
  }

  test("모바일 메뉴: Esc로 닫히고 열었던 버튼으로 포커스가 돌아온다", async ({ page, isMobile }) => {
    test.skip(!isMobile, "햄버거 메뉴는 모바일 레이아웃");
    await page.goto("/");
    await ready(page);
    const opener = page.getByRole("button", { name: /메뉴/ }).first();
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});
