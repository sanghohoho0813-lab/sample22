/**
 * 실행 라이프사이클과 성과 측정
 *
 * 추천됨 → 담당자 확인 → 승인 → 실행중 → 완료 → 성과 측정
 * 성과는 "실행 전 기준값"과 "지금 같은 지표"를 비교한다. 측정할 수 없으면 '판단 보류'로 남기고
 * 숫자를 만들어 내지 않는다.
 */
import type { ActionStage, AXAction, DemoData, Measurement, OpsSnapshot } from "./types";
import type { Ledger } from "./ledger";
import { buildSkuInsights } from "./engines";
import { forecastShipments } from "./fulfillment";
import { repeatReport } from "./repeat";
import { returnSignals } from "./returns";

export const LIFECYCLE: { stage: ActionStage; label: string; desc: string }[] = [
  { stage: "recommended", label: "추천됨", desc: "시스템이 근거와 함께 제안" },
  { stage: "reviewing", label: "담당자 확인", desc: "담당자가 근거·대상을 확인" },
  { stage: "approved", label: "승인", desc: "권한자가 승인 → 실행 지시" },
  { stage: "in_progress", label: "실행중", desc: "발주·처리·안내가 진행 중" },
  { stage: "done", label: "완료", desc: "실행이 끝남" },
  { stage: "measured", label: "성과 측정", desc: "실행 전 기준값과 비교해 기록" },
];

export function lifecycleIndex(stage: ActionStage) {
  if (stage === "requested") return 3;
  const i = LIFECYCLE.findIndex((s) => s.stage === stage);
  return i < 0 ? 0 : i;
}

export const OPEN_STAGES: ActionStage[] = [
  "recommended",
  "reviewing",
  "approved",
  "requested",
  "in_progress",
  "held",
];
export const isOpenAction = (a: AXAction) => OPEN_STAGES.includes(a.stage);
export const CLOSED_STAGES: ActionStage[] = ["done", "measured", "dismissed"];

const bulkyFn = (data: DemoData) => {
  const m = new Map(data.products.map((p) => [p.id, !!p.bulky]));
  return (pid: string) => m.get(pid) ?? false;
};

const approvedAt = (a: AXAction) =>
  a.activity?.find((x) => x.to === "approved" || x.to === "in_progress" || x.to === "requested")?.at ??
  a.recommendedAt;

/** 실행 결과를 실행 전 기준값과 같은 지표로 다시 잰다 */
export function measureAction(a: AXAction, data: DemoData, ledger: Ledger | null, now: Date): Measurement {
  const at = now.toISOString();
  const before = a.baseline?.display ?? "-";
  const m = (metric: string, after: string, verdict: Measurement["verdict"], note: string): Measurement => ({
    metric,
    before,
    after,
    verdict,
    note,
    measuredAt: at,
  });
  switch (a.type) {
    case "urgent_po":
    case "alt_supplier": {
      const ins = buildSkuInsights(data, now).find((i) => i.sku.id === a.related.skuId);
      const po = a.related.poId ? data.purchaseOrders.find((p) => p.id === a.related.poId) : undefined;
      if (!ins) return m("가용재고", "-", "pending", "SKU를 찾을 수 없음");
      const days = ins.daysOfStock === Infinity ? "-" : `${ins.daysOfStock.toFixed(1)}일`;
      const after = `가용 ${ins.available}개 · ${days}`;
      if (!po) return m("가용재고·소진일", after, "pending", "발주가 아직 생성되지 않음");
      if (po.status !== "received")
        return m("가용재고·소진일", after, "pending", `입고 대기 — ${po.id} 예정 ${po.expectedAt}`);
      const ok = ins.available > 0 && ins.daysOfStock >= ins.leadTimeDays;
      return m(
        "가용재고·소진일",
        after,
        ok ? "improved" : ins.available > 0 ? "unchanged" : "worse",
        ok
          ? `입고 ${po.qty}개 반영 — 리드타임(${ins.leadTimeDays}일) 이상 확보`
          : "입고 후에도 리드타임보다 짧음",
      );
    }
    case "priority_order": {
      const ids = new Set(a.related.orderIds ?? []);
      const targets = data.orders.filter((o) => ids.has(o.id));
      const shipped = targets.filter((o) => ["shipped", "in_transit", "delivered"].includes(o.stage));
      const onTime = shipped.filter((o) => {
        const h = o.history.find((x) => x.stage === "shipped");
        return h && new Date(h.at) <= new Date(new Date(o.cutoffAt).getTime() + 60 * 60000);
      });
      const pendingOrders = targets.length - shipped.length;
      const after = `${onTime.length}/${targets.length}건 마감 내 출고`;
      if (
        pendingOrders > 0 &&
        now < new Date(Math.max(...targets.map((o) => new Date(o.cutoffAt).getTime())))
      )
        return m("대상 주문 마감 내 출고", after, "pending", `${pendingOrders}건 출고 전`);
      return m(
        "대상 주문 마감 내 출고",
        after,
        onTime.length === targets.length ? "improved" : onTime.length > 0 ? "unchanged" : "worse",
        `기준: 실행 전 마감 초과 예상 ${a.baseline?.value ?? targets.length}건`,
      );
    }
    case "staff_rebalance": {
      const zone = a.detail?.staffMove?.to;
      const f = forecastShipments(data, now, { bulkyOf: bulkyFn(data) });
      const z = f.zones.find((x) => x.warehouse.id === zone);
      const late = z ? z.late : 0;
      const base = a.baseline?.value ?? late;
      return m(
        "구역 마감 초과 예상 주문",
        `${late}건`,
        late < base ? "improved" : late === base ? "unchanged" : "worse",
        `출고 시뮬레이션 재계산 (인원 ${z?.staff ?? "-"}명 기준)`,
      );
    }
    case "delay_notice": {
      const ids = new Set(a.related.orderIds ?? []);
      const targets = data.orders.filter((o) => ids.has(o.id));
      const notified = targets.filter((o) => o.customerNotified).length;
      return m(
        "지연 예상 주문 사전 안내",
        `${notified}/${targets.length}건 안내`,
        notified === targets.length && targets.length > 0
          ? "improved"
          : notified > 0
            ? "unchanged"
            : "pending",
        "안내 후 배송지연 반품·문의는 반품 화면에서 추적",
      );
    }
    case "repeat_expose": {
      const since = new Date(approvedAt(a));
      const cids = new Set(a.related.customerIds ?? []);
      const conv = data.orders.filter(
        (o) =>
          cids.has(o.customerId) &&
          new Date(o.createdAt) >= since &&
          (!a.related.productId || o.items.some((it) => it.productId === a.related.productId)),
      );
      const buyers = new Set(conv.map((o) => o.customerId)).size;
      const revenue = conv.reduce((s, o) => s + o.total, 0);
      const elapsedDays = (now.getTime() - since.getTime()) / 86400000;
      if (buyers === 0)
        return m(
          "대상 고객 재구매",
          `0/${cids.size}명`,
          elapsedDays < 3 ? "pending" : "unchanged",
          elapsedDays < 3 ? "노출 후 3일까지 전환을 지켜봄" : "노출 후 3일간 전환 없음",
        );
      return m(
        "대상 고객 재구매",
        `${buyers}/${cids.size}명 · ${revenue.toLocaleString()}원`,
        "improved",
        `노출 이후 대상 고객 주문 ${conv.length}건 (실제 주문 기록)`,
      );
    }
    case "stop_po": {
      const since = new Date(approvedAt(a));
      const newPos = data.purchaseOrders.filter(
        (p) => p.skuId === a.related.skuId && new Date(p.createdAt) > since && p.status !== "cancelled",
      );
      const ins = buildSkuInsights(data, now).find((i) => i.sku.id === a.related.skuId);
      return m(
        "추가 발주 · 재고금액",
        `발주 ${newPos.length}건 · 재고 ${Math.round((ins?.stockValue ?? 0) / 10000).toLocaleString()}만원`,
        newPos.length === 0 ? "improved" : "worse",
        newPos.length === 0
          ? "보류 이후 추가 발주 없음 — 재고자금이 더 묶이지 않음"
          : "보류 후에도 발주 발생",
      );
    }
    case "promo_adjust": {
      const pr = data.promotions.find((p) => p.id === a.related.promotionId);
      return m(
        "할인율",
        pr ? `${Math.round(pr.discountRate * 100)}%` : "-",
        a.stage === "done" || a.stage === "measured" ? "improved" : "pending",
        "공헌이익 변화는 조정 이후 주문이 쌓이면 이익 화면에서 확인",
      );
    }
    case "quality_issue": {
      const sig = returnSignals(data, ledger, now).find((s) => s.id === a.detail?.returnSignal);
      return m(
        "해당 신호 반품률",
        sig ? `${(sig.recentRate * 100).toFixed(1)}%` : "신호 해소",
        sig ? "pending" : "improved",
        sig ? "조치 효과는 2~4주 판매 후 판단" : "최근 4주 기준 이상 신호가 사라짐",
      );
    }
    default:
      return m("-", "-", "pending", "측정 기준 없음");
  }
}

/** 운영 상태 스냅샷 — 시연 시작 시점과 지금을 같은 기준으로 비교 */
export function opsSnapshot(data: DemoData, ledger: Ledger | null, now: Date): OpsSnapshot {
  const insights = buildSkuInsights(data, now);
  const risk = insights.filter(
    (i) => ["stockout", "urgent", "low"].includes(i.status) && i.product.status === "active",
  );
  const f = forecastShipments(data, now, { bulkyOf: bulkyFn(data) });
  const late = f.orders.filter(
    (p) => p.cutoffAt <= f.nextCutoff && ["late", "overdue", "blocked"].includes(p.status),
  );
  const slow = insights.filter((i) => ["slow", "overstock"].includes(i.status));
  return {
    at: now.toISOString(),
    stockoutRiskSkus: risk.length,
    stockoutRiskSkuIds: risk.map((i) => i.sku.id),
    lateOrders: late.length,
    lateOrderIds: late.map((p) => p.order.id),
    slowStockValue: slow.reduce((a, i) => a + i.stockValue, 0),
    openActions: data.actions.filter(isOpenAction).length,
    repeatDueCustomers: repeatReport(data, ledger, now).dueCustomers,
    returnSignals: returnSignals(data, ledger, now).length,
  };
}
