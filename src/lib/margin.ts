/**
 * 이익 분석 — 매출과 이익을 나눠 본다.
 * 공헌이익 = 순매출 + 고객 배송비 − 상품원가 − 운임 − 포장 − 채널 수수료 − 반품 손실
 * 주문 단위 비용(운임·포장·수수료)은 줄의 매출 비중으로, 운임은 수량 비중으로 나눠 SKU에 배분한다.
 */
import type { CategorySlug, DemoData, Order } from "./types";
import type { Ledger, LedgerOrder } from "./ledger";
import { memoLast } from "./memo";
import {
  CHANNEL_LABEL,
  CHANNELS,
  DEFAULT_COST_MODEL,
  orderEconomics,
  type Channel,
  type CostModel,
  type Economics,
} from "./costs";

export interface MarginRow {
  key: string;
  label: string;
  orders: number;
  units: number;
  revenue: number; // 순매출 (할인 후)
  discount: number;
  cogs: number;
  shipping: number; // 순운임 (운임 − 고객 배송비)
  packaging: number;
  channelFee: number;
  returnLoss: number; // 환불 − 재판매 원가회수 + 회수운임
  contribution: number;
  marginRate: number; // contribution / revenue
}

export interface MarginReport {
  from: string;
  days: number;
  total: MarginRow;
  bySku: MarginRow[];
  byCustomer: MarginRow[];
  byChannel: MarginRow[];
  byCategory: MarginRow[];
  /** 매출 상위 30% 안에 있으면서 이익률이 하위 30%인 SKU */
  revenueRichMarginPoor: MarginRow[];
  waterfall: { label: string; value: number }[];
}

const empty = (key: string, label: string): MarginRow => ({
  key,
  label,
  orders: 0,
  units: 0,
  revenue: 0,
  discount: 0,
  cogs: 0,
  shipping: 0,
  packaging: 0,
  channelFee: 0,
  returnLoss: 0,
  contribution: 0,
  marginRate: 0,
});

type AnyOrder = {
  id: string;
  customerId: string;
  channel: Channel;
  lines: { skuId: string; productId: string; qty: number; unitPrice: number; unitCost: number }[];
  discount: number;
  shippingFee: number;
  returned?: { skuId: string; qty: number; resellable: boolean };
};

const fromLedger = (o: LedgerOrder): AnyOrder => ({
  id: o.id,
  customerId: o.customerId,
  channel: o.channel,
  lines: o.lines,
  discount: o.discount,
  shippingFee: o.shippingFee,
  returned: o.returned,
});
const fromOrder = (o: Order): AnyOrder => ({
  id: o.id,
  customerId: o.customerId,
  channel: o.channel ?? "app",
  lines: o.items,
  discount: o.discount,
  shippingFee: o.shippingFee,
});

export const marginReport = memoLast(marginReportRaw);

function marginReportRaw(
  data: DemoData,
  ledger: Ledger | null,
  now: Date,
  opts: { days?: number; model?: CostModel; customerName?: (id: string) => string } = {},
): MarginReport {
  const days = opts.days ?? 30;
  const model = opts.model ?? DEFAULT_COST_MODEL;
  const since = now.getTime() - days * 86400000;
  const productById = new Map(data.products.map((p) => [p.id, p]));
  const skuById = new Map(data.skus.map((s) => [s.id, s]));
  const bulkyOf = (pid: string) => !!productById.get(pid)?.bulky;
  const orders: AnyOrder[] = [
    ...(ledger?.orders.filter((o) => new Date(o.createdAt).getTime() >= since).map(fromLedger) ?? []),
    ...data.orders
      .filter((o) => o.stage !== "cancelled" && new Date(o.createdAt).getTime() >= since)
      .map(fromOrder),
  ];

  const total = empty("total", "전체");
  const bySku = new Map<string, MarginRow>();
  const byCustomer = new Map<string, MarginRow>();
  const byChannel = new Map<string, MarginRow>();
  const byCategory = new Map<string, MarginRow>();
  const add = (row: MarginRow, part: Partial<MarginRow>, countOrder: boolean) => {
    row.revenue += part.revenue ?? 0;
    row.discount += part.discount ?? 0;
    row.cogs += part.cogs ?? 0;
    row.shipping += part.shipping ?? 0;
    row.packaging += part.packaging ?? 0;
    row.channelFee += part.channelFee ?? 0;
    row.returnLoss += part.returnLoss ?? 0;
    row.units += part.units ?? 0;
    if (countOrder) row.orders += 1;
  };
  const orderPart = (e: Economics, units: number): Partial<MarginRow> => ({
    revenue: e.net,
    discount: e.discount,
    cogs: e.cogs,
    shipping: e.shipCost - e.shippingFee,
    packaging: e.packaging,
    channelFee: e.channelFee,
    returnLoss: e.refund - e.returnCogsBack + e.returnLogistics,
    units,
  });

  for (const o of orders) {
    const e = orderEconomics(o, bulkyOf, model);
    const units = o.lines.reduce((a, l) => a + l.qty, 0);
    const part = orderPart(e, units);
    add(total, part, true);
    const ch = byChannel.get(o.channel) ?? empty(o.channel, CHANNEL_LABEL[o.channel]);
    add(ch, part, true);
    byChannel.set(o.channel, ch);
    const cu =
      byCustomer.get(o.customerId) ?? empty(o.customerId, opts.customerName?.(o.customerId) ?? o.customerId);
    add(cu, part, true);
    byCustomer.set(o.customerId, cu);
    // 줄 단위 배분
    const gross = e.gross || 1;
    const seenCat = new Set<string>();
    for (const l of o.lines) {
      const rev = l.unitPrice * l.qty;
      const share = rev / gross;
      const unitShare = units ? l.qty / units : 0;
      const ret = o.returned?.skuId === l.skuId;
      const linePart: Partial<MarginRow> = {
        revenue: rev - e.discount * share,
        discount: e.discount * share,
        cogs: l.unitCost * l.qty,
        shipping: (e.shipCost - e.shippingFee) * unitShare,
        packaging: e.packaging * unitShare,
        channelFee: e.channelFee * share,
        returnLoss: ret ? e.refund - e.returnCogsBack + e.returnLogistics : 0,
        units: l.qty,
      };
      const sku = skuById.get(l.skuId);
      const p = productById.get(l.productId);
      const sr = bySku.get(l.skuId) ?? empty(l.skuId, `${p?.name ?? l.productId} · ${sku?.name ?? ""}`);
      add(sr, linePart, true);
      bySku.set(l.skuId, sr);
      const cat = (p?.categorySlug ?? "living") as CategorySlug;
      const cr = byCategory.get(cat) ?? empty(cat, data.categories.find((c) => c.slug === cat)?.name ?? cat);
      add(cr, linePart, !seenCat.has(cat));
      seenCat.add(cat);
      byCategory.set(cat, cr);
    }
  }
  const finish = (r: MarginRow) => {
    r.contribution = Math.round(r.revenue - r.cogs - r.shipping - r.packaging - r.channelFee - r.returnLoss);
    r.marginRate = r.revenue > 0 ? r.contribution / r.revenue : 0;
    (["revenue", "discount", "cogs", "shipping", "packaging", "channelFee", "returnLoss"] as const).forEach(
      (k) => (r[k] = Math.round(r[k])),
    );
    return r;
  };
  finish(total);
  const skuRows = Array.from(bySku.values())
    .map(finish)
    .sort((a, b) => b.revenue - a.revenue);
  const topCut = skuRows[Math.max(0, Math.floor(skuRows.length * 0.3) - 1)]?.revenue ?? 0;
  const rates = skuRows.map((r) => r.marginRate).sort((a, b) => a - b);
  const lowCut = rates[Math.floor(rates.length * 0.3)] ?? 0;
  return {
    from: new Date(since).toISOString(),
    days,
    total,
    bySku: skuRows,
    byCustomer: Array.from(byCustomer.values())
      .map(finish)
      .sort((a, b) => b.revenue - a.revenue),
    byChannel: CHANNELS.map((c) => byChannel.get(c))
      .filter(Boolean)
      .map((r) => finish(r!)),
    byCategory: Array.from(byCategory.values())
      .map(finish)
      .sort((a, b) => b.revenue - a.revenue),
    revenueRichMarginPoor: skuRows.filter((r) => r.revenue >= topCut && r.marginRate <= lowCut),
    waterfall: [
      { label: "순매출", value: total.revenue },
      { label: "상품원가", value: -total.cogs },
      { label: "순운임", value: -total.shipping },
      { label: "포장", value: -total.packaging },
      { label: "채널 수수료", value: -total.channelFee },
      { label: "반품 손실", value: -total.returnLoss },
      { label: "공헌이익", value: total.contribution },
    ],
  };
}
