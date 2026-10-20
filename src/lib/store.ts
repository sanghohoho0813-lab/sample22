"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateDemoData } from "./seed";
import { buildSkuInsights } from "./engines";
import type {
  ActivityEntry,
  AXAction,
  ActionStage,
  CartItem,
  Notification as AppNotification,
  DemoData,
  EvidenceLog,
  EvidenceType,
  Order,
  OrderStage,
  RoleKey,
} from "./types";
import { DEFAULT_THEME } from "./themes";
import { STAGE_LABEL } from "./labels";
import { dateKey } from "./format";
import { getLedger } from "./dataset";
import { cutoffOnOrAfter, forecastShipments, isPreShip } from "./fulfillment";
import { DEFAULT_COST_MODEL, orderEconomics, type CostModel } from "./costs";
import type { OpsException } from "./control";
import { draftFromException, quickContext } from "./actionFactory";
import { measureAction } from "./lifecycle";
import { returnSignals } from "./returns";

export type FontScale = "normal" | "large";
export type DeviceMode = "desktop" | "mobile";

export const ROLE_LABEL: Record<RoleKey, string> = {
  owner: "대표",
  buyer: "구매담당",
  ops: "운영담당",
  cs: "CS담당",
};
export const ROLE_PERSON: Record<RoleKey, string> = {
  owner: "대표 정유통",
  buyer: "구매담당 김구매",
  ops: "운영담당 박운영",
  cs: "CS담당 이CS",
};

export const ORDER_STAGE_LABEL: Record<OrderStage, string> = {
  new: "신규주문",
  confirmed: "주문확인",
  picking_wait: "피킹대기",
  picking: "피킹중",
  packing_wait: "포장대기",
  ship_wait: "출고대기",
  shipped: "출고완료",
  in_transit: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
  return: "반품·교환",
};
export const CUSTOMER_STAGE_LABEL: Record<OrderStage, string> = {
  new: "주문접수",
  confirmed: "주문접수",
  picking_wait: "상품준비",
  picking: "상품준비",
  packing_wait: "상품준비",
  ship_wait: "상품준비",
  shipped: "출고완료",
  in_transit: "배송중",
  delivered: "배송완료",
  cancelled: "취소됨",
  return: "반품·교환",
};
export const ACTION_STAGE_LABEL: Record<ActionStage, string> = {
  recommended: "추천됨",
  reviewing: "담당자 확인",
  approved: "승인",
  requested: "실행중 · 입고 대기",
  in_progress: "실행중",
  done: "완료",
  measured: "성과 측정",
  dismissed: "기각",
  held: "보류",
};

/** localStorage 래퍼 — 용량 초과·Private 모드 등에서 예외로 앱이 죽지 않도록 */
let lastWritten: string | null = null;
const memoryFallback = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return memoryFallback.get(k) ?? null;
    }
  },
  setItem: (k: string, v: string) => {
    lastWritten = v;
    try {
      localStorage.setItem(k, v);
    } catch {
      memoryFallback.set(k, v);
    }
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      memoryFallback.delete(k);
    }
  },
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
  pilot: PilotState;
  /** 비용 기준 (이익 분석) — 회사가 입력 */
  costModel: CostModel;
}

export interface BaselineEntry {
  value?: number;
  measuredAt?: string;
  note?: string;
}
export interface PilotState {
  owner?: string;
  ownerRole?: RoleKey;
  startedAt?: string;
  baselines: Record<string, BaselineEntry>;
  checklist: Record<string, boolean>;
}

/** Baseline 측정지점 — 숫자는 회사가 실측해 입력한다 (DO NOT INVENT) */
export const BASELINE_KPIS: {
  key: string;
  group: "COST" | "REVENUE" | "SCALE";
  label: string;
  unit: string;
  point: string;
}[] = [
  {
    key: "weekly_analysis_hours",
    group: "COST",
    label: "주간 재고·발주 분석 소요시간",
    unit: "시간/주",
    point: "구매담당이 판매·재고·공급사 자료를 대조해 발주안을 만드는 데 쓰는 주간 시간",
  },
  {
    key: "supplier_compare_min",
    group: "COST",
    label: "공급사 비교 소요시간",
    unit: "분/건",
    point: "발주 1건당 단가·납기·최소수량을 확인하는 시간 (전화·카톡 포함)",
  },
  {
    key: "urgent_po_ratio",
    group: "COST",
    label: "긴급발주 비중",
    unit: "%",
    point: "월 발주 건수 중 리드타임 미만 긴급발주 비율",
  },
  {
    key: "order_status_min",
    group: "COST",
    label: "주문상태 확인·전달시간",
    unit: "분/건",
    point: "고객 문의 1건당 물류 확인 후 회신까지 시간",
  },
  {
    key: "conversion_rate",
    group: "REVENUE",
    label: "구매 전환율",
    unit: "%",
    point: "상품상세 방문고객 대비 주문완료 고객",
  },
  {
    key: "stockout_rate",
    group: "REVENUE",
    label: "품절률",
    unit: "%",
    point: "활성 SKU 중 가용재고 0인 SKU 비율 (주간 평균)",
  },
  {
    key: "repeat_rate",
    group: "REVENUE",
    label: "재구매율",
    unit: "%",
    point: "전체 구매고객 중 2회 이상 구매 고객",
  },
  {
    key: "promo_margin",
    group: "REVENUE",
    label: "프로모션 실질마진율",
    unit: "%",
    point: "(매출 − 원가 − 할인 − 배송비) ÷ 매출, 캠페인별",
  },
  {
    key: "sku_per_buyer",
    group: "SCALE",
    label: "구매담당 1인당 관리 SKU",
    unit: "개",
    point: "활성 SKU ÷ 구매담당 인원",
  },
  {
    key: "orders_per_ops",
    group: "SCALE",
    label: "운영직원 1인당 처리 주문",
    unit: "건/일",
    point: "일 출고 주문 ÷ 물류·운영 인원",
  },
  {
    key: "self_service_ratio",
    group: "SCALE",
    label: "마이페이지 자체 조회 비율",
    unit: "%",
    point: "배송 문의 중 마이페이지에서 자체 확인한 비율",
  },
];

export const PILOT_CHECKLIST: { key: string; label: string; auto?: boolean }[] = [
  { key: "owner", label: "AX 책임자 1명 지정 (KPI·데이터 품질·교육·이슈 책임)", auto: true },
  { key: "baseline", label: "비용 · 매출 · 확장성 각 1개 이상 기준값 입력", auto: true },
  { key: "data_intake", label: "상품·SKU·공급사·재고 실데이터 정리 (CSV 가져오기 준비)" },
  { key: "training", label: "대표·구매·운영·CS 역할별 사용 교육 1회" },
  { key: "event", label: "핵심 행동 이벤트 19종 수집 구조 확인 (연결 모듈 준비)" },
];

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
  /** 시연 데이터 교체 (재수화·새 시연일) */
  replaceData: (data: DemoData) => void;
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
  placeOrder: (opts: {
    addressNote?: string;
    isRepeat?: boolean;
    itemsOverride?: CartItem[];
  }) => Order | null;
  requestReturn: (orderId: string, skuId: string, reason: string) => void;
  cancelOrder: (orderId: string) => void;
  // ax
  setActionStage: (
    id: string,
    stage: ActionStage,
    opts?: { reason?: string; actor?: string; qty?: number; supplierId?: string },
  ) => void;
  /** 재고가 모자라 출고할 수 없으면 false */
  advanceOrder: (orderId: string, stage: OrderStage, actor?: string) => boolean;
  notifyCustomer: (orderId: string, body: string) => void;
  /** 고객 알림 모두 읽음 (알림 패널을 닫을 때) */
  markNotificationsRead: (customerId: string) => void;
  receiveInbound: (poId: string) => void;
  addEvidence: (e: Omit<EvidenceLog, "id" | "createdAt" | "updatedAt" | "source">) => string;
  createActionFromSku: (skuId: string) => string | null;
  createPriorityAction: (orderIds: string[]) => string | null;
  /** 컨트롤 타워 예외 → 실행 (이미 연결된 실행이 있으면 그 id) */
  createActionFromException: (ex: OpsException) => string | null;
  setCostModel: (patch: Partial<CostModel>) => void;
  /** 고객 재입고 알림 신청 → 수요신호 */
  requestRestock: (skuId: string) => void;
  setPilot: (patch: Partial<PilotState>) => void;
  setBaseline: (key: string, entry: BaselineEntry) => void;
  setStage: (stage: UiState["stage"]) => void;
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
  pilot: { baselines: {}, checklist: {} },
  costModel: DEFAULT_COST_MODEL,
});

/**
 * 저장된 시연 데이터가 있으면 그대로 쓰고, 없을 때만 새로 만든다 (첫 방문 외에는 시드 계산 생략).
 * 서버 렌더·하이드레이션 전에는 빈 데이터 — 화면은 ClientGate가 자리표시로 가린다.
 */
const EMPTY_DATA: DemoData = {
  generatedAt: "",
  categories: [],
  brands: [],
  products: [],
  skus: [],
  suppliers: [],
  supplierProducts: [],
  warehouses: [],
  inventory: [],
  purchaseOrders: [],
  customers: [],
  demand: [],
  dailySales: [],
  categorySales: [],
  orders: [],
  returns: [],
  promotions: [],
  actions: [],
  evidence: [],
  notifications: [],
  aggregates: {
    customerCount: 0,
    orderCount90d: 0,
    returnCount90d: 0,
    repeatCustomerRate: 0,
    detailVisitors30d: 0,
    cartEntrants30d: 0,
    orderers30d: 0,
  },
};

/** 시연 데이터가 오늘 만든 것이 아니면 새 시연일로 갱신 (출고마감·배송약속이 '오늘' 기준이므로) */
export const isStaleData = (d: DemoData, now = new Date()) =>
  !d.generatedAt || dateKey(new Date(d.generatedAt)) !== dateKey(now);

const bulkyOfData = (data: DemoData) => {
  const m = new Map(data.products.map((p) => [p.id, !!p.bulky]));
  return (pid: string) => m.get(pid) ?? false;
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      data: EMPTY_DATA,
      ui: initialUi(),
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      replaceData: (data) => set({ data }),
      setRole: (role) => set((s) => ({ ui: { ...s.ui, role } })),
      setTheme: (theme) => set((s) => ({ ui: { ...s.ui, theme } })),
      setFontScale: (fontScale) => set((s) => ({ ui: { ...s.ui, fontScale } })),
      setTutorialDone: (tutorialDone) => set((s) => ({ ui: { ...s.ui, tutorialDone } })),
      setCompact: (compact) => set((s) => ({ ui: { ...s.ui, compact } })),

      addToCart: (skuId, qty = 1) =>
        set((s) => {
          const exists = s.ui.cart.find((c) => c.skuId === skuId);
          const cart = exists
            ? s.ui.cart.map((c) => (c.skuId === skuId ? { ...c, qty: c.qty + qty, selected: true } : c))
            : [...s.ui.cart, { skuId, qty, selected: true }];
          const demand = s.data.demand.map((d) => (d.skuId === skuId ? { ...d, cart7d: d.cart7d + 1 } : d));
          return { ui: { ...s.ui, cart }, data: { ...s.data, demand } };
        }),
      updateCartQty: (skuId, qty) =>
        set((s) => ({
          ui: {
            ...s.ui,
            cart: s.ui.cart.map((c) => (c.skuId === skuId ? { ...c, qty: Math.max(1, qty) } : c)),
          },
        })),
      removeFromCart: (skuId) =>
        set((s) => ({ ui: { ...s.ui, cart: s.ui.cart.filter((c) => c.skuId !== skuId) } })),
      toggleCartSelect: (skuId, v) =>
        set((s) => ({
          ui: {
            ...s.ui,
            cart: s.ui.cart.map((c) => (c.skuId === skuId ? { ...c, selected: v ?? !c.selected } : c)),
          },
        })),
      toggleWishlist: (productId) =>
        set((s) => ({
          ui: {
            ...s.ui,
            wishlist: s.ui.wishlist.includes(productId)
              ? s.ui.wishlist.filter((p) => p !== productId)
              : [productId, ...s.ui.wishlist],
          },
        })),
      pushRecentView: (productId) =>
        set((s) => {
          const skuIds = s.data.skus.filter((k) => k.productId === productId).map((k) => k.id);
          const demand = s.data.demand.map((d) =>
            skuIds.includes(d.skuId) ? { ...d, view7d: d.view7d + 1 } : d,
          );
          return {
            ui: {
              ...s.ui,
              recentViews: [productId, ...s.ui.recentViews.filter((p) => p !== productId)].slice(0, 12),
            },
            data: { ...s.data, demand },
          };
        }),
      pushRecentSearch: (q) =>
        set((s) => ({
          ui: { ...s.ui, recentSearches: [q, ...s.ui.recentSearches.filter((x) => x !== q)].slice(0, 8) },
        })),
      clearRecentSearches: () => set((s) => ({ ui: { ...s.ui, recentSearches: [] } })),
      recordEvent: (name, skuId) => {
        if (name === "search_product" && skuId) {
          set((s) => ({
            data: {
              ...s.data,
              demand: s.data.demand.map((d) => (d.skuId === skuId ? { ...d, search7d: d.search7d + 1 } : d)),
            },
          }));
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
          return {
            skuId: sku.id,
            productId: p.id,
            name: p.name,
            skuName: sku.name,
            qty: c.qty,
            unitPrice: sku.salePrice,
            unitCost: sku.cost,
          };
        });
        const subtotal = items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
        const cm = s.ui.costModel ?? DEFAULT_COST_MODEL;
        const shippingFee = subtotal >= cm.freeShippingThreshold ? 0 : cm.shippingFee;
        const now = new Date();
        const d = dateKey(now).slice(2).replace(/-/g, "");
        // 같은 날 주문번호 중 가장 큰 번호 + 1 (시드 주문과 겹치지 않게)
        const maxSeq = s.data.orders
          .filter((o) => o.id.startsWith(`NX${d}-`))
          .reduce((m, o) => Math.max(m, Number(o.id.split("-")[1]) || 0), 0);
        const id = `NX${d}-${String(maxSeq + 1).padStart(4, "0")}`;
        const cutoff = cutoffOnOrAfter(now);
        const anyStandard = items.some((it) => prodById.get(it.productId)!.deliveryType !== "fast");
        const promised = new Date(cutoff.getTime() + (anyStandard ? 3 : 1) * 86400000);
        promised.setHours(21, 0, 0, 0);
        const firstCat = prodById.get(items[0].productId)!.categorySlug;
        const whMap: Record<string, string> = {
          living: "wh-A",
          health: "wh-E",
          food: "wh-B",
          kitchen: "wh-C",
          home: "wh-C",
          digital: "wh-E",
          pet: "wh-D",
          baby: "wh-D",
        };
        const order: Order = {
          id,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          source: "demo",
          customerId: customer.id,
          items,
          subtotal,
          discount: 0,
          shippingFee,
          total: subtotal + shippingFee,
          stage: "new",
          warehouseId: whMap[firstCat],
          promisedAt: promised.toISOString(),
          cutoffAt: cutoff.toISOString(),
          history: [{ at: now.toISOString(), stage: "new", actor: "고객", note: addressNote }],
          isRepeatOrder: isRepeat,
          channel: "app",
        };
        // reserve inventory + demand signal
        const inventory = s.data.inventory.map((inv) => {
          const it = items.find((x) => x.skuId === inv.skuId);
          return it ? { ...inv, reserved: inv.reserved + it.qty, updatedAt: now.toISOString() } : inv;
        });
        // 오늘 접수 수량에 더한다 (일평균 판매속도는 완료된 날 기준이라 바뀌지 않음 — 대신 예약재고가 늘어 가용재고가 준다)
        const demand = s.data.demand.map((dm) => {
          const it = items.find((x) => x.skuId === dm.skuId);
          return it ? { ...dm, today: (dm.today ?? 0) + it.qty } : dm;
        });
        const todayKey = dateKey(now);
        const econ = orderEconomics(
          { channel: "app", lines: items, discount: 0, shippingFee },
          bulkyOfData(s.data),
          cm,
        );
        const dailySales = s.data.dailySales.map((p) =>
          p.date === todayKey
            ? {
                ...p,
                orders: p.orders + 1,
                revenue: p.revenue + econ.net,
                cogs: (p.cogs ?? 0) + econ.cogs,
                shippingCost: p.shippingCost + econ.shipCost - econ.shippingFee,
                grossMargin: p.grossMargin + econ.net - econ.cogs - (econ.shipCost - econ.shippingFee),
              }
            : p,
        );
        const ev: EvidenceLog = {
          id: uid("ev"),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          source: "demo",
          type: "CUSTOMER",
          title: `${isRepeat ? "다시 구매 주문" : "고객 시연 주문"} ${id}`,
          detail: `${customer.name} · ${items.map((i) => `${i.name} ${i.skuName} ×${i.qty}`).join(", ")} · ${order.total.toLocaleString()}원. 재고 예약 및 수요신호 반영.`,
          actor: customer.name,
          orderId: id,
          customerId: customer.id,
          dataSource: "고객 플랫폼 → 공유 저장소",
          mode: "Demo Evidence",
        };
        set({
          data: {
            ...s.data,
            orders: [order, ...s.data.orders],
            inventory,
            demand,
            dailySales,
            evidence: [ev, ...s.data.evidence],
          },
          ui: {
            ...s.ui,
            cart: itemsOverride ? s.ui.cart : s.ui.cart.filter((c) => !c.selected),
            lastOrderId: id,
          },
        });
        return order;
      },
      requestReturn: (orderId, skuId, reason) =>
        set((s) => ({
          data: {
            ...s.data,
            returns: [
              {
                id: uid("RT"),
                createdAt: nowIso(),
                updatedAt: nowIso(),
                source: "demo",
                orderId,
                skuId,
                reason: reason as never,
                status: "requested",
              },
              ...s.data.returns,
            ],
            orders: s.data.orders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    stage: "return" as OrderStage,
                    updatedAt: nowIso(),
                    history: [
                      ...o.history,
                      { at: nowIso(), stage: "return" as OrderStage, actor: "고객", note: reason },
                    ],
                  }
                : o,
            ),
          },
        })),
      cancelOrder: (orderId) =>
        set((s) => {
          const o = s.data.orders.find((x) => x.id === orderId);
          if (!o || !["new", "confirmed"].includes(o.stage)) return {};
          const inventory = s.data.inventory.map((inv) => {
            const it = o.items.find((x) => x.skuId === inv.skuId);
            return it ? { ...inv, reserved: Math.max(0, inv.reserved - it.qty) } : inv;
          });
          return {
            data: {
              ...s.data,
              inventory,
              orders: s.data.orders.map((x) =>
                x.id === orderId
                  ? {
                      ...x,
                      stage: "cancelled" as OrderStage,
                      updatedAt: nowIso(),
                      history: [
                        ...x.history,
                        { at: nowIso(), stage: "cancelled" as OrderStage, actor: "고객" },
                      ],
                    }
                  : x,
              ),
            },
          };
        }),

      setActionStage: (id, stage, opts) => {
        const s = get();
        const a = s.data.actions.find((x) => x.id === id);
        if (!a) return;
        const actor = opts?.actor ?? ROLE_PERSON[s.ui.role];
        const now = new Date();
        const t = now.toISOString();
        const bulkyOf = bulkyOfData(s.data);
        let { purchaseOrders, inventory, orders, warehouses, promotions, notifications, suppliers } = s.data;
        const newEvidence: EvidenceLog[] = [];
        const push = (type: EvidenceType, title: string, detail: string, extra: Partial<EvidenceLog> = {}) =>
          newEvidence.push({
            id: uid("ev"),
            createdAt: t,
            updatedAt: t,
            source: "demo",
            type,
            title,
            detail,
            actor,
            actionId: id,
            dataSource: "AX 실행",
            mode: "Demo Evidence",
            skuId: a.related.skuId,
            supplierId: a.related.supplierId,
            ...extra,
          });
        const patch: Partial<AXAction> = { updatedAt: t };
        const steps: ActivityEntry[] = [];
        const step = (to: ActionStage, note: string, from: ActionStage = steps.at(-1)?.to ?? a.stage) =>
          steps.push({ at: t, actor, from, to, note });
        /** 출고 시뮬레이션으로 대상 주문 중 마감 초과(이월·재고부족 포함) 예상 건수 */
        const missed = (d: DemoData, ids?: Set<string>, zone?: string) =>
          forecastShipments(d, now, { bulkyOf }).orders.filter(
            (p) =>
              ["late", "overdue", "blocked"].includes(p.status) &&
              (!ids || ids.has(p.order.id)) &&
              (!zone || p.warehouseId === zone),
          ).length;

        if (stage === "reviewing") {
          step("reviewing", opts?.reason || "담당자 확인 — 근거·대상 검토");
          push("ADOPTION", `${a.title} — 담당자 확인`, `${actor} 확인 시작.`);
        } else if (stage === "approved") {
          step("approved", "승인");
          if (a.type === "urgent_po" || a.type === "alt_supplier") {
            const qty = opts?.qty ?? a.proposal?.qty ?? 0;
            const supplierId = opts?.supplierId ?? a.proposal?.supplierId ?? a.related.supplierId!;
            const sp = s.data.supplierProducts.find(
              (x) => x.skuId === a.related.skuId && x.supplierId === supplierId,
            );
            const sup = s.data.suppliers.find((x) => x.id === supplierId)!;
            const lead = sp?.leadTimeDays ?? sup.leadTimeDays;
            const eta = dateKey(new Date(now.getTime() + lead * 86400000));
            const ym = dateKey(now).slice(2, 7).replace("-", "");
            const seq = purchaseOrders
              .filter((p) => p.id.startsWith(`PO-${ym}-`))
              .reduce((m, p) => Math.max(m, Number(p.id.split("-")[2]) || 0), 0);
            const poId = `PO-${ym}-${String(Math.max(seq, 0) + 1).padStart(3, "0")}`;
            purchaseOrders = [
              {
                id: poId,
                createdAt: t,
                updatedAt: t,
                source: "demo",
                supplierId,
                skuId: a.related.skuId!,
                qty,
                unitCost: sp?.unitCost ?? 0,
                status: "requested",
                expectedAt: eta,
                actionId: id,
                actor,
              },
              ...purchaseOrders,
            ];
            inventory = inventory.map((inv) =>
              inv.skuId === a.related.skuId
                ? {
                    ...inv,
                    inboundExpected: inv.inboundExpected + qty,
                    inboundEta: inv.inboundEta && inv.inboundEta < eta ? inv.inboundEta : eta,
                    updatedAt: t,
                  }
                : inv,
            );
            step("requested", `${sup.name}에 ${poId} 발주 요청 (${qty}개, 입고예정 ${eta})`);
            patch.related = { ...a.related, poId };
            patch.proposal = { ...a.proposal, qty, supplierId };
            patch.result = `${sup.name} ${qty}개 발주 요청 — 입고예정 ${eta}`;
            push(
              "ACTION",
              `${a.title} — 승인·발주요청`,
              `${sup.name} ${qty}개 (${poId}), 예상 입고 ${eta}. 고객 상품 상세의 배송예정에 입고일 반영.`,
              {
                kpiDelta: `입고예정 +${qty}`,
              },
            );
          } else if (a.type === "priority_order") {
            const ids = new Set(a.related.orderIds ?? []);
            const before = missed(s.data, ids);
            orders = orders.map((o) =>
              ids.has(o.id) && isPreShip(o.stage)
                ? {
                    ...o,
                    priority: true,
                    updatedAt: t,
                    history: [...o.history, { at: t, stage: o.stage, actor, note: "우선처리 지정" }],
                  }
                : o,
            );
            const after = missed({ ...s.data, orders }, ids);
            step("in_progress", `우선처리 ${ids.size}건 지정 — 출고 대기열 재계산`);
            patch.result = `우선처리 ${ids.size}건 — 대상 주문 마감 초과 예상 ${before}건 → ${after}건 (시뮬레이션)`;
            push("ACTION", `${a.title} — 우선처리 지정`, patch.result, {
              kpiDelta: `마감 초과 예상 ${before}→${after}건`,
            });
          } else if (a.type === "staff_rebalance" && a.detail?.staffMove) {
            const mv = a.detail.staffMove;
            const before = missed(s.data, undefined, mv.to);
            warehouses = warehouses.map((w) =>
              w.id === mv.from
                ? { ...w, staff: Math.max(0, w.staff - mv.n) }
                : w.id === mv.to
                  ? { ...w, staff: w.staff + mv.n }
                  : w,
            );
            const after = missed({ ...s.data, warehouses }, undefined, mv.to);
            const fromName = warehouses.find((w) => w.id === mv.from)?.name.split(" ")[0];
            const toName = warehouses.find((w) => w.id === mv.to)?.name.split(" ")[0];
            step("in_progress", `${fromName} ${mv.n}명 → ${toName} 이동`);
            patch.result = `${fromName} ${mv.n}명 → ${toName} — ${toName} 마감 초과 예상 ${before}건 → ${after}건 (시뮬레이션)`;
            push("ACTION", `${a.title} — 재배치 시작`, patch.result, {
              kpiDelta: `마감 초과 예상 ${before}→${after}건`,
            });
          } else if (a.type === "delay_notice") {
            const ids = new Set(a.related.orderIds ?? []);
            const f = forecastShipments(s.data, now, { bulkyOf });
            const newNotes: typeof notifications = [];
            orders = orders.map((o) => {
              if (!ids.has(o.id)) return o;
              const pred = f.orders.find((p) => p.order.id === o.id);
              const ship = pred?.shipAt ?? new Date(now.getTime() + 86400000);
              const eta = new Date(ship.getTime() + 86400000);
              newNotes.push({
                id: uid("n"),
                createdAt: t,
                updatedAt: t,
                source: "demo",
                customerId: o.customerId,
                title: `주문 ${o.id} 출고 지연 안내`,
                body: `${pred?.shortSkus.length ? "일부 상품 입고 대기로" : "주문 집중으로"} 출고가 늦어집니다. 새 도착 예정 ${eta.getMonth() + 1}/${eta.getDate()}.`,
                read: false,
              });
              eta.setHours(21, 0, 0, 0);
              const later = eta.getTime() > new Date(o.promisedAt).getTime();
              return {
                ...o,
                customerNotified: true,
                promisedAt: later ? eta.toISOString() : o.promisedAt,
                updatedAt: t,
                history: [
                  ...o.history,
                  {
                    at: t,
                    stage: o.stage,
                    actor,
                    note: `출고 지연 안내 · 새 도착 예정 ${eta.getMonth() + 1}/${eta.getDate()}`,
                  },
                ],
              };
            });
            notifications = [...newNotes, ...notifications];
            step("in_progress", "안내 발송");
            step("done", `${ids.size}명 고객 사전 안내 완료`);
            patch.result = `${ids.size}명에게 지연 사유·새 도착 예정일 안내 — 고객 마이페이지 알림 반영`;
            push("CUSTOMER", `${a.title} — 발송`, patch.result, { kpiDelta: `사전 안내 ${ids.size}건` });
          } else if (a.type === "repeat_expose") {
            const cids = new Set(a.related.customerIds ?? []);
            const pname = s.data.products.find((p) => p.id === a.related.productId)?.name ?? "자주 사는 상품";
            // 알림은 시연 상세 고객(저장 고객)에게만 저장 — 나머지는 노출 대상 명단으로 관리
            const named = s.data.customers.filter((c) => cids.has(c.id));
            notifications = [
              ...named.map((c) => ({
                id: uid("n"),
                createdAt: t,
                updatedAt: t,
                source: "demo" as const,
                customerId: c.id,
                title: `${pname} 다시 살 때예요`,
                body: "평소 구매 주기가 돌아왔어요. 지난번과 같은 구성으로 한 번에 담을 수 있어요.",
                read: false,
              })),
              ...notifications,
            ];
            step("in_progress", `다시 구매 노출 시작 — 대상 ${cids.size}명`);
            patch.result = `대상 ${cids.size}명 노출 중 (고객 홈 '다시 살 때' + 알림)`;
            push("CUSTOMER", `${a.title} — 노출 시작`, `${patch.result}. 전환은 실제 주문 기록으로 측정.`);
          } else if (a.type === "promo_adjust") {
            const pr = promotions.find((p) => p.id === a.related.promotionId);
            const next = pr ? Math.max(0.05, Math.round((pr.discountRate - 0.05) * 100) / 100) : 0;
            promotions = promotions.map((p) =>
              p.id === a.related.promotionId ? { ...p, discountRate: next, updatedAt: t } : p,
            );
            step(
              "in_progress",
              `할인율 ${Math.round((pr?.discountRate ?? 0) * 100)}% → ${Math.round(next * 100)}% 적용`,
            );
            step("done", "적용 완료");
            patch.result = `할인율 ${Math.round(next * 100)}% 적용 — 이후 주문부터 이익 반영`;
            push("REVENUE", `${a.title} — 적용`, patch.result);
          } else if (a.type === "stop_po") {
            step("in_progress", "추가 발주 보류 시작");
            patch.result = "추가 발주 보류 중 — 보류 이후 발주 건수로 측정";
            push("EFFICIENCY", `${a.title} — 발주 보류`, patch.result);
          } else if (a.type === "quality_issue") {
            const route = a.detail?.route;
            if (route === "supplier" && a.related.supplierId) {
              suppliers = suppliers.map((x) =>
                x.id === a.related.supplierId
                  ? {
                      ...x,
                      contractStatus: "review" as const,
                      note: `품질 클레임 진행${a.related.poId ? ` (${a.related.poId} 로트)` : ""}`,
                      updatedAt: t,
                    }
                  : x,
              );
            }
            step(
              "in_progress",
              route === "supplier"
                ? `공급사 품질 클레임 접수${a.related.poId ? ` · ${a.related.poId} 로트 잔량 검수` : ""}`
                : route === "content"
                  ? "상세페이지 수정 요청"
                  : "출고 전 검수 강화",
            );
            patch.result = a.proposal?.note ?? "조치 진행 중";
            push("ACTION", `${a.title} — 조치 시작`, `${patch.result}. 효과는 2~4주 반품률로 측정.`);
          } else {
            step("in_progress", "실행 시작");
          }
        } else if (stage === "in_progress") {
          step("in_progress", opts?.reason || "실행 재개");
        } else if (stage === "done") {
          step("done", opts?.reason || "완료");
          patch.result = a.result ?? "완료";
          push("RESULT", `${a.title} — 완료`, opts?.reason ?? patch.result);
        } else if (stage === "measured") {
          const m = measureAction(a, s.data, getLedger(s.data), now);
          patch.measurement = m;
          step("measured", `성과 측정: ${m.metric} ${m.before} → ${m.after}`);
          push("RESULT", `${a.title} — 성과 측정`, `${m.metric}: ${m.before} → ${m.after}. ${m.note}`, {
            kpiDelta: `${m.before} → ${m.after}`,
          });
        } else if (stage === "held" || stage === "dismissed") {
          step(stage, `${stage === "held" ? "보류" : "기각"} — ${opts?.reason || "사유 미기록"}`);
          patch.holdReason = opts?.reason;
          push(
            "EXCEPTION",
            `${a.title} — ${stage === "held" ? "보류" : "기각"}`,
            opts?.reason ?? "사유 미기록",
          );
        }
        patch.stage = steps.at(-1)?.to ?? stage;
        patch.activity = [...(a.activity ?? []), ...steps];
        const actions = s.data.actions.map((x) =>
          x.id === id
            ? { ...x, ...patch, evidenceIds: [...x.evidenceIds, ...newEvidence.map((e) => e.id)] }
            : x,
        );
        set({
          data: {
            ...s.data,
            actions,
            purchaseOrders,
            inventory,
            orders,
            warehouses,
            promotions,
            notifications,
            suppliers,
            evidence: [...newEvidence, ...s.data.evidence],
          },
        });
      },

      advanceOrder: (orderId, stage, actor) => {
        const s = get();
        const o = s.data.orders.find((x) => x.id === orderId);
        if (!o) return false;
        const t = nowIso();
        const who = actor ?? ROLE_PERSON[s.ui.role];
        let inventory = s.data.inventory;
        // 보유재고가 모자라면 출고할 수 없다 (예약재고는 이 주문 몫이 이미 포함)
        if (stage === "shipped" || stage === "picking") {
          const short = o.items.some(
            (it) => (s.data.inventory.find((i) => i.skuId === it.skuId)?.onHand ?? 0) < it.qty,
          );
          if (short) return false;
        }
        if (stage === "shipped") {
          inventory = inventory.map((inv) => {
            const it = o.items.find((x) => x.skuId === inv.skuId);
            return it
              ? {
                  ...inv,
                  onHand: Math.max(0, inv.onHand - it.qty),
                  reserved: Math.max(0, inv.reserved - it.qty),
                  updatedAt: t,
                }
              : inv;
          });
        }
        const orders = s.data.orders.map((x) =>
          x.id === orderId
            ? {
                ...x,
                stage,
                updatedAt: t,
                assignee: x.assignee ?? who,
                history: [...x.history, { at: t, stage, actor: who }],
              }
            : x,
        );
        const ev: EvidenceLog = {
          id: uid("ev"),
          createdAt: t,
          updatedAt: t,
          source: "demo",
          type: stage === "delivered" ? "RESULT" : "ACTION",
          title: `주문 ${orderId} ${ORDER_STAGE_LABEL[stage]}`,
          detail: `${who} 처리. 고객 마이페이지 상태 '${CUSTOMER_STAGE_LABEL[stage]}' 반영.${stage === "shipped" ? " 재고 차감." : ""}`,
          actor: who,
          orderId,
          dataSource: "주문·출고",
          mode: "Demo Evidence",
        };
        const notifications = ["shipped", "in_transit", "delivered"].includes(stage)
          ? [
              {
                id: uid("n"),
                createdAt: t,
                updatedAt: t,
                source: "demo" as const,
                customerId: o.customerId,
                title: `주문 ${orderId} ${CUSTOMER_STAGE_LABEL[stage]}`,
                body:
                  stage === "shipped"
                    ? "상품이 출고되었습니다."
                    : stage === "in_transit"
                      ? "배송이 시작되었습니다."
                      : "배송이 완료되었습니다.",
                read: false,
              },
              ...s.data.notifications,
            ]
          : s.data.notifications;
        set({ data: { ...s.data, orders, inventory, evidence: [ev, ...s.data.evidence], notifications } });
        return true;
      },
      markNotificationsRead: (customerId) =>
        set((s) =>
          s.data.notifications.some((n) => n.customerId === customerId && !n.read)
            ? {
                data: {
                  ...s.data,
                  notifications: s.data.notifications.map((n) =>
                    n.customerId === customerId && !n.read ? { ...n, read: true } : n,
                  ),
                },
              }
            : {},
        ),
      notifyCustomer: (orderId, body) =>
        set((s) => {
          const o = s.data.orders.find((x) => x.id === orderId);
          if (!o) return {};
          const t = nowIso();
          return {
            data: {
              ...s.data,
              orders: s.data.orders.map((x) => (x.id === orderId ? { ...x, customerNotified: true } : x)),
              notifications: [
                {
                  id: uid("n"),
                  createdAt: t,
                  updatedAt: t,
                  source: "demo" as const,
                  customerId: o.customerId,
                  title: `주문 ${orderId} 안내`,
                  body,
                  read: false,
                },
                ...s.data.notifications,
              ],
            },
          };
        }),
      receiveInbound: (poId) => {
        const s = get();
        const po = s.data.purchaseOrders.find((p) => p.id === poId);
        if (!po || po.status === "received") return;
        const t = nowIso();
        const inventory = s.data.inventory.map((inv) =>
          inv.skuId === po.skuId
            ? {
                ...inv,
                onHand: inv.onHand + po.qty,
                inboundExpected: Math.max(0, inv.inboundExpected - po.qty),
                inboundEta: undefined,
                updatedAt: t,
              }
            : inv,
        );
        const purchaseOrders = s.data.purchaseOrders.map((p) =>
          p.id === poId ? { ...p, status: "received" as const, receivedAt: t.slice(0, 10), updatedAt: t } : p,
        );
        const actor = ROLE_PERSON[s.ui.role];
        const actions = s.data.actions.map((a) =>
          a.related.poId === poId && !["done", "measured", "dismissed"].includes(a.stage)
            ? {
                ...a,
                stage: "done" as ActionStage,
                result: `${po.id} ${po.qty}개 입고 완료 — 성과 측정 가능`,
                updatedAt: t,
                activity: [
                  ...(a.activity ?? []),
                  { at: t, actor, from: a.stage, to: "done" as ActionStage, note: `입고 완료 ${po.qty}개` },
                ],
              }
            : a,
        );
        const ev: EvidenceLog = {
          id: uid("ev"),
          createdAt: t,
          updatedAt: t,
          source: "demo",
          type: "RESULT",
          title: `${poId} 입고 완료`,
          detail: `${po.qty}개 입고. 가용재고 증가, 고객 상품 상세 재고상태 갱신.`,
          actor: ROLE_PERSON[s.ui.role],
          skuId: po.skuId,
          supplierId: po.supplierId,
          actionId: po.actionId,
          kpiDelta: `가용재고 +${po.qty}`,
          dataSource: "입고",
          mode: "Demo Evidence",
        };
        // 재입고 알림을 신청한 고객에게 입고 사실을 알린다 (신청 → 발주 → 입고 → 고객 알림)
        const alerts = s.data.restockAlerts ?? [];
        const waiting = alerts.filter((x) => x.skuId === po.skuId);
        const sku = s.data.skus.find((k) => k.id === po.skuId);
        const pname = sku ? s.data.products.find((x) => x.id === sku.productId)?.name : undefined;
        const restockNotes: AppNotification[] = waiting.map((x) => ({
          id: uid("n"),
          createdAt: t,
          updatedAt: t,
          source: "demo",
          customerId: x.customerId,
          title: `${pname ?? "알림 신청 상품"} 재입고`,
          body: `신청하신 ${sku?.name ?? ""} 구성이 다시 들어왔어요. 지금 주문할 수 있습니다.`,
          read: false,
        }));
        set({
          data: {
            ...s.data,
            inventory,
            purchaseOrders,
            actions,
            notifications: [...restockNotes, ...s.data.notifications],
            restockAlerts: alerts.filter((x) => x.skuId !== po.skuId),
            evidence: [
              ...(waiting.length
                ? [
                    {
                      ...ev,
                      id: uid("ev"),
                      type: "CUSTOMER" as const,
                      title: `재입고 알림 ${waiting.length}명 발송`,
                      detail: `${pname} ${sku?.name ?? ""} 입고 — 알림 신청 고객에게 발송`,
                      kpiDelta: `알림 ${waiting.length}건`,
                    },
                  ]
                : []),
              ev,
              ...s.data.evidence,
            ],
          },
        });
      },
      addEvidence: (e) => {
        const id = uid("ev");
        const t = nowIso();
        set((s) => ({
          data: {
            ...s.data,
            evidence: [{ ...e, id, createdAt: t, updatedAt: t, source: "demo" }, ...s.data.evidence],
          },
        }));
        return id;
      },
      createActionFromException: (ex) => {
        if (ex.action) return ex.action.id;
        const s = get();
        const now = new Date();
        const ledger = getLedger(s.data);
        const insights = buildSkuInsights(s.data, now);
        const ctx = quickContext(s.data, ledger, now, insights, returnSignals(s.data, ledger, now));
        const draft = draftFromException(ex, ctx);
        if (!draft) return null;
        const t = now.toISOString();
        const id = uid("act");
        const actor = ROLE_PERSON[s.ui.role];
        const ev: EvidenceLog = {
          id: uid("ev"),
          createdAt: t,
          updatedAt: t,
          source: "demo",
          type: ex.severity === "critical" ? "RISK" : "EXCEPTION",
          title: `${draft.title} — 실행 생성`,
          detail: `${actor}가 '${ex.title}' 예외에서 실행을 만들었습니다. 근거: ${ex.evidence[0] ?? ""}`,
          actor,
          actionId: id,
          skuId: draft.related.skuId,
          supplierId: draft.related.supplierId,
          dataSource: "컨트롤 타워",
          mode: "Demo Evidence",
        };
        const action: AXAction = {
          ...draft,
          id,
          createdAt: t,
          updatedAt: t,
          source: "demo",
          evidenceIds: [ev.id],
          activity: [{ at: t, actor, to: "recommended", note: `시스템 추천 · ${actor} 실행 생성` }],
        };
        set({
          data: { ...s.data, actions: [action, ...s.data.actions], evidence: [ev, ...s.data.evidence] },
        });
        return id;
      },
      createActionFromSku: (skuId) => {
        const s = get();
        const open = s.data.actions.find(
          (a) => a.related.skuId === skuId && !["done", "measured", "dismissed"].includes(a.stage),
        );
        if (open) return null;
        const now = new Date();
        const ins = buildSkuInsights(s.data, now).find((i) => i.sku.id === skuId);
        if (!ins) return null;
        const isLow = ["urgent", "stockout", "low", "rising"].includes(ins.status) && ins.recommendedQty > 0;
        const isSlow = ["slow", "overstock"].includes(ins.status);
        if (!isLow && !isSlow) return null;
        // 레이더에서 바로 만든 실행도 컨트롤 타워와 같은 경로(예외 → 실행)를 탄다
        const ex: OpsException = {
          id: `ex-manual-${skuId}`,
          kind: isLow ? "stockout" : "overstock",
          severity: ["urgent", "stockout"].includes(ins.status) ? "critical" : isLow ? "high" : "low",
          title: `${ins.product.name} ${ins.sku.name}`,
          subject: "",
          evidence: ins.reasons,
          impact: isLow
            ? {
                value: ins.calc.lostRevenue,
                unit: "원",
                label: "지금 발주해도 비는 기간 판매",
                basis: "발주량 계산식",
              }
            : {
                value: ins.excessValue,
                unit: "원",
                label: "60일 판매분을 넘는 재고 원가",
                basis: "재고 원가",
              },
          weight: 0,
          owner: "buyer",
          href: `/ax/inventory?sku=${skuId}`,
          actionType: isLow ? "urgent_po" : "stop_po",
          related: { skuId, productId: ins.product.id, supplierId: ins.sku.primarySupplierId },
        };
        return get().createActionFromException(ex);
      },
      createPriorityAction: (orderIds) => {
        const s = get();
        const covered = new Set(
          s.data.actions
            .filter(
              (a) => a.type === "priority_order" && !["done", "measured", "dismissed"].includes(a.stage),
            )
            .flatMap((a) => a.related.orderIds ?? []),
        );
        const ids = orderIds.filter((o) => !covered.has(o));
        if (!ids.length) return null;
        const ex: OpsException = {
          id: `ex-manual-priority`,
          kind: "ship_risk",
          severity: "critical",
          title: `지연위험 주문 ${ids.length}건`,
          subject: "",
          evidence: ["출고 시뮬레이션상 마감 초과 또는 경과"],
          impact: { value: ids.length, unit: "건", label: "대상 주문", basis: "출고 시뮬레이션" },
          weight: 0,
          owner: "ops",
          href: "/ax/fulfillment?tab=forecast",
          actionType: "priority_order",
          related: { orderIds: ids },
        };
        return get().createActionFromException(ex);
      },
      setCostModel: (patch) =>
        set((s) => ({ ui: { ...s.ui, costModel: { ...(s.ui.costModel ?? DEFAULT_COST_MODEL), ...patch } } })),
      requestRestock: (skuId) =>
        set((s) => {
          const t = nowIso();
          const sku = s.data.skus.find((k) => k.id === skuId);
          const p = sku ? s.data.products.find((x) => x.id === sku.productId) : undefined;
          const cid = s.ui.customerId;
          if ((s.data.restockAlerts ?? []).some((x) => x.skuId === skuId && x.customerId === cid)) return {};
          return {
            data: {
              ...s.data,
              restockAlerts: [...(s.data.restockAlerts ?? []), { skuId, customerId: cid, at: t }],
              demand: s.data.demand.map((d) =>
                d.skuId === skuId ? { ...d, restockRequests: (d.restockRequests ?? 0) + 1 } : d,
              ),
              evidence: [
                {
                  id: uid("ev"),
                  createdAt: t,
                  updatedAt: t,
                  source: "demo",
                  type: "CUSTOMER",
                  title: `${p?.name ?? skuId} 재입고 알림 신청`,
                  detail: "품절 상품에 고객이 재입고 알림을 신청 — 재고·발주 레이더의 수요신호에 반영",
                  actor: "고객",
                  skuId,
                  dataSource: "고객 플랫폼 → 공유 저장소",
                  mode: "Demo Evidence",
                },
                ...s.data.evidence,
              ],
            },
          };
        }),
      setPilot: (patch) => set((s) => ({ ui: { ...s.ui, pilot: { ...s.ui.pilot, ...patch } } })),
      setBaseline: (key, entry) =>
        set((s) => ({
          ui: {
            ...s.ui,
            pilot: {
              ...s.ui.pilot,
              baselines: { ...s.ui.pilot.baselines, [key]: { ...s.ui.pilot.baselines[key], ...entry } },
            },
          },
        })),
      setStage: (stage) => {
        const s = get();
        const t = nowIso();
        const ev: EvidenceLog = {
          id: uid("ev"),
          createdAt: t,
          updatedAt: t,
          source: "demo",
          type: "BASELINE",
          title: `진행 단계 → ${STAGE_LABEL[stage]}`,
          detail:
            stage === "PILOT"
              ? `AX 책임자 ${s.ui.pilot.owner ?? "-"} · 기준값 ${Object.values(s.ui.pilot.baselines).filter((b) => b.value !== undefined).length}개 입력. 12주 실증 시작. 화면 데이터는 실데이터 연결 전까지 시연용 시뮬레이션.`
              : `진행 단계 변경 (${ROLE_PERSON[s.ui.role]})`,
          actor: ROLE_PERSON[s.ui.role],
          dataSource: "실증 준비",
          mode: "실증 준비",
        };
        set({
          ui: {
            ...s.ui,
            stage,
            pilot: { ...s.ui.pilot, startedAt: stage === "PILOT" ? t : s.ui.pilot.startedAt },
          },
          data: { ...s.data, evidence: [ev, ...s.data.evidence] },
        });
      },
      resetDemo: () =>
        set((s) => ({
          data: generateDemoData(),
          ui: {
            ...initialUi(),
            theme: s.ui.theme,
            fontScale: s.ui.fontScale,
            tutorialDone: s.ui.tutorialDone,
            costModel: s.ui.costModel ?? DEFAULT_COST_MODEL,
            demoResetAt: nowIso(),
          },
        })),
    }),
    {
      name: "nexmart-demo-v1",
      // v2: 화면 문구 한글화 · v3: 일자 키 로컬 기준 · v4: 90일 주문 원장·출고 시뮬레이션 기반 데이터
      // — 구조가 바뀌면 시연 데이터만 새로 만들고 설정(테마·글자·역할·비용 기준)은 유지
      version: 4,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return (version < 4 ? { ...p, data: undefined } : p) as StoreState;
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ data: s.data, ui: s.ui }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return {
          ...current,
          ...p,
          data: p.data ?? current.data,
          ui: {
            ...initialUi(),
            ...(p.ui ?? {}),
            pilot: { baselines: {}, checklist: {}, ...(p.ui?.pilot ?? {}) },
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        // 서버 렌더에서는 만들지 않는다 (화면은 하이드레이션 후 ClientGate가 연다)
        if (!state || typeof window === "undefined") return;
        // 첫 방문이거나 다른 날 만든 시연 데이터면 오늘 기준으로 새로 만든다
        // (이 콜백은 스토어 생성 중에 동기로 불릴 수 있어 useStore 대신 state의 액션을 쓴다)
        if (isStaleData(state.data)) {
          const fresh = generateDemoData();
          const hadData = !!state.data.generatedAt;
          state.replaceData(
            hadData
              ? {
                  ...fresh,
                  evidence: [
                    {
                      id: uid("ev"),
                      createdAt: fresh.generatedAt,
                      updatedAt: fresh.generatedAt,
                      source: "demo",
                      type: "BASELINE",
                      title: "새 시연일 — 운영 데이터 갱신",
                      detail:
                        "출고마감·배송약속이 오늘 기준이 되도록 시연 데이터를 새로 만들었습니다. 설정은 유지됩니다.",
                      actor: "시스템",
                      dataSource: "시연 데이터",
                      mode: "Demo Evidence",
                    },
                    ...fresh.evidence,
                  ],
                }
              : fresh,
          );
        }
        state.setHydrated();
      },
    },
  ),
);

// cross-tab / iframe sync: reload persisted state when another window writes.
// - 같은 값이면 무시 (재수화 → 재기록 → 다른 창 이벤트 … 왕복 방지)
// - 짧은 시간에 몰린 이벤트는 한 번만 처리
if (typeof window !== "undefined") {
  let timer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener("storage", (e) => {
    if (e.key !== "nexmart-demo-v1" || e.newValue == null || e.newValue === lastWritten) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        useStore.persist.rehydrate();
      } catch {
        /* ignore */
      }
    }, 150);
  });
}
