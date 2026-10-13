"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Search, ShieldAlert } from "lucide-react";
import { useData, useExceptions, useLedger, useLookups, useMinute, useReturnSignals } from "@/lib/hooks";
import { ACTION_STAGE_LABEL, useStore } from "@/lib/store";
import {
  liftTxt,
  pctTxt,
  returnRecords,
  returnSummary,
  ROUTE_LABEL,
  type ReturnRoute,
  type ReturnSignal,
} from "@/lib/returns";
import { RETURN_REASON_LABEL } from "@/lib/labels";
import type { OpsException } from "@/lib/control";
import type { AXAction, ReturnRequest } from "@/lib/types";
import { fmtDate, won } from "@/lib/format";
import { BarChart } from "@/components/shared/Charts";
import Overlay from "@/components/shared/Overlay";
import { EmptyState } from "@/components/shared/Bits";
import { useToast } from "@/components/shared/Toast";
import { Panel } from "./Widgets";
import { SkuDrawer } from "./Drawers";
import { ActionDrawer } from "./ActionDrawer";
import { Basis, LifecycleStepper, money, Pager, pctText, StatusCell, usePage } from "./OpsUi";

const ROUTE_OF: Record<ReturnRequest["reason"], ReturnRoute | "customer"> = {
  defect: "supplier",
  damaged: "supplier",
  wrong_item: "warehouse",
  missing: "warehouse",
  info_mismatch: "content",
  delay: "fulfillment",
  change_mind: "customer",
  other: "customer",
};
const ROUTE_TEXT: Record<ReturnRoute | "customer", string> = { ...ROUTE_LABEL, customer: "고객 사유" };
const STATUS_TEXT: Record<ReturnRequest["status"], string> = {
  requested: "접수 · 확인 필요",
  approved: "승인 · 회수 대기",
  received: "회수 완료",
  refunded: "환불 완료",
  rejected: "반려",
};
/** 신호를 다루는 역할 — 공급 품질은 구매, 피킹은 물류, 상세페이지는 CS */
const ROUTE_OWNER: Record<ReturnRoute, string[]> = {
  supplier: ["owner", "buyer"],
  warehouse: ["owner", "ops"],
  content: ["owner", "cs"],
  fulfillment: ["owner", "ops"],
};

export default function ReturnsView() {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const signals = useReturnSignals();
  const { skuById, productById, supplierById } = useLookups();
  const role = useStore((s) => s.ui.role);
  const sp = useSearchParams();
  const [signalId, setSignalId] = useState<string | null>(sp.get("signal"));
  const [skuId, setSkuId] = useState<string | null>(null);
  const [action, setAction] = useState<AXAction | null>(null);
  const [route, setRoute] = useState<string>("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    const s = sp.get("signal");
    if (s) setSignalId(s);
  }, [sp]);

  const records = useMemo(() => returnRecords(data, ledger, now), [data, ledger, now]);
  const summary = useMemo(() => returnSummary(data, ledger, now), [data, ledger, now]);
  const live = useMemo(
    () => new Map(data.returns.map((r) => [`${r.orderId}|${r.skuId}`, r])),
    [data.returns],
  );
  const recent = records.filter((r) => r.daysAgo <= 28);
  const recentLoss = recent.reduce((a, r) => a + r.lostCogs + 5000, 0);
  const customerShare = recent.length
    ? recent.filter((r) => ROUTE_OF[r.reason] === "customer").length / recent.length
    : 0;
  const pending = data.returns.filter((r) => r.status === "requested").length;
  const qualityActions = data.actions.filter((a) => a.type === "quality_issue");

  const list = useMemo(() => {
    const t = q.trim();
    return records.filter((r) => {
      if (route !== "all" && ROUTE_OF[r.reason] !== route) return false;
      if (!t) return true;
      const p = productById.get(r.productId);
      return `${r.orderId} ${p?.name ?? ""} ${skuById.get(r.skuId)?.name ?? ""}`.includes(t);
    });
  }, [records, route, q, productById, skuById]);
  const pg = usePage(list, 15);
  const sig = signals.find((s) => s.id === signalId) ?? null;

  return (
    <div className="space-y-4">
      <section
        aria-label="반품 현황"
        className="card grid grid-cols-2 sm:grid-cols-3 sm:divide-x xl:grid-cols-5"
      >
        <StatusCell
          label="반품 (최근 4주)"
          value={`${summary.recent.toLocaleString()}건`}
          sub={`판매 수량 대비 ${pctTxt(summary.recentRate)}`}
        />
        <StatusCell
          label="반품 손실 (4주)"
          value={money(recentLoss)}
          sub="재판매 불가 원가 + 회수 운임"
          tone={recentLoss > 0 ? "warn" : "neutral"}
        />
        <StatusCell
          label="원인 신호"
          value={`${signals.length}건`}
          sub={
            signals.length
              ? signals
                  .map((s) => ROUTE_LABEL[s.route])
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(" · ")
              : "평소 수준"
          }
          tone={signals.length ? "danger" : "good"}
        />
        <StatusCell
          label="고객 사유 비중"
          value={pctText(customerShare, 0)}
          sub="단순 변심·기타 — 운영 개선 대상 아님"
        />
        <StatusCell
          label="CS 확인 대기"
          value={`${pending}건`}
          sub={`품질 실행 ${qualityActions.filter((a) => !["done", "measured", "dismissed"].includes(a.stage)).length}건 진행`}
        />
      </section>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldAlert size={18} className="text-danger" />
            반품 원인 신호
          </span>
        }
        sub="최근 4주 반품률을 이전 9주와 비교해, 우연으로 보기 어려운 증가만 원인 경로(공급사·물류·상세페이지)별로 묶었습니다"
      >
        {signals.length === 0 ? (
          <EmptyState
            title="평소와 다른 반품 증가가 없습니다"
            body="반품률이 이전 기간과 통계적으로 다르지 않습니다."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>신호</th>
                  <th>원인 경로</th>
                  <th className="text-right">최근 4주</th>
                  <th className="text-right">반품률 (평소)</th>
                  <th className="text-right">손실</th>
                  <th>의심 로트</th>
                  <th>실행</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => {
                  const a = qualityActions.find((x) => x.detail?.returnSignal === s.id);
                  return (
                    <tr key={s.id} className="row-clickable" onClick={() => setSignalId(s.id)}>
                      <td className="min-w-[240px] font-semibold">{s.title}</td>
                      <td className="whitespace-nowrap text-[13px]">{ROUTE_LABEL[s.route]}</td>
                      <td className="text-right tabular-nums">{s.recentCount}건</td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        <b className="text-danger">{pctTxt(s.recentRate)}</b>{" "}
                        <span className="text-muted">({pctTxt(s.baselineRate)})</span>
                      </td>
                      <td className="text-right tabular-nums">{money(s.cost)}</td>
                      <td className="whitespace-nowrap text-[13px] tabular-nums">
                        {s.lotPoId ? `${s.lotPoId} · ${fmtDate(s.lotReceivedAt!, "md")} 입고` : "-"}
                      </td>
                      <td className="whitespace-nowrap text-[13px]">
                        {a ? (
                          <span className="font-semibold text-primary">{ACTION_STAGE_LABEL[a.stage]}</span>
                        ) : (
                          <span className="text-muted">미착수</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2">
          <Basis>
            판단 기준: 최근 4주 건수가 기대치(평소 반품률 × 최근 판매)보다 포아송 기준 2.5σ 이상 많고, 배수가
            공급사 1.8 · 물류 2 · 상품정보 3 이상일 때만. 단순 변심은 제외합니다.
          </Basis>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="주간 반품 추이" sub="최근 12주 · 7일 단위 · 원장 반품 기준">
            <BarChart
              data={summary.weekly.map((w) => ({ label: w.weekStart, value: w.count }))}
              label1="반품"
              format={(v) => `${v}건`}
              showEvery={2}
            />
          </Panel>
          <Panel title="원인 경로" sub="90일 · 어디서 생긴 반품인가 — 개선 담당이 달라집니다">
            <BarChart
              horizontal
              data={summary.byRoute.map((r) => ({ label: ROUTE_TEXT[r.route], value: r.count }))}
              format={(v) => `${v}건`}
            />
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              {summary.byReason.map((r) => (
                <li key={r.reason} className="flex justify-between">
                  <span className="text-muted">{RETURN_REASON_LABEL[r.reason]}</span>
                  <span className="tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel
          title="반품 많은 SKU (최근 4주)"
          sub="판매 수량 대비 반품률과 공급사 — 행을 누르면 재고·공급 상세"
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>상품 · 구성</th>
                  <th className="text-right">반품</th>
                  <th className="text-right">반품률</th>
                  <th>공급사</th>
                </tr>
              </thead>
              <tbody>
                {summary.topSkus.map((r) => {
                  const s = skuById.get(r.skuId);
                  const p = s && productById.get(s.productId);
                  return (
                    <tr key={r.skuId} className="row-clickable" onClick={() => setSkuId(r.skuId)}>
                      <td className="text-[13px]">
                        <span className="font-semibold">{p?.name}</span>{" "}
                        <span className="text-muted">· {s?.name}</span>
                      </td>
                      <td className="text-right tabular-nums">{r.count}</td>
                      <td
                        className={`text-right tabular-nums ${r.rate > summary.recentRate * 2 ? "font-semibold text-danger" : ""}`}
                      >
                        {pctTxt(r.rate)}
                      </td>
                      <td className="whitespace-nowrap text-[13px]">
                        {s ? supplierById.get(s.primarySupplierId)?.name : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="반품·문의 목록" sub="90일 원장 + 시연 중 접수 · 주문 라인에 연결된 반품만">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            className="input !min-h-[38px] w-auto text-sm"
            value={route}
            onChange={(e) => (setRoute(e.target.value), pg.setPage(0))}
            aria-label="원인 경로"
          >
            <option value="all">전체 경로</option>
            {(Object.keys(ROUTE_TEXT) as (ReturnRoute | "customer")[]).map((k) => (
              <option key={k} value={k}>
                {ROUTE_TEXT[k]}
              </option>
            ))}
          </select>
          <label className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              className="input !min-h-[38px] w-48 pl-9 text-sm"
              placeholder="주문번호·상품"
              value={q}
              onChange={(e) => (setQ(e.target.value), pg.setPage(0))}
              aria-label="반품 검색"
            />
          </label>
          <span className="ml-auto text-[13px] tabular-nums text-muted">
            {list.length.toLocaleString()}건
          </span>
        </div>
        {list.length === 0 ? (
          <EmptyState title="조건에 맞는 반품이 없습니다" body="경로나 검색어를 바꿔 보세요." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>접수</th>
                    <th>주문</th>
                    <th>상품</th>
                    <th>사유</th>
                    <th className="text-right">환불</th>
                    <th>처리</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.rows.map((r) => {
                    const s = skuById.get(r.skuId);
                    const lr = live.get(`${r.orderId}|${r.skuId}`);
                    return (
                      <tr
                        key={`${r.orderId}-${r.skuId}`}
                        className="row-clickable"
                        onClick={() => setSkuId(r.skuId)}
                      >
                        <td className="whitespace-nowrap tabular-nums text-muted">{fmtDate(r.at, "md")}</td>
                        <td className="whitespace-nowrap text-[13px] tabular-nums">
                          {role === "buyer" ? "—" : r.orderId}
                        </td>
                        <td className="text-[13px]">
                          {productById.get(r.productId)?.name} <span className="text-muted">· {s?.name}</span>
                        </td>
                        <td className="whitespace-nowrap text-[13px]">
                          <span
                            className={ROUTE_OF[r.reason] === "supplier" ? "font-semibold text-danger" : ""}
                          >
                            {RETURN_REASON_LABEL[r.reason]}
                          </span>
                          <span className="block text-[11px] text-muted">
                            {ROUTE_TEXT[ROUTE_OF[r.reason]]}
                          </span>
                        </td>
                        <td className="text-right tabular-nums">{won(r.refund)}</td>
                        <td className="whitespace-nowrap text-[13px]">
                          {lr ? STATUS_TEXT[lr.status] : "환불 완료"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager pg={pg} />
          </>
        )}
        <p className="mt-2 text-[12px] text-muted">
          고객에게 불이익을 자동 적용하지 않습니다. 반복 사유는 원인 경로의 담당자 실행으로 넘깁니다.
        </p>
      </Panel>

      <SignalDrawer
        sig={sig}
        onClose={() => setSignalId(null)}
        onOpenSku={setSkuId}
        onOpenAction={(a) => {
          setSignalId(null);
          setAction(a);
        }}
      />
      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} />
      <ActionDrawer action={action} onClose={() => setAction(null)} />
    </div>
  );
}

function SignalDrawer({
  sig,
  onClose,
  onOpenSku,
  onOpenAction,
}: {
  sig: ReturnSignal | null;
  onClose: () => void;
  onOpenSku: (id: string) => void;
  onOpenAction: (a: AXAction) => void;
}) {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const exceptions = useExceptions(false);
  const role = useStore((s) => s.ui.role);
  const create = useStore((s) => s.createActionFromException);
  const toast = useToast();
  const { skuById, productById, supplierById, warehouseById } = useLookups();
  const recs = useMemo(() => {
    if (!sig) return [];
    const all = returnRecords(data, ledger, now);
    const match = (r: (typeof all)[number]) =>
      sig.kind === "supplier"
        ? r.supplierId === sig.supplierId && (r.reason === "defect" || r.reason === "damaged")
        : sig.kind === "warehouse"
          ? r.warehouseId === sig.warehouseId && (r.reason === "wrong_item" || r.reason === "missing")
          : sig.kind === "content"
            ? r.productId === sig.productId && r.reason === "info_mismatch"
            : sig.skuIds.includes(r.skuId) && ROUTE_OF[r.reason] !== "customer";
    return all.filter(match);
  }, [sig, data, ledger, now]);
  if (!sig) return null;
  const weeks = Array.from({ length: 13 }, (_, i) => {
    const w = 12 - i;
    return {
      label: w === 0 ? "이번 주" : `${w}주 전`,
      value: recs.filter((r) => r.daysAgo > w * 7 && r.daysAgo <= (w + 1) * 7).length,
    };
  });
  const linked = data.actions.find((a) => a.type === "quality_issue" && a.detail?.returnSignal === sig.id);
  const lot = sig.lotPoId ? ledger?.purchaseOrders.find((p) => p.id === sig.lotPoId) : undefined;
  const canAct = ROUTE_OWNER[sig.route].includes(role);
  const ex: OpsException = exceptions.find((e) => e.related.signalId === sig.id) ?? {
    id: `ex-return-${sig.id}`,
    kind: "return_anomaly",
    severity: "mid",
    title: sig.title,
    subject: sig.subjectLabel,
    evidence: sig.evidence,
    impact: {
      value: sig.cost,
      unit: "원",
      label: "최근 4주 반품 손실",
      basis: "재판매 불가 원가 + 회수 운임",
    },
    weight: 0,
    owner: sig.route === "warehouse" ? "ops" : sig.route === "content" ? "cs" : "buyer",
    href: `/ax/returns?signal=${sig.id}`,
    actionType: "quality_issue",
    related: {
      supplierId: sig.supplierId,
      warehouseId: sig.warehouseId,
      productId: sig.productId,
      skuId: sig.skuIds[0],
      signalId: sig.id,
      poId: sig.lotPoId,
    },
  };
  const subject =
    sig.kind === "warehouse"
      ? warehouseById.get(sig.warehouseId ?? "")?.name
      : sig.supplierId
        ? supplierById.get(sig.supplierId)?.name
        : productById.get(sig.productId ?? "")?.name;
  return (
    <Overlay
      open
      onClose={onClose}
      variant="drawer"
      size="lg"
      title={sig.title}
      subtitle={
        <span>
          원인 경로: {ROUTE_LABEL[sig.route]} · {subject}
        </span>
      }
      footer={
        linked ? (
          <button className="btn-primary w-full sm:w-auto" onClick={() => onOpenAction(linked)}>
            연결된 실행 보기 <ArrowRight size={15} />
          </button>
        ) : canAct ? (
          <button
            className="btn-primary w-full sm:w-auto"
            onClick={() => {
              const id = create(ex);
              if (!id) return toast({ title: "실행을 만들 수 없습니다", tone: "info" });
              toast({
                title: "품질 개선 실행을 만들었습니다",
                body: "담당자 확인 → 승인 후 2~4주 반품률로 효과를 확인합니다.",
                tone: "success",
              });
              const a = useStore.getState().data.actions.find((x) => x.id === id);
              if (a) onOpenAction(a);
            }}
          >
            {sig.route === "supplier"
              ? "품질 클레임 실행 만들기"
              : sig.route === "content"
                ? "상세페이지 수정 실행 만들기"
                : "피킹 검수 실행 만들기"}
          </button>
        ) : (
          <span className="text-sm text-muted">
            {sig.route === "supplier" ? "구매" : sig.route === "content" ? "CS" : "물류"} 담당 또는 대표가
            실행을 만들 수 있습니다.
          </span>
        )
      }
    >
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[
            ["최근 4주", `${sig.recentCount}건`],
            ["반품률", pctTxt(sig.recentRate)],
            ["평소", `${pctTxt(sig.baselineRate)} · ${liftTxt(sig.lift)}`],
            ["손실 (4주)", money(sig.cost)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-3 py-2.5">
              <div className="text-[12px] text-muted">{k}</div>
              <div className="text-[16px] font-bold tabular-nums">{v}</div>
            </div>
          ))}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">근거</h3>
          <ul className="space-y-1.5 text-[14px]">
            {sig.evidence.map((e) => (
              <li key={e} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">주별 해당 사유 반품</h3>
          <BarChart data={weeks} label1="반품" format={(v) => `${v}건`} showEvery={2} height={150} />
          {sig.onset && (
            <Basis>
              증가 시작 추정: {fmtDate(`${sig.onset}T09:00:00`, "md")} 경 (반품이 가장 많은 SKU의 변화 시점,
              로그우도비 기준)
            </Basis>
          )}
        </section>

        {lot && (
          <section className="rounded-xl border border-danger/30 bg-danger/5 p-3">
            <h3 className="text-sm font-bold">의심 로트 — {lot.id}</h3>
            <p className="mt-1 text-[14px]">
              {fmtDate(`${lot.receivedAt}T09:00:00`, "md")} 입고 ·{" "}
              {productById.get(skuById.get(lot.skuId)?.productId ?? "")?.name} {skuById.get(lot.skuId)?.name}{" "}
              · {lot.receivedQty.toLocaleString()}개 · {supplierById.get(lot.supplierId)?.name}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              반품 증가 직전(늦어도 3일 안)에 들어온 입고 중 가장 최근 것. 확정이 아니라 우선 검수할
              후보입니다.
            </p>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-bold">사유 구성</h3>
          <div className="flex flex-wrap gap-2 text-[13px]">
            {sig.reasons.map((r) => (
              <span key={r.reason} className="rounded-lg bg-mist px-2.5 py-1">
                {RETURN_REASON_LABEL[r.reason]} <b className="tabular-nums">{r.count}</b>
              </span>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">관련 SKU</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>상품 · 구성</th>
                  <th className="text-right">최근 4주</th>
                  <th className="text-right">90일</th>
                </tr>
              </thead>
              <tbody>
                {sig.skuIds.slice(0, 8).map((id) => {
                  const s = skuById.get(id);
                  return (
                    <tr key={id} className="row-clickable" onClick={() => onOpenSku(id)}>
                      <td className="text-[13px]">
                        <span className="font-semibold">{productById.get(s?.productId ?? "")?.name}</span>{" "}
                        <span className="text-muted">· {s?.name}</span>
                      </td>
                      <td className="text-right tabular-nums">
                        {recs.filter((r) => r.skuId === id && r.daysAgo <= 28).length}
                      </td>
                      <td className="text-right tabular-nums">{recs.filter((r) => r.skuId === id).length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-bold">제안</h3>
          <p className="text-[14px]">{sig.suggestion}</p>
          {linked && (
            <div className="mt-3 rounded-xl border border-line p-3">
              <div className="mb-2 text-[13px] font-semibold">{linked.title}</div>
              <LifecycleStepper stage={linked.stage} />
            </div>
          )}
        </section>
      </div>
    </Overlay>
  );
}
