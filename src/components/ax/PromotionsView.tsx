"use client";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useData, useLookups } from "@/lib/hooks";
import { safeDiv } from "@/lib/kpi";
import { num, pct, won, wonShort } from "@/lib/format";
import type { Promotion } from "@/lib/types";
import { StatusBadge } from "@/components/shared/Badge";
import Badge from "@/components/shared/Badge";
import Overlay from "@/components/shared/Overlay";
import { BarChart } from "@/components/shared/Charts";
import { KpiCard, Panel, Stat, Field } from "./Widgets";
import { ActionDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";

const realMargin = (p: Promotion) => p.revenue - p.cogs - p.discountCost - p.shippingCost;

export default function PromotionsView() {
  const data = useData();
  const { skuById, productById } = useLookups();
  const [sel, setSel] = useState<Promotion | null>(null);
  const [action, setAction] = useState<AXAction | null>(null);
  const running = data.promotions.filter((p) => p.status === "running");
  const rows = [...data.promotions].sort((a, b) => (a.status === "running" ? -1 : b.status === "running" ? 1 : 0));
  const negative = data.promotions.filter((p) => p.status !== "planned" && realMargin(p) < 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="진행중 캠페인" value={running.length} tone="primary" />
        <KpiCard label="캠페인 매출 (진행중)" value={wonShort(running.reduce((a, p) => a + p.revenue, 0))} />
        <KpiCard label="실질마진 합계" value={wonShort(running.reduce((a, p) => a + realMargin(p), 0))} tone="good" sub="매출 - 원가 - 할인 - 배송비" />
        <KpiCard label="마진 마이너스 캠페인" value={negative.length} tone={negative.length ? "danger" : "good"} sub="매출만 높은 캠페인" />
      </div>
      <Panel title={<span className="inline-flex items-center gap-2"><Megaphone size={18} className="text-accent" />프로모션 성과 — 실제로 남는 것이 있는가</span>} sub="매출만 높은 캠페인을 성공으로 표시하지 않습니다. 기존 구매 대체 여부, 재고위험 해소, 재구매 연결을 함께 봅니다">
        <div className="table-wrap"><table className="table"><thead><tr><th>캠페인</th><th>기간</th><th>대상</th><th className="text-right">할인</th><th className="text-right">노출→클릭→담기→주문</th><th className="text-right">매출</th><th className="text-right">할인·배송비</th><th className="text-right">실질마진</th><th>상태</th></tr></thead><tbody>
          {rows.map((p) => { const m = realMargin(p); return <tr key={p.id} className="row-clickable" onClick={() => setSel(p)}><td className="font-semibold whitespace-nowrap">{p.name}</td><td className="text-xs text-muted whitespace-nowrap">{p.startsAt.slice(5)}~{p.endsAt.slice(5)}</td><td className="text-xs">{p.segment}</td><td className="text-right tabular-nums">{Math.round(p.discountRate * 100)}%</td><td className="text-right tabular-nums text-xs">{num(p.impressions)}→{num(p.clicks)}→{num(p.carts)}→<b>{num(p.orders)}</b></td><td className="text-right tabular-nums">{wonShort(p.revenue)}</td><td className="text-right tabular-nums text-muted">{wonShort(p.discountCost + p.shippingCost)}</td><td className={`text-right tabular-nums font-bold ${m < 0 ? "text-danger" : ""}`}>{wonShort(m)}<div className="text-[11px] font-normal text-muted">{pct(safeDiv(m, p.revenue), 0)}</div></td><td><StatusBadge status={p.status} /></td></tr>; })}
        </tbody></table></div>
      </Panel>
      <Panel title="캠페인별 매출 vs 실질마진">
        <BarChart data={data.promotions.filter((p) => p.status !== "planned").map((p) => ({ label: p.name.slice(0, 8), value: p.revenue, value2: Math.max(0, realMargin(p)) }))} label1="매출" label2="실질마진" format={wonShort} height={200} />
      </Panel>

      <Overlay open={!!sel} onClose={() => setSel(null)} variant="drawer" size="md" title={sel?.name} subtitle={sel && <span className="inline-flex gap-2 items-center"><StatusBadge status={sel.status} /><span>{sel.startsAt} ~ {sel.endsAt} · 할인 {Math.round(sel.discountRate * 100)}% · {sel.segment}</span></span>}>
        {sel && (() => { const m = realMargin(sel); const related = data.actions.filter((a) => a.related.promotionId === sel.id); const cannibal = sel.id === "promo-01" ? 0.4 : sel.id === "promo-03" ? 0.55 : 0.2; return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2"><Stat label="매출" value={won(sel.revenue)} /><Stat label="실질마진" value={won(m)} sub={pct(safeDiv(m, sel.revenue), 0)} className={m < 0 ? "!bg-danger/10" : ""} /><Stat label="할인비용" value={won(sel.discountCost)} /><Stat label="배송비" value={won(sel.shippingCost)} /><Stat label="원가" value={won(sel.cogs)} /><Stat label="취소·반품" value={sel.returns} /></div>
            <div className="rounded-xl bg-mist p-3 text-sm space-y-1.5">
              <div className="font-bold">네 가지 질문</div>
              <div>① 실제로 남는 것이 있는가 → <b className={m < 0 ? "text-danger" : "text-teal"}>{m < 0 ? "아니오 (마진 마이너스)" : "예"}</b></div>
              <div>② 기존 구매를 할인으로 대체한 것은 아닌가 → 추정 대체율 <b>{Math.round(cannibal * 100)}%</b> {cannibal > 0.35 && <span className="text-[#B84F1A]">(높음)</span>}</div>
              <div>③ 재고위험 해소에 도움이 되었는가 → {sel.id === "promo-03" ? <b>일부 (재고일수 여전히 400일+)</b> : sel.id === "promo-02" ? <b className="text-teal">예 (배변패드 회전 개선)</b> : <b>해당 없음</b>}</div>
              <div>④ 재구매로 이어졌는가 → {sel.segment.includes("재구매") || sel.segment.includes("반복") ? <b className="text-teal">재구매 세그먼트 대상</b> : <b>측정 준비 (Evidence 누적 필요)</b>}</div>
            </div>
            <div><div className="text-xs font-semibold text-muted uppercase mb-1.5">대상 상품</div><ul className="space-y-1 text-sm">{sel.skuIds.map((id) => { const s = skuById.get(id); const p = s && productById.get(s.productId); return <li key={id} className="flex justify-between"><span>{p?.name} · {s?.name}</span><span className="text-muted tabular-nums">{s && won(s.salePrice)}</span></li>; })}</ul></div>
            <Field label="퍼널">노출 {num(sel.impressions)} → 클릭 {num(sel.clicks)} ({pct(safeDiv(sel.clicks, sel.impressions))}) → 담기 {num(sel.carts)} → 주문 {num(sel.orders)} ({pct(safeDiv(sel.orders, sel.carts), 0)})</Field>
            {related.length > 0 && <div><div className="text-xs font-semibold text-muted uppercase mb-1.5">관련 Action</div>{related.map((a) => <button key={a.id} onClick={() => { setSel(null); setAction(a); }} className="w-full text-left rounded-xl border border-line p-3 hover:bg-mist text-sm"><div className="flex gap-2 mb-1"><Badge tone="soft">프로모션</Badge><StatusBadge status={a.stage} /></div><b>{a.title}</b></button>)}</div>}
          </div>
        ); })()}
      </Overlay>
      <ActionDrawer action={action} onClose={() => setAction(null)} />
    </div>
  );
}
