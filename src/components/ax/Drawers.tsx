"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  Factory,
  Package,
  Truck,
  User,
  Bell,
  Play,
  Sparkles,
  Rocket,
} from "lucide-react";
import type { AXAction, OrderStage } from "@/lib/types";
import { useData, useForecast, useInsights, useLedger, useLookups, useMinute } from "@/lib/hooks";
import { isAtRisk, SHIP_STATUS_LABEL } from "@/lib/fulfillment";
import { CUSTOMER_STAGE_LABEL, ORDER_STAGE_LABEL, useStore } from "@/lib/store";
import { actionTypeLabel, compareSuppliers, type SkuInsight } from "@/lib/engines";
import { fmtDate, num, pct, relTime, won } from "@/lib/format";
import Overlay from "@/components/shared/Overlay";
import Badge, { StatusBadge } from "@/components/shared/Badge";
import { Sparkline } from "@/components/shared/Charts";
import { Tabs, Term, TERMS, AiReady } from "@/components/shared/Bits";
import { Field, Reasons, Stat } from "./Widgets";
import { useToast } from "@/components/shared/Toast";
import OrderCalcPanel from "./OrderCalcPanel";
import { EVIDENCE_TYPE_LABEL } from "@/lib/labels";

const URG: Record<string, { label: string; cls: string }> = {
  critical: { label: "긴급", cls: "bg-danger text-white" },
  high: { label: "높음", cls: "bg-orange-strong text-white" },
  mid: { label: "보통", cls: "bg-secondary-strong text-white" },
  low: { label: "낮음", cls: "bg-line text-muted" },
};

export function ActionCard({
  a,
  onOpen,
  compact = false,
}: {
  a: AXAction;
  onOpen: (a: AXAction) => void;
  compact?: boolean;
}) {
  const { productById, supplierById } = useLookups();
  const p = a.related.productId ? productById.get(a.related.productId) : undefined;
  const sup = a.related.supplierId ? supplierById.get(a.related.supplierId) : undefined;
  const open = !["done", "dismissed"].includes(a.stage);
  const due = new Date(a.dueAt).getTime() - Date.now();
  return (
    <button
      onClick={() => onOpen(a)}
      className={`card lift w-full p-4 text-left ${!open ? "opacity-80" : ""}`}
    >
      {/* 배지는 긴급도 하나만 — 유형은 글자로, 상태는 '추천됨'이 아닐 때만 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${URG[a.urgency].cls}`}>{URG[a.urgency].label}</span>
        <span className="text-[14px] font-semibold text-muted">{actionTypeLabel(a.type)}</span>
        {a.stage !== "recommended" && <StatusBadge status={a.stage} />}
        <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap text-[13px] text-muted">
          <Clock3 size={13} />
          {open ? (
            due < 0 ? (
              <b className="font-semibold text-danger">기한 지남</b>
            ) : (
              `마감 ${relTime(a.dueAt)}`
            )
          ) : (
            `완료 ${relTime(a.updatedAt)}`
          )}
        </span>
      </div>
      <div className="mt-2 text-[18px] font-bold leading-snug">{a.title}</div>
      {!compact && <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-ink/75">{a.summary}</p>}
      <div className="mt-2.5 flex min-w-0 items-center gap-3 text-[13px] text-muted">
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          {p ? (
            <>
              <Package size={13} className="shrink-0" />
              <span className="truncate">{p.name}</span>
            </>
          ) : sup ? (
            <>
              <Factory size={13} className="shrink-0" />
              <span className="truncate">{sup.name}</span>
            </>
          ) : a.related.orderIds?.length ? (
            <>
              <Truck size={13} className="shrink-0" />
              주문 {a.related.orderIds.length}건
            </>
          ) : a.related.customerIds?.length ? (
            <>
              <User size={13} className="shrink-0" />
              고객 {a.related.customerIds.length}+명
            </>
          ) : null}
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
          <User size={13} />
          {a.assignee}
        </span>
      </div>
    </button>
  );
}

export { ActionDrawer } from "./ActionDrawer";

// ---------- SKU Drawer ----------
export function SkuDrawer({
  skuId,
  onClose,
  onOpenAction,
}: {
  skuId: string | null;
  onClose: () => void;
  onOpenAction?: (a: AXAction) => void;
}) {
  const data = useData();
  const insights = useInsights();
  const ledger = useLedger();
  const now = useMinute();
  const { supplierById, warehouseById, categoryBySlug } = useLookups();
  const role = useStore((s) => s.ui.role);
  const createActionFromSku = useStore((s) => s.createActionFromSku);
  const toast = useToast();
  const [tab, setTab] = useState<"insight" | "supplier" | "orders" | "evidence">("insight");
  const ins = skuId ? insights.find((i) => i.sku.id === skuId) : undefined;
  const options = useMemo(
    () =>
      skuId
        ? compareSuppliers(
            data,
            skuId,
            ins && ["urgent", "stockout"].includes(ins.status)
              ? "urgent"
              : ins && ["slow", "overstock"].includes(ins.status)
                ? "overstock"
                : "normal",
            { now, ledger },
          )
        : [],
    [data, skuId, ins, now, ledger],
  );
  if (!ins) return null;
  const p = ins.product;
  const pos = data.purchaseOrders.filter((x) => x.skuId === ins.sku.id);
  const actions = data.actions.filter((a) => a.related.skuId === ins.sku.id);
  const evidence = data.evidence.filter((e) => e.skuId === ins.sku.id);
  const recentOrders = data.orders.filter((o) => o.items.some((it) => it.skuId === ins.sku.id)).slice(0, 8);
  const showCost = role !== "ops" && role !== "cs";
  const d = ins.demand;

  return (
    <Overlay
      open={!!skuId}
      onClose={onClose}
      variant="drawer"
      size="lg"
      title={
        <span>
          {p.name} <span className="font-normal text-muted">· {ins.sku.name}</span>
        </span>
      }
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={ins.status} />
          <span>
            {categoryBySlug.get(p.categorySlug)?.name} ·{" "}
            <Term term="SKU" desc={TERMS.sku}>
              {ins.sku.id}
            </Term>{" "}
            · {warehouseById.get(ins.inv.warehouseId)?.name}
          </span>
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="가용재고"
          value={num(ins.available)}
          sub={`현재고 ${ins.inv.onHand} · 예약 ${ins.inv.reserved}`}
        />
        <Stat
          label={
            <Term term="재고일수" desc={TERMS.daysOfStock}>
              예상 소진
            </Term>
          }
          value={ins.daysOfStock === Infinity ? "-" : `${ins.daysOfStock.toFixed(1)}일`}
          sub={`일 ${ins.avgDaily.toFixed(1)}개 판매`}
        />
        <Stat
          label={
            <Term term="리드타임" desc={TERMS.leadTime}>
              공급 리드타임
            </Term>
          }
          value={`${ins.leadTimeDays}일`}
          sub={supplierById.get(ins.sku.primarySupplierId)?.name}
        />
        <Stat
          label="입고예정"
          value={ins.expectedInbound ? num(ins.expectedInbound.qty) : "0"}
          sub={ins.expectedInbound?.eta ?? "없음"}
        />
      </div>
      <Tabs
        className="mt-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "insight", label: "수요 분석" },
          { key: "supplier", label: "공급사·발주", count: pos.length },
          { key: "orders", label: "주문·배송", count: recentOrders.length },
          { key: "evidence", label: "실행·성과 기록", count: actions.length + evidence.length },
        ]}
      />
      <div className="space-y-4 pt-4">
        {tab === "insight" && (
          <>
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_180px]">
              <div>
                <div className="text-xs font-semibold uppercase text-muted">최근 14일 판매</div>
                <div className="mt-1">
                  <Sparkline values={d.dailySales} width={380} height={64} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["검색", d.search7d, d.searchPrev7d],
                  ["조회", d.view7d, d.viewPrev7d],
                  ["장바구니", d.cart7d, d.cartPrev7d],
                  ["주문", d.order7d, d.orderPrev7d],
                ].map(([l, c, pv]) => {
                  const r = (pv as number) > 0 ? ((c as number) - (pv as number)) / (pv as number) : 0;
                  return (
                    <div key={l as string} className="rounded-lg bg-mist px-2.5 py-2">
                      <div className="text-[13px] text-muted">{l} 7일</div>
                      <div className="font-bold tabular-nums">{num(c as number)}</div>
                      <div className={`text-[13px] font-semibold ${r >= 0 ? "text-teal" : "text-danger"}`}>
                        {r >= 0 ? "+" : ""}
                        {Math.round(r * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <Reasons items={ins.reasons} title="판단 근거 (수요신호)" />
            <OrderCalcPanel ins={ins} />
            {showCost && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label="판매가" value={won(ins.sku.salePrice)} />
                <Stat label="원가" value={won(ins.sku.cost)} />
                <Stat
                  label={
                    <Term term="마진율" desc={TERMS.grossMargin}>
                      마진율
                    </Term>
                  }
                  value={pct(ins.marginRate, 0)}
                  sub={`재고금액 ${won(ins.stockValue)}`}
                />
              </div>
            )}
            {!ins.hasOpenAction &&
              (role === "owner" || role === "buyer") &&
              ((ins.recommendedQty > 0 && ["urgent", "stockout", "low", "rising"].includes(ins.status)) ||
                ["slow", "overstock"].includes(ins.status)) && (
                <button
                  className="btn-primary w-full"
                  onClick={() => {
                    const id = createActionFromSku(ins.sku.id);
                    if (!id) {
                      toast({ title: "이미 진행 중인 실행이 있습니다", tone: "info" });
                      return;
                    }
                    const a = useStore.getState().data.actions.find((x) => x.id === id);
                    toast({
                      title: "실행을 생성했습니다",
                      body: "근거·추천수량·공급사 대안이 담겼습니다.",
                      tone: "success",
                    });
                    if (a) onOpenAction?.(a);
                  }}
                >
                  <Rocket size={16} />
                  {["slow", "overstock"].includes(ins.status)
                    ? "발주 보류 검토 실행 만들기"
                    : `발주 검토 실행 만들기 (${ins.recommendedQty}개)`}
                </button>
              )}
            {ins.hasOpenAction && (
              <div className="text-xs text-muted">
                이 SKU에 진행 중인 실행이 있습니다 — 실행·성과 기록 탭에서 확인
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted">
              <AiReady
                compact
                title="수요·발주 추천"
                now="판매속도·재고·검색·장바구니·리드타임 규칙 계산"
                method="규칙 + 통계 · L3"
                next="LLM이 시즌·프로모션 맥락을 반영한 설명 제공"
              />
              AI 연결 준비
            </div>
          </>
        )}
        {tab === "supplier" && (
          <>
            <div className="mb-2 text-xs font-semibold uppercase text-muted">
              공급사 비교 ({options.length}) —{" "}
              {ins.status === "urgent" || ins.status === "stockout"
                ? "긴급: 납기 가중"
                : ins.status === "slow" || ins.status === "overstock"
                  ? "과잉: 최소수량·단가 가중"
                  : "기본 가중"}
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>공급사</th>
                    <th>단가</th>
                    <th>납기</th>
                    <th>최소수량</th>
                    <th>정시납품</th>
                    <th>충족률</th>
                    <th>불량</th>
                    <th>예상입고</th>
                    <th>점수</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((o) => (
                    <tr key={o.supplier.id} className={o.recommended ? "row-selected" : ""}>
                      <td className="whitespace-nowrap font-semibold">
                        {o.supplier.name}
                        {o.recommended && (
                          <Badge tone="primary" className="ml-1">
                            추천
                          </Badge>
                        )}
                      </td>
                      <td className="tabular-nums">
                        {showCost ? won(o.sp.unitCost) : "—"}
                        <div className="text-[13px] text-muted">
                          {o.costDiffPct ? `+${o.costDiffPct}%` : "최저"}
                        </div>
                      </td>
                      <td>{o.sp.leadTimeDays}일</td>
                      <td>{o.sp.moq}</td>
                      <td>{Math.round(o.supplier.onTimeRate * 100)}%</td>
                      <td>{Math.round(o.supplier.fillRate * 100)}%</td>
                      <td>{(o.supplier.defectRate * 100).toFixed(1)}%</td>
                      <td className="whitespace-nowrap">{o.expectedArrival}</td>
                      <td className="font-bold">{o.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">
              가장 싼 공급사를 무조건 추천하지 않습니다. 긴급 품절위험에서는 납기가, 과잉재고 위험에서는
              최소주문수량이 더 중요합니다.
            </p>
            <div className="mb-2 mt-4 text-xs font-semibold uppercase text-muted">발주 이력</div>
            {pos.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>PO</th>
                      <th>공급사</th>
                      <th>수량</th>
                      <th>예정</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.map((po) => (
                      <tr key={po.id}>
                        <td className="font-semibold">{po.id}</td>
                        <td>{supplierById.get(po.supplierId)?.name}</td>
                        <td>{po.qty}</td>
                        <td>{po.expectedAt}</td>
                        <td>
                          <StatusBadge status={po.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted">발주 이력이 없습니다.</div>
            )}
          </>
        )}
        {tab === "orders" &&
          (recentOrders.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>주문</th>
                    <th>일시</th>
                    <th>수량</th>
                    <th>단계</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="font-semibold">{o.id}</td>
                      <td className="text-muted">{fmtDate(o.createdAt, "datetime")}</td>
                      <td>{o.items.find((it) => it.skuId === ins.sku.id)?.qty}</td>
                      <td>
                        <StatusBadge status={o.stage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted">
              최근 7일 상세 주문에 포함되지 않았습니다. (집계 판매는 수요 분석 참고)
            </div>
          ))}
        {tab === "evidence" && (
          <div className="space-y-3">
            {actions.map((a) => (
              <button
                key={a.id}
                onClick={() => onOpenAction?.(a)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-line p-3 text-left hover:bg-mist"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="soft">{actionTypeLabel(a.type)}</Badge>
                    <StatusBadge status={a.stage} />
                  </div>
                  <div className="mt-1 text-sm font-semibold">{a.title}</div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </button>
            ))}
            {evidence.map((e) => (
              <div key={e.id} className="flex gap-2 text-sm">
                <Badge tone={e.type === "RESULT" ? "success" : e.type === "RISK" ? "danger" : "primary"}>
                  {EVIDENCE_TYPE_LABEL[e.type] ?? e.type}
                </Badge>
                <div>
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-muted">{e.detail}</div>
                  <div className="text-xs text-muted">
                    {e.actor} · {fmtDate(e.createdAt, "datetime")}
                  </div>
                </div>
              </div>
            ))}
            {!actions.length && !evidence.length && (
              <div className="text-sm text-muted">실행·성과 기록이 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ---------- Order Drawer ----------
const FLOW: OrderStage[] = [
  "new",
  "confirmed",
  "picking_wait",
  "picking",
  "packing_wait",
  "ship_wait",
  "shipped",
  "in_transit",
  "delivered",
];

export function OrderDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const data = useData();
  const forecast = useForecast();
  const { customerById, warehouseById, productById } = useLookups();
  const advance = useStore((s) => s.advanceOrder);
  const notify = useStore((s) => s.notifyCustomer);
  const role = useStore((s) => s.ui.role);
  const toast = useToast();
  const o = orderId ? data.orders.find((x) => x.id === orderId) : undefined;
  if (!o) return null;
  const c = customerById.get(o.customerId);
  const pred = forecast.orders.find((p) => p.order.id === o.id);
  const risk = pred && isAtRisk(pred.status) ? pred : undefined;
  const idx = FLOW.indexOf(o.stage);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const canOps = role === "owner" || role === "ops";
  const canCs = role === "owner" || role === "cs";
  const evidence = data.evidence.filter((e) => e.orderId === o.id);
  return (
    <Overlay
      open={!!orderId}
      onClose={onClose}
      variant="drawer"
      size="md"
      title={`주문 ${o.id}`}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={o.stage} />
          {risk && (
            <Badge tone={risk.status === "tight" ? "warn" : "danger"}>{SHIP_STATUS_LABEL[risk.status]}</Badge>
          )}
          <span>
            {fmtDate(o.createdAt, "datetime")} · {warehouseById.get(o.warehouseId)?.name}
          </span>
        </span>
      }
      footer={
        <div className="flex flex-wrap gap-2">
          {next && canOps && !["cancelled", "return"].includes(o.stage) && (
            <button
              className="btn-primary"
              data-autofocus
              onClick={() => {
                advance(o.id, next);
                toast({
                  title: `${ORDER_STAGE_LABEL[next]} 처리`,
                  body: `고객 마이페이지에 '${CUSTOMER_STAGE_LABEL[next]}' 상태가 반영됩니다.`,
                  tone: "success",
                });
              }}
            >
              <Play size={16} />
              다음 단계: {ORDER_STAGE_LABEL[next]}
            </button>
          )}
          {o.stage === "picking_wait" && canOps && (
            <button
              className="btn-outline"
              onClick={() => {
                advance(o.id, "shipped");
                toast({ title: "우선처리 → 출고완료", tone: "success" });
              }}
            >
              <Truck size={16} />
              우선처리 (바로 출고)
            </button>
          )}
          {canCs && !o.customerNotified && !["delivered", "cancelled"].includes(o.stage) && (
            <button
              className="btn-outline"
              onClick={() => {
                notify(o.id, "물류 사정으로 배송이 하루 지연될 수 있어 미리 안내드립니다.");
                toast({ title: "고객 사전안내를 발송했습니다", tone: "success" });
              }}
            >
              <Bell size={16} />
              지연 사전안내
            </button>
          )}
          {o.customerNotified && (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Bell size={14} className="text-orange" />
              고객 안내 발송됨
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {pred && (
          <div
            className={`rounded-xl p-3 text-sm ${risk ? (risk.status === "tight" ? "border border-orange/30 bg-orange/10" : "border border-danger/30 bg-danger/10") : "border border-line bg-mist"}`}
          >
            <div className="flex items-center gap-1 font-bold">
              {risk && <AlertTriangle size={15} />}
              출고 예측 · {SHIP_STATUS_LABEL[pred.status]}
            </div>
            <p className="mt-1">
              {pred.status === "blocked"
                ? "재고가 모자라 피킹을 시작할 수 없습니다."
                : `${pred.warehouseId.replace("wh-", "").toUpperCase()}구역 대기 ${pred.queuePos}번째 · 포장 완료 예상 ${fmtDate(pred.readyAt.toISOString(), "time")} · 마감 ${fmtDate(pred.cutoffAt.toISOString(), "time")} (${pred.slackMin >= 0 ? `여유 ${Math.round(pred.slackMin)}분` : `${Math.round(-pred.slackMin)}분 초과`})`}
            </p>
            {pred.reasons.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {pred.reasons.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="고객">
            {c?.name}{" "}
            <span className="text-sm font-normal text-muted">
              ({role === "ops" ? "연락처 비공개" : c?.phone})
            </span>
          </Field>
          <Field label="배송지">
            {role === "ops"
              ? c?.address.line1.split(" ").slice(0, 2).join(" ") + " …"
              : `${c?.address.line1} ${c?.address.line2 ?? ""}`}
          </Field>
          <Field label="배송약속">{fmtDate(o.promisedAt, "datetime")}</Field>
          <Field label="출고마감">{fmtDate(o.cutoffAt, "datetime")}</Field>
          <Field label="담당자">{o.assignee ?? "미배정"}</Field>
          <Field label="금액">
            {won(o.total)} {o.isRepeatOrder && <Badge tone="soft">재구매</Badge>}
          </Field>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-muted">상품 {o.items.length}</div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {o.items.map((it) => {
              const p = productById.get(it.productId);
              const inv = data.inventory.find((i) => i.skuId === it.skuId);
              const av = inv ? inv.onHand - inv.reserved : 0;
              return (
                <li key={it.skuId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div>
                    <b>{it.name}</b> · {it.skuName} × {it.qty}
                    <div className="text-xs text-muted">
                      {p?.categorySlug} · 가용재고 {av}
                      {inv && inv.onHand < it.qty ? " (재고예외!)" : ""}
                    </div>
                  </div>
                  <span className="tabular-nums">{won(it.unitPrice * it.qty)}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-muted">처리 이력</div>
          <ol className="space-y-2 border-l-2 border-line pl-4">
            {[...o.history].reverse().map((h, i) => (
              <li key={i} className="relative text-sm">
                <span
                  className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ${i === 0 ? "bg-primary" : "bg-line"}`}
                />
                <b>{ORDER_STAGE_LABEL[h.stage]}</b>{" "}
                <span className="text-muted">
                  · {h.actor} · {fmtDate(h.at, "datetime")}
                  {h.note ? ` · ${h.note}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="text-xs text-muted">
          고객 플랫폼 표시: <b>{CUSTOMER_STAGE_LABEL[o.stage]}</b> — 여기서 단계를 바꾸면 고객 마이페이지가
          함께 바뀝니다.{" "}
          <Link href={`/my/orders/${o.id}`} target="_blank" className="text-primary underline">
            고객 화면에서 보기
          </Link>
        </div>
        {evidence.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted">성과 기록</div>
            <ul className="space-y-1.5 text-sm">
              {evidence.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <Badge tone="primary">{EVIDENCE_TYPE_LABEL[e.type] ?? e.type}</Badge>
                  <span>
                    {e.title} <span className="text-muted">· {fmtDate(e.createdAt, "time")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted">
          <AiReady
            compact
            title="배송 지연 위험"
            now="마감·배송약속·구역 적체·재고예외 규칙 점수"
            method="규칙 + 통계 · L2 추천"
            next="처리량 예측으로 마감 초과 확률 산출"
          />
          <Sparkles size={12} />
          위험 점수는 규칙 기반입니다.
        </div>
      </div>
    </Overlay>
  );
}

export function useSkuInsightMap(insights: SkuInsight[]) {
  return useMemo(() => new Map(insights.map((i) => [i.sku.id, i])), [insights]);
}
