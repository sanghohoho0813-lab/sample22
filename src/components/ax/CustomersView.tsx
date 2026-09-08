"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, RotateCcw, ChevronRight } from "lucide-react";
import { useData, useLookups } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { buildSegments, repeatItemsForCustomer } from "@/lib/engines";
import { fmtDate, num, pct, won } from "@/lib/format";
import type { Customer } from "@/lib/types";
import Overlay from "@/components/shared/Overlay";
import Badge from "@/components/shared/Badge";
import { AiReady } from "@/components/shared/Bits";
import { KpiCard, Panel, Stat, Field } from "./Widgets";
import { ActionDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";
import { Sparkline } from "@/components/shared/Charts";

export default function CustomersView() {
  const data = useData();
  const { productById } = useLookups();
  const role = useStore((s) => s.ui.role);
  const [seg, setSeg] = useState<string | null>("repeat_due");
  const [sel, setSel] = useState<Customer | null>(null);
  const [action, setAction] = useState<AXAction | null>(null);
  const segments = useMemo(() => buildSegments(data), [data]);
  const rows = useMemo(() => data.customers.map((c) => { const orders = data.orders.filter((o) => o.customerId === c.id && !["cancelled", "return"].includes(o.stage)); const repeat = repeatItemsForCustomer(data, c.id); const spend = orders.reduce((a, o) => a + o.total, 0); const due = repeat.filter((r) => r.dueInDays <= 3).length; return { c, orders, repeat, spend, due, last: orders[0]?.createdAt }; }).sort((a, b) => b.due - a.due || b.spend - a.spend), [data]);
  const active = segments.find((s) => s.key === seg);
  const repeatAction = data.actions.find((a) => a.type === "repeat_expose" && !["done", "dismissed"].includes(a.stage));
  const newCustomers30 = Math.round(data.aggregates.customerCount * 0.14);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="전체 고객" value={num(data.aggregates.customerCount)} sub={`신규 30일 ${num(newCustomers30)}`} tone="primary" />
        <KpiCard label="재구매율" value={pct(data.aggregates.repeatCustomerRate, 0)} sub="2회 이상 구매" tone="good" />
        <KpiCard label="재구매 주기 도래" value="42명" sub="3일 이내" tone="warn" onClick={() => setSeg("repeat_due")} />
        <KpiCard label="Repeat Basket 전환" value="31%" sub="지난달 (Demo 집계)" tone="neutral" />
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
        <Panel title={<span className="inline-flex items-center gap-2"><Users size={18} />Demo 세그먼트</span>} sub="세그먼트는 실제 Action으로 연결됩니다">
          <ul className="space-y-1.5">{segments.map((s) => <li key={s.key}><button onClick={() => setSeg(s.key)} className={`w-full text-left rounded-xl border px-3 py-2.5 ${seg === s.key ? "border-primary bg-soft" : "border-line hover:bg-mist"}`}><div className="flex items-center justify-between"><b className="text-sm">{s.name}</b><span className="font-bold tabular-nums">{s.count}<span className="text-xs text-muted font-normal">명</span></span></div><div className="text-xs text-muted mt-0.5">{s.description}</div></button></li>)}</ul>
        </Panel>
        <div className="space-y-4">
          {active && (
            <Panel title={active.name} sub={active.description} right={active.key === "repeat_due" && repeatAction ? <button className="btn-primary btn-sm" onClick={() => setAction(repeatAction)}><RotateCcw size={14} />Repeat Basket 노출 Action</button> : <Badge tone="soft">Action: {active.action}</Badge>}>
              <div className="text-sm text-muted mb-2">대표 고객 {active.customers.length}명 (전체 {active.count}명 중 상세 Demo 고객만 표시)</div>
              <div className="table-wrap"><table className="table"><thead><tr><th>고객</th><th>가입</th><th className="text-right">주문</th><th className="text-right">구매금액</th><th>최근 주문</th><th>주기 도래</th><th></th></tr></thead><tbody>
                {active.customers.map((c) => { const r = rows.find((x) => x.c.id === c.id)!; return <tr key={c.id} className="row-clickable" onClick={() => setSel(c)}><td className="font-semibold">{c.name}</td><td className="text-muted">{fmtDate(c.joinedAt)}</td><td className="text-right">{r.orders.length}</td><td className="text-right tabular-nums">{won(r.spend)}</td><td className="text-muted">{r.last ? fmtDate(r.last, "md") : "-"}</td><td>{r.due ? <Badge tone="warn">{r.due}개 상품</Badge> : <span className="text-muted">-</span>}</td><td><ChevronRight size={14} className="text-muted" /></td></tr>; })}
              </tbody></table></div>
            </Panel>
          )}
          <Panel title="재구매 예측 · 전체 Demo 고객" sub="구매이력·평균 구매주기 → 재구매 예상시점 → Repeat Basket" right={<AiReady title="Repeat Purchase Opportunity" now="구매주기 평균 + 상품 기본주기 가중 (L2)" method="RULE + STATISTICAL" next="고객별 소비속도 학습, 검색·장바구니 행동 반영" />}>
            <div className="table-wrap"><table className="table"><thead><tr><th>고객</th><th className="text-right">주문</th><th className="text-right">구매금액</th><th>자주 사는 카테고리</th><th>다음 재구매</th><th>상태</th></tr></thead><tbody>
              {rows.slice(0, 14).map((r) => { const cats = Array.from(new Set(r.orders.flatMap((o) => o.items.map((it) => productById.get(it.productId)?.categorySlug)))).slice(0, 3); const next = r.repeat[0]; return <tr key={r.c.id} className="row-clickable" onClick={() => setSel(r.c)}><td className="font-semibold">{r.c.name}</td><td className="text-right">{r.orders.length}</td><td className="text-right tabular-nums">{role === "cs" ? "—" : won(r.spend)}</td><td className="text-xs">{cats.map((c) => data.categories.find((x) => x.slug === c)?.name).join("·") || "-"}</td><td className="text-sm">{next ? `${next.product.name.slice(0, 10)} · ${next.dueInDays <= 0 ? "지금" : `${next.dueInDays}일 후`}` : "-"}</td><td>{r.due ? <Badge tone="warn">주기 도래</Badge> : r.orders.length === 0 ? <Badge tone="neutral">첫 주문 전</Badge> : <Badge tone="success">정상</Badge>}</td></tr>; })}
            </tbody></table></div>
          </Panel>
        </div>
      </div>

      <Overlay open={!!sel} onClose={() => setSel(null)} variant="drawer" size="md" title={sel?.name} subtitle={sel && `가입 ${fmtDate(sel.joinedAt)} · ${role === "cs" || role === "owner" ? sel.phone : "연락처 비공개"}`}>
        {sel && (() => { const r = rows.find((x) => x.c.id === sel.id)!; return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2"><Stat label="주문" value={r.orders.length} /><Stat label="구매금액" value={role === "cs" ? "—" : won(r.spend)} /><Stat label="주기 도래" value={r.due} sub="상품" /></div>
            <Field label="주소">{role === "ops" ? "비공개" : `${sel.address.line1} ${sel.address.line2 ?? ""}`}</Field>
            <div><div className="text-xs font-semibold text-muted uppercase mb-1.5">반복구매 예측</div>{r.repeat.length ? <ul className="space-y-1.5 text-sm">{r.repeat.map((it) => <li key={it.product.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2"><div><b>{it.product.name}</b><div className="text-xs text-muted">{it.reasons.join(" · ")}</div></div><Badge tone={it.dueInDays <= 0 ? "warn" : "neutral"}>{it.dueInDays <= 0 ? "지금" : `${it.dueInDays}일 후`}</Badge></li>)}</ul> : <div className="text-sm text-muted">반복상품 구매 이력이 없습니다.</div>}</div>
            <div><div className="text-xs font-semibold text-muted uppercase mb-1.5">최근 주문</div><ul className="space-y-1 text-sm">{r.orders.slice(0, 6).map((o) => <li key={o.id} className="flex justify-between"><span>{fmtDate(o.createdAt, "md")} · {o.items[0].name}{o.items.length > 1 ? ` 외 ${o.items.length - 1}` : ""}</span><span className="tabular-nums text-muted">{won(o.total)}</span></li>)}</ul></div>
            {sel.id === "c-001" && <Link href="/my" target="_blank" className="text-sm text-primary font-semibold">이 고객의 Customer 화면 보기 (Demo 로그인 고객)</Link>}
            <div className="text-xs text-muted"><Sparkline values={r.orders.slice(0, 8).reverse().map((o) => o.total)} width={200} height={28} /> 주문금액 추이</div>
          </div>
        ); })()}
      </Overlay>
      <ActionDrawer action={action} onClose={() => setAction(null)} />
    </div>
  );
}
