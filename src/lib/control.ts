/**
 * 컨트롤 타워 — 오늘 이익과 고객에 직접 영향을 주는 예외만 모아 우선순위로 세운다.
 *
 * 모든 예외는 같은 모양이다: 근거(왜) → 영향(얼마나, 계산식 포함) → 상세(어디서 보나) → 실행(무엇을 하나)
 * 영향 금액은 "아무것도 하지 않을 때 노출되는 규모"의 추정이며, 절감액·성과로 쓰지 않는다.
 */
import type { ActionStage, ActionType, AXAction, DemoData, RoleKey } from "./types";
import type { Ledger } from "./ledger";
import type { SkuInsight } from "./engines";
import type { ShipForecast } from "./fulfillment";
import type { MarginReport } from "./margin";
import type { ReturnSignal } from "./returns";
import type { RepeatReport } from "./repeat";
import { workMinutes } from "./fulfillment";
import { isOpenAction } from "./lifecycle";

export type ExceptionKind =
  | "stockout"
  | "supply_delay"
  | "ship_risk"
  | "large_order"
  | "return_anomaly"
  | "low_margin"
  | "overstock"
  | "repeat";

export const EXCEPTION_LABEL: Record<ExceptionKind, string> = {
  stockout: "품절 위험",
  supply_delay: "공급 지연",
  ship_risk: "출고마감 위험",
  large_order: "대형 주문",
  return_anomaly: "반품 이상",
  low_margin: "저마진",
  overstock: "과잉재고",
  repeat: "재구매 기회",
};

export type Severity = "critical" | "high" | "mid" | "low";
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "긴급",
  high: "높음",
  mid: "보통",
  low: "낮음",
};

export interface OpsException {
  id: string;
  kind: ExceptionKind;
  severity: Severity;
  title: string;
  subject: string;
  /** 근거 — 판단에 쓴 데이터 */
  evidence: string[];
  impact: { value: number; unit: "원" | "건" | "개" | "명"; label: string; basis: string };
  /** 정렬용 (원 단위 환산) */
  weight: number;
  dueAt?: string;
  owner: RoleKey;
  /** 상세 화면 */
  href: string;
  /** 연결된 진행 중 실행 */
  action?: { id: string; stage: ActionStage; title: string };
  /** 실행이 없으면 만들 수 있는 실행 유형 */
  actionType?: ActionType;
  related: {
    skuId?: string;
    productId?: string;
    supplierId?: string;
    warehouseId?: string;
    orderIds?: string[];
    customerIds?: string[];
    poId?: string;
    signalId?: string;
    promotionId?: string;
  };
}

export interface ControlInputs {
  data: DemoData;
  ledger: Ledger | null;
  now: Date;
  insights: SkuInsight[];
  forecast: ShipForecast;
  margin: MarginReport;
  signals: ReturnSignal[];
  repeat: RepeatReport;
}

const SEV_W: Record<Severity, number> = { critical: 4, high: 3, mid: 2, low: 1 };
const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ko-KR")}만원`;

function openActionFor(data: DemoData, match: (a: AXAction) => boolean) {
  const a = data.actions.find((x) => isOpenAction(x) && match(x));
  return a ? { id: a.id, stage: a.stage, title: a.title } : undefined;
}

export function buildExceptions(inp: ControlInputs): OpsException[] {
  const { data, now, insights, forecast, margin, signals, repeat } = inp;
  const out: OpsException[] = [];
  const supplierById = new Map(data.suppliers.map((s) => [s.id, s]));
  const today = now.toISOString().slice(0, 10);
  const openPos = data.purchaseOrders.filter((p) =>
    ["requested", "confirmed", "in_transit"].includes(p.status),
  );
  const bulkyOf = (pid: string) => !!data.products.find((p) => p.id === pid)?.bulky;

  // 1·2) 품절 위험 / 공급 지연
  for (const i of insights) {
    if (i.product.status !== "active") continue;
    const po = openPos.find((p) => p.skuId === i.sku.id);
    const etaDays = po ? (new Date(`${po.expectedAt}T10:00:00`).getTime() - now.getTime()) / 86400000 : null;
    const delayedPo = po && etaDays !== null && (po.note || po.expectedAt < today) && etaDays > i.daysOfStock;
    if (delayedPo) {
      const gap = Math.max(0, (etaDays ?? 0) - i.daysOfStock);
      const lost = Math.round(i.calc.forecastDaily * gap * i.sku.salePrice);
      out.push({
        id: `ex-supply-${i.sku.id}`,
        kind: "supply_delay",
        severity: gap >= 2 ? "high" : "mid",
        title: `${i.product.name} ${i.sku.name} — 입고 전에 재고가 바닥남`,
        subject: `${po.id} · ${supplierById.get(po.supplierId)?.name ?? ""}`,
        evidence: [
          `입고 예정 ${po.expectedAt} (${po.note ?? "예정일 경과"})`,
          `가용 ${i.available}개 ÷ 일 ${i.calc.forecastDaily.toFixed(1)}개 = ${i.daysOfStock.toFixed(1)}일 후 소진`,
          `입고까지 ${gap.toFixed(1)}일 공백`,
        ],
        impact: {
          value: lost,
          unit: "원",
          label: "공백 기간 예상 판매",
          basis: `일 ${i.calc.forecastDaily.toFixed(1)}개 × ${gap.toFixed(1)}일 × ${won(i.sku.salePrice)}`,
        },
        weight: lost,
        dueAt: new Date(now.getTime() + Math.max(0.5, i.daysOfStock - 1) * 86400000).toISOString(),
        owner: "buyer",
        href: `/ax/suppliers?sku=${i.sku.id}`,
        action: openActionFor(
          data,
          (a) => a.related.skuId === i.sku.id && ["alt_supplier", "urgent_po"].includes(a.type),
        ),
        actionType: "alt_supplier",
        related: { skuId: i.sku.id, productId: i.product.id, supplierId: po.supplierId, poId: po.id },
      });
      continue;
    }
    if (["stockout", "urgent", "low"].includes(i.status)) {
      const lost = i.calc.lostRevenue;
      const sev: Severity =
        i.status === "stockout" || (i.calc.gapDays > 0 && i.daysOfStock < i.leadTimeDays * 0.7)
          ? "critical"
          : i.calc.gapDays > 0
            ? "high"
            : "mid";
      out.push({
        id: `ex-stock-${i.sku.id}`,
        kind: "stockout",
        severity: sev,
        title:
          i.status === "stockout"
            ? `${i.product.name} ${i.sku.name} — 가용재고 0`
            : `${i.product.name} ${i.sku.name} — ${i.daysOfStock.toFixed(1)}일 후 소진`,
        subject: `리드타임 ${i.leadTimeDays}일 · 추천 발주 ${i.recommendedQty}개`,
        evidence: i.reasons.slice(0, 3),
        impact: {
          value: lost,
          unit: "원",
          label: lost > 0 ? "지금 발주해도 비는 기간 판매" : "결품 위험 (리드타임 내 입고 가능)",
          basis:
            lost > 0
              ? `일 ${i.calc.forecastDaily.toFixed(1)}개 × 공백 ${i.calc.gapDays.toFixed(1)}일 × ${won(i.sku.salePrice)}`
              : `소진 ${i.daysOfStock.toFixed(1)}일 vs 리드타임 ${i.leadTimeDays}일`,
        },
        weight: lost + (sev === "critical" ? 300000 : 50000),
        dueAt: new Date(
          now.getTime() + Math.max(0.25, i.daysOfStock - i.leadTimeDays + 1) * 86400000,
        ).toISOString(),
        owner: "buyer",
        href: `/ax/inventory?sku=${i.sku.id}`,
        action: openActionFor(
          data,
          (a) => a.related.skuId === i.sku.id && ["urgent_po", "alt_supplier"].includes(a.type),
        ),
        actionType: "urgent_po",
        related: { skuId: i.sku.id, productId: i.product.id, supplierId: i.sku.primarySupplierId },
      });
    }
  }

  // 3) 출고마감 위험 — 구역별 마감 초과, 재고 부족, 이월
  const due = forecast.orders.filter((p) => p.cutoffAt <= forecast.nextCutoff);
  const groups: {
    key: string;
    preds: typeof due;
    title: string;
    sev: Severity;
    type: ActionType;
    zone?: string;
  }[] = [];
  for (const z of forecast.zones) {
    const late = due.filter((p) => p.warehouseId === z.warehouse.id && p.status === "late");
    if (late.length)
      groups.push({
        key: `late-${z.warehouse.id}`,
        preds: late,
        title: `${z.warehouse.name.split(" ")[0]} 오늘 마감 초과 예상 ${late.length}건`,
        sev: late.length >= 5 ? "critical" : "high",
        type: "staff_rebalance",
        zone: z.warehouse.id,
      });
  }
  const blocked = due.filter((p) => p.status === "blocked");
  if (blocked.length)
    groups.push({
      key: "blocked",
      preds: blocked,
      title: `재고 부족으로 출고 불가 ${blocked.length}건`,
      sev: "high",
      type: "delay_notice",
    });
  const overdue = due.filter((p) => p.status === "overdue");
  if (overdue.length)
    groups.push({
      key: "overdue",
      preds: overdue,
      title: `어제 마감을 넘긴 이월 주문 ${overdue.length}건`,
      sev: "high",
      type: "priority_order",
    });
  for (const g of groups) {
    const ids = g.preds.map((p) => p.order.id);
    const value = g.preds.reduce((a, p) => a + p.order.total, 0);
    const z = g.zone ? forecast.zones.find((x) => x.warehouse.id === g.zone) : undefined;
    out.push({
      id: `ex-ship-${g.key}`,
      kind: "ship_risk",
      severity: g.sev,
      title: g.title,
      subject: z
        ? `작업 ${Math.round((z.remainingWorkMin / 60) * 10) / 10}시간 · 가능 ${Math.round((z.capacityMin / 60) * 10) / 10}시간 (인원 ${z.staff}명)`
        : (g.preds[0].reasons[0] ?? ""),
      evidence: z
        ? [
            `필요 작업 ÷ 마감까지 가능 작업 = ${Math.round(z.utilization * 100)}%`,
            `예상 포장완료 ${z.projectedFinish ? hm(z.projectedFinish) : "-"} (마감 ${hm(forecast.nextCutoff)})`,
            z.warehouse.staff < z.warehouse.staffPlanned
              ? `작업 인원 ${z.warehouse.staff}명 — 정원 ${z.warehouse.staffPlanned}명 중 결원`
              : `대기 ${z.pending}건`,
          ]
        : Array.from(new Set(g.preds.flatMap((p) => p.reasons))).slice(0, 3),
      impact: {
        value: ids.length,
        unit: "건",
        label: `배송약속 영향 주문 (주문액 ${man(value)})`,
        basis: "출고 시뮬레이션: 구역 인원 × 근무시간 vs 주문별 작업시간",
      },
      weight: value + ids.length * 20000,
      dueAt: forecast.nextCutoff.toISOString(),
      owner: g.type === "delay_notice" ? "cs" : "ops",
      href: `/ax/fulfillment?tab=forecast${g.zone ? `&zone=${g.zone}` : ""}`,
      action: openActionFor(
        data,
        (a) =>
          ["priority_order", "staff_rebalance", "delay_notice"].includes(a.type) &&
          ((a.related.orderIds ?? []).some((id) => ids.includes(id)) ||
            (!!g.zone && a.detail?.staffMove?.to === g.zone)),
      ),
      actionType: g.type,
      related: { orderIds: ids, warehouseId: g.zone },
    });
  }

  // 4) 대형 주문 — 한 건이 구역 작업량·재고를 크게 차지
  forecast.orders
    .filter((p) => !["ready"].includes(p.status))
    .forEach((p) => {
      const units = p.order.items.reduce((a, it) => a + it.qty, 0);
      const mins = workMinutes(p.order.items, bulkyOf);
      if (units < 30 && p.order.total < 400000 && mins < 90) return;
      const zone = forecast.zones.find((z) => z.warehouse.id === p.warehouseId);
      const behind = forecast.orders.filter(
        (q) =>
          q.warehouseId === p.warehouseId &&
          q.queuePos > p.queuePos &&
          (q.status === "late" || q.status === "tight"),
      ).length;
      out.push({
        id: `ex-large-${p.order.id}`,
        kind: "large_order",
        severity: behind > 0 || p.status === "late" ? "high" : "mid",
        title: `대형 주문 ${p.order.id} — ${units}개 · ${man(p.order.total)}`,
        subject: `${zone?.warehouse.name.split(" ")[0] ?? ""} 작업 ${Math.round(mins)}분 (일반 주문 ${Math.round(mins / 15)}건 분량)`,
        evidence: [
          `품목 ${p.order.items.length}종 ${units}개 — ${p.order.items
            .map((it) => `${it.name} ×${it.qty}`)
            .slice(0, 2)
            .join(", ")}`,
          behind > 0 ? `뒤 순번 주문 ${behind}건이 마감 위험` : `예상 포장완료 ${hm(p.readyAt)}`,
          p.status === "late" ? "이 주문 자체도 마감 초과 예상" : "분할 출고·다음날 출고 협의 여지",
        ],
        impact: {
          value: p.order.total,
          unit: "원",
          label: "주문 금액",
          basis: "주문 합계 (할인·배송비 반영)",
        },
        weight: p.order.total * 0.3 + behind * 20000,
        dueAt: p.cutoffAt.toISOString(),
        owner: "ops",
        href: `/ax/fulfillment?tab=forecast&order=${p.order.id}`,
        action: openActionFor(data, (a) => (a.related.orderIds ?? []).includes(p.order.id)),
        actionType: "priority_order",
        related: { orderIds: [p.order.id], warehouseId: p.warehouseId },
      });
    });

  // 5) 반품 이상
  for (const s of signals.slice(0, 6)) {
    out.push({
      id: `ex-return-${s.id}`,
      kind: "return_anomaly",
      severity: s.lift >= 4 || s.cost > 1000000 ? "high" : "mid",
      title: s.title,
      subject: `${s.subjectLabel} · 원인 경로: ${s.route === "supplier" ? "공급사" : s.route === "content" ? "상품정보" : s.route === "warehouse" ? "물류" : "출고"}`,
      evidence: s.evidence,
      impact: {
        value: s.cost,
        unit: "원",
        label: "최근 4주 반품 손실",
        basis: "재판매 불가 원가 + 회수 운임 (건당 5,000원)",
      },
      weight: s.cost * 1.5,
      owner: s.route === "warehouse" ? "ops" : s.route === "content" ? "cs" : "buyer",
      href: `/ax/returns?signal=${s.id}`,
      action: openActionFor(data, (a) => a.type === "quality_issue" && a.detail?.returnSignal === s.id),
      actionType: "quality_issue",
      related: {
        supplierId: s.supplierId,
        warehouseId: s.warehouseId,
        productId: s.productId,
        skuId: s.skuIds[0],
        signalId: s.id,
        poId: s.lotPoId,
      },
    });
  }

  // 6) 저마진 — 매출 상위인데 이익률 하위
  const avgRate = margin.total.marginRate;
  margin.revenueRichMarginPoor.slice(0, 3).forEach((r) => {
    const gap = Math.round(Math.max(0, (avgRate - r.marginRate) * r.revenue));
    const drivers = [
      { k: "할인", v: r.discount },
      { k: "운임", v: r.shipping },
      { k: "채널 수수료", v: r.channelFee },
      { k: "반품", v: r.returnLoss },
    ].sort((a, b) => b.v - a.v);
    const runningPromo = data.promotions.find((p) => p.status === "running" && p.skuIds.includes(r.key));
    // 할인이 주된 원인일 때만 할인율 조정을 실행으로 제안 (운임·수수료가 원인이면 정책 검토로 안내)
    const promo =
      runningPromo && runningPromo.discountRate >= 0.1 && drivers[0].k === "할인" ? runningPromo : undefined;
    out.push({
      id: `ex-margin-${r.key}`,
      kind: "low_margin",
      severity: r.marginRate < 0 ? "high" : "mid",
      title: `${r.label} — 매출 상위, 이익률 ${(r.marginRate * 100).toFixed(1)}%`,
      subject: `최근 ${margin.days}일 매출 ${man(r.revenue)} · 공헌이익 ${man(r.contribution)}`,
      evidence: [
        `평균 이익률 ${(avgRate * 100).toFixed(1)}% 대비 ${((avgRate - r.marginRate) * 100).toFixed(1)}%p 낮음`,
        `가장 큰 비용: ${drivers[0].k} ${man(drivers[0].v)}, ${drivers[1].k} ${man(drivers[1].v)}`,
        runningPromo
          ? `진행 중 프로모션: ${runningPromo.name} (할인 ${Math.round(runningPromo.discountRate * 100)}%)`
          : drivers[0].k === "운임"
            ? "중량 상품 — 무료배송 기준·묶음 판매 검토"
            : drivers[0].k === "채널 수수료"
              ? "제휴몰 판매 비중 — 채널별 가격 검토"
              : "가격·묶음 구성 점검",
      ],
      impact: {
        value: gap,
        unit: "원",
        label: "평균 이익률 대비 부족분",
        basis: `(평균 ${(avgRate * 100).toFixed(1)}% − ${(r.marginRate * 100).toFixed(1)}%) × 매출`,
      },
      weight: gap * 0.6,
      owner: "owner",
      href: `/ax/sales?tab=sku&q=${encodeURIComponent(r.label.split(" · ")[0])}`,
      action: promo
        ? openActionFor(data, (a) => a.type === "promo_adjust" && a.related.promotionId === promo.id)
        : undefined,
      actionType: promo ? "promo_adjust" : undefined,
      related: { skuId: r.key, promotionId: promo?.id },
    });
  });

  // 7) 과잉재고 — 60일 판매분을 넘는 재고 원가
  insights
    .filter((i) => ["slow", "overstock"].includes(i.status) && i.excessValue >= 500000)
    .sort((a, b) => b.excessValue - a.excessValue)
    .slice(0, 4)
    .forEach((i) => {
      out.push({
        id: `ex-over-${i.sku.id}`,
        kind: "overstock",
        severity: i.status === "slow" ? "mid" : "low",
        title: `${i.product.name} ${i.sku.name} — 재고 ${Math.round(i.daysOfStock)}일치`,
        subject: `보유 ${i.inv.onHand.toLocaleString()}개 · 일 ${i.avgDaily.toFixed(1)}개 판매`,
        evidence: i.reasons.slice(0, 3),
        impact: {
          value: i.excessValue,
          unit: "원",
          label: "60일 판매분을 넘는 재고 원가",
          basis: `(보유 − 예약 − 일 ${i.avgDaily.toFixed(1)}개 × 60일) × 원가 ${won(i.sku.cost)}`,
        },
        weight: i.excessValue * 0.25,
        owner: "buyer",
        href: `/ax/inventory?sku=${i.sku.id}`,
        action: openActionFor(
          data,
          (a) => a.related.skuId === i.sku.id && ["stop_po", "promo_adjust"].includes(a.type),
        ),
        actionType: "stop_po",
        related: { skuId: i.sku.id, productId: i.product.id },
      });
    });

  // 8) 재구매 기회
  const top = repeat.byProduct.filter((b) => b.due + b.late >= 5).slice(0, 2);
  top.forEach((b) => {
    const rows = repeat.rows.filter(
      (r) => r.productId === b.productId && (r.status === "due" || r.status === "late") && !r.targeted,
    );
    if (rows.length < 5) return;
    out.push({
      id: `ex-repeat-${b.productId}`,
      kind: "repeat",
      severity: "low",
      title: `${b.name} 다시 살 때인 고객 ${rows.length}명`,
      subject: `주기 도래 ${b.due}명 · 주기 지남 ${b.late}명 · 가용재고 ${b.available.toLocaleString()}개`,
      evidence: [
        "고객별 실제 구매 간격(2회 이상 구매) 또는 상품 평균 주기 기준",
        b.stockOk
          ? `재고 충분 — 필요 ${b.need}개 / 가용 ${b.available}개`
          : `재고 주의 — 필요 ${b.need}개 / 가용 ${b.available}개`,
        "이미 다시 주문했거나 다른 노출 대상인 고객 제외",
      ],
      impact: {
        value: rows.reduce((a, r) => a + r.expectedValue, 0),
        unit: "원",
        label: "직전 구매 기준 주문 규모",
        basis: "대상 고객 직전 구매 수량 × 현재 판매가 (전환율 가정 없음)",
      },
      weight: rows.reduce((a, r) => a + r.expectedValue, 0) * 0.15,
      owner: "cs",
      href: `/ax/customers?product=${b.productId}`,
      action: openActionFor(data, (a) => a.type === "repeat_expose" && a.related.productId === b.productId),
      actionType: "repeat_expose",
      related: { productId: b.productId, customerIds: rows.map((r) => r.customerId) },
    });
  });

  return out.sort((a, b) => SEV_W[b.severity] - SEV_W[a.severity] || b.weight - a.weight);
}

/** 역할별로 먼저 볼 예외 */
export const ROLE_KINDS: Record<RoleKey, ExceptionKind[]> = {
  owner: [
    "stockout",
    "supply_delay",
    "ship_risk",
    "large_order",
    "return_anomaly",
    "low_margin",
    "overstock",
    "repeat",
  ],
  buyer: ["stockout", "supply_delay", "overstock", "return_anomaly", "low_margin"],
  ops: ["ship_risk", "large_order", "return_anomaly", "stockout"],
  cs: ["ship_risk", "return_anomaly", "repeat"],
};

export function forRole(list: OpsException[], role: RoleKey) {
  if (role === "owner") return list;
  const kinds = ROLE_KINDS[role];
  return list
    .filter(
      (e) => kinds.includes(e.kind) && (e.owner === role || role === "ops" || kinds.indexOf(e.kind) < 3),
    )
    .sort(
      (a, b) =>
        kinds.indexOf(a.kind) - kinds.indexOf(b.kind) ||
        SEV_W[b.severity] - SEV_W[a.severity] ||
        b.weight - a.weight,
    );
}

function hm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
