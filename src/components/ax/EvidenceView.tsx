"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PilotPanel from "./PilotPanel";
import { useStore } from "@/lib/store";
import { buildEvidencePack, downloadText } from "@/lib/evidencePack";
import { useToast } from "@/components/shared/Toast";
import Link from "next/link";
import { FileCheck2, Search, Download, FlaskConical } from "lucide-react";
import { useData, useLedger, useLookups, useMinute } from "@/lib/hooks";
import { measureAction, opsSnapshot } from "@/lib/lifecycle";
import { actionTypeLabel } from "@/lib/engines";
import { dateKey, fmtDate } from "@/lib/format";
import type { EvidenceType } from "@/lib/types";
import Badge from "@/components/shared/Badge";
import { EmptyState, Tabs } from "@/components/shared/Bits";
import { Panel } from "./Widgets";
import { Basis, money, StatusCell, VerdictTag } from "./OpsUi";
import { ActionDrawer } from "./Drawers";
import type { AXAction } from "@/lib/types";
import { EVIDENCE_TYPE_LABEL, EVIDENCE_MODE_LABEL, STAGE_LABEL } from "@/lib/labels";

const TYPES: EvidenceType[] = [
  "BASELINE",
  "ACTION",
  "RESULT",
  "ADOPTION",
  "CUSTOMER",
  "EFFICIENCY",
  "REVENUE",
  "SCALE",
  "RISK",
  "EXCEPTION",
];
const tone = (t: EvidenceType) =>
  t === "RESULT" || t === "REVENUE" || t === "EFFICIENCY"
    ? "success"
    : t === "RISK" || t === "EXCEPTION"
      ? "danger"
      : t === "BASELINE" || t === "SCALE"
        ? "neutral"
        : "primary";

export default function EvidenceView() {
  const data = useData();
  const { productById, skuById, supplierById } = useLookups();
  const [type, setType] = useState<EvidenceType | "all">("all");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [action, setAction] = useState<AXAction | null>(null);
  const sp = useSearchParams();
  const [view, setView] = useState<"log" | "pilot">(sp.get("tab") === "pilot" ? "pilot" : "log");
  useEffect(() => {
    if (sp.get("tab") === "pilot") setView("pilot");
  }, [sp]);
  const ui = useStore((s) => s.ui);
  const toast = useToast();
  const baselineCount = Object.values(ui.pilot.baselines).filter((b) => b.value !== undefined).length;
  const list = useMemo(
    () =>
      data.evidence
        .filter(
          (e) =>
            (type === "all" || e.type === type) &&
            (Date.now() - new Date(e.createdAt).getTime()) / 86400000 <= Number(period) &&
            (!q || `${e.title} ${e.detail} ${e.actor}`.includes(q)),
        )
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [data.evidence, type, q, period],
  );
  const counts = TYPES.map((t) => ({ t, n: data.evidence.filter((e) => e.type === t).length }));
  const results = data.evidence.filter((e) => e.type === "RESULT").length;
  const measured = data.actions.filter((a) => a.stage === "measured" && a.measurement);
  const waiting = data.actions.filter((a) => a.stage === "done");
  const verdicts = { improved: 0, unchanged: 0, worse: 0, pending: 0 };
  measured.forEach((a) => (verdicts[a.measurement!.verdict] += 1));

  return (
    <div className="space-y-4">
      <section aria-label="성과 현황" className="card grid grid-cols-2 sm:grid-cols-4 sm:divide-x">
        <StatusCell
          label="측정한 실행"
          value={`${measured.length}건`}
          sub={`개선 ${verdicts.improved} · 변화 없음 ${verdicts.unchanged} · 악화 ${verdicts.worse}`}
        />
        <StatusCell
          label="측정 대기"
          value={`${waiting.length}건`}
          sub="완료됐지만 아직 같은 지표로 재지 않음"
          tone={waiting.length ? "warn" : "neutral"}
        />
        <StatusCell
          label="성과 기록"
          value={`${data.evidence.length}건`}
          sub={`결과 ${results} · 위험·예외 ${data.evidence.filter((e) => ["RISK", "EXCEPTION"].includes(e.type)).length}`}
        />
        <StatusCell
          label="실증 상태"
          value={ui.stage === "DEMO" ? (baselineCount ? "준비 중" : "준비") : STAGE_LABEL[ui.stage]}
          sub={`책임자 ${ui.pilot.owner || "미지정"} · 기준값 ${baselineCount}건`}
        />
      </section>

      <OpsOutcome onOpen={setAction} />

      <Tabs
        value={view}
        onChange={setView}
        tabs={[
          { key: "log", label: "성과 기록", count: data.evidence.length },
          { key: "pilot", label: "실증 준비" },
        ]}
      />
      {view === "pilot" && <PilotPanel />}
      {view === "log" && (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          <Panel
            title={
              <span className="inline-flex items-center gap-2">
                <FileCheck2 size={18} className="text-accent" />
                AX 성과 기록
              </span>
            }
            sub="무엇을 보고 · 무엇을 했고 · 무엇이 바뀌었는지 시간순으로 남깁니다"
          >
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <div className="hide-scrollbar -mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-0.5">
                <button
                  onClick={() => setType("all")}
                  className={`chip !min-h-[36px] shrink-0 text-sm ${type === "all" ? "chip-on" : ""}`}
                >
                  전체
                </button>
                {counts.map(({ t, n }) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`chip !min-h-[36px] shrink-0 whitespace-nowrap text-sm ${type === t ? "chip-on" : ""}`}
                  >
                    {EVIDENCE_TYPE_LABEL[t] ?? t}
                    <span className="text-muted">{n}</span>
                  </button>
                ))}
              </div>
              <div className="flex w-full items-center gap-1.5 sm:ml-auto sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    className="input !min-h-[38px] w-full pl-8 text-sm sm:w-44"
                    placeholder="성과 기록 검색"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                {(["7", "30", "90"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`chip !min-h-[36px] shrink-0 text-sm ${period === p ? "chip-on" : ""}`}
                  >
                    {p}일
                  </button>
                ))}
              </div>
            </div>
            {list.length ? (
              <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">
                {list.map((e) => {
                  const p = e.skuId ? productById.get(skuById.get(e.skuId)?.productId ?? "") : undefined;
                  const a = e.actionId ? data.actions.find((x) => x.id === e.actionId) : undefined;
                  return (
                    <li key={e.id} className="relative">
                      <span
                        className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white"
                        style={{
                          background:
                            tone(e.type) === "success"
                              ? "#0FAF9A"
                              : tone(e.type) === "danger"
                                ? "#D93A3A"
                                : "var(--t-primary)",
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={tone(e.type)}>{EVIDENCE_TYPE_LABEL[e.type] ?? e.type}</Badge>
                        <span>{fmtDate(e.createdAt, "datetime")}</span>
                        <span>· {e.actor}</span>
                        <Badge tone="neutral">{EVIDENCE_MODE_LABEL[e.mode] ?? e.mode}</Badge>
                      </div>
                      <div className="mt-1 font-semibold">{e.title}</div>
                      <div className="text-sm text-ink/80">{e.detail}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                        {e.kpiDelta && (
                          <span>
                            KPI 변화 <b className="text-ink">{e.kpiDelta}</b>
                          </span>
                        )}
                        <span>출처 {e.dataSource}</span>
                        {p && <span>상품 {p.name}</span>}
                        {e.supplierId && <span>공급사 {supplierById.get(e.supplierId)?.name}</span>}
                        {e.orderId && <span>주문 {e.orderId}</span>}
                        {a && (
                          <button onClick={() => setAction(a)} className="font-semibold text-primary">
                            실행 보기 →
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState title="조건에 맞는 성과 기록이 없습니다" />
            )}
          </Panel>

          <div className="space-y-4">
            <Panel
              title="성과 보고서 (12주 실증 후)"
              sub="지금은 구조만 준비 — 숫자는 실측 후 채웁니다"
              right={
                <button
                  className="btn-outline btn-sm"
                  onClick={() => {
                    downloadText(`NEXMART_성과보고서_${dateKey()}.md`, buildEvidencePack(data, ui));
                    toast({ title: "성과 보고서 초안을 내려받았습니다", tone: "success" });
                  }}
                >
                  <Download size={14} />
                  초안
                </button>
              }
            >
              <ol className="space-y-1.5 text-sm">
                {[
                  "이전 / 기준값",
                  "발생 조건 · 문제",
                  "추천 · 결정",
                  "사람 승인",
                  "실행",
                  "결과",
                  "KPI 변화",
                  "데이터 출처",
                  "담당자 · 시각",
                  "화면 캡처 · 보고서",
                ].map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mist text-[13px] font-bold">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-3 rounded-xl bg-mist p-3 text-xs text-muted">
                기준값 상태:{" "}
                <b className="text-ink">
                  {baselineCount
                    ? `${baselineCount} / 11 입력 (나머지 미측정 / 입력 필요)`
                    : "미측정 / 입력 필요"}
                </b>
                <br />
                목표값: 임의로 정하지 않음
                <br />
                현재 수치: 시연용 시뮬레이션
              </div>
            </Panel>
            <Panel title="12주 실증 계획">
              <ul className="space-y-2 text-sm">
                <li>
                  <b>1~2주</b> · 상품·SKU·공급사 정리, 재고·주문 기준값, 교육, 핵심 행동 이벤트 수집
                </li>
                <li>
                  <b>3~6주</b> · 품절위험·발주 실행 운영, 공급사 비교, 주문·출고 상태관리, 사용률 측정
                </li>
                <li>
                  <b>7~10주</b> · 다시 구매, 프로모션 마진 비교, 배송위험 사전처리, 실행 결과 축적
                </li>
                <li>
                  <b>11~12주</b> · 이전/이후, 비용·매출·확장성 KPI, 사용 정착, 성과 보고서, 고도화/재설계 결정
                </li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                <button
                  onClick={() => setView("pilot")}
                  className="inline-flex items-center gap-1 text-primary"
                >
                  <FlaskConical size={14} />
                  실증 준비 화면 →
                </button>
                <Link href="/ax/why#16" className="text-primary">
                  기획 의도 16 →
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      )}
      <ActionDrawer action={action} onClose={() => setAction(null)} />
    </div>
  );
}

/** 시연 시작 시점 운영 상태 → 지금, 그리고 실행별 같은 지표 재측정. 금액 절감액은 만들지 않는다. */
function OpsOutcome({ onOpen }: { onOpen: (a: AXAction) => void }) {
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const snap = useMemo(() => opsSnapshot(data, ledger, now), [data, ledger, now]);
  const base = data.baseline;
  const rows: {
    k: string;
    b: number | undefined;
    n: number;
    fmt: (v: number) => string;
    good: "down" | "up";
    note: string;
  }[] = [
    {
      k: "품절 위험 SKU",
      b: base?.stockoutRiskSkus,
      n: snap.stockoutRiskSkus,
      fmt: (v) => `${v}개`,
      good: "down",
      note: "결품·긴급·부족 상태 판매중 SKU",
    },
    {
      k: "다음 마감 출고 위험 주문",
      b: base?.lateOrders,
      n: snap.lateOrders,
      fmt: (v) => `${v}건`,
      good: "down",
      note: "출고 시뮬레이션상 마감을 넘기는 주문",
    },
    {
      k: "느린 재고 금액",
      b: base?.slowStockValue,
      n: snap.slowStockValue,
      fmt: money,
      good: "down",
      note: "재고일수 75일 초과 SKU의 재고 원가",
    },
    {
      k: "반품 원인 신호",
      b: base?.returnSignals,
      n: snap.returnSignals,
      fmt: (v) => `${v}건`,
      good: "down",
      note: "통계적으로 유의한 반품 증가",
    },
    {
      k: "재구매 주기 도래 고객",
      b: base?.repeatDueCustomers,
      n: snap.repeatDueCustomers,
      fmt: (v) => `${v.toLocaleString()}명`,
      good: "down",
      note: "아직 다시 주문하지 않은 도래·지남 고객",
    },
    {
      k: "열린 실행",
      b: base?.openActions,
      n: snap.openActions,
      fmt: (v) => `${v}건`,
      good: "down",
      note: "추천~실행중 단계",
    },
  ];
  const acted = data.actions
    .filter((a) => ["in_progress", "requested", "done", "measured"].includes(a.stage))
    .map((a) => ({ a, m: a.measurement ?? measureAction(a, data, ledger, now), live: !a.measurement }))
    .sort((x, y) => (x.a.updatedAt < y.a.updatedAt ? 1 : -1));
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Panel
        title="운영 상태 변화"
        sub={base ? `시연 시작 ${fmtDate(base.at, "datetime")} → 지금` : "기준 시점 없음"}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>지표</th>
                <th className="text-right">시작</th>
                <th className="text-right">지금</th>
                <th className="text-right">변화</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = r.b === undefined ? 0 : r.n - r.b;
                const better = r.good === "down" ? d < 0 : d > 0;
                return (
                  <tr key={r.k}>
                    <td>
                      <span className="font-semibold">{r.k}</span>
                      <span className="block text-[12px] text-muted">{r.note}</span>
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums text-muted">
                      {r.b === undefined ? "-" : r.fmt(r.b)}
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{r.fmt(r.n)}</td>
                    <td
                      className={`whitespace-nowrap text-right font-semibold tabular-nums ${d === 0 ? "text-muted" : better ? "text-teal" : "text-danger"}`}
                    >
                      {r.b === undefined
                        ? "-"
                        : d === 0
                          ? "변화 없음"
                          : `${d > 0 ? "+" : "−"}${r.fmt(Math.abs(d))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <Basis>
            시연 데이터 위에서 실행 전후 운영 상태를 같은 계산식으로 다시 잰 값입니다. 절감액·매출 증가액으로
            환산하지 않습니다 — 금액 효과는 실증 기간 실측값으로만 보고합니다.
          </Basis>
        </div>
      </Panel>
      <Panel title="실행별 성과" sub="실행 전 기준값과 같은 지표로 다시 측정 — 판단 보류도 그대로 표시">
        {acted.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>실행</th>
                  <th>지표</th>
                  <th className="text-right">전 → 후</th>
                  <th>판정</th>
                </tr>
              </thead>
              <tbody>
                {acted.map(({ a, m, live }) => (
                  <tr key={a.id} className="row-clickable" onClick={() => onOpen(a)}>
                    <td className="min-w-[200px]">
                      <span className="font-semibold">{a.title}</span>
                      <span className="block text-[12px] text-muted">
                        {actionTypeLabel(a.type)} ·{" "}
                        {live ? "지금 계산" : `측정 ${fmtDate(m.measuredAt, "md")}`}
                      </span>
                    </td>
                    <td className="text-[13px]">{m.metric}</td>
                    <td className="whitespace-nowrap text-right text-[13px] tabular-nums">
                      {m.before} → <b>{m.after}</b>
                    </td>
                    <td>
                      <VerdictTag v={m.verdict} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="아직 실행된 항목이 없습니다"
            body="실행 센터에서 승인하면 여기서 전후를 잽니다."
          />
        )}
      </Panel>
    </div>
  );
}
