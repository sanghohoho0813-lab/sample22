"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { useData } from "@/lib/hooks";
import { useStore, ROLE_LABEL } from "@/lib/store";
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
  useEffect(() => {
    const u = sp.get("urg");
    if (u && ["critical", "high", "mid", "low"].includes(u)) setUrg(u as Urgency);
    const id = sp.get("id");
    if (id) {
      const a = data.actions.find((x) => x.id === id);
      if (a) setAction(a);
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  useEffect(() => {
    setOwner(role === "owner" ? "all" : role);
  }, [role]);

  const OPEN: ActionStage[] = ["recommended", "reviewing", "held"];
  const PROG: ActionStage[] = ["approved", "requested", "in_progress"];
  const list = useMemo(
    () =>
      data.actions
        .filter(
          (a) =>
            (tab === "all"
              ? true
              : tab === "open"
                ? OPEN.includes(a.stage)
                : tab === "progress"
                  ? PROG.includes(a.stage)
                  : ["done", "dismissed"].includes(a.stage)) &&
            (urg === "all" || a.urgency === urg) &&
            (type === "all" || a.type === type) &&
            (owner === "all" || a.owner === owner) &&
            (role === "owner" || a.owner === role || tab === "done"),
        )
        .sort(
          (a, b) =>
            ({ critical: 0, high: 1, mid: 2, low: 3 })[a.urgency] -
            { critical: 0, high: 1, mid: 2, low: 3 }[b.urgency],
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.actions, tab, urg, type, owner, role],
  );
  const counts = {
    open: data.actions.filter((a) => OPEN.includes(a.stage)).length,
    progress: data.actions.filter((a) => PROG.includes(a.stage)).length,
    done: data.actions.filter((a) => ["done", "dismissed"].includes(a.stage)).length,
  };
  const execRate = data.actions.length
    ? data.actions.filter((a) => a.stage === "done").length / data.actions.length
    : 0;
  const types = Array.from(new Set(data.actions.map((a) => a.type)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="미처리 실행"
          value={counts.open}
          tone="danger"
          sub={`긴급 ${data.actions.filter((a) => a.urgency === "critical" && OPEN.includes(a.stage)).length}건`}
          onClick={() => setTab("open")}
        />
        <KpiCard label="실행중" value={counts.progress} tone="primary" onClick={() => setTab("progress")} />
        <KpiCard label="완료·보류해제" value={counts.done} tone="good" onClick={() => setTab("done")} />
        <KpiCard
          label="완료율"
          value={`${Math.round(execRate * 100)}%`}
          sub="완료 ÷ 생성 (시연)"
          tone="neutral"
        />
      </div>

      <Panel>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "open", label: "처리 대기", count: counts.open },
            { key: "progress", label: "실행중", count: counts.progress },
            { key: "done", label: "완료", count: counts.done },
            { key: "all", label: "전체" },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="mr-1 hidden items-center gap-1 text-muted sm:inline-flex">
            <Filter size={14} />
            긴급도
          </span>
          {(["all", "critical", "high", "mid", "low"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUrg(u)}
              className={`chip !min-h-[36px] text-sm ${urg === u ? "chip-on" : ""}`}
            >
              {u === "all" ? "전체" : { critical: "긴급", high: "높음", mid: "보통", low: "낮음" }[u]}
            </button>
          ))}
          {/* 선택지가 많은 필터는 칩 대신 선택 상자로 — 한 줄에 정리 */}
          <div className="mt-1 flex w-full gap-2 sm:ml-auto sm:mt-0 sm:w-auto">
            <select
              aria-label="유형"
              className="input !min-h-[38px] flex-1 text-[15px] sm:w-40"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <option value="all">유형 전체</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {actionTypeLabel(t)}
                </option>
              ))}
            </select>
            {role === "owner" && (
              <select
                aria-label="담당"
                className="input !min-h-[38px] flex-1 text-[15px] sm:w-36"
                value={owner}
                onChange={(e) => setOwner(e.target.value as typeof owner)}
              >
                {(["all", "owner", "buyer", "ops", "cs"] as const).map((o) => (
                  <option key={o} value={o}>
                    {o === "all" ? "담당 전체" : ROLE_LABEL[o]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {(urg !== "all" || type !== "all" || (role === "owner" && owner !== "all")) && (
          <button
            className="mt-2 text-[14px] font-semibold text-primary"
            onClick={() => {
              setUrg("all");
              setType("all");
              setOwner("all");
            }}
          >
            필터 초기화
          </button>
        )}
        <div className="stagger mt-4 grid gap-3 md:grid-cols-2">
          {list.map((a) => (
            <ActionCard key={a.id} a={a} onOpen={setAction} />
          ))}
        </div>
        {!list.length && (
          <EmptyState title="조건에 맞는 실행이 없습니다" body="필터를 줄이거나 다른 탭을 확인하세요." />
        )}
      </Panel>

      <details className="card group p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold">
          실행 단계 안내
          <span className="text-[14px] font-semibold text-primary group-open:hidden">펼치기</span>
          <span className="hidden text-[14px] font-semibold text-primary group-open:inline">접기</span>
        </summary>
        <p className="mt-1 text-sm text-muted">
          승인하면 상태만 바뀌는 게 아니라 발주서·고객 화면·성과 기록이 함께 바뀝니다.
        </p>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl bg-mist p-3">
            <div className="mb-1 font-bold">일반 실행</div>
            <div className="text-muted">추천됨 → 확인 → 실행중 → 완료</div>
          </div>
          <div className="rounded-xl bg-mist p-3">
            <div className="mb-1 font-bold">구매·발주 실행</div>
            <div className="text-muted">
              추천됨 → 검토 → 승인 → 발주요청 → 입고진행 → 완료{" "}
              <span className="text-primary">(발주서 생성·입고예정 반영)</span>
            </div>
          </div>
          <div className="rounded-xl bg-mist p-3">
            <div className="mb-1 font-bold">배송 실행</div>
            <div className="text-muted">
              위험감지 → 담당자 확인 → 우선처리 → 출고완료 → 고객반영{" "}
              <span className="text-primary">(마이페이지 상태 변경)</span>
            </div>
          </div>
        </div>
      </details>

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
