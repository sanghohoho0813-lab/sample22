import type { Page } from "@playwright/test";
import { expect, ready, STORE_KEY, test } from "./fixtures";

/**
 * 화면을 떠나지 않고 처리하는 패널들 — 알림 센터, 배송조회 빠른 조회, 실행 상세 연속 처리.
 * 패널이 보이는지뿐 아니라 저장된 상태(읽음 처리)까지 확인한다.
 */
const unreadOf = (page: Page) =>
  page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k) ?? "{}").state;
    const cid = s?.ui?.customerId ?? "c-001";
    return (s?.data?.notifications ?? []).filter(
      (n: { customerId: string; read: boolean }) => n.customerId === cid && !n.read,
    ).length as number;
  }, STORE_KEY);

test("고객 알림 센터: 열어서 보고 닫으면 읽음으로 바뀐다", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const bell = page.getByRole("button", { name: /^알림/ }).filter({ visible: true }).first();
  await expect(bell).toHaveAccessibleName(/새 알림 \d+개/);
  await bell.click();
  const panel = page.getByRole("dialog", { name: /알림/ });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect.poll(() => unreadOf(page)).toBe(0);
  await expect(bell).toHaveAccessibleName("알림");
});

test("배송조회: 내 최근 주문 번호를 누르면 바로 진행 단계가 보인다", async ({ page }) => {
  await page.goto("/track");
  await ready(page);
  const chip = page.getByRole("button", { name: /^NX\d{6}-\d{4}$/ }).first();
  const id = (await chip.textContent())!.trim();
  await chip.click();
  await expect(page.getByRole("textbox", { name: "주문번호" })).toHaveValue(id);
  const card = page.getByRole("article", { name: `주문 ${id}` }).first();
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("list", { name: "배송 진행 단계" }).or(card.getByText(/취소된 주문|반품/)),
  ).toBeVisible();
});

test("실행 센터: 상세를 연 채로 J/K 로 다음·이전 실행을 넘겨 본다", async ({ page, isMobile }) => {
  test.skip(isMobile, "키보드 단축키는 데스크톱 기준");
  await page.goto("/ax/actions");
  await ready(page);
  await page.locator("tbody tr").filter({ visible: true }).first().click();
  const d = page.getByRole("dialog").last();
  const first = await d.getByRole("heading").first().textContent();
  await expect(d.getByText(/^1 \/ \d+$/)).toBeVisible();
  await page.keyboard.press("j");
  await expect(d.getByText(/^2 \/ \d+$/)).toBeVisible();
  await expect(d.getByRole("heading").first()).not.toHaveText(first!);
  await page.keyboard.press("k");
  await expect(d.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(d.getByRole("heading").first()).toHaveText(first!);
});
