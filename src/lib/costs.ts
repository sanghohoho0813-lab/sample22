/**
 * 비용 기준(원가 모델) — 매출에서 이익까지 가는 길에 빠지는 돈.
 *
 * 금액은 "회사가 입력하는 기준값"이다. 시연값은 중소 유통사 평균 수준의 가정치이며,
 * 설정 > 비용 기준에서 바꾸면 이익 분석·컨트롤 타워·성과 기록이 같은 기준으로 다시 계산된다.
 */
import type { Product } from "./types";

export type Channel = "app" | "web" | "partner" | "b2b";

export const CHANNELS: Channel[] = ["app", "web", "partner", "b2b"];

export const CHANNEL_LABEL: Record<Channel, string> = {
  app: "자사몰 앱",
  web: "자사몰 웹",
  partner: "제휴몰",
  b2b: "기업·단체",
};

export interface CostModel {
  /** 택배 1박스 기본 운임 */
  parcelBase: number;
  /** 같은 박스에 들어가는 추가 수량 1개당 */
  parcelExtraPerUnit: number;
  /** 중량·부피 상품 1개당 할증 */
  bulkySurcharge: number;
  /** 포장재·완충재 (주문 1건) */
  packaging: number;
  /** 기업·단체 화물 운임 (수량 1개당) */
  b2bFreightPerUnit: number;
  /** 채널 수수료율 — 결제수수료(자사몰), 판매수수료(제휴몰) */
  feeRate: Record<Channel, number>;
  /** 반품 회수 운임 (1건) */
  returnPickup: number;
  /** 무료배송 기준 금액과 고객 부담 배송비 */
  freeShippingThreshold: number;
  shippingFee: number;
}

export const DEFAULT_COST_MODEL: CostModel = {
  parcelBase: 2900,
  parcelExtraPerUnit: 250,
  bulkySurcharge: 1800,
  packaging: 350,
  b2bFreightPerUnit: 650,
  feeRate: { app: 0.022, web: 0.025, partner: 0.108, b2b: 0 },
  returnPickup: 5000,
  freeShippingThreshold: 30000,
  shippingFee: 3000,
};

export const COST_MODEL_FIELDS: { key: keyof Omit<CostModel, "feeRate">; label: string; unit: string }[] = [
  { key: "parcelBase", label: "택배 기본 운임 (박스당)", unit: "원" },
  { key: "parcelExtraPerUnit", label: "추가 수량 운임 (개당)", unit: "원" },
  { key: "bulkySurcharge", label: "중량·부피 할증 (개당)", unit: "원" },
  { key: "packaging", label: "포장재 (주문당)", unit: "원" },
  { key: "b2bFreightPerUnit", label: "기업·단체 화물 운임 (개당)", unit: "원" },
  { key: "returnPickup", label: "반품 회수 운임 (건당)", unit: "원" },
  { key: "freeShippingThreshold", label: "무료배송 기준", unit: "원" },
  { key: "shippingFee", label: "고객 부담 배송비", unit: "원" },
];

/** 중량·부피 상품 — 택배 할증 대상 (상품명 기준 분류, 실데이터에서는 상품 마스터의 규격으로 대체) */
const BULKY =
  /생수|탄산수|2L|3L|2\.5L|1\.8L|10kg|3kg|모래|사료|이불|매트리스|리빙박스|건조대|냄비|청소기|욕조|커튼|화장지/;
export const isBulky = (p: Pick<Product, "name">) => BULKY.test(p.name);

export interface EconLine {
  skuId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export interface EconOrder {
  channel: Channel;
  lines: EconLine[];
  discount: number;
  shippingFee: number;
  /** 반품된 줄 (없으면 undefined) */
  returned?: { skuId: string; qty: number; resellable: boolean };
}

export interface Economics {
  gross: number; // 정가 기준이 아닌 판매가 × 수량
  discount: number;
  net: number; // 할인 후 상품 매출
  shippingFee: number; // 고객이 낸 배송비
  cogs: number;
  shipCost: number; // 회사가 낸 운임
  packaging: number;
  channelFee: number;
  refund: number; // 반품 환불액
  returnCogsBack: number; // 재판매 가능한 반품의 원가 회수
  returnLogistics: number;
  /** 공헌이익 = 순매출 + 배송비수입 − 원가 − 운임 − 포장 − 수수료 − 반품손실 */
  contribution: number;
}

export function shipCostOf(
  lines: readonly EconLine[],
  channel: Channel,
  bulkyOf: (productId: string) => boolean,
  m: CostModel,
) {
  const units = lines.reduce((a, l) => a + l.qty, 0);
  const bulkyUnits = lines.reduce((a, l) => a + (bulkyOf(l.productId) ? l.qty : 0), 0);
  if (channel === "b2b") return units * m.b2bFreightPerUnit + bulkyUnits * Math.round(m.bulkySurcharge / 2);
  return m.parcelBase + Math.max(0, units - 1) * m.parcelExtraPerUnit + bulkyUnits * m.bulkySurcharge;
}

export function orderEconomics(
  o: EconOrder,
  bulkyOf: (productId: string) => boolean,
  m: CostModel = DEFAULT_COST_MODEL,
): Economics {
  const gross = o.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const cogs = o.lines.reduce((a, l) => a + l.unitCost * l.qty, 0);
  const net = gross - o.discount;
  const shipCost = shipCostOf(o.lines, o.channel, bulkyOf, m);
  const packaging = o.channel === "b2b" ? m.packaging * 2 : m.packaging;
  const channelFee = Math.round((net + o.shippingFee) * m.feeRate[o.channel]);
  let refund = 0;
  let returnCogsBack = 0;
  let returnLogistics = 0;
  if (o.returned) {
    const line = o.lines.find((l) => l.skuId === o.returned!.skuId);
    if (line) {
      const share = gross > 0 ? (line.unitPrice * o.returned.qty) / gross : 0;
      refund = Math.round(line.unitPrice * o.returned.qty - o.discount * share);
      returnCogsBack = o.returned.resellable ? line.unitCost * o.returned.qty : 0;
      returnLogistics = m.returnPickup;
    }
  }
  const contribution =
    net +
    o.shippingFee -
    refund -
    (cogs - returnCogsBack) -
    shipCost -
    packaging -
    channelFee -
    returnLogistics;
  return {
    gross,
    discount: o.discount,
    net,
    shippingFee: o.shippingFee,
    cogs,
    shipCost,
    packaging,
    channelFee,
    refund,
    returnCogsBack,
    returnLogistics,
    contribution,
  };
}
