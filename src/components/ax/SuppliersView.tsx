"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Factory, Rocket } from "lucide-react";
import { useData, useInsights, useLedger, useLookups, useMinute } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { compareSuppliers } from "@/lib/engines";
import { supplierPerformance } from "@/lib/procurement";
import { returnRecords } from "@/lib/returns";
import { RETURN_REASON_LABEL } from "@/lib/labels";
import { num, won } from "@/lib/format";
import type { OpsException } from "@/lib/control";
import type { AXAction, Supplier } from "@/lib/types";
import { StatusBadge } from "@/components/shared/Badge";
import Badge from "@/components/shared/Badge";
import Overlay from "@/components/shared/Overlay";
import { AiReady, Tabs } from "@/components/shared/Bits";
import { useToast } from "@/components/shared/Toast";
import { Panel, Stat } from "./Widgets";
import { SkuDrawer } from "./Drawers";
import { ActionDrawer } from "./ActionDrawer";
import { Basis, Pager, pctText, SortTh, StatusCell, usePage, useSort } from "./OpsUi";

type Mode = "urgent" | "normal" | "overstock";
const MODE_LABEL: Record<Mode, string> = {
  urgent: "긴급 (품절 위험)",
  normal: "일반 보충",
  overstock: "과잉 주의",
};

export default function SuppliersView() {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const insights = useInsights();
  const { categoryBySlug } = useLookups();
  const role = useStore((s) => s.ui.role);
  const create = useStore((s) => s.createActionFromException);
  const toast = useToast();
  const sp = useSearchParams();
  const showCost = role !== "ops" && role !== "cs";
  const perf = useMemo(() => supplierPerformance(data, ledger, now), [data, ledger, now]);

  // ---- 비교 대상 SKU: 여러 공급사가 있는 SKU, 위험한 순 ----
  const multi = useMemo(() => {
    const c = new Map<string, number>();
    data.supplierProducts.forEach((x) => c.set(x.skuId, (c.get(x.skuId) ?? 0) + 1));
    return insights.filter((i) => (c.get(i.sku.id) ?? 0) >= 2).sort((a, b) => b.priority - a.priority);
  }, [data.supplierProducts, insights]);
  const [cmpSku, setCmpSku] = useState<string>(sp.get("sku") ?? multi[0]?.sku.id ?? "");
  const cmpIns = insights.find((i) => i.sku.id === cmpSku);
  const autoMode: Mode =
    cmpIns && ["urgent", "stockout", "low"].includes(cmpIns.status)
      ? "urgent"
      : cmpIns && ["slow", "overstock"].includes(cmpIns.status)
        ? "overstock"
        : "normal";
  const [mode, setMode] = useState<Mode>(autoMode);
  const [qty, setQty] = useState<number | null>(null);
  useEffect(() => {
    setMode(autoMode);
    setQty(null);
  }, [cmpSku, autoMode]);
  useEffect(() => {
    const s = sp.get("sku");
    if (s) setCmpSku(s);
  }, [sp]);
  const cmp = useMemo(
    () => (cmpSku ? compareSuppliers(data, cmpSku, mode, { now, ledger, qty: qty ?? undefined }) : []),
    [data, cmpSku, mode, now, ledger, qty],
  );
  const needDefault = cmpIns
    ? Math.max(cmpIns.sku.moq, cmpIns.calc.netNeed > 0 ? cmpIns.calc.netNeed : cmpIns.recommendedQty)
    : 0;

  // ---- 스코어카드 ----
  const rows = useMemo(() => Array.from(perf.values()), [perf]);
  const sort = useSort(
    rows,
    {
      name: (r) => r.supplier.name,
      ontime: (r) => r.onTimeRate,
      fill: (r) => r.fillRate,
      defect: (r) => r.defectRate,
      sole: (r) => r.soleSourceSkus,
      open: (r) => r.openPos * 10 + r.lateOpenPos * 100,
    },
    "defect",
  );
  const [sel, setSel] = useState<Supplier | null>(null);
  useEffect(() => {
    const id = sp.get("supplier");
    if (id) setSel(data.suppliers.find((s) => s.id === id) ?? null);
  }, [sp, data.suppliers]);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [action, setAction] = useState<AXAction | null>(null);

  const openPos = data.purchaseOrders.filter((p) =>
    ["requested", "confirmed", "in_transit"].includes(p.status),
  );
  const allPos = ledger?.purchaseOrders ?? [];
  const onTimeAll = allPos.length ? allPos.filter((p) => p.delayDays === 0).length / allPos.length : 1;
  const worstDefect = [...rows].sort((a, b) => b.defectRate - a.defectRate)[0];
  const sole = rows.reduce((a, r) => a + r.soleSourceSkus, 0);

  const makePo = (supplierId: string) => {
    if (!cmpIns) return;
    const ex: OpsException = {
      id: `ex-supplier-${cmpIns.sku.id}`,
      kind: "stockout",
      severity: autoMode === "urgent" ? "high" : "mid",
      title: `${cmpIns.product.name} ${cmpIns.sku.name}`,
      subject: "",
      evidence: cmpIns.reasons,
      impact: {
        value: cmpIns.calc.lostRevenue,
        unit: "원",
        label: "지금 발주해도 비는 기간 판매",
        basis: "발주량 계산식",
      },
      weight: 0,
      owner: "buyer",
      href: `/ax/suppliers?sku=${cmpIns.sku.id}`,
      actionType: "urgent_po",
      related: {
        skuId: cmpIns.sku.id,
        productId: cmpIns.product.id,
        supplierId: cmpIns.sku.primarySupplierId,
        preferSupplierId: supplierId,
        preferQty: qty ?? undefined,
      },
    };
    const id = create(ex);
    if (!id) return toast({ title: "이미 이 SKU에 진행 중인 실행이 있습니다", tone: "info" });
    toast({
      title: "발주 실행을 만들었습니다",
      body: "선택한 공급사·수량이 제안으로 담겼습니다. 승인하면 발주가 생성됩니다.",
      tone: "success",
    });
    const a = useStore.getState().data.actions.find((x) => x.id === id);
    if (a) setAction(a);
  };
  const hasOpen =
    !!cmpIns &&
    data.actions.some(
      (a) => a.related.skuId === cmpIns.sku.id && !["done", "measured", "dismissed"].includes(a.stage),
    );

  const CRIT: {
    label: string;
    render: (o: (typeof cmp)[number]) => React.ReactNode;
    money?: boolean;
    hint?: string;
  }[] = [
    {
      label: "단가",
      money: true,
      render: (o) => (
        <>
          {won(o.sp.unitCost)}{" "}
          <span className="text-[12px] text-muted">{o.costDiffPct ? `+${o.costDiffPct}%` : "최저"}</span>
        </>
      ),
    },
    { label: "최소주문수량", render: (o) => `${num(o.sp.moq)}개` },
    {
      label: "발주 수량",
      hint: "필요량 → 10개 단위·최소주문 반영",
      render: (o) => (
        <>
          {num(o.orderQty)}개
          {o.excessQty > 0 && (
            <span className="block text-[12px] text-orange">필요량보다 +{o.excessQty}</span>
          )}
        </>
      ),
    },
    { label: "발주금액", money: true, render: (o) => won(o.orderCost) },
    { label: "계약 리드타임", render: (o) => `${o.sp.leadTimeDays}일` },
    {
      label: "실적 반영 예상 도착",
      hint: "리드타임 + (1 − 정시율) × 평균 지연일",
      render: (o) => `${o.expectedDays}일`,
    },
    {
      label: "도착 전 재고 공백",
      render: (o) =>
        o.gapDays > 0 ? <span className="font-semibold text-danger">{o.gapDays}일</span> : "없음",
    },
    {
      label: "결품 손실 이익",
      money: true,
      render: (o) => (o.lostMargin ? <span className="text-danger">{won(o.lostMargin)}</span> : "0원"),
    },
    {
      label: "정시 입고 실적",
      render: (o) => (
        <>
          {pctText(o.reliability.onTimeRate, 0)}{" "}
          <span className="text-[12px] text-muted">
            {o.reliability.measured ? `${o.reliability.pos}건` : "계약값"}
          </span>
        </>
      ),
    },
    { label: "충족률 실적", render: (o) => pctText(o.reliability.fillRate, 0) },
    {
      label: "불량 반품률 실적",
      render: (o) => (
        <span className={o.reliability.defectRate > 0.004 ? "font-semibold text-danger" : ""}>
          {pctText(o.reliability.defectRate, 2)}
        </span>
      ),
    },
    { label: "예상 불량 손실", money: true, render: (o) => won(o.defectCost) },
    {
      label: "계약 · 위험",
      render: (o) => (
        <span className="inline-flex flex-wrap gap-1">
          <StatusBadge status={o.supplier.contractStatus} />
          <Badge
            tone={
              o.supplier.riskLevel === "high" ? "danger" : o.supplier.riskLevel === "mid" ? "warn" : "success"
            }
          >
            위험 {{ high: "높음", mid: "보통", low: "낮음" }[o.supplier.riskLevel]}
          </Badge>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <section
        aria-label="공급 현황"
        className="card grid grid-cols-2 sm:grid-cols-3 sm:divide-x xl:grid-cols-5"
      >
        <StatusCell
          label="계약 공급사"
          value={`${data.suppliers.filter((s) => s.contractStatus === "active").length}곳`}
          sub={`검토 중 ${data.suppliers.filter((s) => s.contractStatus === "review").length}곳`}
        />
        <StatusCell
          label="진행 발주"
          value={`${openPos.length}건`}
          sub={`지연 통보 ${openPos.filter((p) => p.note).length}건`}
          tone={openPos.some((p) => p.note) ? "warn" : "neutral"}
        />
        <StatusCell
          label="정시 입고율 (90일)"
          value={pctText(onTimeAll, 0)}
          sub={`입고 ${allPos.length.toLocaleString()}건 실적`}
        />
        <StatusCell
          label="불량 반품률 최고"
          value={worstDefect ? pctText(worstDefect.defectRate, 2) : "-"}
          sub={worstDefect?.supplier.name}
          tone="warn"
        />
        <StatusCell label="단독 공급 SKU" value={`${sole}개`} sub="대체 공급사 없음 — 의존도" />
      </section>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Factory size={18} className="text-accent" />
            공급사 선택 — 총비용 비교
          </span>
        }
        sub="단가만 보지 않습니다. 발주금액 + 도착 전 결품으로 놓치는 이익 + 실적 불량률 손실을 더한 총비용으로 고릅니다."
        right={
          <AiReady
            title="공급사 비교"
            now="실제 입고·반품 실적 기반 총비용 계산 (L3 — 사람이 승인)"
            method="규칙 + 최적화"
            next="공급사별 납기 분포 학습으로 도착일 확률 예측"
          />
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="supplier-compare-sku" className="text-sm text-muted">
            비교 상품
          </label>
          <select
            id="supplier-compare-sku"
            className="input !min-h-[40px] w-auto max-w-full text-sm"
            value={cmpSku}
            onChange={(e) => setCmpSku(e.target.value)}
          >
            {multi.map((i) => (
              <option key={i.sku.id} value={i.sku.id}>
                {i.product.name} · {i.sku.name}
              </option>
            ))}
          </select>
          <div
            className="inline-flex rounded-lg border border-line p-0.5 text-sm"
            role="group"
            aria-label="상황"
          >
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                className={`rounded-md px-2.5 py-1 ${mode === m ? "bg-soft font-semibold text-primary" : "text-muted"}`}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <label className="text-sm text-muted">
            필요 수량{" "}
            <input
              type="number"
              className="input ml-1 inline-block !min-h-[40px] w-24"
              min={1}
              inputMode="numeric"
              value={qty ?? needDefault}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setQty(Number.isFinite(n) && n > 0 ? Math.min(99999, n) : 1);
              }}
            />
          </label>
        </div>
        {cmpIns && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={cmpIns.status} />
            <span className="text-muted">
              가용 {num(cmpIns.available)}개 · 소진{" "}
              {cmpIns.daysOfStock === Infinity ? "-" : `${cmpIns.daysOfStock.toFixed(1)}일`} · 예측 일판매{" "}
              {cmpIns.calc.forecastDaily.toFixed(1)}개
            </span>
            <button className="font-semibold text-primary" onClick={() => setSkuId(cmpIns.sku.id)}>
              발주량 계산 보기
            </button>
          </p>
        )}
        {cmp.length > 0 && (
          <div className="table-wrap" data-nostack>
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th>기준</th>
                  {cmp.map((o) => (
                    <th key={o.supplier.id} className={o.recommended ? "!bg-soft text-ink" : ""}>
                      {o.supplier.name} {o.recommended && <Badge tone="primary">추천</Badge>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRIT.filter((c) => showCost || !c.money).map((c) => (
                  <tr key={c.label}>
                    <td className="whitespace-nowrap text-[13px] font-semibold text-muted">
                      {c.label}
                      {c.hint && <span className="block text-[11px] font-normal">{c.hint}</span>}
                    </td>
                    {cmp.map((o) => (
                      <td key={o.supplier.id} className={`tabular-nums ${o.recommended ? "bg-soft/40" : ""}`}>
                        {c.render(o)}
                      </td>
                    ))}
                  </tr>
                ))}
                {showCost && (
                  <tr>
                    <td className="font-bold">총비용</td>
                    {cmp.map((o) => (
                      <td
                        key={o.supplier.id}
                        className={`text-[16px] font-bold tabular-nums ${o.recommended ? "bg-soft/40 text-primary" : ""}`}
                      >
                        {won(o.totalCost)}
                      </td>
                    ))}
                  </tr>
                )}
                <tr>
                  <td className="text-[13px] font-semibold text-muted">판단</td>
                  {cmp.map((o) => (
                    <td
                      key={o.supplier.id}
                      className={`text-[13px] ${o.recommended ? "bg-soft/40" : "text-muted"}`}
                    >
                      <span className="block min-w-[160px] whitespace-normal">{o.why}</span>
                      {(role === "owner" || role === "buyer") && !hasOpen && (
                        <button
                          className={`${o.recommended ? "btn-primary" : "btn-outline"} btn-sm mt-2`}
                          onClick={() => makePo(o.supplier.id)}
                        >
                          <Rocket size={14} /> 이 공급사로 발주 실행
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {hasOpen && (
          <p className="mt-2 text-sm text-muted">
            이 SKU에는 진행 중인 실행이 있습니다 — 실행 센터에서 확인하세요.
          </p>
        )}
        <div className="mt-2">
          <Basis>
            총비용 = 발주금액 + 예측 일판매 × 도착 전 공백일 × 개당 이익 + 발주금액 × 실적 불량률 + 부족 입고
            재발주 부담{mode === "overstock" ? " + 초과 수량 보관비(월 2%)" : ""}. 실적은 지난 90일 입고·반품
            기록, 발주 3건 미만이면 계약값을 씁니다.
          </Basis>
        </div>
      </Panel>

      <Panel title="공급사 스코어카드" sub="계약서의 약속이 아니라 지난 90일 실제 입고·반품 기록으로 잽니다">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <SortTh k="name" sort={sort}>
                  공급사
                </SortTh>
                <th>취급</th>
                <th>계약</th>
                <SortTh k="ontime" sort={sort} className="text-right">
                  정시 입고
                </SortTh>
                <SortTh k="fill" sort={sort} className="text-right">
                  충족률
                </SortTh>
                <SortTh k="defect" sort={sort} className="text-right">
                  불량 반품
                </SortTh>
                <SortTh k="sole" sort={sort} className="text-right">
                  단독 공급
                </SortTh>
                <SortTh k="open" sort={sort} className="text-right">
                  진행 발주
                </SortTh>
              </tr>
            </thead>
            <tbody>
              {sort.sorted.map((r) => (
                <tr key={r.supplier.id} className="row-clickable" onClick={() => setSel(r.supplier)}>
                  <td className="whitespace-nowrap font-semibold">
                    {r.supplier.name}
                    {r.supplier.note && (
                      <span className="block text-[12px] font-normal text-muted">{r.supplier.note}</span>
                    )}
                  </td>
                  <td className="text-[13px]">
                    {r.supplier.categories.map((c) => categoryBySlug.get(c)?.name).join("·")}
                  </td>
                  <td>
                    <StatusBadge status={r.supplier.contractStatus} />
                  </td>
                  <td
                    className={`text-right tabular-nums ${r.onTimeRate < 0.85 ? "font-semibold text-danger" : ""}`}
                  >
                    {pctText(r.onTimeRate, 0)}
                    <span className="block text-[12px] font-normal text-muted">
                      {r.poCount}건{r.avgDelayDays ? ` · 지연 평균 ${r.avgDelayDays.toFixed(1)}일` : ""}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{pctText(r.fillRate, 0)}</td>
                  <td
                    className={`text-right tabular-nums ${r.defectRate > 0.004 ? "font-semibold text-danger" : ""}`}
                  >
                    {pctText(r.defectRate, 2)}
                    <span className="block text-[12px] font-normal text-muted">
                      {r.defectReturns}건 / {num(r.unitsSold)}개
                    </span>
                  </td>
                  <td className="text-right tabular-nums">
                    {r.soleSourceSkus}/{r.skuCount}
                  </td>
                  <td className="text-right tabular-nums">
                    {r.openPos}
                    {r.lateOpenPos > 0 && (
                      <span className="block text-[12px] font-semibold text-danger">
                        지연 {r.lateOpenPos}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <SupplierDrawer supplier={sel} onClose={() => setSel(null)} onOpenSku={setSkuId} showCost={showCost} />
      <SkuDrawer
        skuId={skuId}
        onClose={() => setSkuId(null)}
        onOpenAction={(a) => {
          setSkuId(null);
          setAction(a);
        }}
      />
      <ActionDrawer
        action={action}
        onClose={() => setAction(null)}
        onOpenSku={(id) => {
          setAction(null);
          setSkuId(id);
        }}
      />
    </div>
  );
}

function SupplierDrawer({
  supplier,
  onClose,
  onOpenSku,
  showCost,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onOpenSku: (id: string) => void;
  showCost: boolean;
}) {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const insights = useInsights();
  const [tab, setTab] = useState<"po" | "returns" | "skus">("po");
  const perf = useMemo(() => supplierPerformance(data, ledger, now), [data, ledger, now]);
  const recs = useMemo(() => returnRecords(data, ledger, now), [data, ledger, now]);
  const pf = supplier ? perf.get(supplier.id) : undefined;
  const poRows = useMemo(() => {
    if (!supplier) return [];
    const live = data.purchaseOrders
      .filter((p) => p.supplierId === supplier.id)
      .map((p) => ({
        id: p.id,
        skuId: p.skuId,
        qty: p.qty,
        received: p.status === "received" ? p.qty : undefined,
        ordered: p.createdAt.slice(0, 10),
        expected: p.expectedAt,
        receivedAt: p.receivedAt,
        delay: undefined as number | undefined,
        status: p.status as string,
        note: p.note,
      }));
    const hist = (ledger?.purchaseOrders ?? [])
      .filter((p) => p.supplierId === supplier.id)
      .map((p) => ({
        id: p.id,
        skuId: p.skuId,
        qty: p.qty,
        received: p.receivedQty,
        ordered: p.orderedAt.slice(0, 10),
        expected: p.expectedAt,
        receivedAt: p.receivedAt,
        delay: p.delayDays,
        status: "received",
        note: undefined as string | undefined,
      }));
    return [...live, ...hist];
  }, [supplier, data.purchaseOrders, ledger]);
  const pg = usePage(poRows, 10);
  const rets = supplier
    ? recs.filter((r) => r.supplierId === supplier.id && (r.reason === "defect" || r.reason === "damaged"))
    : [];
  const skuName = (id: string) => {
    const i = insights.find((x) => x.sku.id === id);
    return i ? `${i.product.name} · ${i.sku.name}` : id;
  };
  if (!supplier || !pf) return null;
  return (
    <Overlay
      open={!!supplier}
      onClose={onClose}
      variant="drawer"
      size="lg"
      title={supplier.name}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={supplier.contractStatus} />
          <span>
            담당 {supplier.contact} · 계약 리드타임 {supplier.leadTimeDays}일
          </span>
        </span>
      }
    >
      {(pf.onTimeRate < 0.85 || pf.defectRate > 0.004) && (
        <div className="mb-3 flex gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
          <div>
            실적 주의 — 정시 입고 {pctText(pf.onTimeRate, 0)}, 불량 반품률 {pctText(pf.defectRate, 2)}. 단독
            공급 SKU {pf.soleSourceSkus}개는 대체 공급사 확보를 검토하세요.
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="정시 입고 (90일)"
          value={pctText(pf.onTimeRate, 0)}
          sub={`${pf.poCount}건 · 계약 ${pctText(supplier.onTimeRate, 0)}`}
        />
        <Stat label="충족률" value={pctText(pf.fillRate, 0)} sub={`계약 ${pctText(supplier.fillRate, 0)}`} />
        <Stat label="불량 반품률" value={pctText(pf.defectRate, 2)} sub={`${pf.defectReturns}건`} />
        <Stat label="단독 공급 SKU" value={`${pf.soleSourceSkus}개`} sub={`취급 ${pf.skuCount}개`} />
      </div>
      <Tabs
        className="mt-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "po", label: "발주·입고 이력", count: poRows.length },
          { key: "returns", label: "불량·파손 반품", count: rets.length },
          { key: "skus", label: "취급 상품", count: pf.skuCount },
        ]}
      />
      <div className="pt-4">
        {tab === "po" && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>발주</th>
                    <th>상품</th>
                    <th className="text-right">수량</th>
                    <th>예정</th>
                    <th>입고</th>
                    <th className="text-right">지연</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.rows.map((p) => (
                    <tr key={p.id} className="row-clickable" onClick={() => onOpenSku(p.skuId)}>
                      <td className="whitespace-nowrap font-semibold tabular-nums">{p.id}</td>
                      <td className="text-[13px]">{skuName(p.skuId)}</td>
                      <td className="text-right tabular-nums">
                        {num(p.qty)}
                        {p.received !== undefined && p.received < p.qty && (
                          <span className="block text-[12px] text-orange">입고 {num(p.received)}</span>
                        )}
                      </td>
                      <td className="tabular-nums">{p.expected}</td>
                      <td className="tabular-nums">{p.receivedAt ?? <StatusBadge status={p.status} />}</td>
                      <td
                        className={`text-right tabular-nums ${(p.delay ?? 0) > 0 || p.note ? "font-semibold text-danger" : "text-muted"}`}
                      >
                        {p.note
                          ? "지연 통보"
                          : p.delay === undefined
                            ? "-"
                            : p.delay
                              ? `+${p.delay}일`
                              : "정시"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager pg={pg} />
          </>
        )}
        {tab === "returns" &&
          (rets.length ? (
            <div className="table-wrap max-h-[420px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>접수</th>
                    <th>상품</th>
                    <th>사유</th>
                    <th>주문</th>
                  </tr>
                </thead>
                <tbody>
                  {rets.slice(0, 60).map((r) => (
                    <tr key={`${r.orderId}-${r.skuId}`}>
                      <td className="whitespace-nowrap tabular-nums">
                        {r.at.slice(5, 10).replace("-", "/")}
                      </td>
                      <td className="text-[13px]">{skuName(r.skuId)}</td>
                      <td>{RETURN_REASON_LABEL[r.reason]}</td>
                      <td className="text-[13px] tabular-nums text-muted">{r.orderId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">최근 90일 불량·파손 반품이 없습니다.</p>
          ))}
        {tab === "skus" && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>상품 · SKU</th>
                  {showCost && <th className="text-right">단가</th>}
                  <th className="text-right">최소수량</th>
                  <th className="text-right">납기</th>
                  <th>재고 상태</th>
                </tr>
              </thead>
              <tbody>
                {data.supplierProducts
                  .filter((x) => x.supplierId === supplier.id)
                  .map((x) => {
                    const i = insights.find((y) => y.sku.id === x.skuId)!;
                    return (
                      <tr key={x.skuId} className="row-clickable" onClick={() => onOpenSku(x.skuId)}>
                        <td>
                          {i.product.name} <span className="text-muted">· {i.sku.name}</span>
                        </td>
                        {showCost && <td className="text-right tabular-nums">{won(x.unitCost)}</td>}
                        <td className="text-right tabular-nums">{x.moq}</td>
                        <td className="text-right tabular-nums">{x.leadTimeDays}일</td>
                        <td>
                          <StatusBadge status={i.status} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Overlay>
  );
}
