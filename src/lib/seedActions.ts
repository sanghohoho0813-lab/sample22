/**
 * 시연 시작 시점의 실행 목록 — 손으로 쓴 숫자가 아니라, 같은 엔진이 시드 데이터에서 찾아낸 예외로 만든다.
 * (지난 실행 몇 건은 원장의 실제 입고 기록에 연결해 '완료 → 성과 측정'까지 보여준다)
 */
import type { ActionStage, AXAction, DemoData, EvidenceLog, EvidenceType } from "./types";
import type { Ledger } from "./ledger";
import { buildSkuInsights } from "./engines";
import { forecastShipments } from "./fulfillment";
import { marginReport } from "./margin";
import { returnSignals } from "./returns";
import { repeatReport } from "./repeat";
import { buildExceptions, type ExceptionKind, type OpsException } from "./control";
import { draftFromException, type ActionDraft, type FactoryContext } from "./actionFactory";

export function buildSeedActions(
  data: DemoData,
  ledger: Ledger,
  now: Date,
): { actions: AXAction[]; evidence: EvidenceLog[] } {
  const bulky = new Map(data.products.map((p) => [p.id, !!p.bulky]));
  const ctx: FactoryContext = {
    data,
    ledger,
    now,
    insights: buildSkuInsights(data, now),
    forecast: forecastShipments(data, now, { bulkyOf: (pid) => bulky.get(pid) ?? false }),
    signals: returnSignals(data, ledger, now),
  };
  const exceptions = buildExceptions({
    ...ctx,
    margin: marginReport(data, ledger, now),
    repeat: repeatReport(data, ledger, now),
  });
  const ago = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
  const actions: AXAction[] = [];
  const evidence: EvidenceLog[] = [];
  let seq = 1;
  const ev = (
    type: EvidenceType,
    a: AXAction,
    title: string,
    detail: string,
    at: string,
    extra: Partial<EvidenceLog> = {},
  ) => {
    const e: EvidenceLog = {
      id: `ev-${String(evidence.length + 1).padStart(3, "0")}`,
      createdAt: at,
      updatedAt: at,
      source: "demo",
      type,
      title,
      detail,
      actor: "시스템",
      actionId: a.id,
      skuId: a.related.skuId,
      supplierId: a.related.supplierId,
      dataSource: "운영 엔진",
      mode: "Demo Evidence",
      ...extra,
    };
    evidence.push(e);
    a.evidenceIds.push(e.id);
  };
  const add = (
    draft: ActionDraft | null,
    opts: {
      hoursAgo: number;
      stage?: ActionStage;
      steps?: { to: ActionStage; hoursAgo: number; actor: string; note: string }[];
    },
  ) => {
    if (!draft) return null;
    const recommendedAt = ago(opts.hoursAgo);
    const a: AXAction = {
      ...draft,
      id: `act-${String(seq++).padStart(3, "0")}`,
      createdAt: recommendedAt,
      updatedAt: recommendedAt,
      source: "demo",
      recommendedAt,
      evidenceIds: [],
      stage: "recommended",
      activity: [{ at: recommendedAt, actor: "시스템", to: "recommended", note: "근거와 함께 추천" }],
      baseline: draft.baseline ? { ...draft.baseline, at: recommendedAt } : undefined,
    };
    ev(draft.urgency === "critical" ? "RISK" : "EXCEPTION", a, `${a.title} — 감지`, a.trigger, recommendedAt);
    let prev: ActionStage = "recommended";
    for (const s of opts.steps ?? []) {
      const at = ago(s.hoursAgo);
      a.activity!.push({ at, actor: s.actor, from: prev, to: s.to, note: s.note });
      a.stage = s.to;
      a.updatedAt = at;
      prev = s.to;
      ev(
        s.to === "reviewing" ? "ADOPTION" : s.to === "done" || s.to === "measured" ? "RESULT" : "ACTION",
        a,
        `${a.title} — ${s.note}`,
        s.note,
        at,
        {
          actor: s.actor,
        },
      );
    }
    actions.push(a);
    return a;
  };
  const firstOf = (kind: ExceptionKind, pred: (e: OpsException) => boolean = () => true) =>
    exceptions.find((e) => e.kind === kind && pred(e));

  // 오늘의 추천 (엔진이 찾은 예외 → 실행)
  const stock = firstOf("stockout", (e) => e.severity === "critical") ?? firstOf("stockout");
  if (stock) add(draftFromException(stock, ctx), { hoursAgo: 2 });
  const supply = firstOf("supply_delay");
  if (supply) add(draftFromException(supply, ctx), { hoursAgo: 5 });
  const late = firstOf("ship_risk", (e) => e.id.startsWith("ex-ship-late"));
  if (late) add(draftFromException(late, ctx), { hoursAgo: 0.5 });
  const overdue = firstOf("ship_risk", (e) => e.id === "ex-ship-overdue");
  if (overdue) add(draftFromException(overdue, ctx), { hoursAgo: 1 });
  const blocked = firstOf("ship_risk", (e) => e.id === "ex-ship-blocked");
  if (blocked) add(draftFromException(blocked, ctx), { hoursAgo: 1 });
  const quality =
    firstOf("return_anomaly", (e) => e.related.signalId?.startsWith("sig-sup") ?? false) ??
    firstOf("return_anomaly");
  if (quality)
    add(draftFromException(quality, ctx), {
      hoursAgo: 46,
      steps: [{ to: "reviewing", hoursAgo: 20, actor: "김구매", note: "반품 근거·입고 로트 확인 중" }],
    });
  const margin = firstOf("low_margin", (e) => !!e.related.promotionId);
  if (margin) add(draftFromException(margin, ctx), { hoursAgo: 24 });
  const over = firstOf("overstock");
  if (over)
    add(draftFromException(over, ctx), {
      hoursAgo: 72,
      steps: [{ to: "reviewing", hoursAgo: 50, actor: "김구매", note: "시즌 수요 확인 중" }],
    });
  const repeat = firstOf("repeat");
  if (repeat) add(draftFromException(repeat, ctx), { hoursAgo: 3 });

  // 진행 중: 품절 SKU — 이미 발주해 내일 입고 예정
  const maskPo = data.purchaseOrders.find(
    (p) =>
      p.skuId ===
      data.skus.find((s) => data.products.find((pp) => pp.id === s.productId)?.name === "KF94 마스크 50매")
        ?.id,
  );
  const maskIns = maskPo ? ctx.insights.find((i) => i.sku.id === maskPo.skuId) : undefined;
  if (maskPo && maskIns) {
    const a = add(
      {
        type: "urgent_po",
        title: `${maskIns.product.name} 품절 — 긴급발주 진행`,
        summary: `가용재고가 0이 되어 ${maskPo.qty}개를 긴급발주했습니다. 입고 예정 ${maskPo.expectedAt}. 상품 상세는 예약배송으로 표시됩니다.`,
        trigger: "가용재고 0",
        reasons: maskIns.reasons.slice(0, 3),
        expectedImpact: "품절 이탈 대신 예약 주문 확보",
        urgency: "critical",
        owner: "buyer",
        assignee: "김구매",
        recommendedAt: ago(52),
        dueAt: ago(46),
        stage: "recommended",
        related: {
          productId: maskIns.product.id,
          skuId: maskIns.sku.id,
          supplierId: maskPo.supplierId,
          poId: maskPo.id,
        },
        proposal: { qty: maskPo.qty, supplierId: maskPo.supplierId },
        baseline: { metric: "가용재고·소진일", value: 0, display: "가용 0개 · 품절", at: ago(52) },
      },
      {
        hoursAgo: 52,
        steps: [
          { to: "reviewing", hoursAgo: 51, actor: "김구매", note: "공급사 납기 확인" },
          { to: "approved", hoursAgo: 50, actor: "대표", note: "승인" },
          {
            to: "requested",
            hoursAgo: 50,
            actor: "김구매",
            note: `${maskPo.id} 발주 요청 (${maskPo.qty}개)`,
          },
        ],
      },
    );
    if (a) a.result = `${maskPo.id} ${maskPo.qty}개 발주 — 입고 예정 ${maskPo.expectedAt}`;
  }

  // 지난 실행: 원장의 실제 입고 기록에 연결
  const pastPo = (productName: string, bundle: number) => {
    const sku = data.skus.find(
      (s) => data.products.find((p) => p.id === s.productId)?.name === productName && s.bundleQty === bundle,
    );
    if (!sku) return null;
    const po = ledger.purchaseOrders
      .filter((p) => p.skuId === sku.id)
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))[0];
    return po ? { sku, po } : null;
  };
  const tissue = pastPo("3겹 롤화장지 30롤", 1);
  if (tissue) {
    const { sku, po } = tissue;
    const rd = Math.max(
      2,
      Math.round((now.getTime() - new Date(`${po.receivedAt}T10:00:00`).getTime()) / 3600000),
    );
    const a = add(
      {
        type: "urgent_po",
        title: "3겹 롤화장지 30롤 발주",
        summary: `판매 증가로 ${po.qty}개 발주 → ${po.receivedAt} 입고 완료.`,
        trigger: "예상 소진일 < 리드타임",
        reasons: [
          `발주 ${po.id}`,
          `입고 ${po.receivedQty}개 (${po.delayDays ? `${po.delayDays}일 지연` : "정시"})`,
        ],
        expectedImpact: "품절 방지",
        urgency: "high",
        owner: "buyer",
        assignee: "김구매",
        recommendedAt: new Date(new Date(po.orderedAt).getTime() - 3 * 3600000).toISOString(),
        dueAt: po.orderedAt,
        stage: "recommended",
        related: { productId: sku.productId, skuId: sku.id, supplierId: po.supplierId },
        proposal: { qty: po.qty, supplierId: po.supplierId },
        baseline: { metric: "가용재고·소진일", value: 0, display: "리드타임 미만", at: po.orderedAt },
      },
      {
        hoursAgo: (now.getTime() - new Date(po.orderedAt).getTime()) / 3600000 + 3,
        steps: [
          {
            to: "approved",
            hoursAgo: (now.getTime() - new Date(po.orderedAt).getTime()) / 3600000 + 1,
            actor: "대표",
            note: "승인",
          },
          {
            to: "requested",
            hoursAgo: (now.getTime() - new Date(po.orderedAt).getTime()) / 3600000,
            actor: "김구매",
            note: `${po.id} 발주 요청`,
          },
          { to: "done", hoursAgo: rd, actor: "이물류", note: `입고 완료 ${po.receivedQty}개` },
          { to: "measured", hoursAgo: Math.max(1, rd - 24), actor: "시스템", note: "성과 측정 기록" },
        ],
      },
    );
    if (a) {
      a.related.poId = po.id;
      a.result = `${po.id} ${po.receivedQty}개 입고`;
      a.measurement = {
        metric: "입고 후 가용재고",
        before: "리드타임 미만",
        after: `입고 ${po.receivedQty.toLocaleString()}개 (${po.receivedAt})`,
        verdict: "improved",
        note: "원장 입고 기록 기준 — 입고 후 결품 없이 판매 지속",
        measuredAt: ago(Math.max(1, rd - 24)),
      };
    }
  }
  const pad = pastPo("반려동물 배변패드 50매", 2);
  if (pad) {
    const { sku, po } = pad;
    const h0 = (now.getTime() - new Date(po.orderedAt).getTime()) / 3600000;
    const a = add(
      {
        type: "urgent_po",
        title: "반려동물 배변패드 2개 묶음 발주",
        summary: `재구매 주기 도래 고객 증가 대응 ${po.qty}개 발주. ${po.receivedAt} 입고.`,
        trigger: "재구매 예상 수요 > 가용재고",
        reasons: [`발주 ${po.id}`, `입고 ${po.receivedQty}개`],
        expectedImpact: "재구매 품절 방지",
        urgency: "mid",
        owner: "buyer",
        assignee: "김구매",
        recommendedAt: ago(h0 + 2),
        dueAt: ago(h0),
        stage: "recommended",
        related: { productId: sku.productId, skuId: sku.id, supplierId: po.supplierId, poId: po.id },
        proposal: { qty: po.qty, supplierId: po.supplierId },
        baseline: { metric: "가용재고·소진일", value: 0, display: "재구매 수요 대비 부족", at: ago(h0 + 2) },
      },
      {
        hoursAgo: h0 + 2,
        steps: [
          { to: "approved", hoursAgo: h0 + 1, actor: "대표", note: "승인" },
          { to: "requested", hoursAgo: h0, actor: "김구매", note: `${po.id} 발주 요청` },
          {
            to: "done",
            hoursAgo: Math.max(
              2,
              (now.getTime() - new Date(`${po.receivedAt}T10:00:00`).getTime()) / 3600000,
            ),
            actor: "이물류",
            note: `입고 완료 ${po.receivedQty}개`,
          },
        ],
      },
    );
    if (a) a.result = `${po.id} ${po.receivedQty}개 입고 — 성과 측정 대기`;
  }

  // 보류·기각도 이유와 함께 남긴다
  const slowSkus = ctx.insights.filter((i) => i.status === "slow" && i.sku.id !== over?.related.skuId);
  const heldIns = slowSkus[0];
  if (heldIns) {
    const ex: OpsException = {
      id: "seed-held",
      kind: "overstock",
      severity: "low",
      title: `${heldIns.product.name} 재고 ${Math.round(heldIns.daysOfStock)}일치`,
      subject: "",
      evidence: heldIns.reasons,
      impact: { value: heldIns.excessValue, unit: "원", label: "60일 판매분을 넘는 재고 원가", basis: "" },
      weight: 0,
      owner: "buyer",
      href: "",
      actionType: "stop_po",
      related: { skuId: heldIns.sku.id, productId: heldIns.product.id },
    };
    const a = add(draftFromException(ex, ctx), {
      hoursAgo: 24 * 6,
      steps: [{ to: "held", hoursAgo: 24 * 5, actor: "대표", note: "보류 — 계절 수요 확인 후 재평가" }],
    });
    if (a) a.holdReason = "계절상품 — 다음 달 첫 주 판매 확인 후 재평가";
  }

  return { actions, evidence };
}
