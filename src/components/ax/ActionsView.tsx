"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, LayoutGrid, Rows3, Search, X } from "lucide-react";
import { useData, useMinute } from "@/lib/hooks";
import { ACTION_STAGE_LABEL, ROLE_LABEL, useStore } from "@/lib/store";
import { actionTypeLabel } from "@/lib/engines";
import { LIFECYCLE, lifecycleIndex } from "@/lib/lifecycle";
import { fmtDate, relTime } from "@/lib/format";
import type { AXAction, ActionStage, ActionType, RoleKey, Urgency } from "@/lib/types";
import { EmptyState } from "@/components/shared/Bits";
import { useToast } from "@/components/shared/Toast";
import { OrderDrawer, SkuDrawer } from "./Drawers";
import { ActionDrawer } from "./ActionDrawer";
import { Panel } from "./Widgets";
import { Impact, Pager, SeverityTag, SortTh, usePage, useSort, VerdictTag } from "./OpsUi";

type StageFilter = ActionStage | "all" | "running";
const URG_RANK: Record<Urgency, number> = { critical: 4, high: 3, mid: 2, low: 1 };
const TYPES: ActionType[] = [
  "urgent_po",
  "alt_supplier",
  "stop_po",
  "priority_order",
  "staff_rebalance",
  "delay_notice",
  "repeat_expose",
  "promo_adjust",
  "quality_issue",
];
const BOARD: { key: string; label: string; stages: ActionStage[] }[] = [
  { key: "recommended", label: "추천됨", stages: ["recommended"] },
  { key: "reviewing", label: "담당자 확인", stages: ["reviewing"] },
  { key: "running", label: "승인 · 실행중", stages: ["approved", "requested", "in_progress"] },
  { key: "done", label: "완료 · 측정 대기", stages: ["done"] },
  { key: "measured", label: "성과 측정", stages: ["measured"] },
];

export default function ActionsView() {
  const data = useData();
  const now = useMinute();
  const role = useStore((s) => s.ui.role);
  const setStage = useStore((s) => s.setActionStage);
  const toast = useToast();
  const sp = useSearchParams();
  const [stage, setStageFilter] = useState<StageFilter>("all");
  const [urg, setUrg] = useState<Urgency | "all">("all");
  const [type, setType] = useState<ActionType | "all">("all");
  const [owner, setOwner] = useState<RoleKey | "all">(role === "owner" ? "all" : role);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "board">("table");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<AXAction | null>(null);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const u = sp.get("urg");
    if (u && ["critical", "high", "mid", "low"].includes(u)) setUrg(u as Urgency);
    const st = sp.get("stage");
    if (st) setStageFilter(st === "in_progress" ? "running" : (st as StageFilter));
    const id = sp.get("id");
    if (id) {
      const a = data.actions.find((x) => x.id === id);
      if (a) setAction(a);
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  useEffect(() => setOwner(role === "owner" ? "all" : role), [role]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.actions.length, running: 0, held: 0, dismissed: 0 };
    data.actions.forEach((a) => {
      c[a.stage] = (c[a.stage] ?? 0) + 1;
      if (["approved", "requested", "in_progress"].includes(a.stage)) c.running += 1;
    });
    return c;
  }, [data.actions]);

  const filtered = useMemo(
    () =>
      data.actions.filter(
        (a) =>
          (stage === "all" ||
            (stage === "running"
              ? ["approved", "requested", "in_progress"].includes(a.stage)
              : a.stage === stage)) &&
          (urg === "all" || a.urgency === urg) &&
          (type === "all" || a.type === type) &&
          (owner === "all" || a.owner === owner) &&
          (!q.trim() ||
            `${a.title} ${a.summary} ${a.assignee}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [data.actions, stage, urg, type, owner, q],
  );
  const sort = useSort(
    filtered,
    {
      urg: (a) => URG_RANK[a.urgency] * 1e6 - new Date(a.dueAt).getTime() / 1e8,
      due: (a) => -new Date(a.dueAt).getTime(),
      stage: (a) => lifecycleIndex(a.stage),
      impact: (a) => (a.impact?.unit === "원" ? a.impact.value : (a.impact?.value ?? 0) * 20000),
      updated: (a) => new Date(a.updatedAt).getTime(),
    },
    "urg",
  );
  const pg = usePage(sort.sorted, 15);
  const reset = () => {
    setStageFilter("all");
    setUrg("all");
    setType("all");
    setOwner(role === "owner" ? "all" : role);
    setQ("");
  };
  const canAct = (a: AXAction) => role === "owner" || role === a.owner;
  const selectable = (a: AXAction) => a.stage === "recommended" && canAct(a);
  const bulkConfirm = () => {
    sel.forEach((id) => setStage(id, "reviewing", { reason: "일괄 담당자 확인" }));
    toast({
      title: `${sel.size}건을 담당자 확인으로 넘겼습니다`,
      body: "활동 로그에 일괄 처리로 남았습니다.",
      tone: "success",
    });
    setSel(new Set());
  };
  const overdue = (a: AXAction) =>
    new Date(a.dueAt) < now && !["done", "measured", "dismissed"].includes(a.stage);
  const filtersOn =
    stage !== "all" || urg !== "all" || type !== "all" || q || owner !== (role === "owner" ? "all" : role);

  return (
    <div className="space-y-4">
      {/* 라이프사이클 — 단계별 건수 */}
      <nav aria-label="실행 단계" className="card hide-scrollbar overflow-x-auto p-2">
        <ol className="flex min-w-max items-stretch gap-1">
          <li>
            <button
              className={`h-full rounded-xl px-3 py-2 text-left ${stage === "all" ? "bg-soft" : "hover:bg-mist"}`}
              aria-pressed={stage === "all"}
              onClick={() => setStageFilter("all")}
            >
              <div className="text-[12px] font-semibold text-muted">전체</div>
              <div className="text-[20px] font-bold tabular-nums">{counts.all}</div>
            </button>
          </li>
          {LIFECYCLE.map((s, i) => {
            const key: StageFilter = s.stage === "in_progress" ? "running" : s.stage;
            const n = s.stage === "in_progress" ? counts.running : (counts[s.stage] ?? 0);
            if (s.stage === "approved") return null;
            return (
              <li key={s.stage} className="flex items-center">
                <span className="px-1 text-muted" aria-hidden>
                  ›
                </span>
                <button
                  className={`rounded-xl px-3 py-2 text-left ${stage === key ? "bg-soft" : "hover:bg-mist"}`}
                  aria-pressed={stage === key}
                  onClick={() => setStageFilter(key)}
                  title={s.desc}
                >
                  <div className="text-[12px] font-semibold text-muted">
                    {i + 1}. {s.stage === "in_progress" ? "승인 · 실행중" : s.label}
                  </div>
                  <div className="text-[20px] font-bold tabular-nums">{n}</div>
                </button>
              </li>
            );
          })}
          <li className="ml-2 flex items-center gap-1 border-l border-line pl-2">
            {(["held", "dismissed"] as const).map((k) => (
              <button
                key={k}
                className={`rounded-xl px-3 py-2 text-left ${stage === k ? "bg-soft" : "hover:bg-mist"}`}
                aria-pressed={stage === k}
                onClick={() => setStageFilter(k)}
              >
                <div className="text-[12px] font-semibold text-muted">{ACTION_STAGE_LABEL[k]}</div>
                <div className="text-[20px] font-bold tabular-nums text-muted">{counts[k] ?? 0}</div>
              </button>
            ))}
          </li>
        </ol>
      </nav>

      <Panel
        title="실행 목록"
        sub="모든 실행은 근거·영향 대상·실행 전 기준값을 갖고 시작하고, 끝나면 같은 지표로 다시 잽니다."
        right={
          <div
            className="inline-flex rounded-lg border border-line p-0.5"
            role="group"
            aria-label="보기 방식"
          >
            <button
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm ${view === "table" ? "bg-soft font-semibold text-primary" : "text-muted"}`}
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <Rows3 size={15} /> 표
            </button>
            <button
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm ${view === "board" ? "bg-soft font-semibold text-primary" : "text-muted"}`}
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
            >
              <LayoutGrid size={15} /> 보드
            </button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1 basis-[220px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              className="input !min-h-[40px] pl-9"
              placeholder="실행 제목·담당자 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="실행 검색"
            />
          </label>
          <select
            className="input !min-h-[40px] w-auto"
            value={type}
            onChange={(e) => setType(e.target.value as ActionType | "all")}
            aria-label="유형"
          >
            <option value="all">유형 전체</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {actionTypeLabel(t)}
              </option>
            ))}
          </select>
          <select
            className="input !min-h-[40px] w-auto"
            value={urg}
            onChange={(e) => setUrg(e.target.value as Urgency | "all")}
            aria-label="긴급도"
          >
            <option value="all">긴급도 전체</option>
            <option value="critical">긴급</option>
            <option value="high">높음</option>
            <option value="mid">보통</option>
            <option value="low">낮음</option>
          </select>
          <select
            className="input !min-h-[40px] w-auto"
            value={owner}
            onChange={(e) => setOwner(e.target.value as RoleKey | "all")}
            aria-label="담당 역할"
          >
            <option value="all">담당 전체</option>
            {(Object.keys(ROLE_LABEL) as RoleKey[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          {filtersOn && (
            <button className="btn-ghost btn-sm" onClick={reset}>
              <X size={14} /> 필터 초기화
            </button>
          )}
        </div>

        {sel.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-soft px-3 py-2">
            <span className="text-sm font-semibold">{sel.size}건 선택</span>
            <div className="flex gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setSel(new Set())}>
                선택 해제
              </button>
              <button className="btn-primary btn-sm" onClick={bulkConfirm}>
                <ClipboardCheck size={15} /> 일괄 담당자 확인
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            title="조건에 맞는 실행이 없습니다"
            body="필터를 바꾸거나, 컨트롤 타워의 예외에서 실행을 만들어 보세요."
            action={
              <button className="btn-outline btn-sm" onClick={reset}>
                필터 초기화
              </button>
            }
          />
        ) : view === "table" ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <span className="sr-only">선택</span>
                    </th>
                    <th>실행</th>
                    <SortTh k="urg" sort={sort}>
                      긴급도
                    </SortTh>
                    <SortTh k="stage" sort={sort}>
                      단계
                    </SortTh>
                    <th>담당</th>
                    <SortTh k="due" sort={sort}>
                      기한
                    </SortTh>
                    <SortTh k="impact" sort={sort} className="text-right">
                      영향
                    </SortTh>
                    <th>기준값 → 측정</th>
                    <SortTh k="updated" sort={sort}>
                      갱신
                    </SortTh>
                  </tr>
                </thead>
                <tbody>
                  {pg.rows.map((a) => (
                    <tr
                      key={a.id}
                      className={`row-clickable ${sel.has(a.id) ? "row-selected" : ""}`}
                      onClick={() => setAction(a)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        {selectable(a) && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--t-primary)]"
                            checked={sel.has(a.id)}
                            onChange={(e) => {
                              const n = new Set(sel);
                              if (e.target.checked) n.add(a.id);
                              else n.delete(a.id);
                              setSel(n);
                            }}
                            aria-label={`${a.title} 선택`}
                          />
                        )}
                      </td>
                      <td className="min-w-[240px]">
                        <div className="text-[12px] font-semibold text-muted">{actionTypeLabel(a.type)}</div>
                        <div className="font-semibold leading-snug">{a.title}</div>
                      </td>
                      <td>
                        <SeverityTag s={a.urgency} />
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="text-[13px] font-semibold">{ACTION_STAGE_LABEL[a.stage]}</span>
                        {!["held", "dismissed"].includes(a.stage) && (
                          <span className="ml-1 text-[12px] tabular-nums text-muted">
                            {lifecycleIndex(a.stage) + 1}/6
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-[13px]">
                        {a.assignee}
                        <span className="block text-[12px] text-muted">{ROLE_LABEL[a.owner]}</span>
                      </td>
                      <td
                        className={`whitespace-nowrap text-[13px] ${overdue(a) ? "font-semibold text-danger" : "text-muted"}`}
                      >
                        {overdue(a) ? "기한 지남" : fmtDate(a.dueAt, "md")}
                        <span className="block text-[12px] font-normal text-muted">
                          {fmtDate(a.dueAt, "time")}
                        </span>
                      </td>
                      <td className="text-right">
                        {a.impact ? (
                          <Impact value={a.impact.value} unit={a.impact.unit} />
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="text-[13px]">
                        {a.measurement ? (
                          <span className="inline-flex flex-wrap items-center gap-1">
                            <span className="tabular-nums">
                              {a.measurement.before} → {a.measurement.after}
                            </span>
                            <VerdictTag v={a.measurement.verdict} />
                          </span>
                        ) : (
                          <span className="text-muted">{a.baseline?.display ?? "-"}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-[13px] text-muted">{relTime(a.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager pg={pg} />
          </>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1 pb-2">
            <div className="grid min-w-[980px] grid-cols-5 gap-3">
              {BOARD.map((col) => {
                const items = sort.sorted.filter((a) => col.stages.includes(a.stage));
                return (
                  <section key={col.key} className="rounded-2xl bg-mist p-2" aria-label={col.label}>
                    <h3 className="flex items-center justify-between px-1.5 pb-2 pt-1 text-sm font-bold">
                      {col.label}
                      <span className="tabular-nums text-muted">{items.length}</span>
                    </h3>
                    <ul className="space-y-2">
                      {items.map((a) => (
                        <li key={a.id}>
                          <button
                            className="card w-full p-3 text-left hover:shadow-raised"
                            onClick={() => setAction(a)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <SeverityTag s={a.urgency} />
                              <span
                                className={`text-[12px] ${overdue(a) ? "font-semibold text-danger" : "text-muted"}`}
                              >
                                {overdue(a) ? "기한 지남" : fmtDate(a.dueAt, "md")}
                              </span>
                            </div>
                            <div className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-snug">
                              {a.title}
                            </div>
                            <div className="mt-1 text-[12px] text-muted">
                              {actionTypeLabel(a.type)} · {a.assignee}
                            </div>
                            {a.measurement && (
                              <div className="mt-1.5">
                                <VerdictTag v={a.measurement.verdict} />
                              </div>
                            )}
                          </button>
                        </li>
                      ))}
                      {!items.length && (
                        <li className="px-1.5 py-3 text-center text-[13px] text-muted">없음</li>
                      )}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <ActionDrawer
        action={action}
        onClose={() => setAction(null)}
        onOpenSku={(id) => {
          setAction(null);
          setSkuId(id);
        }}
        onOpenOrder={(id) => {
          setAction(null);
          setOrderId(id);
        }}
      />
      <SkuDrawer
        skuId={skuId}
        onClose={() => setSkuId(null)}
        onOpenAction={(a) => {
          setSkuId(null);
          setAction(a);
        }}
      />
      <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />
    </div>
  );
}
