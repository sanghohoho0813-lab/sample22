/**
 * 예외 → 실행 카드. 시드(초기 추천)와 화면의 "실행 만들기"가 같은 함수를 쓴다.
 * 모든 실행은 근거·영향 대상·실행 전 기준값을 갖고 시작한다 (성과 측정의 비교 기준).
 */
import type { ActionType, AXAction, DemoData, RoleKey, Urgency } from "./types";
import type { Ledger } from "./ledger";
import type { OpsException } from "./control";
import { compareSuppliers, type SkuInsight } from "./engines";
import { forecastShipments, staffMoveEffect, suggestStaffMove, type ShipForecast } from "./fulfillment";
import type { ReturnSignal } from "./returns";

export type ActionDraft = Omit<AXAction, "id" | "createdAt" | "updatedAt" | "source" | "evidenceIds">;

export interface FactoryContext {
  data: DemoData;
  ledger: Ledger | null;
  now: Date;
  insights: SkuInsight[];
  forecast: ShipForecast;
  signals: ReturnSignal[];
}

export const ROLE_ASSIGNEE: Record<RoleKey, string> = {
  owner: "대표",
  buyer: "김구매",
  ops: "박운영",
  cs: "이CS",
};
const URG: Record<OpsException["severity"], Urgency> = {
  critical: "critical",
  high: "high",
  mid: "mid",
  low: "low",
};
const hours = (now: Date, h: number) => new Date(now.getTime() + h * 3600000).toISOString();
const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const bulkyFn = (data: DemoData) => {
  const m = new Map(data.products.map((p) => [p.id, !!p.bulky]));
  return (pid: string) => m.get(pid) ?? false;
};

export function draftFromException(
  ex: OpsException,
  ctx: FactoryContext,
  type = ex.actionType,
): ActionDraft | null {
  if (!type) return null;
  const { data, now } = ctx;
  const base = {
    urgency: URG[ex.severity],
    recommendedAt: now.toISOString(),
    stage: "recommended" as const,
    impact: ex.impact,
    activity: [
      {
        at: now.toISOString(),
        actor: "시스템",
        to: "recommended" as const,
        note: `${ex.title} — 근거와 함께 추천`,
      },
    ],
  };
  const ins = ex.related.skuId ? ctx.insights.find((i) => i.sku.id === ex.related.skuId) : undefined;
  const stockDisplay = (i: SkuInsight) =>
    `가용 ${i.available}개 · ${i.daysOfStock === Infinity ? "-" : `${i.daysOfStock.toFixed(1)}일`}`;

  switch (type) {
    case "urgent_po": {
      if (!ins) return null;
      const urgent = ["stockout", "urgent"].includes(ins.status);
      const opts = compareSuppliers(data, ins.sku.id, urgent ? "urgent" : "normal", {
        now,
        ledger: ctx.ledger,
      });
      const best = opts.find((o) => o.recommended);
      const qty = best?.orderQty ?? ins.recommendedQty;
      const days = ins.daysOfStock === Infinity ? "-" : ins.daysOfStock.toFixed(1);
      return {
        ...base,
        type,
        title: `${ins.product.name} ${ins.sku.name} ${urgent ? "긴급발주" : "발주"} 검토`,
        summary: `가용재고 ${ins.available}개, 예상 소진 ${days}일 — 공급 리드타임 ${ins.leadTimeDays}일보다 ${urgent ? "짧습니다" : "여유가 적습니다"}. ${best ? `${best.supplier.name} ${qty}개 발주를 제안합니다 (${best.why}).` : ""}`,
        trigger: urgent
          ? `예상 소진일 ${days}일 < 공급 리드타임 ${ins.leadTimeDays}일`
          : "안전재고 미달 또는 수요 증가",
        reasons: ins.reasons.slice(0, 4),
        expectedImpact: `입고 후 약 ${ins.calc.coverDays}일치 재고 확보 (리드타임 ${ins.leadTimeDays}일 + 검토주기 ${ins.calc.reviewDays}일)`,
        caution:
          best && best.costDiffPct > 0
            ? `추천 공급사 단가가 최저가 대비 +${best.costDiffPct}% — 총비용 기준 선택`
            : undefined,
        owner: "buyer",
        assignee: ROLE_ASSIGNEE.buyer,
        dueAt: hours(now, urgent ? 6 : 48),
        related: {
          productId: ins.product.id,
          skuId: ins.sku.id,
          supplierId: ins.sku.primarySupplierId,
          altSupplierId: best?.supplier.id,
        },
        proposal: {
          qty,
          supplierId: best?.supplier.id ?? ins.sku.primarySupplierId,
          note: "발주량 계산식·공급사 총비용 비교로 산출",
        },
        baseline: {
          metric: "가용재고·소진일",
          value: ins.available,
          display: stockDisplay(ins),
          at: now.toISOString(),
        },
      };
    }
    case "alt_supplier": {
      if (!ins) return null;
      const po = data.purchaseOrders.find((p) => p.id === ex.related.poId);
      const etaDays = po
        ? (new Date(`${po.expectedAt}T10:00:00`).getTime() - now.getTime()) / 86400000
        : ins.leadTimeDays;
      const gap = Math.max(0, etaDays - ins.daysOfStock);
      const need = Math.ceil(ins.calc.forecastDaily * (gap + 2));
      const opts = compareSuppliers(data, ins.sku.id, "urgent", {
        now,
        ledger: ctx.ledger,
        qty: need,
      }).filter((o) => o.supplier.id !== po?.supplierId);
      const best = opts[0];
      if (!best) return null;
      return {
        ...base,
        type,
        title: `${ins.product.name} ${ins.sku.name} 입고 지연 — 부족분 대체 발주 검토`,
        summary: `${po ? `${po.id} 입고가 ${po.expectedAt}로 늦어져` : "입고 지연으로"} ${gap.toFixed(1)}일간 재고가 빕니다. 기존 발주는 유지하고 부족분 ${best.orderQty}개만 ${best.supplier.name}(납기 ${best.sp.leadTimeDays}일)에 대체 발주합니다.`,
        trigger: "입고 예정일 > 예상 소진일",
        reasons: [...ex.evidence.slice(0, 3), `대체 공급사 ${best.supplier.name}: ${best.why}`],
        expectedImpact: `공백 ${gap.toFixed(1)}일 메움 — 반복구매 고객 이탈 방지`,
        caution:
          best.excessQty > 0
            ? `최소주문수량 ${best.sp.moq}개 조건으로 ${best.excessQty}개 초과 발주`
            : undefined,
        owner: "buyer",
        assignee: ROLE_ASSIGNEE.buyer,
        dueAt: hours(now, 24),
        related: {
          productId: ins.product.id,
          skuId: ins.sku.id,
          supplierId: po?.supplierId,
          altSupplierId: best.supplier.id,
          poId: po?.id,
        },
        proposal: {
          qty: best.orderQty,
          supplierId: best.supplier.id,
          note: "부족분만 대체 발주, 기존 발주 유지",
        },
        baseline: {
          metric: "가용재고·소진일",
          value: ins.available,
          display: stockDisplay(ins),
          at: now.toISOString(),
        },
      };
    }
    case "stop_po": {
      if (!ins) return null;
      return {
        ...base,
        type,
        title: `${ins.product.name} ${ins.sku.name} 추가 발주 보류`,
        summary: `재고가 ${Math.round(ins.daysOfStock)}일치로 60일 판매분을 넘는 재고 원가가 ${won(ins.excessValue)}입니다. 추가 발주를 보류하고 묶음·프로모션으로 소진 속도를 높입니다.`,
        trigger: `재고일수 > ${ins.status === "slow" ? 180 : 75}일`,
        reasons: ins.reasons.slice(0, 4),
        expectedImpact: "추가 발주로 재고자금이 더 묶이는 것을 막음",
        owner: "buyer",
        assignee: ROLE_ASSIGNEE.buyer,
        dueAt: hours(now, 120),
        related: { productId: ins.product.id, skuId: ins.sku.id },
        proposal: { note: "보류 기간 중 재평가 일정 기록" },
        baseline: {
          metric: "재고금액",
          value: ins.stockValue,
          display: `재고 ${Math.round(ins.stockValue / 10000).toLocaleString()}만원 · ${Math.round(ins.daysOfStock)}일치`,
          at: now.toISOString(),
        },
      };
    }
    case "staff_rebalance": {
      const zone = ex.related.warehouseId;
      const sug = suggestStaffMove(data, now, bulkyFn(data));
      if (!zone || !sug || sug.to !== zone) return draftFromException(ex, ctx, "priority_order");
      const from = data.warehouses.find((w) => w.id === sug.from)!;
      const to = data.warehouses.find((w) => w.id === sug.to)!;
      const eff = staffMoveEffect(data, now, sug, bulkyFn(data));
      const lateTo = eff.beforeZones.find((z) => z.warehouse.id === zone)?.late ?? 0;
      return {
        ...base,
        type,
        title: `${from.name.split(" ")[0]} ${sug.n}명 → ${to.name.split(" ")[0]} 재배치`,
        summary: `${to.name.split(" ")[0]} 작업량이 마감까지 가능한 작업시간을 넘어 ${lateTo}건이 오늘 출고를 놓칩니다. 여유가 있는 ${from.name.split(" ")[0]}에서 ${sug.n}명을 옮기면 마감 초과 예상이 ${eff.before}건 → ${eff.after}건으로 줄어듭니다.`,
        trigger: "구역 필요 작업 > 마감까지 가능 작업",
        reasons: [...ex.evidence, `${from.name.split(" ")[0]} 이동 후에도 마감 내 처리 가능 (시뮬레이션)`],
        expectedImpact: `마감 내 출고 +${eff.saved}건 (시뮬레이션)`,
        caution: "재배치 인원의 구역 숙련도 확인 — 오배송 검수 강화",
        owner: "ops",
        assignee: ROLE_ASSIGNEE.ops,
        dueAt: ex.dueAt ?? hours(now, 2),
        related: { orderIds: ex.related.orderIds },
        detail: { staffMove: { from: sug.from, to: sug.to, n: sug.n } },
        proposal: { note: `출고 시뮬레이션: ${eff.before}건 → ${eff.after}건` },
        baseline: {
          metric: "구역 마감 초과 예상",
          value: lateTo,
          display: `${lateTo}건`,
          at: now.toISOString(),
        },
      };
    }
    case "priority_order": {
      const ids = ex.related.orderIds ?? [];
      if (!ids.length) return null;
      return {
        ...base,
        type,
        title: `${ex.title} 우선처리`,
        summary: `대상 주문 ${ids.length}건을 출고 대기열 맨 앞으로 올립니다. 다른 주문의 마감 여유를 함께 확인한 뒤 승인하세요.`,
        trigger:
          ex.kind === "large_order" ? "대형 주문이 구역 작업량을 크게 차지" : "출고마감 경과 또는 초과 예상",
        reasons: ex.evidence,
        expectedImpact: "대상 주문 마감 내 출고",
        owner: "ops",
        assignee: ROLE_ASSIGNEE.ops,
        dueAt: ex.dueAt ?? hours(now, 3),
        related: { orderIds: ids },
        proposal: { note: "우선처리 지정 → 출고 대기열 재계산" },
        baseline: {
          metric: "마감 초과 예상 주문",
          value: ids.length,
          display: `${ids.length}건`,
          at: now.toISOString(),
        },
      };
    }
    case "delay_notice": {
      const ids = ex.related.orderIds ?? [];
      if (!ids.length) return null;
      return {
        ...base,
        type,
        title: `출고 지연 예상 고객 ${ids.length}명 사전 안내`,
        summary: `오늘 출고가 어려운 주문 ${ids.length}건의 고객에게 지연 사유와 새 도착 예정일을 먼저 안내합니다. 고객 마이페이지 알림에 바로 반영됩니다.`,
        trigger: "출고 시뮬레이션상 마감 내 출고 불가",
        reasons: ex.evidence,
        expectedImpact: "지연 문의·반품 예방, 신뢰 유지",
        owner: "cs",
        assignee: ROLE_ASSIGNEE.cs,
        dueAt: ex.dueAt ?? hours(now, 3),
        related: { orderIds: ids },
        proposal: { note: "안내 문구: 지연 사유 + 새 도착 예정일" },
        baseline: {
          metric: "사전 안내된 지연 주문",
          value: 0,
          display: `0/${ids.length}건`,
          at: now.toISOString(),
        },
      };
    }
    case "repeat_expose": {
      const cids = ex.related.customerIds ?? [];
      const p = data.products.find((x) => x.id === ex.related.productId);
      if (!cids.length || !p) return null;
      return {
        ...base,
        type,
        title: `${p.name} 재구매 주기 고객 ${cids.length}명 다시 구매 안내`,
        summary: `${p.name}을(를) 주기적으로 사 온 고객 중 다시 살 때가 된 ${cids.length}명에게 '다시 구매'를 노출하고 알림을 보냅니다. 재고 확인을 마쳤습니다.`,
        trigger: "마지막 구매일 + 구매주기 ≤ 오늘 + 3일",
        reasons: ex.evidence,
        expectedImpact: "대상 고객 재구매 주문 — 실제 주문 기록으로 측정",
        owner: "cs",
        assignee: ROLE_ASSIGNEE.cs,
        dueAt: hours(now, 48),
        related: { productId: p.id, customerIds: cids },
        proposal: { note: "고객 홈 '다시 살 때' + 알림" },
        baseline: {
          metric: "대상 고객 재구매",
          value: 0,
          display: `0/${cids.length}명`,
          at: now.toISOString(),
        },
      };
    }
    case "promo_adjust": {
      const pr = data.promotions.find((x) => x.id === ex.related.promotionId);
      if (!pr) return null;
      const next = Math.max(0.05, Math.round((pr.discountRate - 0.05) * 100) / 100);
      return {
        ...base,
        type,
        title: `${pr.name} 할인율 ${Math.round(pr.discountRate * 100)}% → ${Math.round(next * 100)}% 조정`,
        summary: `${ex.title}. 할인·운임을 빼면 이익률이 평균보다 낮습니다. 할인율을 ${Math.round(next * 100)}%로 낮추고 묶음 구성 중심으로 노출합니다.`,
        trigger: "프로모션 상품 이익률 < 평균",
        reasons: ex.evidence,
        expectedImpact: "프로모션 이익률 회복 — 조정 이후 주문으로 확인",
        owner: "owner",
        assignee: ROLE_ASSIGNEE.owner,
        dueAt: hours(now, 48),
        related: { promotionId: pr.id, skuId: ex.related.skuId },
        proposal: { note: `할인율 ${Math.round(next * 100)}%` },
        baseline: {
          metric: "할인율",
          value: pr.discountRate,
          display: `${Math.round(pr.discountRate * 100)}%`,
          at: now.toISOString(),
        },
      };
    }
    case "quality_issue": {
      const sig = ctx.signals.find((s) => s.id === ex.related.signalId);
      if (!sig) return null;
      const owner: RoleKey = sig.route === "warehouse" ? "ops" : sig.route === "content" ? "cs" : "buyer";
      return {
        ...base,
        type,
        title:
          sig.route === "supplier"
            ? `${sig.subjectLabel} 품질 클레임${sig.lotPoId ? ` · ${sig.lotPoId} 로트 검수` : ""}`
            : sig.route === "content"
              ? `${sig.subjectLabel} 상세페이지 정보 수정`
              : `${sig.subjectLabel.split(" ")[0]} 피킹 검수 강화`,
        summary: `${sig.title}. ${sig.suggestion}.`,
        trigger: `최근 4주 반품률이 평소의 ${sig.lift.toFixed(1)}배`,
        reasons: sig.evidence,
        expectedImpact: "같은 원인의 반품 재발 방지 — 2~4주 후 반품률로 확인",
        owner,
        assignee: ROLE_ASSIGNEE[owner],
        dueAt: hours(now, 72),
        related: {
          supplierId: sig.supplierId,
          productId: sig.productId,
          skuId: sig.skuIds[0],
          poId: sig.lotPoId,
        },
        detail: { route: sig.route === "fulfillment" ? "warehouse" : sig.route, returnSignal: sig.id },
        proposal: { note: sig.suggestion },
        baseline: {
          metric: "해당 신호 반품률",
          value: sig.recentRate,
          display: `${(sig.recentRate * 100).toFixed(1)}% (평소 ${(sig.baselineRate * 100).toFixed(1)}%)`,
          at: now.toISOString(),
        },
      };
    }
    default:
      return null;
  }
}

/** 재계산이 필요한 화면용: 예외에서 바로 초안 만들기 (forecast 미리 계산 안 했을 때) */
export function quickContext(
  data: DemoData,
  ledger: Ledger | null,
  now: Date,
  insights: SkuInsight[],
  signals: ReturnSignal[],
): FactoryContext {
  return {
    data,
    ledger,
    now,
    insights,
    signals,
    forecast: forecastShipments(data, now, { bulkyOf: bulkyFn(data) }),
  };
}

export const ACTION_TYPES_WITH_SIDE_EFFECT: ActionType[] = [
  "urgent_po",
  "alt_supplier",
  "priority_order",
  "staff_rebalance",
  "delay_notice",
  "repeat_expose",
  "promo_adjust",
  "stop_po",
  "quality_issue",
];
