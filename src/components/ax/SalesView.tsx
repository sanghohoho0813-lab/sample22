"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Settings2 } from "lucide-react";
import { useData, useMargin } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { DEFAULT_COST_MODEL } from "@/lib/costs";
import type { MarginRow } from "@/lib/margin";
import { fmtDate, wonShort } from "@/lib/format";
import { LineChart } from "@/components/shared/Charts";
import { Tabs } from "@/components/shared/Bits";
import { Panel } from "./Widgets";
import { SkuDrawer } from "./Drawers";
import { Basis, money, Pager, pctText, SortTh, StatusCell, usePage, useSort } from "./OpsUi";

type Dim = "sku" | "customer" | "channel" | "category";
const DIM_LABEL: Record<Dim, string> = {
  sku: "SKU",
  customer: "고객",
  channel: "채널",
  category: "카테고리",
};

export default function SalesView() {
  const data = useData();
  const sp = useSearchParams();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [dim, setDim] = useState<Dim>((sp.get("tab") as Dim) || "sku");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [onlyFlag, setOnlyFlag] = useState(false);
  const [skuId, setSkuId] = useState<string | null>(null);
  useEffect(() => {
    const t = sp.get("tab") as Dim | null;
    if (t && DIM_LABEL[t]) setDim(t);
    const qq = sp.get("q");
    if (qq) setQ(qq);
  }, [sp]);
  const m = useMargin(days);
  const model = useStore((s) => s.ui.costModel) ?? DEFAULT_COST_MODEL;
  const t = m.total;
  const flagged = useMemo(() => new Set(m.revenueRichMarginPoor.map((r) => r.key)), [m]);

  const base: MarginRow[] =
    dim === "sku"
      ? m.bySku
      : dim === "customer"
        ? m.byCustomer
        : dim === "channel"
          ? m.byChannel
          : m.byCategory;
  const filtered = useMemo(
    () =>
      base.filter(
        (r) =>
          (!q.trim() || r.label.toLowerCase().includes(q.trim().toLowerCase())) &&
          (!onlyFlag || dim !== "sku" || flagged.has(r.key)),
      ),
    [base, q, onlyFlag, dim, flagged],
  );
  const sort = useSort(
    filtered,
    {
      revenue: (r) => r.revenue,
      contribution: (r) => r.contribution,
      rate: (r) => r.marginRate,
      shipping: (r) => r.shipping,
      fee: (r) => r.channelFee,
      discount: (r) => r.discount,
      orders: (r) => r.orders,
    },
    "revenue",
  );
  const pg = usePage(sort.sorted, 15);
  const series = data.dailySales.slice(-(days === 7 ? 8 : days === 30 ? 31 : 90), -1).map((d) => ({
    label: fmtDate(d.date, "md"),
    value: d.revenue,
    value2: d.grossMargin,
  }));
  const steps = m.waterfall;
  const maxAbs = Math.max(...steps.map((s) => Math.abs(s.value)), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-lg border border-line bg-white p-0.5 text-sm"
          role="group"
          aria-label="기간"
        >
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              className={`rounded-md px-3 py-1 ${days === d ? "bg-soft font-semibold text-primary" : "text-muted"}`}
              aria-pressed={days === d}
              onClick={() => setDays(d)}
            >
              최근 {d}일
            </button>
          ))}
        </div>
        <Link
          href="/ax/settings?tab=cost"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <Settings2 size={15} /> 비용 기준 (택배 {model.parcelBase.toLocaleString()}원 · 제휴몰 수수료{" "}
          {pctText(model.feeRate.partner)})
        </Link>
      </div>

      <section
        aria-label="매출과 이익"
        className="card grid grid-cols-2 sm:grid-cols-3 sm:divide-x xl:grid-cols-6"
      >
        <StatusCell
          label="순매출"
          value={money(t.revenue)}
          sub={`할인 후 · 주문 ${t.orders.toLocaleString()}건`}
        />
        <StatusCell
          label="공헌이익"
          value={money(t.contribution)}
          sub="모든 변동비 차감 후"
          tone={t.contribution > 0 ? "good" : "danger"}
        />
        <StatusCell
          label="공헌이익률"
          value={pctText(t.marginRate)}
          sub={`객단가 ${money(t.orders ? t.revenue / t.orders : 0)}`}
        />
        <StatusCell
          label="할인"
          value={money(t.discount)}
          sub={`매출 대비 ${pctText(t.revenue ? t.discount / (t.revenue + t.discount) : 0)}`}
        />
        <StatusCell
          label="순운임"
          value={money(t.shipping)}
          sub={`매출 대비 ${pctText(t.revenue ? t.shipping / t.revenue : 0)}`}
        />
        <StatusCell
          label="채널 수수료"
          value={money(t.channelFee)}
          sub={`매출 대비 ${pctText(t.revenue ? t.channelFee / t.revenue : 0)}`}
        />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel
          title="매출에서 이익까지"
          sub={`최근 ${days}일 · 원장 주문 ${t.orders.toLocaleString()}건 집계`}
        >
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const last = i === steps.length - 1;
              const first = i === 0;
              const w = (Math.abs(s.value) / maxAbs) * 100;
              return (
                <li
                  key={s.label}
                  className="grid grid-cols-[88px_minmax(0,1fr)_92px] items-center gap-2 text-[14px]"
                >
                  <span className={first || last ? "font-bold" : "text-muted"}>{s.label}</span>
                  <span className="h-5 rounded bg-mist">
                    <span
                      className={`block h-full rounded ${first ? "bg-primary" : last ? "bg-teal" : "bg-orange/70"}`}
                      style={{ width: `${Math.max(1.5, w)}%` }}
                    />
                  </span>
                  <span className={`text-right tabular-nums ${first || last ? "font-bold" : ""}`}>
                    {first || last ? money(s.value) : `−${money(-s.value)}`}
                    {!first && (
                      <span className="block text-[11px] text-muted">
                        {pctText(Math.abs(s.value) / (steps[0].value || 1))}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-3">
            <Basis>
              공헌이익 = 순매출 + 고객 배송비 − 상품원가 − 운임 − 포장 − 채널 수수료 − 반품 손실(환불 − 재판매
              원가회수 + 회수운임). 고정비(인건비·임대)는 포함하지 않습니다.
            </Basis>
          </div>
        </Panel>
        <Panel title="순매출 · 매출총이익 추이" sub="매출총이익 = 순매출 − 상품원가 − 순운임">
          <LineChart
            data={series}
            label1="순매출"
            label2="매출총이익"
            format={wonShort}
            showEvery={days === 7 ? 1 : days === 30 ? 3 : 10}
          />
        </Panel>
      </div>

      <Panel
        title="어디서 이익이 새는가"
        sub="매출 순으로 보되, 매출 상위 30% 안에서 이익률이 하위 30%인 SKU를 표시합니다"
        right={
          dim === "sku" ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--t-primary)]"
                checked={onlyFlag}
                onChange={(e) => setOnlyFlag(e.target.checked)}
              />
              매출 상위·이익 하위만 ({flagged.size})
            </label>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tabs
            value={dim}
            onChange={(d) => {
              setDim(d);
              pg.setPage(0);
            }}
            tabs={(Object.keys(DIM_LABEL) as Dim[]).map((k) => ({ key: k, label: DIM_LABEL[k] }))}
            className="flex-1"
          />
          {(dim === "sku" || dim === "customer") && (
            <label className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                className="input !min-h-[38px] w-56 pl-9 text-sm"
                placeholder={dim === "sku" ? "상품명 검색" : "고객명 검색"}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="검색"
              />
            </label>
          )}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{DIM_LABEL[dim]}</th>
                <SortTh k="orders" sort={sort} className="text-right">
                  주문
                </SortTh>
                <SortTh k="revenue" sort={sort} className="text-right">
                  순매출
                </SortTh>
                <SortTh k="discount" sort={sort} className="text-right">
                  할인
                </SortTh>
                <SortTh k="shipping" sort={sort} className="text-right">
                  순운임
                </SortTh>
                <SortTh k="fee" sort={sort} className="text-right">
                  수수료
                </SortTh>
                <th className="text-right">반품 손실</th>
                <SortTh k="contribution" sort={sort} className="text-right">
                  공헌이익
                </SortTh>
                <SortTh k="rate" sort={sort} className="text-right">
                  이익률
                </SortTh>
              </tr>
            </thead>
            <tbody>
              {pg.rows.map((r) => {
                const flag = dim === "sku" && flagged.has(r.key);
                return (
                  <tr
                    key={r.key}
                    className={dim === "sku" ? "row-clickable" : ""}
                    onClick={() => dim === "sku" && setSkuId(r.key)}
                  >
                    <td className="min-w-[200px]">
                      <span className="font-semibold">{r.label}</span>
                      {flag && (
                        <span className="ml-1.5 rounded bg-danger/10 px-1.5 py-0.5 text-[11px] font-bold text-danger">
                          매출 상위·이익 하위
                        </span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{r.orders.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{money(r.revenue)}</td>
                    <td className="text-right tabular-nums text-muted">{money(r.discount)}</td>
                    <td className="text-right tabular-nums text-muted">{money(r.shipping)}</td>
                    <td className="text-right tabular-nums text-muted">{money(r.channelFee)}</td>
                    <td className="text-right tabular-nums text-muted">{money(r.returnLoss)}</td>
                    <td
                      className={`text-right font-semibold tabular-nums ${r.contribution < 0 ? "text-danger" : ""}`}
                    >
                      {money(r.contribution)}
                    </td>
                    <td
                      className={`text-right font-bold tabular-nums ${r.marginRate < t.marginRate * 0.6 ? "text-danger" : ""}`}
                    >
                      {pctText(r.marginRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager pg={pg} />
      </Panel>
      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} />
    </div>
  );
}
