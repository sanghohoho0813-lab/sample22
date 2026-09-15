import type { DemoData } from "./types";
import type { PilotState, UiState } from "./store";
import { BASELINE_KPIS, ACTION_STAGE_LABEL } from "./store";
import { fmtDate } from "./format";

/**
 * Evidence Pack — 12주 실증 보고서 초안 (Markdown).
 * Demo 수치는 항상 "Simulation"으로 표시하고, Baseline은 회사가 입력한 값만 사용한다.
 */
export function buildEvidencePack(data: DemoData, ui: Pick<UiState, "stage" | "pilot">): string {
  const pilot: PilotState = ui.pilot;
  const now = new Date();
  const L: string[] = [];
  const push = (s = "") => L.push(s);

  push(`# NEXMART AX Evidence Pack`);
  push(`> 생성 ${fmtDate(now, "datetime")} · Delivery Stage **${ui.stage}** · ${ui.stage === "DEMO" ? "모든 수치는 Demo Simulation" : "Baseline은 회사 입력값, 그 외 수치는 실데이터 연결 전까지 Simulation"}`);
  push();
  push(`## 1. Before / Baseline`);
  push(`- AX Owner: ${pilot.owner ? `${pilot.owner}` : "**미지정**"}${pilot.startedAt ? ` · 실증 시작 ${fmtDate(pilot.startedAt)}` : ""}`);
  push();
  push(`| 구분 | KPI | 측정지점 | Baseline | 측정일 |`);
  push(`|---|---|---|---|---|`);
  for (const k of BASELINE_KPIS) {
    const b = pilot.baselines[k.key];
    push(`| ${k.group} | ${k.label} | ${k.point} | ${b?.value !== undefined ? `${b.value} ${k.unit}` : "UNKNOWN / REQUIRED"} | ${b?.measuredAt ?? "-"} |`);
  }
  push();
  push(`BASELINE STATUS: ${Object.values(pilot.baselines).filter((b) => b.value !== undefined).length} / ${BASELINE_KPIS.length} 입력 · TARGET: DO NOT INVENT`);
  push();

  push(`## 2. Trigger → Recommendation → Approval → Action → Result`);
  const actions = [...data.actions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  push(`| Action | 유형 | Trigger | 근거 | 승인·담당 | 상태 | 결과 |`);
  push(`|---|---|---|---|---|---|---|`);
  for (const a of actions) {
    push(`| ${a.title} | ${a.type} | ${a.trigger} | ${a.reasons.slice(0, 2).join(" / ")} | ${a.assignee} | ${ACTION_STAGE_LABEL[a.stage]} | ${a.result ?? a.holdReason ?? "-"} |`);
  }
  push();

  push(`## 3. KPI Delta (Evidence 기록 기준)`);
  const deltas = data.evidence.filter((e) => e.kpiDelta);
  if (deltas.length) { for (const e of deltas) push(`- ${fmtDate(e.createdAt)} · ${e.title} → **${e.kpiDelta}** (${e.mode})`); } else push(`- 기록 없음`);
  push();

  push(`## 4. Evidence Timeline (${data.evidence.length}건)`);
  push(`| 일시 | Type | 제목 | 담당 | 출처 | 모드 |`);
  push(`|---|---|---|---|---|---|`);
  for (const e of [...data.evidence].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))) push(`| ${fmtDate(e.createdAt, "datetime")} | ${e.type} | ${e.title} | ${e.actor} | ${e.dataSource} | ${e.mode} |`);
  push();

  push(`## 5. Adoption`);
  const done = data.actions.filter((a) => a.stage === "done").length;
  push(`- Action 생성 ${data.actions.length} · 완료 ${done} · 실행률 ${data.actions.length ? Math.round((done / data.actions.length) * 100) : 0}% (Demo)`);
  push(`- Weekly Active User / 핵심 업무 AX 처리비율 / Portal Self-Service 비율: 실데이터 연결 후 측정`);
  push();
  push(`## 6. Data Source / Provenance`);
  push(`- Shared Demo Repository (localStorage) · Demand Signal · Inventory · Purchase Orders · Fulfillment · Customer Platform Events`);
  push(`- 실데이터 연결(Supabase · CSV Import · 택배 API)은 READY 단계`);
  push();
  push(`---`);
  push(`_Demo 성과를 Live 성과처럼 말하지 않습니다. 이 문서는 12주 실증 종료 시 실측값으로 다시 생성합니다._`);
  return L.join("\n");
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
