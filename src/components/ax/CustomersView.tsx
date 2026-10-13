"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Repeat, Rocket, Search } from "lucide-react";
import { useCustomerName, useData, useLedger, useMargin, useMinute, useRepeat } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { REPEAT_STATUS_LABEL, type RepeatOpportunity, type RepeatStatus } from "@/lib/repeat";
import { measureAction } from "@/lib/lifecycle";
import { CHANNEL_LABEL } from "@/lib/costs";
import type { OpsException } from "@/lib/control";
import type { AXAction } from "@/lib/types";
import { fmtDate, won } from "@/lib/format";
import Overlay from "@/components/shared/Overlay";
import { AiReady, EmptyState } from "@/components/shared/Bits";
import { useToast } from "@/components/shared/Toast";
import { Panel, Stat } from "./Widgets";
import { ActionDrawer } from "./ActionDrawer";
import { Basis, money, Pager, pctText, StatusCell, usePage, VerdictTag } from "./OpsUi";

const STATUS_ORDER: RepeatStatus[] = ["due", "late", "upcoming", "lapsed"];

export default function CustomersView() {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const repeat = useRepeat();
  const role = useStore((s) => s.ui.role);
  const create = useStore((s) => s.createActionFromException);
  const toast = useToast();
  const sp = useSearchParams();
  const [status, setStatus] = useState<RepeatStatus>("due");
  const [product, setProduct] = useState<string>(sp.get("product") ?? "all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<AXAction | null>(null);
  const [cust, setCust] = useState<string | null>(sp.get("customer"));
  const [allProducts, setAllProducts] = useState(false);
  useEffect(() => {
    const p = sp.get("product");
    if (p) setProduct(p);
    const c = sp.get("customer");
    if (c) setCust(c);
  }, [sp]);
  const canAct = role === "owner" || role === "cs";

  const rows = useMemo(
    () =>
      repeat.rows.filter(
        (r) =>
          r.status === status &&
          (product === "all" || r.productId === product) &&
          (!q.trim() || `${r.customerName} ${r.productName}`.includes(q.trim())),
      ),
    [repeat.rows, status, product, q],
  );
  const pg = usePage(rows, 12);
  const repeatActions = data.actions.filter((a) => a.type === "repeat_expose");
  const live = repeatActions.filter((a) => ["in_progress", "done", "measured"].includes(a.stage));
  const keyOf = (r: RepeatOpportunity) => `${r.customerId}|${r.productId}`;

  const makeAction = (productId: string, targets: RepeatOpportunity[]) => {
    const p = data.products.find((x) => x.id === productId);
    const ex: OpsException = {
      id: `ex-repeat-manual-${productId}`,
      kind: "repeat",
      severity: "low",
      title: `${p?.name ?? ""} 다시 살 때인 고객 ${targets.length}명`,
      subject: "",
      evidence: [
        "고객별 실제 구매 간격(2회 이상) 또는 상품 평균 주기 기준",
        `대상 ${targets.length}명 — 주기 도래 ${targets.filter((t) => t.status === "due").length} · 지남 ${targets.filter((t) => t.status === "late").length}`,
        targets.every((t) => t.stockOk) ? "재고 확인 완료" : "일부 SKU 재고 주의 — 노출량 조절",
      ],
      impact: {
        value: targets.reduce((a, t) => a + t.expectedValue, 0),
        unit: "원",
        label: "직전 구매 기준 주문 규모",
        basis: "대상 고객 직전 구매 수량 × 현재 판매가 (전환율 가정 없음)",
      },
      weight: 0,
      owner: "cs",
      href: `/ax/customers?product=${productId}`,
      actionType: "repeat_expose",
      related: { productId, customerIds: Array.from(new Set(targets.map((t) => t.customerId))) },
    };
    const id = create(ex);
    if (!id) return toast({ title: "실행을 만들 수 없습니다", tone: "info" });
    toast({
      title: "재구매 안내 실행을 만들었습니다",
      body: "승인하면 노출이 시작되고, 실제 주문으로 전환을 측정합니다.",
      tone: "success",
    });
    setSel(new Set());
    const a = useStore.getState().data.actions.find((x) => x.id === id);
    if (a) setAction(a);
  };
  const selectedRows = repeat.rows.filter((r) => sel.has(keyOf(r)));
  const selProducts = Array.from(new Set(selectedRows.map((r) => r.productId)));

  return (
    <div className="space-y-4">
      <section
        aria-label="재구매 현황"
        className="card grid grid-cols-2 sm:grid-cols-3 sm:divide-x xl:grid-cols-5"
      >
        <StatusCell
          label="활성 고객 (90일)"
          value={`${data.aggregates.customerCount.toLocaleString()}명`}
          sub={`최근 30일 주문 ${data.aggregates.orderers30d.toLocaleString()}명`}
        />
        <StatusCell
          label="재구매 고객 비율"
          value={pctText(data.aggregates.repeatCustomerRate, 0)}
          sub="90일 내 2회 이상 주문"
        />
        <StatusCell
          label="주기 도래"
          value={`${repeat.counts.due.toLocaleString()}건`}
          sub={`지남 ${repeat.counts.late.toLocaleString()} · 곧 ${repeat.counts.upcoming.toLocaleString()}`}
          tone="warn"
        />
        <StatusCell
          label="이탈 위험"
          value={`${repeat.counts.lapsed.toLocaleString()}건`}
          sub="주기의 2배 이상 미구매"
        />
        <StatusCell
          label="노출 중인 실행"
          value={`${live.length}건`}
          sub={`대상 ${live.reduce((a, x) => a + (x.related.customerIds?.length ?? 0), 0).toLocaleString()}명`}
        />
      </section>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Repeat size={18} className="text-primary" />
            상품별 재구매 기회
          </span>
        }
        sub="대상 고객이 모두 다시 산다면 필요한 수량과 가용재고를 함께 봅니다 — 재고 없이 노출하면 품절만 앞당깁니다"
        right={
          <AiReady
            title="재구매 대상"
            now="고객×상품 실제 구매 간격 (규칙·통계)"
            method="구매주기 추정"
            next="고객별 전환 확률 예측으로 노출 우선순위"
          />
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>상품</th>
                <th className="text-right">주기 도래</th>
                <th className="text-right">주기 지남</th>
                <th className="text-right">직전 구매 기준</th>
                <th className="text-right">전원 재구매 시 필요 / 가용</th>
                <th>재고</th>
                <th>
                  <span className="sr-only">실행</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {repeat.byProduct.slice(0, allProducts ? 12 : 5).map((b) => {
                const open = repeatActions.find(
                  (a) =>
                    a.related.productId === b.productId &&
                    !["done", "measured", "dismissed"].includes(a.stage),
                );
                return (
                  <tr key={b.productId} className="row-clickable" onClick={() => setProduct(b.productId)}>
                    <td className="font-semibold">{b.name}</td>
                    <td className="text-right tabular-nums">{b.due.toLocaleString()}명</td>
                    <td className="text-right tabular-nums">{b.late.toLocaleString()}명</td>
                    <td className="text-right tabular-nums">{money(b.value)}</td>
                    <td className="text-right tabular-nums">
                      {b.need.toLocaleString()} / {b.available.toLocaleString()}개
                    </td>
                    <td
                      className={`whitespace-nowrap ${b.available >= b.need ? "text-teal" : b.stockOk ? "text-orange" : "font-semibold text-danger"}`}
                    >
                      {b.available >= b.need
                        ? "충분"
                        : b.stockOk
                          ? `${Math.round((b.available / Math.max(1, b.need)) * 100)}% 감당`
                          : "주의"}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {open ? (
                        <button
                          className="btn-ghost btn-sm whitespace-nowrap"
                          onClick={() => setAction(open)}
                        >
                          실행 보기
                        </button>
                      ) : canAct ? (
                        <button
                          className="btn-outline btn-sm whitespace-nowrap"
                          onClick={() =>
                            makeAction(
                              b.productId,
                              repeat.rows.filter(
                                (r) =>
                                  r.productId === b.productId &&
                                  (r.status === "due" || r.status === "late") &&
                                  !r.targeted,
                              ),
                            )
                          }
                        >
                          <Rocket size={14} /> 안내 실행
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {repeat.byProduct.length > 5 && (
          <button
            className="btn-ghost btn-sm mt-2"
            onClick={() => setAllProducts((v) => !v)}
            aria-expanded={allProducts}
          >
            {allProducts ? "상위 5개만 보기" : `상위 ${Math.min(12, repeat.byProduct.length)}개 모두 보기`}
          </button>
        )}
        <div className="mt-2">
          <Basis>
            2회 이상 산 고객은 실제 구매 간격 평균, 1회만 산 고객은 상품 평균 주기를 씁니다. 이미 다시
            주문했거나 다른 노출 대상인 고객은 제외합니다. 가용재고가 필요 수량의 절반에 못 미치면 노출을
            줄이거나 발주를 먼저 확인하세요.
          </Basis>
        </div>
      </Panel>

      <Panel title="대상 고객" sub="상태별 명단 — 선택해서 실행을 만들 수 있습니다">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-line p-0.5 text-sm"
            role="tablist"
            aria-label="재구매 상태"
          >
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={status === s}
                className={`rounded-md px-2.5 py-1 ${status === s ? "bg-soft font-semibold text-primary" : "text-muted"}`}
                onClick={() => {
                  setStatus(s);
                  pg.setPage(0);
                }}
              >
                {REPEAT_STATUS_LABEL[s]}{" "}
                <span className="tabular-nums">{repeat.counts[s].toLocaleString()}</span>
              </button>
            ))}
          </div>
          <select
            className="input !min-h-[38px] w-auto text-sm"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            aria-label="상품"
          >
            <option value="all">전체 상품</option>
            {repeat.byProduct.map((b) => (
              <option key={b.productId} value={b.productId}>
                {b.name}
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
              placeholder="고객·상품 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="고객 검색"
            />
          </label>
          {sel.size > 0 && canAct && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{sel.size}명 선택</span>
              {selProducts.length === 1 ? (
                <button
                  className="btn-primary btn-sm"
                  onClick={() => makeAction(selProducts[0], selectedRows)}
                >
                  <Rocket size={14} /> 선택 고객 안내 실행
                </button>
              ) : (
                <span className="text-[13px] text-muted">상품 하나만 골라 주세요</span>
              )}
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <EmptyState title="해당하는 고객이 없습니다" body="다른 상태나 상품을 골라 보세요." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <span className="sr-only">선택</span>
                    </th>
                    <th>고객</th>
                    <th>상품 · 구성</th>
                    <th className="text-right">구매</th>
                    <th className="text-right">마지막 구매</th>
                    <th className="text-right">주기</th>
                    <th className="text-right">도래</th>
                    <th className="text-right">직전 구매액</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.rows.map((r) => (
                    <tr
                      key={keyOf(r)}
                      className={`row-clickable ${sel.has(keyOf(r)) ? "row-selected" : ""}`}
                      onClick={() => setCust(r.customerId)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        {!r.targeted && canAct && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--t-primary)]"
                            checked={sel.has(keyOf(r))}
                            aria-label={`${r.customerName} 선택`}
                            onChange={(e) => {
                              const n = new Set(sel);
                              if (e.target.checked) n.add(keyOf(r));
                              else n.delete(keyOf(r));
                              setSel(n);
                            }}
                          />
                        )}
                      </td>
                      <td className="whitespace-nowrap font-semibold">
                        {r.customerName}
                        {r.business && <span className="ml-1 text-[12px] text-muted">기업</span>}
                      </td>
                      <td className="text-[13px]">
                        {r.productName} <span className="text-muted">· {r.skuName}</span>
                      </td>
                      <td className="text-right tabular-nums">{r.purchases}회</td>
                      <td className="text-right tabular-nums">{r.lastDaysAgo}일 전</td>
                      <td className="text-right tabular-nums">
                        {r.cycleDays}일
                        <span className="block text-[11px] text-muted">
                          {r.cycleSource === "observed" ? "실제 간격" : "상품 평균"}
                        </span>
                      </td>
                      <td
                        className={`text-right font-semibold tabular-nums ${r.dueInDays < -3 ? "text-orange" : ""}`}
                      >
                        {r.dueInDays === 0
                          ? "오늘"
                          : r.dueInDays > 0
                            ? `D-${r.dueInDays}`
                            : `${-r.dueInDays}일 지남`}
                      </td>
                      <td className="text-right tabular-nums">{won(r.expectedValue)}</td>
                      <td className="text-[13px]">
                        {r.targeted ? (
                          <span className="font-semibold text-primary">노출 대상</span>
                        ) : r.stockOk ? (
                          <span className="text-muted">대기</span>
                        ) : (
                          <span className="text-danger">재고 주의</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager pg={pg} />
          </>
        )}
      </Panel>

      <Panel
        title="재구매 실행 · 실제 전환"
        sub="노출 이후 대상 고객의 실제 주문으로만 셉니다 (추정 전환율 없음)"
      >
        {repeatActions.length ? (
          <ul className="divide-y divide-line">
            {repeatActions.map((a) => {
              const m = ["in_progress", "done", "measured"].includes(a.stage)
                ? (a.measurement ?? measureAction(a, data, ledger, now))
                : null;
              return (
                <li key={a.id}>
                  <button
                    className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:bg-mist"
                    onClick={() => setAction(a)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{a.title}</span>
                      <span className="block text-[13px] text-muted">
                        {m
                          ? `${m.metric}: ${m.before} → ${m.after}`
                          : `대상 ${a.related.customerIds?.length ?? 0}명 · 승인 대기`}
                      </span>
                    </span>
                    {m && <VerdictTag v={m.verdict} />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">아직 재구매 실행이 없습니다.</p>
        )}
      </Panel>

      <CustomerDrawer customerId={cust} onClose={() => setCust(null)} />
      <ActionDrawer action={action} onClose={() => setAction(null)} />
    </div>
  );
}

function CustomerDrawer({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  const data = useData();
  const ledger = useLedger();
  const repeat = useRepeat();
  const margin = useMargin(90);
  const name = useCustomerName();
  const info = useMemo(() => {
    if (!customerId) return null;
    const lc = ledger?.customers.find((c) => c.id === customerId);
    const orders = [
      ...(ledger?.orders
        .filter((o) => o.customerId === customerId)
        .map((o) => ({
          id: o.id,
          at: o.createdAt,
          total: o.subtotal - o.discount + o.shippingFee,
          items: o.lines.length,
          returned: !!o.returned,
          channel: o.channel,
        })) ?? []),
      ...data.orders
        .filter((o) => o.customerId === customerId)
        .map((o) => ({
          id: o.id,
          at: o.createdAt,
          total: o.total,
          items: o.items.length,
          returned: o.stage === "return",
          channel: o.channel ?? "app",
        })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));
    return {
      lc,
      orders,
      m: margin.byCustomer.find((r) => r.key === customerId),
      opps: repeat.rows.filter((r) => r.customerId === customerId),
    };
  }, [customerId, ledger, data.orders, margin, repeat]);
  if (!customerId || !info) return null;
  const spend = info.orders.reduce((a, o) => a + o.total, 0);
  return (
    <Overlay
      open={!!customerId}
      onClose={onClose}
      variant="drawer"
      size="md"
      title={name(customerId)}
      subtitle={
        <span>
          {info.lc?.kind === "business" ? "기업·단체" : "개인"} ·{" "}
          {info.lc?.region ?? data.customers.find((c) => c.id === customerId)?.address.line1} ·{" "}
          {CHANNEL_LABEL[(info.lc?.channel ?? "app") as keyof typeof CHANNEL_LABEL]}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="주문 (90일)" value={`${info.orders.length}건`} />
        <Stat label="구매액" value={money(spend)} />
        <Stat
          label="공헌이익"
          value={info.m ? money(info.m.contribution) : "-"}
          sub={info.m ? pctText(info.m.marginRate) : undefined}
        />
        <Stat label="반품" value={`${info.orders.filter((o) => o.returned).length}건`} />
      </div>
      {info.opps.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 text-sm font-bold">늘 사는 상품</h3>
          <ul className="space-y-1.5">
            {info.opps.map((r) => (
              <li
                key={r.productId}
                className="flex items-center justify-between gap-2 rounded-lg bg-mist px-3 py-2 text-sm"
              >
                <span>
                  {r.productName} · {r.cycleDays}일 주기 ({r.purchases}회)
                </span>
                <b className={r.status === "late" || r.status === "lapsed" ? "text-orange" : ""}>
                  {REPEAT_STATUS_LABEL[r.status]}
                </b>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-4">
        <h3 className="mb-2 text-sm font-bold">주문 이력</h3>
        <div className="table-wrap max-h-[360px] overflow-y-auto">
          <table className="table">
            <thead>
              <tr>
                <th>주문</th>
                <th>일시</th>
                <th className="text-right">금액</th>
                <th>채널</th>
              </tr>
            </thead>
            <tbody>
              {info.orders.slice(0, 40).map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap font-semibold tabular-nums">
                    {o.id}
                    {o.returned && <span className="ml-1 text-[12px] text-danger">반품</span>}
                  </td>
                  <td className="whitespace-nowrap tabular-nums text-muted">{fmtDate(o.at, "datetime")}</td>
                  <td className="text-right tabular-nums">{won(o.total)}</td>
                  <td className="text-[13px]">{CHANNEL_LABEL[o.channel as keyof typeof CHANNEL_LABEL]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Overlay>
  );
}
