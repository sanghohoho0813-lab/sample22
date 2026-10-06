import { expect, ready, test } from "./fixtures";

test.describe("고객 주문 → AX 운영 반영", () => {
  test("검색 → 상세 → 장바구니 → 주문 → 마이페이지 → AX 출고 목록", async ({ page, isMobile }) => {
    // 1) 검색
    await page.goto("/");
    await ready(page);
    const search = page.getByRole("searchbox", { name: "통합검색" }).or(page.getByLabel("통합검색")).first();
    if (isMobile) await page.goto("/search?q=%EB%AC%BC%ED%8B%B0%EC%8A%88");
    else {
      await search.fill("물티슈");
      await search.press("Enter");
    }
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(page.locator("article").first()).toBeVisible();

    // 2) 상세에서 장바구니 담기 → 토스트의 바로가기
    await page.goto("/product/p-001");
    await ready(page);
    await page
      .getByRole("button", { name: "장바구니", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByText("장바구니에 담았습니다")).toBeVisible();

    // 3) 장바구니 → 주문서
    await page.goto("/cart");
    await ready(page);
    // 데스크톱: "선택 상품 주문하기", 모바일 하단 고정바: "N원 주문하기"
    await page
      .getByRole("link", { name: /주문하기/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/checkout/);

    // 4) 주문
    await page
      .getByRole("button", { name: /시연 주문하기/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/order\/complete\//);
    await expect(page.getByRole("heading", { name: "주문이 접수되었습니다" })).toBeVisible();
    const orderId = decodeURIComponent(page.url().split("/").pop()!);
    expect(orderId).toMatch(/^NX\d{6}-\d{4}$/);

    // 5) 마이페이지에 보인다
    await page.goto("/my");
    await ready(page);
    await expect(page.getByText(`주문번호 ${orderId}`)).toBeVisible();

    // 6) 같은 주문이 AX 출고 목록에 보인다 (고객 화면과 운영 화면이 한 저장소를 공유)
    await page.goto("/ax/fulfillment?tab=list");
    await ready(page);
    await expect(page.getByText(orderId).filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe("주문 안정성", () => {
  test("바로 주문은 이 상품만 주문서로 보낸다 (장바구니 다른 상품은 유지)", async ({ page }) => {
    await page.goto("/product/p-002");
    await ready(page);
    await page
      .getByRole("button", { name: "장바구니", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await page.goto("/product/p-001");
    await ready(page);
    await page.getByRole("button", { name: "바로 주문" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText("프리미엄 물티슈").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("액상 세탁세제")).toHaveCount(0);
    await page.goto("/cart");
    await ready(page);
    await expect(page.getByText("액상 세탁세제").filter({ visible: true }).first()).toBeVisible();
  });

  test("주문 버튼을 연타해도 주문은 1건만 생긴다", async ({ page }) => {
    await page.goto("/product/p-001");
    await ready(page);
    await page
      .getByRole("button", { name: "장바구니", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await page.goto("/checkout");
    await ready(page);
    const before = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) ?? "{}").state?.data?.orders?.length ?? 0,
      "nexmart-demo-v1",
    );
    const pay = page
      .getByRole("button", { name: /시연 주문하기/ })
      .filter({ visible: true })
      .first();
    await pay.click({ clickCount: 3, delay: 20 }).catch(() => {});
    await expect(page).toHaveURL(/\/order\/complete\//);
    const after = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) ?? "{}").state?.data?.orders?.length ?? 0,
      "nexmart-demo-v1",
    );
    expect(after - before).toBe(1);
  });
});
