"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateDemoData } from "./seed";
import type { AXAction, ActionStage, CartItem, DemoData, EvidenceLog, EvidenceType, Order, OrderStage, RoleKey } from "./types";
import { DEFAULT_THEME } from "./themes";

export type FontScale = "normal" | "large";
export type DeviceMode = "desktop" | "mobile";

export const ROLE_LABEL: Record<RoleKey, string> = { owner: "대표", buyer: "구매담당", ops: "운영담당", cs: "CS담당" };
export const ROLE_PERSON: Record<RoleKey, string> = { owner: "대표 정유통", buyer: "구매담당 김구매", ops: "운영담당 박운영", cs: "CS담당 이CS" };

export const ORDER_STAGE_LABEL: Record<OrderStage, string> = {
  new: "신규주문", confirmed: "주문확인", picking_wait: "피킹대기", picking: "피킹중", packing_wait: "포장대기", ship_wait: "출고대기", shipped: "출고완료", in_transit: "배송중", delivered: "배송완료", cancelled: "취소", return: "반품·교환",
};
export const CUSTOMER_STAGE_LABEL: Record<OrderStage, string> = {
  new: "주문접수", confirmed: "주문접수", picking_wait: "상품준비", picking: "상품준비", packing_wait: "상품준비", ship_wait: "상품준비", shipped: "출고완료", in_transit: "배송중", delivered: "배송완료", cancelled: "취소됨", return: "반품·교환",
};
export const ACTION_STAGE_LABEL: Record<ActionStage, string> = {
  recommended: "추천됨", reviewing: "검토중", approved: "승인", requested: "발주요청", in_progress: "실행중", done: "완료", dismissed: "보류해제", held: "보류",
};

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();

export interface UiState {
  role: RoleKey;
  theme: string;
  fontScale: FontScale;
  tutorialDone: boolean;
  customerId: string;
  cart: CartItem[];
  wishlist: string[];
  recentViews: string[];
  recentSearches: string[];
  lastOrderId?: string;
  demoResetAt?: string;
  stage: "DEMO" | "PILOT" | "PRODUCTION";
  compact: boolean;
  aiConnected: boolean;
}

export interface StoreState {
  data: DemoData;
  ui: UiState;
  hydrated: boolean;
  // ui
  setRole: (r: RoleKey) => void;
  setTheme: (t: string) => void;
  setFontScale: (f: FontScale) => void;
  setTutorialDone: (v: boolean) => void;
  setCompact: (v: boolean) => void;
  setHydrated: () => void;
  // customer
  addToCart: (skuId: string, qty?: number) => void;
  updateCartQty: (skuId: string, qty: number) => void;
  removeFromCart: (skuId: string) => void;
  toggleCartSelect: (skuId: string, v?: boolean) => void;
  toggleWishlist: (productId: string) => void;
  pushRecentView: (productId: string) => void;
  pushRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  recordEvent: (name: string, skuId?: string) => void;
  placeOrder: (opts: { addressNote?: string; isRepeat?: boolean; itemsOverride?: CartItem[] }) => Order | null;
  requestReturn: (orderId: string, skuId: string, reason: string) => void;
  cancelOrder: (orderId: string) => void;
  // ax
  setActionStage: (id: string, stage: ActionStage, opts?: { reason?: string; actor?: string; qty?: number; supplierId?: string }) => void;
  advanceOrder: (orderId: string, stage: OrderStage, actor?: string) => void;
  notifyCustomer: (orderId: string, body: string) => void;
  receiveInbound: (poId: string) => void;
  addEvidence: (e: Omit<EvidenceLog, "id" | "createdAt" | "updatedAt" | "source">) => string;
  resetDemo: () => void;
}

const initialUi = (): UiState => ({
  role: "owner",
  theme: DEFAULT_THEME,
  fontScale: "normal",
  tutorialDone: false,
  customerId: "c-001",
  cart: [],
  wishlist: [],
  recentViews: [],
  recentSearches: [],
  stage: "DEMO",
  compact: false,
  aiConnected: false,
});

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      data: generateDemoData(),
      ui: initialUi(),
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setRole: (role) => set((s) => ({ ui: { ...s.ui, role } })),
      setTheme: (theme) => set((s) => ({ ui: { ...s.ui, theme } })),
      setFontScale: (fontScale) => set((s) => ({ ui: { ...s.ui, fontScale } })),
      setTutorialDone: (tutorialDone) => set((s) => ({ ui: { ...s.ui, tutorialDone } })),
      setCompact: (compact) => set((s) => ({ ui: { ...s.ui, compact } })),

      addToCart: (skuId, qty = 1) =>
        set((s) => {
          const exists = s.ui.cart.find((c) => c.skuId === skuId);
          const cart = exists ? s.ui.cart.map((c) => (c.skuId === skuId ? { ...c, qty: c.qty + qty, selected: true } : c)) : [...s.ui.cart, { skuId, qty, selected: true }];
          const demand = s.data.demand.map((d) => (d.skuId === skuId ? { ...d, cart7d: d.cart7d + 1 } : d));
          return { ui: { ...s.ui, cart }, data: { ...s.data, demand } };
        }),
      updateCartQty: (skuId, qty) => set((s) => ({ ui: { ...s.ui, cart: s.ui.cart.map((c) => (c.skuId === skuId ? { ...c, qty: Math.max(1, qty) } : c)) } })),
      removeFromCart: (skuId) => set((s) => ({ ui: { ...s.ui, cart: s.ui.cart.filter((c) => c.skuId !== skuId) } })),
      toggleCartSelect: (skuId, v) => set((s) => ({ ui: { ...s.ui, cart: s.ui.cart.map((c) => (c.skuId === skuId ? { ...c, selected: v ?? !c.selected } : c)) } })),
      toggleWishlist: (productId) => set((s) => ({ ui: { ...s.ui, wishlist: s.ui.wishlist.includes(productId) ? s.ui.wishlist.filter((p) => p !== productId) : [productId, ...s.ui.wishlist] } })),
      pushRecentView: (productId) =>
        set((s) => {
          const skuIds = s.data.skus.filter((k) => k.productId === productId).map((k) => k.id);
          const demand = s.data.demand.map((d) => (skuIds.includes(d.skuId) ? { ...d, view7d: d.view7d + 1 } : d));
          return { ui: { ...s.ui, recentViews: [productId, ...s.ui.recentViews.filter((p) => p !== productId)].slice(0, 12) }, data: { ...s.data, demand } };
        }),
      pushRecentSearch: (q) => set((s) => ({ ui: { ...s.ui, recentSearches: [q, ...s.ui.recentSearches.filter((x) => x !== q)].slice(0, 8) } })),
      clearRecentSearches: () => set((s) => ({ ui: { ...s.ui, recentSearches: [] } })),
      recordEvent: (name, skuId) => {
        if (name === "search_product" && skuId) {
          set((s) => ({ data: { ...s.data, demand: s.data.demand.map((d) => (d.skuId === skuId ? { ...d, search7d: d.search7d + 1 } : d)) } }));
        }
      },

      placeOrder: ({ addressNote, isRepeat, itemsOverride }) => {
        const s = get();
        const cartItems = (itemsOverride ?? s.ui.cart.filter((c) => c.selected)).filter((c) => c.qty > 0);
        if (cartItems.length === 0) return null;
        const customer = s.data.customers.find((c) => c.id === s.ui.customerId)!;
        const skuById = new Map(s.data.skus.map((k) => [k.id, k]));
        const prodById = new Map(s.data.products.map((p) => [p.id, p]));
        const items = cartItems.map((c) => {
          const sku = skuById.get(c.skuId)!;
          const p = prodById.get(sku.productId)!;
          return { skuId: sku.id, productId: p.id, name: p.name, skuName: sku.name, qty: c.qty, unitPrice: sku.salePrice, unitCost: sku.cost };
        });
        const subtotal = items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
        const shippingFee = subtotal >= 30000 ? 0 : 3000;
        const now = new Date();
        const d = now.toISOString().slice(2, 10).replace(/-/g, "");
        const id = `NX${d}-${String(s.data.orders.length + 1).padStart(4, "0")}`;
        const cutoff = new Date(now); cutoff.setHours(15, 0, 0, 0);
        if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1);
        const anyStandard = items.some((it) => prodById.get(it.productId)!.deliveryType !== "fast");
        const promised = new Date(now.getTime() + (anyStandard ? 3 : now.getHours() < 15 ? 1 : 2) * 86400000);
        const firstCat = prodById.get(items[0].productId)!.categorySlug;
        const whMap: Record<string, string> = { living: "wh-A", health: "wh-E", food: "wh-B", kitchen: "wh-C", home: "wh-C", digital: "wh-E", pet: "wh-D", baby: "wh-D" };
        const order: Order = {
          id, createdAt: now.toISOString(), updatedAt: now.toISOString(), source: "demo",
          customerId: customer.id, items, subtotal, discount: 0, shippingFee, total: subtotal + shippingFee,
          stage: "new", warehouseId: whMap[firstCat], promisedAt: promised.toISOString(), cutoffAt: cutoff.toISOString(),
          history: [{ at: now.toISOString(), stage: "new", actor: "고객", note: addressNote }], isRepeatOrder: isRepeat,
        };
        // reserve inventory + demand signal
        const inventory = s.data.inventory.map((inv) => {
          const it = items.find((x) => x.skuId === inv.skuId);
          return it ? { ...inv, reserved: inv.reserved + it.qty, updatedAt: now.toISOString() } : inv;
        });
        const demand = s.data.demand.map((dm) => {
          const it = items.find((x) => x.skuId === dm.skuId);
          if (!it) return dm;
          const daily = [...dm.dailySales];
          daily[daily.length - 1] += it.qty;
          return { ...dm, order7d: dm.order7d + it.qty, dailySales: daily };
        });
        const todayKey = now.toISOString().slice(0, 10);
        const dailySales = s.data.dailySales.map((p) => (p.date === todayKey ? { ...p, orders: p.orders + 1, revenue: p.revenue + order.total, grossMargin: p.grossMargin + items.reduce((a, it) => a + (it.unitPrice - it.unitCost) * it.qty, 0) - shippingFee } : p));
        const ev: EvidenceLog = {
          id: uid("ev"), createdAt: now.toISOString(), updatedAt: now.toISOString(), source: "demo",
          type: "CUSTOMER", title: `${isRepeat ? "Repeat Basket 재구매" : "고객 DEMO 주문"} ${id}`, detail: `${customer.name} · ${items.map((i) => `${i.name} ${i.skuName} ×${i.qty}`).join(", ")} · ${order.total.toLocaleString()}원. 재고 예약 및 수요신호 반영.`,
          actor: customer.name, orderId: id, customerId: customer.id, dataSource: "Customer Platform → Shared Store", mode: "Demo Evidence",
        };
        set({
          data: { ...s.data, orders: [order, ...s.data.orders], inventory, demand, dailySales, evidence: [ev, ...s.data.evidence] },
          ui: { ...s.ui, cart: itemsOverride ? s.ui.cart : s.ui.cart.filter((c) => !c.selected), lastOrderId: id },
        });
        return order;
      },
      requestReturn: (orderId, skuId, reason) =>
        set((s) => ({
          data: {
            ...s.data,
            returns: [{ id: uid("RT"), createdAt: nowIso(), updatedAt: nowIso(), source: "demo", orderId, skuId, reason: reason as never, status: "requested" }, ...s.data.returns],
            orders: s.data.orders.map((o) => (o.id === orderId ? { ...o, stage: "return" as OrderStage, updatedAt: nowIso(), history: [...o.history, { at: nowIso(), stage: "return" as OrderStage, actor: "고객", note: reason }] } : o)),
          },
        })),
      cancelOrder: (orderId) =>
        set((s) => {
          const o = s.data.orders.find((x) => x.id === orderId);
          if (!o || !["new", "confirmed"].includes(o.stage)) return {};
          const inventory = s.data.inventory.map((inv) => { const it = o.items.find((x) => x.skuId === inv.skuId); return it ? { ...inv, reserved: Math.max(0, inv.reserved - it.qty) } : inv; });
          return { data: { ...s.data, inventory, orders: s.data.orders.map((x) => (x.id === orderId ? { ...x, stage: "cancelled" as OrderStage, updatedAt: nowIso(), history: [...x.history, { at: nowIso(), stage: "cancelled" as OrderStage, actor: "고객" }] } : x)) } };
        }),

      setActionStage: (id, stage, opts) => {
        const s = get();
        const a = s.data.actions.find((x) => x.id === id);
        if (!a) return;
        const actor = opts?.actor ?? ROLE_PERSON[s.ui.role];
        const t = nowIso();
        let purchaseOrders = s.data.purchaseOrders;
        let inventory = s.data.inventory;
        let orders = s.data.orders;
        let warehouses = s.data.warehouses;
        let promotions = s.data.promotions;
        const newEvidence: EvidenceLog[] = [];
        const push = (type: EvidenceType, title: string, detail: string, extra: Partial<EvidenceLog> = {}) =>
          newEvidence.push({ id: uid("ev"), createdAt: t, updatedAt: t, source: "demo", type, title, detail, actor, actionId: id, dataSource: "AX Action", mode: "Demo Evidence", skuId: a.related.skuId, supplierId: a.related.supplierId, ...extra });
        const patch: Partial<AXAction> = { stage, updatedAt: t };

        if (stage === "approved" && (a.type === "urgent_po" || a.type === "alt_supplier")) {
          const qty = opts?.qty ?? a.proposal?.qty ?? 0;
          const supplierId = opts?.supplierId ?? a.proposal?.supplierId ?? a.related.supplierId!;
          const sp = s.data.supplierProducts.find((x) => x.skuId === a.related.skuId && x.supplierId === supplierId);
          const sup = s.data.suppliers.find((x) => x.id === supplierId)!;
          const lead = sp?.leadTimeDays ?? sup.leadTimeDays;
          const eta = new Date(Date.now() + lead * 86400000).toISOString().slice(0, 10);
          const poId = `PO-${new Date().toISOString().slice(2, 7).replace("-", "")}-${String(purchaseOrders.length + 19).padStart(3, "0")}`;
          purchaseOrders = [{ id: poId, createdAt: t, updatedAt: t, source: "demo", supplierId, skuId: a.related.skuId!, qty, unitCost: sp?.unitCost ?? 0, status: "requested", expectedAt: eta, actionId: id, actor }, ...purchaseOrders];
          inventory = inventory.map((inv) => (inv.skuId === a.related.skuId ? { ...inv, inboundExpected: inv.inboundExpected + qty, inboundEta: eta, updatedAt: t } : inv));
          patch.stage = "requested";
          patch.related = { ...a.related, poId };
          patch.proposal = { ...a.proposal, qty, supplierId };
          patch.result = `${sup.name}에 ${qty}개 발주 요청 (입고예정 ${eta})`;
          push("ACTION", `${a.title} — 승인·발주요청`, `${sup.name} ${qty}개, 예상 입고 ${eta}. 상품 상세 배송예정에 입고일 반영.`, { kpiDelta: `입고예정 +${qty}` });
        } else if (stage === "approved" && a.type === "priority_order") {
          const ids = new Set(a.related.orderIds ?? []);
          orders = orders.map((o) => (ids.has(o.id) && ["new", "confirmed", "picking_wait"].includes(o.stage) ? { ...o, stage: "picking" as OrderStage, assignee: "박운영", updatedAt: t, history: [...o.history, { at: t, stage: "picking" as OrderStage, actor, note: "우선처리" }] } : o));
          warehouses = warehouses.map((w) => (w.id === "wh-C" ? { ...w, congestion: 0.48 } : w));
          patch.stage = "in_progress";
          patch.result = `${ids.size}건 우선 피킹 시작, C구역 인력 재배치`;
          push("ACTION", `${a.title} — 우선처리 시작`, `${ids.size}건 피킹 단계로 전환. C구역 적체 82% → 48%.`, { kpiDelta: "C구역 적체 -34%p" });
        } else if (stage === "approved" && a.type === "delay_notice") {
          const ids = new Set(a.related.orderIds ?? []);
          orders = orders.map((o) => (ids.has(o.id) ? { ...o, customerNotified: true, updatedAt: t } : o));
          patch.stage = "done";
          patch.result = `${ids.size}건 고객 사전안내 발송`;
          push("CUSTOMER", `${a.title} — 발송`, `${ids.size}명에게 배송지연 사전안내. My Page 알림 반영.`);
        } else if (stage === "approved" && a.type === "repeat_expose") {
          patch.stage = "done";
          patch.result = "Repeat Basket 노출 시작 (Customer 홈 '다시 구매할 때' 섹션)";
          push("CUSTOMER", `${a.title} — 노출`, "재구매 주기 도래 고객에게 Repeat Basket 노출. 전환 결과는 주문 Evidence로 누적.");
        } else if (stage === "approved" && a.type === "promo_adjust") {
          promotions = promotions.map((p) => (p.id === a.related.promotionId ? { ...p, discountRate: Math.max(0.05, p.discountRate - 0.05), updatedAt: t } : p));
          patch.stage = "done";
          patch.result = "할인율 조정 적용";
          push("REVENUE", `${a.title} — 적용`, "프로모션 할인율 5%p 하향. 실질마진 변화는 프로모션 화면에서 추적.");
        } else if (stage === "approved" && a.type === "stop_po") {
          patch.stage = "done";
          patch.result = "발주 보류 확정, 재평가 일정 기록";
          push("EFFICIENCY", `${a.title} — 발주 보류`, "추가 발주 보류. 재고자금 절감 효과는 Pilot에서 실측.");
        } else if (stage === "done") {
          if (a.type === "priority_order") {
            const ids = new Set(a.related.orderIds ?? []);
            orders = orders.map((o) => (ids.has(o.id) && !["shipped", "in_transit", "delivered", "cancelled"].includes(o.stage) ? { ...o, stage: "shipped" as OrderStage, updatedAt: t, history: [...o.history, { at: t, stage: "shipped" as OrderStage, actor }] } : o));
            patch.result = `${ids.size}건 출고 완료. Customer 배송상태 반영.`;
            push("RESULT", `${a.title} — 출고 완료`, `${ids.size}건 마감 전 출고. 고객 My Page '출고완료' 반영.`, { kpiDelta: "정시출고 +12건" });
          } else {
            patch.result = a.result ?? "완료";
            push("RESULT", `${a.title} — 완료`, opts?.reason ?? "Action 완료 처리.");
          }
        } else if (stage === "held" || stage === "dismissed") {
          patch.holdReason = opts?.reason;
          push("EXCEPTION", `${a.title} — ${stage === "held" ? "보류" : "무시"}`, opts?.reason ?? "사유 미기록");
        } else if (stage === "reviewing") {
          push("ADOPTION", `${a.title} — 검토 시작`, `${actor} 확인.`);
        }
        const actions = s.data.actions.map((x) => (x.id === id ? { ...x, ...patch, evidenceIds: [...x.evidenceIds, ...newEvidence.map((e) => e.id)] } : x));
        set({ data: { ...s.data, actions, purchaseOrders, inventory, orders, warehouses, promotions, evidence: [...newEvidence, ...s.data.evidence] } });
      },

      advanceOrder: (orderId, stage, actor) => {
        const s = get();
        const o = s.data.orders.find((x) => x.id === orderId);
        if (!o) return;
        const t = nowIso();
        const who = actor ?? ROLE_PERSON[s.ui.role];
        let inventory = s.data.inventory;
        if (stage === "shipped") {
          inventory = inventory.map((inv) => { const it = o.items.find((x) => x.skuId === inv.skuId); return it ? { ...inv, onHand: Math.max(0, inv.onHand - it.qty), reserved: Math.max(0, inv.reserved - it.qty), updatedAt: t } : inv; });
        }
        const orders = s.data.orders.map((x) => (x.id === orderId ? { ...x, stage, updatedAt: t, assignee: x.assignee ?? who, history: [...x.history, { at: t, stage, actor: who }] } : x));
        const ev: EvidenceLog = { id: uid("ev"), createdAt: t, updatedAt: t, source: "demo", type: stage === "delivered" ? "RESULT" : "ACTION", title: `주문 ${orderId} ${ORDER_STAGE_LABEL[stage]}`, detail: `${who} 처리. 고객 My Page 상태 '${CUSTOMER_STAGE_LABEL[stage]}' 반영.${stage === "shipped" ? " 재고 차감." : ""}`, actor: who, orderId, dataSource: "Fulfillment", mode: "Demo Evidence" };
        const notifications = ["shipped", "in_transit", "delivered"].includes(stage)
          ? [{ id: uid("n"), createdAt: t, updatedAt: t, source: "demo" as const, customerId: o.customerId, title: `주문 ${orderId} ${CUSTOMER_STAGE_LABEL[stage]}`, body: stage === "shipped" ? "상품이 출고되었습니다." : stage === "in_transit" ? "배송이 시작되었습니다." : "배송이 완료되었습니다.", read: false }, ...s.data.notifications]
          : s.data.notifications;
        set({ data: { ...s.data, orders, inventory, evidence: [ev, ...s.data.evidence], notifications } });
      },
      notifyCustomer: (orderId, body) =>
        set((s) => {
          const o = s.data.orders.find((x) => x.id === orderId);
          if (!o) return {};
          const t = nowIso();
          return { data: { ...s.data, orders: s.data.orders.map((x) => (x.id === orderId ? { ...x, customerNotified: true } : x)), notifications: [{ id: uid("n"), createdAt: t, updatedAt: t, source: "demo" as const, customerId: o.customerId, title: `주문 ${orderId} 안내`, body, read: false }, ...s.data.notifications] } };
        }),
      receiveInbound: (poId) => {
        const s = get();
        const po = s.data.purchaseOrders.find((p) => p.id === poId);
        if (!po || po.status === "received") return;
        const t = nowIso();
        const inventory = s.data.inventory.map((inv) => (inv.skuId === po.skuId ? { ...inv, onHand: inv.onHand + po.qty, inboundExpected: Math.max(0, inv.inboundExpected - po.qty), inboundEta: undefined, updatedAt: t } : inv));
        const purchaseOrders = s.data.purchaseOrders.map((p) => (p.id === poId ? { ...p, status: "received" as const, receivedAt: t.slice(0, 10), updatedAt: t } : p));
        const actions = s.data.actions.map((a) => (a.related.poId === poId ? { ...a, stage: "done" as ActionStage, result: `${po.qty}개 입고 완료`, updatedAt: t } : a));
        const ev: EvidenceLog = { id: uid("ev"), createdAt: t, updatedAt: t, source: "demo", type: "RESULT", title: `${poId} 입고 완료`, detail: `${po.qty}개 입고. 가용재고 증가, 고객 상품 상세 재고상태 갱신.`, actor: ROLE_PERSON[s.ui.role], skuId: po.skuId, supplierId: po.supplierId, actionId: po.actionId, kpiDelta: `가용재고 +${po.qty}`, dataSource: "Inbound", mode: "Demo Evidence" };
        set({ data: { ...s.data, inventory, purchaseOrders, actions, evidence: [ev, ...s.data.evidence] } });
      },
      addEvidence: (e) => {
        const id = uid("ev");
        const t = nowIso();
        set((s) => ({ data: { ...s.data, evidence: [{ ...e, id, createdAt: t, updatedAt: t, source: "demo" }, ...s.data.evidence] } }));
        return id;
      },
      resetDemo: () => set((s) => ({ data: generateDemoData(), ui: { ...initialUi(), theme: s.ui.theme, fontScale: s.ui.fontScale, tutorialDone: s.ui.tutorialDone, demoResetAt: nowIso() } })),
    }),
    {
      name: "nexmart-demo-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data, ui: s.ui }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

// cross-tab / iframe sync: reload persisted state when another window writes
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "nexmart-demo-v1") useStore.persist.rehydrate();
  });
}
