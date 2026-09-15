"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, Factory, FileCheck2, Package, PauseCircle, Truck, User, XCircle, Bell, Play, Sparkles, Rocket } from "lucide-react";
import type { AXAction, Order, OrderStage } from "@/lib/types";
import { useData, useInsights, useLookups, useOrderRisks } from "@/lib/hooks";
import { ACTION_STAGE_LABEL, CUSTOMER_STAGE_LABEL, ORDER_STAGE_LABEL, ROLE_LABEL, useStore } from "@/lib/store";
import { actionTypeLabel, compareSuppliers, STOCK_STATUS_LABEL, type SkuInsight } from "@/lib/engines";
import { fmtDate, num, pct, relTime, won } from "@/lib/format";
import Overlay from "@/components/shared/Overlay";
import Badge, { StatusBadge } from "@/components/shared/Badge";
import { Sparkline, Meter } from "@/components/shared/Charts";
import { Tabs, Term, TERMS, AiReady } from "@/components/shared/Bits";
import { Field, Reasons, Stat } from "./Widgets";
import { useToast } from "@/components/shared/Toast";

const URG: Record<string, { label: string; cls: string }> = { critical: { label: "긴급", cls: "bg-danger text-white" }, high: { label: "높음", cls: "bg-orange text-white" }, mid: { label: "보통", cls: "bg-secondary text-white" }, low: { label: "낮음", cls: "bg-line text-muted" } };

export function ActionCard({ a, onOpen, compact = false }: { a: AXAction; onOpen: (a: AXAction) => void; compact?: boolean }) {
  const { productById, supplierById } = useLookups();
  const p = a.related.productId ? productById.get(a.related.productId) : undefined;
  const sup = a.related.supplierId ? supplierById.get(a.related.supplierId) : undefined;
  const open = !["done", "dismissed"].includes(a.stage);
  const due = new Date(a.dueAt).getTime() - Date.now();
  return (
    <button onClick={() => onOpen(a)} className={`w-full text-left card p-4 hover:shadow-raised transition-shadow ${!open ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`badge ${URG[a.urgency].cls}`}>{URG[a.urgency].label}</span>
        <Badge tone="soft">{actionTypeLabel(a.type)}</Badge>
        <StatusBadge status={a.stage} />
        {a.scenario && <span className="text-[11px] text-muted">시나리오 {a.scenario}</span>}
        <span className="ml-auto text-xs text-muted inline-flex items-center gap-1"><Clock3 size={12} />{open ? (due < 0 ? `마감 ${relTime(a.dueAt)}` : `마감 ${relTime(a.dueAt)}`) : `완료 ${relTime(a.updatedAt)}`}</span>
      </div>
      <div className="mt-2 font-bold text-[16px] leading-snug">{a.title}</div>
      {!compact && <p className="mt-1 text-sm text-ink/80 line-clamp-2">{a.summary}</p>}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted flex-wrap">
        {p && <span className="inline-flex items-center gap-1"><Package size={12} />{p.name}</span>}
        {sup && <span className="inline-flex items-center gap-1"><Factory size={12} />{sup.name}</span>}
        {a.related.orderIds?.length ? <span className="inline-flex items-center gap-1"><Truck size={12} />주문 {a.related.orderIds.length}건</span> : null}
        {a.related.customerIds?.length ? <span className="inline-flex items-center gap-1"><User size={12} />고객 {a.related.customerIds.length}+명</span> : null}
        <span className="inline-flex items-center gap-1 ml-auto"><User size={12} />{a.assignee} · {ROLE_LABEL[a.owner]}</span>
      </div>
    </button>
  );
}

export function ActionDrawer({ action, onClose, onOpenSku, onOpenOrder }: { action: AXAction | null; onClose: () => void; onOpenSku?: (skuId: string) => void; onOpenOrder?: (orderId: string) => void }) {
  const data = useData();
  const { productById, skuById, supplierById, customerById } = useLookups();
  const setActionStage = useStore((s) => s.setActionStage);
  const role = useStore((s) => s.ui.role);
  const toast = useToast();
  const [hold, setHold] = useState<null | "held" | "dismissed">(null);
  const [reason, setReason] = useState("");
  const [qty, setQty] = useState<number | null>(null);
  const [supId, setSupId] = useState<string | null>(null);
  const a = action ? data.actions.find((x) => x.id === action.id) ?? action : null;
  const options = useMemo(() => (a?.related.skuId ? compareSuppliers(data, a.related.skuId, a.type === "urgent_po" ? "urgent" : "normal") : []), [data, a]);
  if (!a) return null;
  const p = a.related.productId ? productById.get(a.related.productId) : undefined;
  const sku = a.related.skuId ? skuById.get(a.related.skuId) : undefined;
  const isPo = a.type === "urgent_po" || a.type === "alt_supplier";
  const chosenSup = supId ?? a.proposal?.supplierId ?? options.find((o) => o.recommended)?.supplier.id ?? a.related.supplierId;
  const chosenQty = qty ?? a.proposal?.qty ?? 0;
  const canAct = role === "owner" || role === a.owner;
  const evidence = data.evidence.filter((e) => e.actionId === a.id);
  const orders = (a.related.orderIds ?? []).map((id) => data.orders.find((o) => o.id === id)).filter(Boolean) as Order[];
  const po = a.related.poId ? data.purchaseOrders.find((x) => x.id === a.related.poId) : undefined;

  const act = (stage: AXAction["stage"]) => {
    setActionStage(a.id, stage, { qty: chosenQty, supplierId: chosenSup, reason });
    const msg: Record<string, string> = { reviewing: "검토를 시작했습니다", approved: isPo ? "승인 → 발주 요청이 생성되었습니다" : "승인 → 실행되었습니다", done: "완료 처리되었습니다", held: "보류했습니다", dismissed: "무시 처리했습니다", in_progress: "실행 중으로 전환했습니다" };
    toast({ title: msg[stage] ?? "처리했습니다", body: "관련 데이터와 Evidence가 갱신되었습니다.", tone: stage === "dismissed" ? "info" : "success" });
    setHold(null);
  };

  const nextLabel = a.type === "priority_order" ? "우선처리 시작" : a.type === "delay_notice" ? "고객 안내 발송" : a.type === "repeat_expose" ? "노출 시작" : a.type === "promo_adjust" ? "할인율 조정 적용" : a.type === "stop_po" ? "발주 보류 확정" : "승인 · 발주 요청";

  return (
    <Overlay open={!!action} onClose={onClose} variant="drawer" size="lg" title={a.title} subtitle={<span className="inline-flex items-center gap-2"><span className={`badge ${URG[a.urgency].cls}`}>{URG[a.urgency].label}</span><Badge tone="soft">{actionTypeLabel(a.type)}</Badge><StatusBadge status={a.stage} /><span>담당 {a.assignee} · 추천 {relTime(a.recommendedAt)} · 마감 {fmtDate(a.dueAt, "datetime")}</span></span>}
      footer={
        <div className="flex flex-wrap gap-2">
          {!canAct && <div className="text-xs text-muted w-full">이 Action은 {ROLE_LABEL[a.owner]} 권한에서 처리합니다. (현재 {ROLE_LABEL[role]})</div>}
          {["recommended", "reviewing", "held"].includes(a.stage) && canAct && (
            <>
              {a.stage === "recommended" && <button className="btn-outline" onClick={() => act("reviewing")}>확인·검토중</button>}
              <button className="btn-primary" onClick={() => act("approved")} data-autofocus><CheckCircle2 size={16} />{nextLabel}</button>
              <button className="btn-outline" onClick={() => setHold("held")}><PauseCircle size={16} />보류</button>
              <button className="btn-ghost text-muted" onClick={() => setHold("dismissed")}><XCircle size={16} />무시</button>
            </>
          )}
          {["approved", "requested", "in_progress"].includes(a.stage) && canAct && (
            <>
              {a.type === "priority_order" && <button className="btn-primary" onClick={() => act("done")}><Truck size={16} />출고 완료 처리 → 고객 반영</button>}
              {isPo && po && po.status !== "received" && <ReceiveButton poId={po.id} />}
              {!isPo && a.type !== "priority_order" && <button className="btn-primary" onClick={() => act("done")}><CheckCircle2 size={16} />완료</button>}
            </>
          )}
          {["done", "dismissed"].includes(a.stage) && <div className="text-sm text-muted inline-flex items-center gap-1"><FileCheck2 size={15} />{a.stage === "done" ? "완료된 Action입니다. 결과와 Evidence가 기록되었습니다." : `무시됨 — ${a.holdReason ?? "사유 미기록"}`}</div>}
        </div>
      }>
      <div className="space-y-5">
        <div className="rounded-xl bg-mist p-4 text-[15px] leading-relaxed">{a.summary}</div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Trigger">{a.trigger}</Field>
          <Field label="예상 영향">{a.expectedImpact}</Field>
        </div>
        <Reasons items={a.reasons} />
        {a.caution && <div className="flex items-start gap-2 rounded-xl border border-orange/40 bg-orange/5 px-3 py-2.5 text-sm"><AlertTriangle size={16} className="text-orange mt-0.5 shrink-0" /><div><b>주의</b> · {a.caution}</div></div>}

        {/* proposal / supplier selection */}
        {isPo && sku && ["recommended", "reviewing", "held"].includes(a.stage) && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">대안 · 공급사 선택 (L3 — 사람이 승인)</div>
            <div className="space-y-2">
              {options.map((o) => {
                const on = o.supplier.id === chosenSup;
                return (
                  <label key={o.supplier.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${on ? "border-primary bg-soft" : "border-line hover:bg-mist"}`}>
                    <input type="radio" name="sup" checked={on} onChange={() => setSupId(o.supplier.id)} className="mt-1 accent-[var(--t-primary)]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><b>{o.supplier.name}</b>{o.recommended && <Badge tone="primary">추천</Badge>}<span className="text-xs text-muted">점수 {o.score}</span></div>
                      <div className="text-sm text-muted mt-0.5">{o.tradeoffs.join(" · ")} · 정시 {Math.round(o.supplier.onTimeRate * 100)}% · 충족 {Math.round(o.supplier.fillRate * 100)}% · 예상입고 {o.expectedArrival}</div>
                    </div>
                    <div className="text-right text-sm"><div className="font-bold tabular-nums">{won(o.sp.unitCost)}</div><div className="text-xs text-muted">개당</div></div>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="text-sm">발주수량 <input type="number" className="input !min-h-[40px] w-28 inline-block ml-1" value={chosenQty} min={1} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} /></label>
              <span className="text-sm text-muted">예상 발주금액 <b className="text-ink tabular-nums">{won(chosenQty * (options.find((o) => o.supplier.id === chosenSup)?.sp.unitCost ?? sku.cost))}</b></span>
              {a.proposal?.note && <span className="text-xs text-muted">· {a.proposal.note}</span>}
            </div>
          </div>
        )}
        {po && (
          <div className="rounded-xl border border-line p-3 text-sm flex items-center justify-between gap-2 flex-wrap"><div><b>발주 {po.id}</b> · {supplierById.get(po.supplierId)?.name} · {po.qty}개 · 입고예정 {po.expectedAt}</div><StatusBadge status={po.status} /></div>
        )}

        {orders.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">관련 주문 {orders.length}건</div>
            <div className="table-wrap max-h-64 overflow-y-auto"><table className="table"><thead><tr><th>주문</th><th>고객</th><th>단계</th><th>배송약속</th></tr></thead><tbody>
              {orders.map((o) => <tr key={o.id} className="row-clickable" onClick={() => onOpenOrder?.(o.id)}><td className="font-semibold">{o.id}</td><td>{customerById.get(o.customerId)?.name}</td><td><StatusBadge status={o.stage} /></td><td className="text-muted">{fmtDate(o.promisedAt, "datetime")}{o.customerNotified && <Bell size={12} className="inline ml-1 text-orange" />}</td></tr>)}
            </tbody></table></div>
          </div>
        )}
        {a.related.customerIds?.length ? <div className="text-sm"><span className="text-xs font-semibold text-muted uppercase tracking-wide">대상 고객 (일부)</span><div className="mt-1 flex flex-wrap gap-1.5">{a.related.customerIds.map((id) => <span key={id} className="chip !min-h-[30px] text-xs">{customerById.get(id)?.name}</span>)}<span className="chip !min-h-[30px] text-xs text-muted">외 다수</span></div></div> : null}

        {p && sku && (
          <button onClick={() => onOpenSku?.(sku.id)} className="w-full flex items-center justify-between rounded-xl border border-line px-3 py-2.5 hover:bg-mist text-left"><div className="text-sm"><b>{p.name}</b> · {sku.name}<div className="text-xs text-muted">SKU 상세 · 수요신호 · 재고 · 공급사 이력 보기</div></div><ChevronRight size={16} className="text-muted" /></button>
        )}

        {a.result && <div className="rounded-xl bg-teal/10 border border-teal/30 p-3 text-sm"><b>결과</b> · {a.result}</div>}
        {a.holdReason && a.stage === "held" && <div className="rounded-xl bg-mist p-3 text-sm"><b>보류 사유</b> · {a.holdReason}</div>}

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Evidence {evidence.length}건</div>
          {evidence.length ? <ul className="space-y-2">{evidence.map((e) => <li key={e.id} className="flex gap-2 text-sm"><Badge tone={e.type === "RESULT" ? "success" : e.type === "RISK" || e.type === "EXCEPTION" ? "danger" : "primary"}>{e.type}</Badge><div><div className="font-semibold">{e.title}</div><div className="text-muted">{e.detail}</div><div className="text-xs text-muted">{e.actor} · {fmtDate(e.createdAt, "datetime")} · {e.mode}</div></div></li>)}</ul> : <div className="text-sm text-muted">아직 Evidence가 없습니다. 검토·승인 시 자동 기록됩니다.</div>}
        </div>

        <div className="text-xs text-muted flex items-center gap-2"><AiReady compact title="Action 추천 근거" now="규칙 + 통계 기반 계산 (예상 소진일, 리드타임, 추세)" method="RULE + STATISTICAL + OPTIMIZATION · L3 (사람 승인)" next="LLM이 근거를 자연어로 요약하고 담당자 질문에 답변" />추천은 규칙·통계 계산이며, 사람이 승인해야 실행됩니다.</div>
      </div>

      <Overlay open={!!hold} onClose={() => setHold(null)} title={hold === "held" ? "보류 사유" : "무시 사유"} size="sm" footer={<div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setHold(null)}>취소</button><button className="btn-primary flex-1" onClick={() => act(hold!)}>{hold === "held" ? "보류" : "무시"}</button></div>}>
        <textarea className="input min-h-[100px] py-2" placeholder="선택 사항 — 예: 11월 1일 재평가, 시즌 프로모션 예정" value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="text-xs text-muted mt-2">사유는 Evidence에 기록되어 나중에 '왜 안 했는지'를 남깁니다.</p>
      </Overlay>
    </Overlay>
  );
}

function ReceiveButton({ poId }: { poId: string }) {
  const receive = useStore((s) => s.receiveInbound);
  const toast = useToast();
  return <button className="btn-primary" onClick={() => { receive(poId); toast({ title: "입고 처리했습니다", body: "가용재고가 늘고 고객 상품 상세의 재고·배송예정이 갱신됩니다.", tone: "success" }); }}><Package size={16} />입고 완료 처리 (Demo)</button>;
}

// ---------- SKU Drawer ----------
export function SkuDrawer({ skuId, onClose, onOpenAction }: { skuId: string | null; onClose: () => void; onOpenAction?: (a: AXAction) => void }) {
  const data = useData();
  const insights = useInsights();
  const { productById, supplierById, warehouseById, categoryBySlug } = useLookups();
  const role = useStore((s) => s.ui.role);
  const createActionFromSku = useStore((s) => s.createActionFromSku);
  const toast = useToast();
  const [tab, setTab] = useState<"insight" | "supplier" | "orders" | "evidence">("insight");
  const ins = skuId ? insights.find((i) => i.sku.id === skuId) : undefined;
  const options = useMemo(() => (skuId ? compareSuppliers(data, skuId, ins && ["urgent", "stockout"].includes(ins.status) ? "urgent" : ins && ["slow", "overstock"].includes(ins.status) ? "overstock" : "normal") : []), [data, skuId, ins]);
  if (!ins) return null;
  const p = ins.product;
  const pos = data.purchaseOrders.filter((x) => x.skuId === ins.sku.id);
  const actions = data.actions.filter((a) => a.related.skuId === ins.sku.id);
  const evidence = data.evidence.filter((e) => e.skuId === ins.sku.id);
  const recentOrders = data.orders.filter((o) => o.items.some((it) => it.skuId === ins.sku.id)).slice(0, 8);
  const showCost = role !== "ops" && role !== "cs";
  const d = ins.demand;

  return (
    <Overlay open={!!skuId} onClose={onClose} variant="drawer" size="lg" title={<span>{p.name} <span className="text-muted font-normal">· {ins.sku.name}</span></span>} subtitle={<span className="inline-flex items-center gap-2 flex-wrap"><StatusBadge status={ins.status} /><span>{categoryBySlug.get(p.categorySlug)?.name} · <Term term="SKU" desc={TERMS.sku}>{ins.sku.id}</Term> · {warehouseById.get(ins.inv.warehouseId)?.name}</span></span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="가용재고" value={num(ins.available)} sub={`현재고 ${ins.inv.onHand} · 예약 ${ins.inv.reserved}`} />
        <Stat label={<Term term="재고일수" desc={TERMS.daysOfStock}>예상 소진</Term>} value={ins.daysOfStock === Infinity ? "-" : `${ins.daysOfStock.toFixed(1)}일`} sub={`일 ${ins.avgDaily.toFixed(1)}개 판매`} />
        <Stat label={<Term term="리드타임" desc={TERMS.leadTime}>공급 리드타임</Term>} value={`${ins.leadTimeDays}일`} sub={supplierById.get(ins.sku.primarySupplierId)?.name} />
        <Stat label="입고예정" value={ins.expectedInbound ? num(ins.expectedInbound.qty) : "0"} sub={ins.expectedInbound?.eta ?? "없음"} />
      </div>
      <Tabs className="mt-4" value={tab} onChange={setTab} tabs={[{ key: "insight", label: "Demand Insight" }, { key: "supplier", label: "공급사·발주", count: pos.length }, { key: "orders", label: "주문·배송", count: recentOrders.length }, { key: "evidence", label: "Action·Evidence", count: actions.length + evidence.length }]} />
      <div className="pt-4 space-y-4">
        {tab === "insight" && (
          <>
            <div className="grid sm:grid-cols-[1fr_180px] gap-4 items-center">
              <div>
                <div className="text-xs font-semibold text-muted uppercase">최근 14일 판매</div>
                <div className="mt-1"><Sparkline values={d.dailySales} width={380} height={64} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[["검색", d.search7d, d.searchPrev7d], ["조회", d.view7d, d.viewPrev7d], ["장바구니", d.cart7d, d.cartPrev7d], ["주문", d.order7d, d.orderPrev7d]].map(([l, c, pv]) => { const r = (pv as number) > 0 ? ((c as number) - (pv as number)) / (pv as number) : 0; return <div key={l as string} className="rounded-lg bg-mist px-2.5 py-2"><div className="text-[11px] text-muted">{l} 7일</div><div className="font-bold tabular-nums">{num(c as number)}</div><div className={`text-[11px] font-semibold ${r >= 0 ? "text-teal" : "text-danger"}`}>{r >= 0 ? "+" : ""}{Math.round(r * 100)}%</div></div>; })}
              </div>
            </div>
            <Reasons items={ins.reasons} title="판단 근거 (Demand Signal)" />
            <div className="grid sm:grid-cols-3 gap-2 text-sm">
              <Stat label={<Term term="안전재고" desc={TERMS.safetyStock}>안전재고</Term>} value={num(ins.safetyStock)} sub={ins.shortage > 0 ? `부족 ${ins.shortage}` : "충족"} />
              <Stat label="발주 우선순위" value={`${ins.priority}/100`} sub={<Meter value={ins.priority} max={100} color={ins.priority > 70 ? "#D93A3A" : "var(--t-primary)"} className="mt-1" />} />
              <Stat label="추천 검토수량" value={ins.recommendedQty ? `${num(ins.recommendedQty)}개` : "-"} sub={ins.recommendedQty ? `최소주문 ${ins.sku.moq}` : "발주 불필요"} />
            </div>
            {showCost && <div className="grid grid-cols-3 gap-2 text-sm"><Stat label="판매가" value={won(ins.sku.salePrice)} /><Stat label="원가" value={won(ins.sku.cost)} /><Stat label={<Term term="마진율" desc={TERMS.grossMargin}>마진율</Term>} value={pct(ins.marginRate, 0)} sub={`재고금액 ${won(ins.stockValue)}`} /></div>}
            {!ins.hasOpenAction && (role === "owner" || role === "buyer") && ((ins.recommendedQty > 0 && ["urgent", "stockout", "low", "rising"].includes(ins.status)) || ["slow", "overstock"].includes(ins.status)) && (
              <button className="btn-primary w-full" onClick={() => { const id = createActionFromSku(ins.sku.id); if (!id) { toast({ title: "이미 진행 중인 Action이 있습니다", tone: "info" }); return; } const a = useStore.getState().data.actions.find((x) => x.id === id); toast({ title: "Action을 생성했습니다", body: "근거·추천수량·공급사 대안이 담겼습니다.", tone: "success" }); if (a) onOpenAction?.(a); }}>
                <Rocket size={16} />{["slow", "overstock"].includes(ins.status) ? "발주 보류 검토 Action 만들기" : `발주 검토 Action 만들기 (${ins.recommendedQty}개)`}
              </button>
            )}
            {ins.hasOpenAction && <div className="text-xs text-muted">이 SKU에 진행 중인 Action이 있습니다 — Action·Evidence 탭에서 확인</div>}
            <div className="text-xs text-muted flex items-center gap-2"><AiReady compact title="Demand & Purchase Recommendation" now="판매속도·재고·검색·장바구니·리드타임 규칙 계산" method="RULE + STATISTICAL · L3" next="LLM이 시즌·프로모션 맥락을 반영한 설명 제공" />AI Ready</div>
          </>
        )}
        {tab === "supplier" && (
          <>
            <div className="text-xs font-semibold text-muted uppercase mb-2">공급사 비교 ({options.length}) — {ins.status === "urgent" || ins.status === "stockout" ? "긴급: 납기 가중" : ins.status === "slow" || ins.status === "overstock" ? "과잉: 최소수량·단가 가중" : "기본 가중"}</div>
            <div className="table-wrap"><table className="table"><thead><tr><th>공급사</th><th>단가</th><th>납기</th><th>최소수량</th><th>정시납품</th><th>충족률</th><th>불량</th><th>예상입고</th><th>점수</th></tr></thead><tbody>
              {options.map((o) => <tr key={o.supplier.id} className={o.recommended ? "row-selected" : ""}><td className="font-semibold whitespace-nowrap">{o.supplier.name}{o.recommended && <Badge tone="primary" className="ml-1">추천</Badge>}</td><td className="tabular-nums">{showCost ? won(o.sp.unitCost) : "—"}<div className="text-[11px] text-muted">{o.costDiffPct ? `+${o.costDiffPct}%` : "최저"}</div></td><td>{o.sp.leadTimeDays}일</td><td>{o.sp.moq}</td><td>{Math.round(o.supplier.onTimeRate * 100)}%</td><td>{Math.round(o.supplier.fillRate * 100)}%</td><td>{(o.supplier.defectRate * 100).toFixed(1)}%</td><td className="whitespace-nowrap">{o.expectedArrival}</td><td className="font-bold">{o.score}</td></tr>)}
            </tbody></table></div>
            <p className="text-xs text-muted mt-2">가장 싼 공급사를 무조건 추천하지 않습니다. 긴급 품절위험에서는 납기가, 과잉재고 위험에서는 최소주문수량이 더 중요합니다.</p>
            <div className="text-xs font-semibold text-muted uppercase mt-4 mb-2">발주 이력</div>
            {pos.length ? <div className="table-wrap"><table className="table"><thead><tr><th>PO</th><th>공급사</th><th>수량</th><th>예정</th><th>상태</th></tr></thead><tbody>{pos.map((po) => <tr key={po.id}><td className="font-semibold">{po.id}</td><td>{supplierById.get(po.supplierId)?.name}</td><td>{po.qty}</td><td>{po.expectedAt}</td><td><StatusBadge status={po.status} /></td></tr>)}</tbody></table></div> : <div className="text-sm text-muted">발주 이력이 없습니다.</div>}
          </>
        )}
        {tab === "orders" && (recentOrders.length ? <div className="table-wrap"><table className="table"><thead><tr><th>주문</th><th>일시</th><th>수량</th><th>단계</th></tr></thead><tbody>{recentOrders.map((o) => <tr key={o.id}><td className="font-semibold">{o.id}</td><td className="text-muted">{fmtDate(o.createdAt, "datetime")}</td><td>{o.items.find((it) => it.skuId === ins.sku.id)?.qty}</td><td><StatusBadge status={o.stage} /></td></tr>)}</tbody></table></div> : <div className="text-sm text-muted">최근 7일 상세 주문에 포함되지 않았습니다. (집계 판매는 Demand Insight 참고)</div>)}
        {tab === "evidence" && (
          <div className="space-y-3">
            {actions.map((a) => <button key={a.id} onClick={() => onOpenAction?.(a)} className="w-full text-left rounded-xl border border-line p-3 hover:bg-mist flex items-center justify-between gap-2"><div><div className="flex items-center gap-2"><Badge tone="soft">{actionTypeLabel(a.type)}</Badge><StatusBadge status={a.stage} /></div><div className="font-semibold text-sm mt-1">{a.title}</div></div><ChevronRight size={16} className="text-muted shrink-0" /></button>)}
            {evidence.map((e) => <div key={e.id} className="flex gap-2 text-sm"><Badge tone={e.type === "RESULT" ? "success" : e.type === "RISK" ? "danger" : "primary"}>{e.type}</Badge><div><div className="font-semibold">{e.title}</div><div className="text-muted">{e.detail}</div><div className="text-xs text-muted">{e.actor} · {fmtDate(e.createdAt, "datetime")}</div></div></div>)}
            {!actions.length && !evidence.length && <div className="text-sm text-muted">Action·Evidence가 없습니다.</div>}
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ---------- Order Drawer ----------
const FLOW: OrderStage[] = ["new", "confirmed", "picking_wait", "picking", "packing_wait", "ship_wait", "shipped", "in_transit", "delivered"];

export function OrderDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const data = useData();
  const risks = useOrderRisks();
  const { customerById, warehouseById, productById } = useLookups();
  const advance = useStore((s) => s.advanceOrder);
  const notify = useStore((s) => s.notifyCustomer);
  const role = useStore((s) => s.ui.role);
  const toast = useToast();
  const o = orderId ? data.orders.find((x) => x.id === orderId) : undefined;
  if (!o) return null;
  const c = customerById.get(o.customerId);
  const risk = risks.find((r) => r.order.id === o.id);
  const idx = FLOW.indexOf(o.stage);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const canOps = role === "owner" || role === "ops";
  const canCs = role === "owner" || role === "cs";
  const evidence = data.evidence.filter((e) => e.orderId === o.id);
  return (
    <Overlay open={!!orderId} onClose={onClose} variant="drawer" size="md" title={`주문 ${o.id}`} subtitle={<span className="inline-flex items-center gap-2 flex-wrap"><StatusBadge status={o.stage} />{risk && <Badge tone={risk.level === "high" ? "danger" : risk.level === "mid" ? "warn" : "neutral"}>지연위험 {risk.score}</Badge>}<span>{fmtDate(o.createdAt, "datetime")} · {warehouseById.get(o.warehouseId)?.name}</span></span>}
      footer={
        <div className="flex flex-wrap gap-2">
          {next && canOps && !["cancelled", "return"].includes(o.stage) && <button className="btn-primary" data-autofocus onClick={() => { advance(o.id, next); toast({ title: `${ORDER_STAGE_LABEL[next]} 처리`, body: `고객 My Page에 '${CUSTOMER_STAGE_LABEL[next]}' 상태가 반영됩니다.`, tone: "success" }); }}><Play size={16} />다음 단계: {ORDER_STAGE_LABEL[next]}</button>}
          {o.stage === "picking_wait" && canOps && <button className="btn-outline" onClick={() => { advance(o.id, "shipped"); toast({ title: "우선처리 → 출고완료", tone: "success" }); }}><Truck size={16} />우선처리 (바로 출고)</button>}
          {canCs && !o.customerNotified && !["delivered", "cancelled"].includes(o.stage) && <button className="btn-outline" onClick={() => { notify(o.id, "물류 사정으로 배송이 하루 지연될 수 있어 미리 안내드립니다."); toast({ title: "고객 사전안내를 발송했습니다", tone: "success" }); }}><Bell size={16} />지연 사전안내</button>}
          {o.customerNotified && <span className="text-sm text-muted inline-flex items-center gap-1"><Bell size={14} className="text-orange" />고객 안내 발송됨</span>}
        </div>
      }>
      <div className="space-y-4">
        {risk && risk.level !== "low" && <div className={`rounded-xl p-3 text-sm ${risk.level === "high" ? "bg-danger/10 border border-danger/30" : "bg-orange/10 border border-orange/30"}`}><div className="font-bold flex items-center gap-1"><AlertTriangle size={15} />지연위험 {risk.level === "high" ? "높음" : "보통"} ({risk.score}점)</div><ul className="mt-1 list-disc pl-5 space-y-0.5">{risk.causes.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        <div className="grid grid-cols-2 gap-2">
          <Field label="고객">{c?.name} <span className="text-muted font-normal text-sm">({role === "ops" ? "연락처 비공개" : c?.phone})</span></Field>
          <Field label="배송지">{role === "ops" ? c?.address.line1.split(" ").slice(0, 2).join(" ") + " …" : `${c?.address.line1} ${c?.address.line2 ?? ""}`}</Field>
          <Field label="배송약속">{fmtDate(o.promisedAt, "datetime")}</Field>
          <Field label="출고마감">{fmtDate(o.cutoffAt, "datetime")}</Field>
          <Field label="담당자">{o.assignee ?? "미배정"}</Field>
          <Field label="금액">{won(o.total)} {o.isRepeatOrder && <Badge tone="soft">재구매</Badge>}</Field>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted uppercase mb-2">상품 {o.items.length}</div>
          <ul className="divide-y divide-line rounded-xl border border-line">{o.items.map((it) => { const p = productById.get(it.productId); const inv = data.inventory.find((i) => i.skuId === it.skuId); const av = inv ? inv.onHand - inv.reserved : 0; return <li key={it.skuId} className="px-3 py-2 flex items-center justify-between gap-2 text-sm"><div><b>{it.name}</b> · {it.skuName} × {it.qty}<div className="text-xs text-muted">{p?.categorySlug} · 가용재고 {av}{inv && inv.onHand < it.qty ? " (재고예외!)" : ""}</div></div><span className="tabular-nums">{won(it.unitPrice * it.qty)}</span></li>; })}</ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted uppercase mb-2">처리 History</div>
          <ol className="border-l-2 border-line pl-4 space-y-2">{[...o.history].reverse().map((h, i) => <li key={i} className="relative text-sm"><span className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full ${i === 0 ? "bg-primary" : "bg-line"}`} /><b>{ORDER_STAGE_LABEL[h.stage]}</b> <span className="text-muted">· {h.actor} · {fmtDate(h.at, "datetime")}{h.note ? ` · ${h.note}` : ""}</span></li>)}</ol>
        </div>
        <div className="text-xs text-muted">고객 화면 표시: <b>{CUSTOMER_STAGE_LABEL[o.stage]}</b> — 여기서 단계를 바꾸면 고객 My Page가 함께 바뀝니다. <Link href={`/my/orders/${o.id}`} target="_blank" className="text-primary underline">고객 화면에서 보기</Link></div>
        {evidence.length > 0 && <div><div className="text-xs font-semibold text-muted uppercase mb-2">Evidence</div><ul className="space-y-1.5 text-sm">{evidence.map((e) => <li key={e.id} className="flex gap-2"><Badge tone="primary">{e.type}</Badge><span>{e.title} <span className="text-muted">· {fmtDate(e.createdAt, "time")}</span></span></li>)}</ul></div>}
        <div className="text-xs text-muted flex items-center gap-2"><AiReady compact title="Fulfillment Risk" now="마감·배송약속·구역 적체·재고예외 규칙 점수" method="RULE + STATISTICAL · L2 추천" next="처리량 예측으로 마감 초과 확률 산출" /><Sparkles size={12} />위험 점수는 규칙 기반입니다.</div>
      </div>
    </Overlay>
  );
}

export function useSkuInsightMap(insights: SkuInsight[]) {
  return useMemo(() => new Map(insights.map((i) => [i.sku.id, i])), [insights]);
}
