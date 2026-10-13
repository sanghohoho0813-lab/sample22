import type { Page } from "@playwright/test";
import { expect, ready, test } from "./fixtures";

/**
 * 폐쇄 루프 — 고객 화면과 운영 화면이 한 저장소를 쓰므로, 한쪽의 행동이 다른 쪽 판단·상태로 바로 이어져야 한다.
 * 화면 문구가 아니라 저장된 상태(localStorage)로 숫자 연결을 확인하고, 화면에서는 사용자가 보는 결과를 확인한다.
 */
const KEY = "nexmart-demo-v1";
type Inv = { skuId: string; onHand: number; reserved: number; inboundExpected: number };
type Act = {
  id: string;
  type: string;
  stage: string;
  title: string;
  related: { skuId?: string; poId?: string };
};
type Po = { id: string; skuId: string; qty: number; status: string };
const state = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").state?.data ?? {}, KEY) as Promise<{
    inventory: Inv[];
    actions: Act[];
    purchaseOrders: Po[];
    orders: { id: string; stage: string; items: { skuId: string; qty: number }[] }[];
    notifications: { customerId: string; title: string }[];
  }>;
const drawer = (page: Page) => page.getByRole("dialog").last();

test.describe("폐쇄 루프", () => {
  test("고객 주문 → 예약재고 → 출고 예측 → 출고 → 고객 배송상태", async ({ page }) => {
    await page.goto("/product/p-001");
    await ready(page);
    await page.getByRole("button", { name: "바로 주문" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/checkout/);
    const before = await state(page);
    await page
      .getByRole("button", { name: /시연 주문하기/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/order\/complete\//);
    const orderId = decodeURIComponent(page.url().split("/").pop()!);

    // 주문 즉시 같은 SKU의 예약재고가 주문 수량만큼 늘어난다 (보유재고는 출고 때 준다)
    const s1 = await state(page);
    const item = s1.orders.find((o) => o.id === orderId)!.items[0];
    const inv0 = before.inventory.find((i) => i.skuId === item.skuId)!;
    const inv1 = s1.inventory.find((i) => i.skuId === item.skuId)!;
    expect(inv1.reserved - inv0.reserved).toBe(item.qty);
    expect(inv1.onHand).toBe(inv0.onHand);

    // 운영: 같은 주문이 출고 시뮬레이션에 들어가 예상 시각이 나온다
    await page.goto(`/ax/fulfillment?tab=list&order=${orderId}`);
    await ready(page);
    await expect(drawer(page).getByText(/출고 예측 ·/)).toBeVisible();

    // 출고까지 진행
    for (let i = 0; i < 6; i++) {
      const next = drawer(page).getByRole("button", { name: /다음 단계/ });
      if (!(await next.isVisible().catch(() => false))) break;
      const label = (await next.textContent()) ?? "";
      await next.click();
      if (label.includes("출고완료")) break;
    }
    await expect
      .poll(async () => (await state(page)).orders.find((o) => o.id === orderId)!.stage)
      .toBe("shipped");
    const s2 = await state(page);
    const inv2 = s2.inventory.find((i) => i.skuId === item.skuId)!;
    expect(inv2.onHand).toBe(inv0.onHand - item.qty);
    expect(inv2.reserved).toBe(inv0.reserved);

    // 고객: 주문 상세가 출고완료로 바뀌어 있다
    await page.goto(`/my/orders/${orderId}`);
    await ready(page);
    await expect(page.getByText("출고완료").filter({ visible: true }).first()).toBeVisible();
  });

  test("컨트롤 타워 품절 위험 → 실행 → 담당자 확인 → 발주 승인 → 입고 → 성과 측정", async ({ page }) => {
    await page.goto("/ax");
    await ready(page);
    // 데스크톱은 표의 행, 모바일은 요약 목록의 버튼
    await page.locator("tr, li > button", { hasText: "품절 위험" }).filter({ visible: true }).first().click();
    await drawer(page)
      .getByRole("button", { name: /연결된 실행 열기|실행 만들기/ })
      .click();
    const a = drawer(page);
    await a.getByRole("button", { name: "담당자 확인", exact: true }).click();
    await expect(a.getByRole("button", { name: "승인 · 발주 요청" })).toBeVisible();

    const s0 = await state(page);
    const target = s0.actions.find((x) => x.type === "urgent_po" && x.stage === "reviewing")!;
    expect(target).toBeDefined();
    const skuId = target.related.skuId!;
    const inv0 = s0.inventory.find((i) => i.skuId === skuId)!;

    await a.getByRole("button", { name: "승인 · 발주 요청" }).click();
    await expect
      .poll(async () => (await state(page)).actions.find((x) => x.id === target.id)!.stage)
      .toBe("requested");
    const s1 = await state(page);
    const po = s1.purchaseOrders.find(
      (p) => p.id === s1.actions.find((x) => x.id === target.id)!.related.poId,
    )!;
    expect(s1.inventory.find((i) => i.skuId === skuId)!.inboundExpected).toBe(inv0.inboundExpected + po.qty);

    await a.getByRole("button", { name: "입고 처리 (시연)" }).click();
    await expect
      .poll(async () => (await state(page)).actions.find((x) => x.id === target.id)!.stage)
      .toBe("done");
    expect((await state(page)).inventory.find((i) => i.skuId === skuId)!.onHand).toBe(inv0.onHand + po.qty);

    await a.getByRole("button", { name: "성과 측정 기록" }).click();
    await expect(a.getByText("실행 전").first()).toBeVisible();
    await expect
      .poll(async () => (await state(page)).actions.find((x) => x.id === target.id)!.stage)
      .toBe("measured");

    // 성과 기록 화면에 같은 실행이 측정 결과와 함께 남는다
    await page.goto("/ax/evidence");
    await ready(page);
    await expect(page.getByText(target.title).filter({ visible: true }).first()).toBeVisible();
  });

  test("입고 대기 상품 재입고 알림 신청 → 운영 입고 처리 → 고객 알림", async ({ page }) => {
    await page.goto("/product/p-060");
    await ready(page);
    // 묶음 구성은 재고가 있고, 단품만 입고 대기 — 단품을 고른다
    await page
      .getByRole("button", { name: /^단품 입고예정/ })
      .filter({ visible: true })
      .first()
      .click();
    await page.getByRole("button", { name: "재입고 알림 신청" }).filter({ visible: true }).first().click();
    await expect(page.getByText("재입고 알림 신청됨").filter({ visible: true }).first()).toBeVisible();

    const s0 = await state(page);
    const mask = s0.actions.find(
      (x) => x.type === "urgent_po" && x.stage === "requested" && x.title.includes("KF94"),
    )!;
    expect(mask).toBeDefined();
    await page.goto(`/ax/actions?id=${mask.id}`);
    await ready(page);
    await drawer(page).getByRole("button", { name: "입고 처리 (시연)" }).click();
    await expect
      .poll(async () =>
        (await state(page)).notifications.some((n) => n.customerId === "c-001" && n.title.includes("재입고")),
      )
      .toBe(true);

    await page.goto("/my?tab=noti");
    await ready(page);
    await expect(
      page
        .getByText(/KF94 마스크 50매 재입고/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  test("전역 검색(Ctrl+K)으로 SKU를 찾아 재고 상세를 연다", async ({ page, isMobile }) => {
    test.skip(isMobile, "키보드 단축키는 데스크톱 기준");
    await page.goto("/ax");
    await ready(page);
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox", { name: "검색어" });
    await expect(box).toBeFocused();
    await box.fill("물티슈");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page
      .getByRole("option", { name: /프리미엄 물티슈 100매/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/ax\/inventory\?sku=/);
    await expect(drawer(page)).toBeVisible();
  });
});
