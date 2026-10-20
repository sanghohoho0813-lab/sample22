"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  Package,
  PauseCircle,
  PlayCircle,
  Users,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { AXAction, Order } from "@/lib/types";
import {
  useData,
  useForecast,
  useLedger,
  useLookups,
  useMinute,
  useBulkyOf,
  useCustomerName,
} from "@/lib/hooks";
import { ROLE_LABEL, useStore } from "@/lib/store";
import { actionTypeLabel, compareSuppliers } from "@/lib/engines";
import { staffMoveEffect, SHIP_STATUS_LABEL } from "@/lib/fulfillment";
import { measureAction } from "@/lib/lifecycle";
import { fmtDate, relTime, won } from "@/lib/format";
import { EVIDENCE_TYPE_LABEL } from "@/lib/labels";
import Overlay from "@/components/shared/Overlay";
import Badge, { StatusBadge } from "@/components/shared/Badge";
import { useToast } from "@/components/shared/Toast";
import { Reasons } from "./Widgets";
import { ActivityTimeline, Basis, Impact, LifecycleStepper, MeasureRow, SeverityTag } from "./OpsUi";

const APPROVE_LABEL: Record<AXAction["type"], string> = {
  urgent_po: "승인 · 발주 요청",
  alt_supplier: "승인 · 대체 발주 요청",
  priority_order: "승인 · 우선처리 지정",
  staff_rebalance: "승인 · 인원 재배치",
  delay_notice: "승인 · 고객 안내 발송",
  repeat_expose: "승인 · 노출 시작",
  promo_adjust: "승인 · 할인율 조정",
  stop_po: "승인 · 발주 보류",
  quality_issue: "승인 · 조치 시작",
};

export function ActionDrawer({
  action,
  onClose,
  onOpenSku,
  onOpenOrder,
  nav,
}: {
  action: AXAction | null;
  onClose: () => void;
  onOpenSku?: (skuId: string) => void;
  onOpenOrder?: (orderId: string) => void;
  /** 목록에서 연 경우 — 닫지 않고 이전·다음 실행으로 넘겨 보며 연속 처리 */
  nav?: { index: number; total: number; onPrev: () => void; onNext: () => void };
}) {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const bulkyOf = useBulkyOf();
  const forecast = useForecast();
  const customerName = useCustomerName();
  const { productById, skuById, supplierById, warehouseById } = useLookups();
  const setActionStage = useStore((s) => s.setActionStage);
  const receive = useStore((s) => s.receiveInbound);
  const role = useStore((s) => s.ui.role);
  const toast = useToast();
  const [hold, setHold] = useState<null | "held" | "dismissed">(null);
  const [reason, setReason] = useState("");
  const [qty, setQty] = useState<number | null>(null);
  const [supId, setSupId] = useState<string | null>(null);
  // 다른 실행을 열면 앞 실행에서 고친 수량·공급사·보류 사유가 따라오지 않도록 초기화
  const [openedId, setOpenedId] = useState(action?.id);
  if (action?.id !== openedId) {
    setOpenedId(action?.id);
    setHold(null);
    setReason("");
    setQty(null);
    setSupId(null);
  }
  // J/K 로 다음·이전 (입력 중이거나 사유 입력 창이 열려 있으면 무시)
  useEffect(() => {
    if (!action || !nav || hold) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "j" || e.key === "J") nav.onNext();
      else if (e.key === "k" || e.key === "K") nav.onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [action, nav, hold]);
  const a = action ? (data.actions.find((x) => x.id === action.id) ?? action) : null;
  const isPo = a?.type === "urgent_po" || a?.type === "alt_supplier";
  const editable = !!a && ["recommended", "reviewing", "held"].includes(a.stage);
  const options = useMemo(
    () =>
      a?.related.skuId && isPo && editable
        ? compareSuppliers(data, a.related.skuId, a.type === "urgent_po" ? "urgent" : "urgent", {
            now,
            ledger,
            qty: a.proposal?.qty,
          })
        : [],
    [data, a, isPo, editable, now, ledger],
  );
  const staffEffect = useMemo(
    () =>
      a?.type === "staff_rebalance" && a.detail?.staffMove && editable
        ? staffMoveEffect(data, now, a.detail.staffMove, bulkyOf)
        : null,
    [a, data, now, bulkyOf, editable],
  );
  const liveMeasure = useMemo(
    () =>
      a && ["requested", "in_progress", "done"].includes(a.stage)
        ? measureAction(a, data, ledger, now)
        : null,
    [a, data, ledger, now],
  );
  if (!a) return null;
  const p = a.related.productId ? productById.get(a.related.productId) : undefined;
  const sku = a.related.skuId ? skuById.get(a.related.skuId) : undefined;
  const chosenSup =
    supId ??
    a.proposal?.supplierId ??
    options.find((o) => o.recommended)?.supplier.id ??
    a.related.supplierId;
  const chosenQty = qty ?? a.proposal?.qty ?? 0;
  const chosenOpt = options.find((o) => o.supplier.id === chosenSup);
  const canAct = role === "owner" || role === a.owner;
  const evidence = data.evidence.filter((e) => e.actionId === a.id);
  const orders = (a.related.orderIds ?? [])
    .map((id) => data.orders.find((o) => o.id === id))
    .filter(Boolean) as Order[];
  const predOf = new Map(forecast.orders.map((x) => [x.order.id, x]));
  const po = a.related.poId ? data.purchaseOrders.find((x) => x.id === a.related.poId) : undefined;
  const overdue =
    new Date(a.dueAt).getTime() < now.getTime() && !["done", "measured", "dismissed"].includes(a.stage);
  const shipped = orders.filter((o) => ["shipped", "in_transit", "delivered"].includes(o.stage)).length;

  const act = (stage: AXAction["stage"], msg: string) => {
    setActionStage(a.id, stage, { qty: chosenQty, supplierId: chosenSup, reason });
    toast({
      title: msg,
      body: "활동 로그와 성과 기록에 남았습니다.",
      tone: stage === "dismissed" ? "info" : "success",
    });
    setHold(null);
    setReason("");
  };

  return (
    <Overlay
      open={!!action}
      onClose={onClose}
      variant="drawer"
      size="lg"
      title={a.title}
      headerActions={
        nav && nav.total > 1 ? (
          <div className="flex items-center gap-0.5" aria-label="실행 이동">
            <span className="mr-1 hidden text-[13px] tabular-nums text-muted sm:inline">
              {nav.index + 1} / {nav.total}
            </span>
            <button
              type="button"
              className="btn-ghost btn-sm !min-h-[40px] !px-2 disabled:opacity-35"
              onClick={nav.onPrev}
              disabled={nav.index <= 0}
              aria-label="이전 실행"
              title="이전 실행 (K)"
              aria-keyshortcuts="K"
            >
              <ChevronUp size={19} />
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm !min-h-[40px] !px-2 disabled:opacity-35"
              onClick={nav.onNext}
              disabled={nav.index >= nav.total - 1}
              aria-label="다음 실행"
              title="다음 실행 (J)"
              aria-keyshortcuts="J"
            >
              <ChevronDown size={19} />
            </button>
          </div>
        ) : null
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <SeverityTag s={a.urgency} />
          <span className="text-[14px] font-semibold">{actionTypeLabel(a.type)}</span>
          <span className="text-[14px]">
            · 담당 {a.assignee} ({ROLE_LABEL[a.owner]}) ·{" "}
            {overdue ? <b className="text-danger">기한 지남</b> : <>기한 {fmtDate(a.dueAt, "datetime")}</>}
          </span>
        </span>
      }
      footer={
        <div className="flex flex-wrap gap-2">
          {!canAct && !["done", "measured", "dismissed"].includes(a.stage) && (
            <div className="w-full text-xs text-muted">
              이 실행은 {ROLE_LABEL[a.owner]} 권한에서 처리합니다. (현재 {ROLE_LABEL[role]})
            </div>
          )}
          {canAct && ["recommended", "reviewing"].includes(a.stage) && (
            <>
              {a.stage === "recommended" && (
                <button
                  className="btn-outline"
                  onClick={() => act("reviewing", "담당자 확인으로 넘겼습니다")}
                >
                  <ClipboardCheck size={16} />
                  담당자 확인
                </button>
              )}
              <button
                className="btn-primary"
                data-autofocus
                onClick={() => act("approved", "승인했습니다 — 실행이 시작됐습니다")}
              >
                <CheckCircle2 size={16} />
                {APPROVE_LABEL[a.type]}
              </button>
              <button className="btn-outline" onClick={() => setHold("held")}>
                <PauseCircle size={16} />
                보류
              </button>
              <button className="btn-ghost text-muted" onClick={() => setHold("dismissed")}>
                <XCircle size={16} />
                기각
              </button>
            </>
          )}
          {canAct && a.stage === "held" && (
            <>
              <button className="btn-primary" onClick={() => act("reviewing", "다시 검토합니다")}>
                <PlayCircle size={16} />
                재개 · 담당자 확인
              </button>
              <button className="btn-ghost text-muted" onClick={() => setHold("dismissed")}>
                <XCircle size={16} />
                기각
              </button>
            </>
          )}
          {canAct && a.stage === "requested" && po && po.status !== "received" && (
            <button
              className="btn-primary"
              onClick={() => {
                receive(po.id);
                toast({
                  title: "입고 처리했습니다",
                  body: "가용재고가 늘고 실행이 완료로 바뀌었습니다.",
                  tone: "success",
                });
              }}
            >
              <Package size={16} />
              입고 처리 (시연)
            </button>
          )}
          {canAct && a.stage === "in_progress" && (
            <button className="btn-primary" onClick={() => act("done", "완료 처리했습니다")}>
              <CheckCircle2 size={16} />
              완료 처리
              {a.type === "priority_order" && orders.length ? ` (${shipped}/${orders.length} 출고)` : ""}
            </button>
          )}
          {canAct && a.stage === "done" && (
            <button className="btn-primary" onClick={() => act("measured", "성과를 기록했습니다")}>
              <Gauge size={16} />
              성과 측정 기록
            </button>
          )}
          {["measured", "dismissed"].includes(a.stage) && (
            <div className="inline-flex items-center gap-1 text-sm text-muted">
              <FileCheck2 size={15} />
              {a.stage === "measured"
                ? "성과 측정까지 끝난 실행입니다."
                : `기각 — ${a.holdReason ?? "사유 미기록"}`}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <LifecycleStepper stage={a.stage} />
        {(a.stage === "held" || a.stage === "dismissed") && (
          <div className="rounded-xl bg-mist p-3 text-sm">
            <b>{a.stage === "held" ? "보류" : "기각"}</b> · {a.holdReason ?? "사유 미기록"}
          </div>
        )}

        <div className="rounded-xl bg-mist p-4 text-[16px] leading-relaxed">{a.summary}</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line p-3">
            <div className="text-xs font-semibold text-muted">발생 조건</div>
            <div className="mt-1 text-[16px] font-semibold">{a.trigger}</div>
          </div>
          <div className="rounded-xl border border-line p-3">
            <div className="text-xs font-semibold text-muted">{a.impact?.label ?? "예상 영향"}</div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              {a.impact ? (
                <Impact value={a.impact.value} unit={a.impact.unit} />
              ) : (
                <span className="text-[16px] font-semibold">{a.expectedImpact}</span>
              )}
            </div>
            {a.impact?.basis && <Basis>{a.impact.basis}</Basis>}
          </div>
        </div>

        <Reasons items={a.reasons} />
        {a.caution && (
          <div className="flex items-start gap-2 rounded-xl border border-orange/40 bg-orange/5 px-3 py-2.5 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange" />
            <div>
              <b>주의</b> · {a.caution}
            </div>
          </div>
        )}

        {/* 발주 제안: 공급사 총비용 비교 + 수량 */}
        {isPo && sku && editable && options.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold">공급사 선택 · 총비용 기준 (사람이 승인)</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>공급사</th>
                    <th className="text-right">단가</th>
                    <th className="text-right">발주</th>
                    <th className="text-right">도착</th>
                    <th className="text-right">총비용</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((o) => {
                    const on = o.supplier.id === chosenSup;
                    return (
                      <tr
                        key={o.supplier.id}
                        className={`row-clickable ${on ? "row-selected" : ""}`}
                        onClick={() => setSupId(o.supplier.id)}
                      >
                        <td>
                          <label className="flex cursor-pointer items-start gap-2">
                            <input
                              type="radio"
                              name="sup"
                              checked={on}
                              onChange={() => setSupId(o.supplier.id)}
                              className="mt-1 accent-[var(--t-primary)]"
                            />
                            <span>
                              <b>{o.supplier.name}</b> {o.recommended && <Badge tone="primary">추천</Badge>}
                              <span className="block text-[13px] text-muted">{o.why}</span>
                            </span>
                          </label>
                        </td>
                        <td className="text-right tabular-nums">{won(o.sp.unitCost)}</td>
                        <td className="text-right tabular-nums">{o.orderQty.toLocaleString()}개</td>
                        <td className="text-right tabular-nums">{o.expectedDays}일</td>
                        <td className="text-right font-bold tabular-nums">{won(o.totalCost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-sm">
                발주수량{" "}
                <input
                  type="number"
                  className="input ml-1 inline-block !min-h-[40px] w-28"
                  value={chosenQty}
                  min={1}
                  max={99999}
                  inputMode="numeric"
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value));
                    setQty(Number.isFinite(n) ? Math.min(99999, Math.max(1, n)) : 1);
                  }}
                />
              </label>
              <span className="text-sm text-muted">
                발주금액{" "}
                <b className="tabular-nums text-ink">
                  {won(chosenQty * (chosenOpt?.sp.unitCost ?? sku.cost))}
                </b>
              </span>
              {chosenOpt && chosenQty < chosenOpt.sp.moq && (
                <span className="text-sm text-danger">최소주문수량 {chosenOpt.sp.moq}개 미만</span>
              )}
            </div>
            <Basis>
              총비용 = 발주금액 + 도착 전 결품으로 놓치는 이익 + 실적 불량률 손실 + 부족 입고 부담
            </Basis>
          </section>
        )}

        {/* 인력 재배치 시뮬레이션 */}
        {a.type === "staff_rebalance" && a.detail?.staffMove && (
          <section className="rounded-xl border border-line p-3">
            <h3 className="text-sm font-bold">재배치 시뮬레이션</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[15px]">
              <span className="chip !min-h-[30px]">{warehouseById.get(a.detail.staffMove.from)?.name}</span>
              <ChevronRight size={16} className="text-muted" />
              <span className="chip !min-h-[30px]">{warehouseById.get(a.detail.staffMove.to)?.name}</span>
              <b>{a.detail.staffMove.n}명</b>
            </div>
            {staffEffect && (
              <p className="mt-2 text-[15px]">
                마감 초과 예상 <b className="tabular-nums">{staffEffect.before}건</b> →{" "}
                <b className="tabular-nums text-teal">{staffEffect.after}건</b> (지금 데이터로 다시 계산)
              </p>
            )}
            <Basis>
              구역 인원 × 남은 근무시간 vs 주문별 작업시간(기본 9분 + 수량당 2.5분, 중량 상품 2배)
            </Basis>
          </section>
        )}

        {po && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm">
            <div>
              <b>발주 {po.id}</b> · {supplierById.get(po.supplierId)?.name} · {po.qty.toLocaleString()}개 ·
              입고예정 {po.expectedAt}
              {po.note && <span className="text-danger"> · {po.note}</span>}
            </div>
            <StatusBadge status={po.status} />
          </div>
        )}

        {/* 영향 대상 */}
        {orders.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold">
              대상 주문 {orders.length}건{" "}
              {shipped > 0 && <span className="font-normal text-muted">· 출고 {shipped}건</span>}
            </h3>
            <div className="table-wrap max-h-72 overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>주문</th>
                    <th>고객</th>
                    <th>단계</th>
                    <th>출고 예측</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const pr = predOf.get(o.id);
                    return (
                      <tr key={o.id} className="row-clickable" onClick={() => onOpenOrder?.(o.id)}>
                        <td className="font-semibold tabular-nums">
                          {o.id}
                          {o.priority && (
                            <span className="ml-1 text-[12px] font-bold text-primary">우선</span>
                          )}
                        </td>
                        <td>{customerName(o.customerId)}</td>
                        <td>
                          <StatusBadge status={o.stage} />
                        </td>
                        <td className="text-[13px]">
                          {pr ? (
                            <span
                              className={
                                ["late", "overdue", "blocked"].includes(pr.status)
                                  ? "font-semibold text-danger"
                                  : pr.status === "tight"
                                    ? "text-orange"
                                    : "text-muted"
                              }
                            >
                              {SHIP_STATUS_LABEL[pr.status]}
                            </span>
                          ) : (
                            <span className="text-muted">출고됨</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {a.related.customerIds?.length ? (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <Users size={15} /> 대상 고객 {a.related.customerIds.length.toLocaleString()}명
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {a.related.customerIds.slice(0, 12).map((id) => (
                <span key={id} className="chip !min-h-[30px] text-[13px]">
                  {customerName(id)}
                </span>
              ))}
              {a.related.customerIds.length > 12 && (
                <span className="chip !min-h-[30px] text-[13px] text-muted">
                  외 {a.related.customerIds.length - 12}명
                </span>
              )}
            </div>
          </section>
        ) : null}
        {(p || a.related.supplierId) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {p && sku && (
              <button
                onClick={() => onOpenSku?.(sku.id)}
                className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left hover:bg-mist"
              >
                <span className="text-sm">
                  <b>{p.name}</b> · {sku.name}
                  <span className="block text-xs text-muted">재고·발주량 계산·공급사 이력</span>
                </span>
                <ChevronRight size={16} className="text-muted" />
              </button>
            )}
            {a.related.supplierId && (
              <Link
                href={`/ax/suppliers?supplier=${a.related.supplierId}`}
                className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left hover:bg-mist"
              >
                <span className="text-sm">
                  <b>{supplierById.get(a.related.supplierId)?.name}</b>
                  <span className="block text-xs text-muted">공급사 실적·발주 이력</span>
                </span>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            )}
          </div>
        )}

        {/* 기준값 → 성과 */}
        <section>
          <h3 className="mb-2 text-sm font-bold">성과 측정</h3>
          {a.measurement ? (
            <MeasureRow m={a.measurement} />
          ) : liveMeasure ? (
            <MeasureRow m={liveMeasure} live />
          ) : (
            <div className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">
              실행 전 기준값: <b className="text-ink">{a.baseline?.display ?? "-"}</b> — 승인 후 같은 지표로
              다시 잽니다.
            </div>
          )}
        </section>

        {a.result && (
          <div className="rounded-xl border border-teal/30 bg-teal/10 p-3 text-sm">
            <b>실행 결과</b> · {a.result}
          </div>
        )}

        <section>
          <h3 className="mb-2 text-sm font-bold">활동 로그</h3>
          <ActivityTimeline items={a.activity ?? [{ at: a.recommendedAt, actor: "시스템", note: "추천" }]} />
        </section>

        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-bold">성과 기록 {evidence.length}건</summary>
          <ul className="mt-3 space-y-2">
            {evidence.map((e) => (
              <li key={e.id} className="flex gap-2 text-sm">
                <Badge
                  tone={
                    e.type === "RESULT"
                      ? "success"
                      : e.type === "RISK" || e.type === "EXCEPTION"
                        ? "danger"
                        : "primary"
                  }
                >
                  {EVIDENCE_TYPE_LABEL[e.type] ?? e.type}
                </Badge>
                <div>
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-muted">{e.detail}</div>
                  <div className="text-xs text-muted">
                    {e.actor} · {fmtDate(e.createdAt, "datetime")} ({relTime(e.createdAt)}) · {e.mode}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
        <p className="text-xs text-muted">
          추천은 규칙·통계·시뮬레이션 계산이며, 사람이 승인해야 실행됩니다. 자동 발주(L4)는 없습니다.
        </p>
      </div>

      <Overlay
        open={!!hold}
        onClose={() => setHold(null)}
        title={hold === "held" ? "보류 사유" : "기각 사유"}
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => setHold(null)}>
              취소
            </button>
            <button
              className="btn-primary flex-1"
              onClick={() => act(hold!, hold === "held" ? "보류했습니다" : "기각했습니다")}
            >
              {hold === "held" ? "보류" : "기각"}
            </button>
          </div>
        }
      >
        <textarea
          className="input min-h-[100px] py-2"
          placeholder="예: 다음 주 판매 확인 후 재평가 / 시즌 프로모션 예정"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="사유"
        />
        <p className="mt-2 text-xs text-muted">
          사유는 활동 로그와 성과 기록에 남아 ‘왜 안 했는지’를 설명합니다.
        </p>
      </Overlay>
    </Overlay>
  );
}
