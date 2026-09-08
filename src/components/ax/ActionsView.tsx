"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { useData } from "@/lib/hooks";
import { useStore, ROLE_LABEL, ACTION_STAGE_LABEL } from "@/lib/store";
import { actionTypeLabel } from "@/lib/engines";
import type { AXAction, ActionStage, RoleKey, Urgency } from "@/lib/types";
import { ActionCard, ActionDrawer, SkuDrawer, OrderDrawer } from "./Drawers";
import { Panel, KpiCard } from "./Widgets";
import { EmptyState, Tabs } from "@/components/shared/Bits";

export default function ActionsView() {
  const data = useData();
  const role = useStore((s) => s.ui.role);
  const sp = useSearchParams();
  const [tab, setTab] = useState<"open" | "progress" | "done" | "all">("open");
  const [urg, setUrg] = useState<Urgency | "all">("all");
  const [type, setType] = useState<AXAction["type"] | "all">("all");
  const [owner, setOwner] = useState<RoleKey | "all">(role === "owner" ? "all" : role);
  const [action, setAction] = useState<AXAction | null>(null);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(() => { const id = sp.get("id"); if (id) { const a = data.actions.find((x) => x.id === id); if (a) setAction(a); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  useEffect(() => { setOwner(role === "owner" ? "all" : role); }, [role]);

  const OPEN: ActionStage[] = ["recommended", "reviewing", "held"];
  const PROG: ActionStage[] = ["approved", "requested", "in_progress"];
  const list = useMemo(() => data.actions.filter((a) => (tab === "all" ? true : tab === "open" ? OPEN.includes(a.stage) : tab === "progress" ? PROG.includes(a.stage) : ["done", "dismissed"].includes(a.stage)) && (urg === "all" || a.urgency === urg) && (type === "all" || a.type === type) && (owner === "all" || a.owner === owner) && (role === "owner" || a.owner === role || tab === "done")).sort((a, b) => ({ critical: 0, high: 1, mid: 2, low: 3 }[a.urgency] - { critical: 0, high: 1, mid: 2, low: 3 }[b.urgency])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.actions, tab, urg, type, owner, role]);
  const counts = { open: data.actions.filter((a) => OPEN.includes(a.stage)).length, progress: data.actions.filter((a) => PROG.includes(a.stage)).length, done: data.actions.filter((a) => ["done", "dismissed"].includes(a.stage)).length };
  const execRate = data.actions.length ? data.actions.filter((a) => a.stage === "done").length / data.actions.length : 0;
  const types = Array.from(new Set(data.actions.map((a) => a.type)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="미처리 Action" value={counts.open} tone="danger" sub={`긴급 ${data.actions.filter((a) => a.urgency === "critical" && OPEN.includes(a.stage)).length}건`} onClick={() => setTab("open")} />
        <KpiCard label="실행중" value={counts.progress} tone="primary" onClick={() => setTab("progress")} />
        <KpiCard label="완료·보류해제" value={counts.done} tone="good" onClick={() => setTab("done")} />
        <KpiCard label="Action 실행률" value={`${Math.round(execRate * 100)}%`} sub="완료 ÷ 생성 (Demo)" tone="neutral" />
      </div>

      <Panel>
        <Tabs value={tab} onChange={setTab} tabs={[{ key: "open", label: "처리 대기", count: counts.open }, { key: "progress", label: "실행중", count: counts.progress }, { key: "done", label: "완료", count: counts.done }, { key: "all", label: "전체" }]} />
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted inline-flex items-center gap-1 mr-1"><Filter size={14} />긴급도</span>
          {(["all", "critical", "high", "mid", "low"] as const).map((u) => <button key={u} onClick={() => setUrg(u)} className={`chip !min-h-[32px] text-xs ${urg === u ? "chip-on" : ""}`}>{u === "all" ? "전체" : { critical: "긴급", high: "높음", mid: "보통", low: "낮음" }[u]}</button>)}
          <span className="text-muted ml-3 mr-1">유형</span>
          <button onClick={() => setType("all")} className={`chip !min-h-[32px] text-xs ${type === "all" ? "chip-on" : ""}`}>전체</button>
          {types.map((t) => <button key={t} onClick={() => setType(t)} className={`chip !min-h-[32px] text-xs ${type === t ? "chip-on" : ""}`}>{actionTypeLabel(t)}</button>)}
          {role === "owner" && <><span className="text-muted ml-3 mr-1">담당</span>{(["all", "owner", "buyer", "ops", "cs"] as const).map((o) => <button key={o} onClick={() => setOwner(o)} className={`chip !min-h-[32px] text-xs ${owner === o ? "chip-on" : ""}`}>{o === "all" ? "전체" : ROLE_LABEL[o]}</button>)}</>}
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {list.map((a) => <ActionCard key={a.id} a={a} onOpen={setAction} />)}
        </div>
        {!list.length && <EmptyState title="조건에 맞는 Action이 없습니다" body="필터를 줄이거나 다른 탭을 확인하세요." />}
      </Panel>

      <Panel title="Action Lifecycle" sub="버튼 클릭 후 상태만 바뀌고 끝나지 않습니다 — 데이터·고객상태·Evidence가 함께 바뀝니다">
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-mist p-3"><div className="font-bold mb-1">일반 Action</div><div className="text-muted">추천됨 → 확인 → 실행중 → 완료</div></div>
          <div className="rounded-xl bg-mist p-3"><div className="font-bold mb-1">구매·발주 Action</div><div className="text-muted">추천됨 → 검토 → 승인 → 발주요청 → 입고진행 → 완료 <span className="text-primary">(발주서 생성·입고예정 반영)</span></div></div>
          <div className="rounded-xl bg-mist p-3"><div className="font-bold mb-1">배송 Action</div><div className="text-muted">위험감지 → 담당자 확인 → 우선처리 → 출고완료 → 고객반영 <span className="text-primary">(My Page 상태 변경)</span></div></div>
        </div>
        <div className="mt-2 text-xs text-muted">{Object.entries(ACTION_STAGE_LABEL).map(([k, v]) => `${v}(${k})`).join(" · ")}</div>
      </Panel>

      <ActionDrawer action={action} onClose={() => setAction(null)} onOpenSku={(id) => { setAction(null); setSkuId(id); }} onOpenOrder={(id) => { setAction(null); setOrderId(id); }} />
      <SkuDrawer skuId={skuId} onClose={() => setSkuId(null)} onOpenAction={(a) => { setSkuId(null); setAction(a); }} />
      <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />
    </div>
  );
}
