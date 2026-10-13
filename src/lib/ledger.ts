/**
 * 90일 주문 원장 (Order Ledger)
 *
 * 매출·이익·재구매·반품·공급사 실적을 "따로 만든 숫자"가 아니라 하나의 거래 기록에서 계산하기 위한 원장.
 * - SKU별 하루 판매량은 수요신호(demand.dailySales)와 정확히 같다 → 재고 판단과 매출 분석이 같은 숫자를 본다.
 * - 고객마다 "늘 사는 상품(루틴)"과 주기가 있어 재구매 주기·이탈이 원장에서 자연스럽게 나온다.
 * - 반품은 실제 주문 줄에 붙고, 공급사 입고 로트·물류 구역·상품정보 문제와 연결된다.
 *
 * 원장은 저장하지 않는다(용량). 같은 시드·같은 생성 시각이면 항상 같은 원장이 나오므로
 * 필요할 때 다시 만든다 — `getLedger(data)` 참고.
 */
import type {
  CategorySlug,
  Customer,
  Order,
  OrderStage,
  Product,
  ReturnRequest,
  SKU,
  Supplier,
  SupplierProduct,
} from "./types";
import { dateKey } from "./format";
import { makeRng, makeSampler, type Rng } from "./rng";
import type { Channel } from "./costs";

export type ReturnReason = ReturnRequest["reason"];
export type Archetype = "loyal" | "regular" | "light";

export interface LedgerCustomer {
  id: string;
  name: string;
  kind: "consumer" | "business";
  channel: Channel;
  region: string;
  joinedAt: string;
  joinedDaysAgo: number;
  archetype: Archetype;
  /** 시나리오 고객(김서연 등) — 원장 생성에서 제외하고 저장된 주문 이력만 쓴다 */
  scripted?: boolean;
}

export interface LedgerLine {
  skuId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export interface LedgerReturn {
  skuId: string;
  qty: number;
  reason: ReturnReason;
  at: string;
  daysAgo: number;
  resellable: boolean;
}

export interface LedgerOrder {
  id: string;
  createdAt: string;
  /** 며칠 전 주문인지 (1 = 어제) */
  day: number;
  customerId: string;
  channel: Channel;
  warehouseId: string;
  lines: LedgerLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  promotionId?: string;
  /** 출고마감을 넘겨 출고됨 */
  shipLate: boolean;
  returned?: LedgerReturn;
}

export interface LedgerPO {
  id: string;
  supplierId: string;
  skuId: string;
  qty: number;
  receivedQty: number;
  unitCost: number;
  orderedAt: string;
  expectedAt: string;
  receivedAt: string;
  /** 예정일 대비 지연 일수 (0 = 정시) */
  delayDays: number;
}

export interface Ledger {
  generatedAt: string;
  days: number;
  customers: LedgerCustomer[];
  orders: LedgerOrder[];
  purchaseOrders: LedgerPO[];
  /** 반품 이상 시나리오의 실제 근거 (분석 엔진은 이 값을 모른 채 데이터만 보고 찾아낸다 — 테스트용) */
  planted: {
    defectLotPoId?: string;
    defectSupplierId?: string;
    contentProductId?: string;
    pickingWarehouseId?: string;
  };
}

// ---------- customer base ----------
const SURNAMES = "김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남노".split("");
const GIVEN_A = "서민지현수예하도시유준은채윤건다소태가주".split("");
const GIVEN_B = "연호민진수은윤우아율준원빈린후람인희영결".split("");
export const REGIONS = [
  "서울 마포구",
  "서울 송파구",
  "경기 성남시 분당구",
  "경기 고양시 일산동구",
  "인천 연수구",
  "서울 강서구",
  "경기 용인시 수지구",
  "서울 노원구",
  "부산 해운대구",
  "대전 유성구",
  "경기 화성시",
  "대구 수성구",
  "광주 서구",
  "경기 수원시 영통구",
];
const BUSINESS_NAMES = [
  "새싹어린이집",
  "해오름요양원",
  "온누리공유오피스",
  "바른치과의원",
  "한결독서실",
  "푸른숲캠핑장",
  "가온필라테스",
  "다온키즈카페",
  "미소요양센터",
  "한빛학원",
  "늘봄주간보호센터",
  "청솔게스트하우스",
  "별빛펜션",
  "누리스터디카페",
  "하늘정원카페",
  "든든한방병원",
  "사랑나눔복지관",
  "도담어린이집",
];

export const SCRIPTED_CUSTOMER_IDS = new Set(["c-001"]);

export function generateCustomerBase(named: Customer[], now: Date, seed = 20261013): LedgerCustomer[] {
  const r = makeRng(seed);
  const out: LedgerCustomer[] = named.map((c, i) => {
    const joinedDaysAgo = Math.max(
      1,
      Math.round((now.getTime() - new Date(c.joinedAt).getTime()) / 86400000),
    );
    return {
      id: c.id,
      name: c.name,
      kind: "consumer",
      channel: i % 3 === 2 ? "web" : "app",
      region: c.address.line1.split(" ").slice(0, 2).join(" "),
      joinedAt: c.joinedAt,
      joinedDaysAgo,
      archetype: "loyal",
      scripted: SCRIPTED_CUSTOMER_IDS.has(c.id),
    };
  });
  const CONSUMERS = 15000;
  for (let i = 0; i < CONSUMERS; i++) {
    const roll = r.next();
    const archetype: Archetype = roll < 0.08 ? "loyal" : roll < 0.3 ? "regular" : "light";
    const ch = r.next();
    const channel: Channel = ch < 0.5 ? "app" : ch < 0.78 ? "web" : "partner";
    const joinedDaysAgo = r.chance(0.28) ? r.int(1, 89) : r.int(90, 900);
    out.push({
      id: `c-${String(10001 + i)}`,
      name: r.pick(SURNAMES) + r.pick(GIVEN_A) + r.pick(GIVEN_B),
      kind: "consumer",
      channel,
      region: r.pick(REGIONS),
      joinedAt: new Date(now.getTime() - joinedDaysAgo * 86400000).toISOString(),
      joinedDaysAgo,
      archetype,
    });
  }
  BUSINESS_NAMES.forEach((n, i) => {
    const region = r.pick(REGIONS);
    const joinedDaysAgo = r.int(120, 900);
    out.push({
      id: `c-${String(9001 + i)}`,
      name: `${n} (${region.split(" ")[1] ?? region})`,
      kind: "business",
      channel: "b2b",
      region,
      joinedAt: new Date(now.getTime() - joinedDaysAgo * 86400000).toISOString(),
      joinedDaysAgo,
      archetype: "loyal",
    });
  });
  return out;
}

// ---------- generation ----------
export interface LedgerPromotion {
  id: string;
  skuIds: string[];
  /** 시작·종료가 며칠 전인지 (미래면 음수) */
  startsDaysAgo: number;
  endsDaysAgo: number;
  rate: number;
}

export interface LedgerInput {
  now: Date;
  days: number;
  products: Product[];
  skus: SKU[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  customers: LedgerCustomer[];
  /** daysAgo(1~days)일의 SKU 판매 수량 */
  unitsFor: (skuId: string, daysAgo: number) => number;
  promotions: LedgerPromotion[];
  warehouseOf: (cat: CategorySlug) => string;
  bulkyOf: (productId: string) => boolean;
  /** 시연 시나리오: 원장에 심어 두는 운영 문제 (분석 엔진이 데이터만 보고 찾아내야 한다) */
  scenario: {
    defectSupplierId?: string;
    contentProductId?: string;
    pickingWarehouseId?: string;
    slowWarehouseId?: string;
  };
}

export const HOUR_WEIGHTS = [
  1, 0.6, 0.3, 0.2, 0.2, 0.3, 0.6, 1.2, 2, 2.4, 2.6, 2.8, 3, 2.8, 2.6, 2.6, 2.7, 2.9, 3.2, 3.8, 4.4, 4.6, 3.6,
  2.2,
];
const B2B_CATS: CategorySlug[] = ["living", "food", "kitchen", "health", "baby"];
const RESELLABLE: Record<ReturnReason, boolean> = {
  defect: false,
  damaged: false,
  wrong_item: true,
  delay: true,
  info_mismatch: true,
  missing: true,
  change_mind: true,
  other: true,
};

interface Routine {
  productId: string;
  skuId: string;
  cycle: number;
  adherence: number;
  qty: number;
  active: boolean;
}

export function generateLedger(input: LedgerInput, seed = 20260908 ^ 0x5bd1e995): Ledger {
  const r = makeRng(seed);
  const { now, days } = input;
  const dayStart = (d: number) => {
    const t = new Date(now);
    t.setHours(0, 0, 0, 0);
    return new Date(t.getTime() - d * 86400000);
  };
  const productById = new Map(input.products.map((p) => [p.id, p]));
  const skusByProduct = new Map<string, SKU[]>();
  input.skus.forEach((s) => skusByProduct.set(s.productId, [...(skusByProduct.get(s.productId) ?? []), s]));
  const skuIndex = new Map(input.skus.map((s, i) => [s.id, i]));
  const supplierById = new Map(input.suppliers.map((s) => [s.id, s]));

  // 1) 입고 이력 — 공급사 실적(정시·충족)과 불량 로트의 근거
  const purchaseOrders = generatePOs(input, r);
  const planted: Ledger["planted"] = {};
  let defectSince = -1;
  let defectLotSkuId: string | undefined;
  if (input.scenario.defectSupplierId) {
    // 그 공급사의 가장 많이 팔리는 SKU에서, 3~5주 전에 입고된 발주 하나를 불량 로트로 둔다
    const vel = (id: string) => {
      let v = 0;
      for (let d = 1; d <= 28; d++) v += input.unitsFor(id, d);
      return v;
    };
    const supSkus = input.skus
      .filter((s) => s.primarySupplierId === input.scenario.defectSupplierId)
      .sort((a, b) => vel(b.id) - vel(a.id));
    const lot = supSkus.flatMap((sku) =>
      purchaseOrders
        .filter((po) => po.skuId === sku.id && po.supplierId === input.scenario.defectSupplierId)
        .map((po) => ({ po, d: Math.round((now.getTime() - new Date(po.receivedAt).getTime()) / 86400000) }))
        .filter((x) => x.d >= 18 && x.d <= 36),
    )[0];
    if (lot) {
      defectSince = lot.d;
      defectLotSkuId = lot.po.skuId;
      planted.defectLotPoId = lot.po.id;
      planted.defectSupplierId = input.scenario.defectSupplierId;
    }
  }
  if (input.scenario.contentProductId) planted.contentProductId = input.scenario.contentProductId;
  if (input.scenario.pickingWarehouseId) planted.pickingWarehouseId = input.scenario.pickingWarehouseId;

  // 2) 고객 루틴 — 늘 사는 상품과 주기
  const eligible = input.customers.filter((c) => !c.scripted);
  const consumers = eligible.filter((c) => c.kind === "consumer");
  const businesses = eligible.filter((c) => c.kind === "business");
  const repeatProducts = input.products.filter((p) => p.isRepeatable && p.avgRepeatCycleDays);
  const productWeight = (p: Product) =>
    (skusByProduct.get(p.id) ?? []).reduce(
      (a, s) => a + input.unitsFor(s.id, 1) + input.unitsFor(s.id, 8),
      0,
    ) + 0.2;
  const repeatWeights = repeatProducts.map(productWeight);
  const routines = new Map<string, Routine[]>();
  const dueBuckets: Map<number, { cid: string; ri: number }[]> = new Map();
  const schedule = (cid: string, ri: number, day: number) => {
    if (day < 1) return;
    const list = dueBuckets.get(day) ?? [];
    list.push({ cid, ri });
    dueBuckets.set(day, list);
  };
  const preferredSku = (p: Product, business: boolean) => {
    const list = skusByProduct.get(p.id) ?? [];
    if (!list.length) return undefined;
    const w = list.map(
      (s) => input.unitsFor(s.id, 3) + input.unitsFor(s.id, 10) + 0.1 + (business ? s.bundleQty : 0),
    );
    return list[Math.max(0, r.weighted(w))];
  };
  const addRoutine = (c: LedgerCustomer, p: Product, startDay: number) => {
    const sku = preferredSku(p, c.kind === "business");
    if (!sku) return;
    const list = routines.get(c.id) ?? [];
    if (list.some((x) => x.productId === p.id)) return;
    const base = p.avgRepeatCycleDays ?? 30;
    const routine: Routine = {
      productId: p.id,
      skuId: sku.id,
      cycle: Math.max(5, Math.round(base * r.float(0.8, 1.3) * (c.kind === "business" ? 0.8 : 1))),
      adherence: c.archetype === "loyal" ? 0.88 : c.archetype === "regular" ? 0.68 : 0.45,
      qty: c.kind === "business" ? r.int(6, 18) : r.chance(0.15) ? 2 : 1,
      active: true,
    };
    list.push(routine);
    routines.set(c.id, list);
    schedule(c.id, list.length - 1, startDay);
  };
  eligible.forEach((c) => {
    const n =
      c.kind === "business"
        ? r.int(2, 4)
        : c.archetype === "loyal"
          ? r.int(2, 4)
          : c.archetype === "regular"
            ? r.int(1, 2)
            : r.chance(0.3)
              ? 1
              : 0;
    for (let k = 0; k < n; k++) {
      const idx = r.weighted(repeatWeights);
      if (idx < 0) continue;
      const p = repeatProducts[idx];
      if (c.kind === "business" && !B2B_CATS.includes(p.categorySlug)) continue;
      const first = Math.min(days, c.joinedDaysAgo) - r.int(0, p.avgRepeatCycleDays ?? 30);
      addRoutine(c, p, Math.max(1, first));
    }
  });

  // 3) 하루씩 앞으로 — 그날 SKU 판매량을 정확히 주문으로 나눈다
  const custWeights = consumers.map((c) =>
    c.archetype === "loyal" ? 5 : c.archetype === "regular" ? 2.2 : 0.6,
  );
  const sampleConsumer = makeSampler(custWeights);
  const customerById = new Map(eligible.map((c) => [c.id, c]));
  const orders: LedgerOrder[] = [];

  const b2bSku = input.skus.map((s) => B2B_CATS.includes(productById.get(s.productId)!.categorySlug));
  for (let d = days; d >= 1; d--) {
    const remaining = new Float64Array(input.skus.length);
    input.skus.forEach((s, i) => (remaining[i] = Math.max(0, Math.round(input.unitsFor(s.id, d)))));
    const date = dayStart(d);
    const ymd = dateKey(date).slice(2).replace(/-/g, "");
    let seq = 1001;
    const dayOrders: { cid: string; lines: LedgerLine[] }[] = [];
    const take = (skuId: string, want: number) => {
      const i = skuIndex.get(skuId)!;
      const q = Math.min(want, remaining[i]);
      remaining[i] -= q;
      return q;
    };
    const lineOf = (sku: SKU, qty: number): LedgerLine => ({
      skuId: sku.id,
      productId: sku.productId,
      qty,
      unitPrice: sku.salePrice,
      unitCost: sku.cost,
    });

    // 3-a) 주기가 돌아온 고객 먼저
    const due = dueBuckets.get(d) ?? [];
    const byCustomer = new Map<string, number[]>();
    due.forEach(({ cid, ri }) => byCustomer.set(cid, [...(byCustomer.get(cid) ?? []), ri]));
    byCustomer.forEach((ris, cid) => {
      const c = customerById.get(cid)!;
      const list = routines.get(cid)!;
      const lines: LedgerLine[] = [];
      ris.forEach((ri) => {
        const rt = list[ri];
        if (!rt.active) return;
        if (!r.chance(rt.adherence)) {
          // 이번 주기는 건너뜀 — 일부는 이탈
          if (r.chance(c.archetype === "light" ? 0.5 : 0.22)) rt.active = false;
          else schedule(cid, ri, d - Math.round(rt.cycle * r.float(1.2, 1.6)));
          return;
        }
        const sku = input.skus[skuIndex.get(rt.skuId)!];
        const q = take(rt.skuId, rt.qty);
        if (q <= 0) {
          schedule(cid, ri, d - 1); // 그날 물량이 없으면 하루 뒤
          return;
        }
        lines.push(lineOf(sku, q));
        schedule(cid, ri, d - Math.max(3, Math.round(rt.cycle * r.float(0.85, 1.18))));
      });
      if (lines.length) dayOrders.push({ cid, lines });
    });

    // 3-b) 남은 수량은 새 주문으로
    let left = 0;
    for (let i = 0; i < remaining.length; i++) left += remaining[i];
    /** 남은 수량에 비례해 SKU 하나 (exclude: 이미 담은 SKU, b2bOnly: 기업 주문 가능 카테고리만) */
    const pickRemaining = (exclude: number[], b2bOnly: boolean) => {
      let total = left;
      if (b2bOnly) {
        total = 0;
        for (let i = 0; i < remaining.length; i++) if (b2bSku[i]) total += remaining[i];
      }
      for (const e of exclude) if (!b2bOnly || b2bSku[e]) total -= remaining[e];
      if (total <= 1e-9) return -1;
      let x = r.next() * total;
      for (let i = 0; i < remaining.length; i++) {
        const v = remaining[i];
        if (v <= 0 || (b2bOnly && !b2bSku[i]) || exclude.includes(i)) continue;
        x -= v;
        if (x <= 0) return i;
      }
      return -1;
    };
    let guard = 0;
    while (left > 0 && guard++ < 6000) {
      const business = businesses.length > 0 && r.chance(0.022);
      const i = pickRemaining([], business);
      if (i < 0) {
        if (business) continue;
        break;
      }
      const sku = input.skus[i];
      let cust: LedgerCustomer | undefined;
      if (business) cust = r.pick(businesses);
      else {
        for (let k = 0; k < 6 && !cust; k++) {
          const c = consumers[sampleConsumer(r.next())];
          if (c.joinedDaysAgo >= d) cust = c;
        }
        cust ??= consumers[sampleConsumer(r.next())];
      }
      const want = business ? r.int(6, 24) : r.chance(0.7) ? 1 : r.chance(0.8) ? 2 : 3;
      const q0 = take(sku.id, want);
      left -= q0;
      const lines = [lineOf(sku, q0)];
      const extra = business ? r.int(0, 2) : r.chance(0.6) ? (r.chance(0.4) ? 2 : 1) : 0;
      for (let k = 0; k < extra; k++) {
        const j = pickRemaining(
          lines.map((l) => skuIndex.get(l.skuId)!),
          false,
        );
        if (j < 0) break;
        const q = take(input.skus[j].id, business ? r.int(4, 12) : r.chance(0.8) ? 1 : 2);
        left -= q;
        if (q > 0) lines.push(lineOf(input.skus[j], q));
      }
      dayOrders.push({ cid: cust.id, lines });
      // 반복 상품을 처음 산 단골은 루틴이 생긴다
      const p = productById.get(sku.productId)!;
      if (p.isRepeatable && cust.archetype !== "light" && r.chance(cust.archetype === "loyal" ? 0.45 : 0.25))
        addRoutine(cust, p, d - Math.round((p.avgRepeatCycleDays ?? 30) * r.float(0.85, 1.2)));
    }

    // 3-c) 주문 기록으로 확정 (시각·채널·할인·출고·반품)
    for (const o of dayOrders) {
      const c = customerById.get(o.cid)!;
      const hour = r.weighted(HOUR_WEIGHTS);
      const at = new Date(date.getTime() + hour * 3600000 + r.int(0, 3599) * 1000);
      const subtotal = o.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
      let discount = 0;
      let promotionId: string | undefined;
      for (const l of o.lines) {
        const promo = input.promotions.find(
          (pr) => pr.skuIds.includes(l.skuId) && d <= pr.startsDaysAgo && d >= pr.endsDaysAgo,
        );
        if (promo) {
          discount += Math.round(l.unitPrice * l.qty * promo.rate);
          promotionId ??= promo.id;
        }
      }
      if (c.kind === "business") discount += Math.round(subtotal * 0.06);
      const shippingFee = c.kind === "business" || subtotal - discount >= 30000 ? 0 : 3000;
      const firstProduct = productById.get(o.lines[0].productId)!;
      const warehouseId = input.warehouseOf(firstProduct.categorySlug);
      const slow = warehouseId === input.scenario.slowWarehouseId;
      const lateP = slow ? (d <= 14 ? 0.11 : 0.06) : 0.022;
      const shipLate = r.chance(lateP);
      const order: LedgerOrder = {
        id: `NX${ymd}-${seq++}`,
        createdAt: at.toISOString(),
        day: d,
        customerId: c.id,
        channel: c.channel,
        warehouseId,
        lines: o.lines,
        subtotal,
        discount,
        shippingFee,
        promotionId,
        shipLate,
      };
      const ret = drawReturn(order, r, {
        productById,
        supplierById,
        skuById: (id) => input.skus[skuIndex.get(id)!],
        bulkyOf: input.bulkyOf,
        defectSupplierId: input.scenario.defectSupplierId,
        defectLotSkuId,
        defectSince,
        contentProductId: input.scenario.contentProductId,
        pickingWarehouseId: input.scenario.pickingWarehouseId,
      });
      if (ret) {
        const back = r.int(2, 7);
        const daysAgo = d - back;
        if (daysAgo >= 0) {
          order.returned = {
            ...ret,
            daysAgo,
            at: new Date(at.getTime() + back * 86400000).toISOString(),
            resellable: RESELLABLE[ret.reason],
          };
        }
      }
      orders.push(order);
    }
  }
  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return {
    generatedAt: now.toISOString(),
    days,
    customers: input.customers,
    orders,
    purchaseOrders,
    planted,
  };
}

const REASONS: ReturnReason[] = [
  "defect",
  "damaged",
  "wrong_item",
  "missing",
  "delay",
  "info_mismatch",
  "change_mind",
  "other",
];
const reasonWeights = new Float64Array(REASONS.length);

function drawReturn(
  o: LedgerOrder,
  r: Rng,
  ctx: {
    productById: Map<string, Product>;
    supplierById: Map<string, Supplier>;
    skuById: (id: string) => SKU;
    bulkyOf: (pid: string) => boolean;
    defectSupplierId?: string;
    defectLotSkuId?: string;
    defectSince: number;
    contentProductId?: string;
    pickingWarehouseId?: string;
  },
): { skuId: string; qty: number; reason: ReturnReason } | null {
  const picking = o.warehouseId === ctx.pickingWarehouseId && o.day <= 24 ? 9 : 1;
  for (const l of o.lines) {
    const p = ctx.productById.get(l.productId)!;
    const sku = ctx.skuById(l.skuId);
    const sup = ctx.supplierById.get(sku.primarySupplierId);
    const lotHit =
      !!ctx.defectLotSkuId &&
      l.skuId === ctx.defectLotSkuId &&
      ctx.defectSince > 0 &&
      o.day <= ctx.defectSince;
    const content = p.id === ctx.contentProductId && o.day <= 28 ? 90 : 1;
    // 사유별 발생 확률 (줄 단위) — 순서는 REASONS와 같다
    reasonWeights[0] = 0.0032 * ((sup?.defectRate ?? 0.007) / 0.007) * (lotHit ? 22 : 1);
    reasonWeights[1] = 0.0016 * (ctx.bulkyOf(p.id) ? 2.4 : 1);
    reasonWeights[2] = 0.0007 * picking;
    reasonWeights[3] = 0.0005 * picking;
    reasonWeights[4] = o.shipLate ? 0.07 : 0;
    reasonWeights[5] = 0.0011 * content;
    reasonWeights[6] = p.isRepeatable ? 0.0014 : 0.0065;
    reasonWeights[7] = 0.0004;
    let totalP = 0;
    for (let i = 0; i < reasonWeights.length; i++) totalP += reasonWeights[i];
    let x = r.next();
    if (x >= totalP) continue;
    for (let i = 0; i < reasonWeights.length; i++) {
      x -= reasonWeights[i];
      if (x < 0) {
        const k = REASONS[i];
        return { skuId: l.skuId, qty: k === "change_mind" || k === "delay" ? l.qty : 1, reason: k };
      }
    }
  }
  return null;
}

function generatePOs(input: LedgerInput, r: Rng): LedgerPO[] {
  const { now, days } = input;
  const out: LedgerPO[] = [];
  const at = (d: number) => new Date(now.getTime() - d * 86400000);
  const seqByMonth = new Map<string, number>();
  const nextId = (d: Date) => {
    const ym = dateKey(d).slice(2, 7).replace("-", "");
    const n = (seqByMonth.get(ym) ?? 100) + 1;
    seqByMonth.set(ym, n);
    return `PO-${ym}-${n}`;
  };
  const supplierById = new Map(input.suppliers.map((s) => [s.id, s]));
  for (const sku of input.skus) {
    let vel = 0;
    for (let d = 1; d <= 28; d++) vel += input.unitsFor(sku.id, d);
    vel /= 28;
    if (vel <= 0.05) continue;
    const options = input.supplierProducts.filter((sp) => sp.skuId === sku.id);
    const primary = options.find((sp) => sp.supplierId === sku.primarySupplierId) ?? options[0];
    if (!primary) continue;
    const cycle = Math.max(7, primary.leadTimeDays + 7);
    for (let d = days - r.int(0, cycle - 1); d - primary.leadTimeDays >= 2; d -= cycle) {
      const sp =
        options.length > 1 && r.chance(0.15) ? r.pick(options.filter((o) => o !== primary)) : primary;
      const sup = supplierById.get(sp.supplierId)!;
      const qty = Math.max(sp.moq, Math.round((vel * cycle * r.float(0.95, 1.15)) / 10) * 10);
      const expectedDay = d - sp.leadTimeDays;
      const late = !r.chance(sup.onTimeRate);
      const delayDays = late ? r.int(1, sup.riskLevel === "high" ? 6 : 4) : 0;
      const receivedDay = expectedDay - delayDays;
      if (receivedDay < 1) continue;
      const receivedQty = r.chance(sup.fillRate) ? qty : Math.round(qty * r.float(0.7, 0.95));
      out.push({
        id: nextId(at(d)),
        supplierId: sp.supplierId,
        skuId: sku.id,
        qty,
        receivedQty,
        unitCost: sp.unitCost,
        orderedAt: at(d).toISOString(),
        expectedAt: dateKey(at(expectedDay)),
        receivedAt: dateKey(at(receivedDay)),
        delayDays,
      });
    }
  }
  return out.sort((a, b) => (a.orderedAt < b.orderedAt ? 1 : -1));
}

// ---------- lookups ----------
/** 원장 주문을 화면 공용 Order 모양으로 (주문 상세 드로어에서 사용) */
export function ledgerOrderToOrder(
  o: LedgerOrder,
  products: Map<string, Product>,
  skus: Map<string, SKU>,
): Order {
  const delivered = new Date(new Date(o.createdAt).getTime() + 2 * 86400000).toISOString();
  const stage: OrderStage = o.returned ? "return" : "delivered";
  return {
    id: o.id,
    createdAt: o.createdAt,
    updatedAt: o.returned?.at ?? delivered,
    source: "demo",
    customerId: o.customerId,
    items: o.lines.map((l) => ({
      skuId: l.skuId,
      productId: l.productId,
      name: products.get(l.productId)?.name ?? l.productId,
      skuName: skus.get(l.skuId)?.name ?? "",
      qty: l.qty,
      unitPrice: l.unitPrice,
      unitCost: l.unitCost,
    })),
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    total: o.subtotal - o.discount + o.shippingFee,
    stage,
    warehouseId: o.warehouseId,
    promisedAt: delivered,
    cutoffAt: o.createdAt,
    history: [
      { at: o.createdAt, stage: "new", actor: "고객" },
      { at: delivered, stage: "delivered", actor: "배송" },
      ...(o.returned ? [{ at: o.returned.at, stage: "return" as OrderStage, actor: "고객" }] : []),
    ],
    promotionId: o.promotionId,
    channel: o.channel,
  };
}
