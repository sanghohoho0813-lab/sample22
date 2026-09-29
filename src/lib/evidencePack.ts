import type { DemoData } from "./types";
import type { PilotState, UiState } from "./store";
import { BASELINE_KPIS, ACTION_STAGE_LABEL } from "./store";
import { fmtDate } from "./format";
import { actionTypeLabel } from "./engines";
import { BASELINE_GROUP_LABEL, EVIDENCE_MODE_LABEL, EVIDENCE_TYPE_LABEL, STAGE_LABEL } from "./labels";

/**
 * 성과 보고서(Evidence Pack) — 12주 실증 보고서 초안 (Markdown).
 * 시연 수치는 항상 "시뮬레이션"으로 표시하고, 기준값(Baseline)은 회사가 입력한 값만 사용한다.
 */
export function buildEvidencePack(data: DemoData, ui: Pick<UiState, "stage" | "pilot">): string {
  const pilot: PilotState = ui.pilot;
  const now = new Date();
  const L: string[] = [];
  const push = (s = "") => L.push(s);

  push(`# NEXMART AX 성과 보고서`);
  push(`> 생성 ${fmtDate(now, "datetime")} · 진행 단계 **${STAGE_LABEL[ui.stage]}** · ${ui.stage === "DEMO" ? "모든 수치는 시연용 시뮬레이션" : "기준값은 회사 입력값, 그 외 수치는 실데이터 연결 전까지 시뮬레이션"}`);
  push();
  push(`## 1. 이전 / 기준값`);
  push(`- AX 책임자: ${pilot.owner ? `${pilot.owner}` : "**미지정**"}${pilot.startedAt ? ` · 실증 시작 ${fmtDate(pilot.startedAt)}` : ""}`);
  push();
  push(`| 구분 | KPI | 측정지점 | 기준값 | 측정일 |`);
  push(`|---|---|---|---|---|`);
  for (const k of BASELINE_KPIS) {
    const b = pilot.baselines[k.key];
    push(`| ${BASELINE_GROUP_LABEL[k.group]} | ${k.label} | ${k.point} | ${b?.value !== undefined ? `${b.value} ${k.unit}` : "미측정 / 입력 필요"} | ${b?.measuredAt ?? "-"} |`);
  }
  push();
  push(`기준값 상태: ${Object.values(pilot.baselines).filter((b) => b.value !== undefined).length} / ${BASELINE_KPIS.length} 입력 · 목표값: 임의로 정하지 않음`);
  push();

  push(`## 2. 발생 조건 → 추천 → 승인 → 실행 → 결과`);
  const actions = [...data.actions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  push(`| 실행 | 유형 | 발생 조건 | 근거 | 승인·담당 | 상태 | 결과 |`);
  push(`|---|---|---|---|---|---|---|`);
  for (const a of actions) {
    push(`| ${a.title} | ${actionTypeLabel(a.type)} | ${a.trigger} | ${a.reasons.slice(0, 2).join(" / ")} | ${a.assignee} | ${ACTION_STAGE_LABEL[a.stage]} | ${a.result ?? a.holdReason ?? "-"} |`);
  }
  push();

  push(`## 3. KPI 변화 (성과 기록 기준)`);
  const deltas = data.evidence.filter((e) => e.kpiDelta);
  if (deltas.length) { for (const e of deltas) push(`- ${fmtDate(e.createdAt)} · ${e.title} → **${e.kpiDelta}** (${EVIDENCE_MODE_LABEL[e.mode] ?? e.mode})`); } else push(`- 기록 없음`);
  push();

  push(`## 4. 성과 기록 타임라인 (${data.evidence.length}건)`);
  push(`| 일시 | 유형 | 제목 | 담당 | 출처 | 모드 |`);
  push(`|---|---|---|---|---|---|`);
  for (const e of [...data.evidence].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))) push(`| ${fmtDate(e.createdAt, "datetime")} | ${EVIDENCE_TYPE_LABEL[e.type] ?? e.type} | ${e.title} | ${e.actor} | ${e.dataSource} | ${EVIDENCE_MODE_LABEL[e.mode] ?? e.mode} |`);
  push();

  push(`## 5. 사용 정착`);
  const done = data.actions.filter((a) => a.stage === "done").length;
  push(`- 실행 생성 ${data.actions.length} · 완료 ${done} · 실행률 ${data.actions.length ? Math.round((done / data.actions.length) * 100) : 0}% (시연)`);
  push(`- 주간 활성 사용자 / 핵심 업무 AX 처리비율 / 마이페이지 자체 조회 비율: 실데이터 연결 후 측정`);
  push();
  push(`## 6. 데이터 출처`);
  push(`- 공유 시연 저장소 (localStorage) · 수요신호 · 재고 · 발주서 · 주문·출고 · 고객 플랫폼 행동 이벤트`);
  push(`- 실데이터 연결(Supabase · CSV 가져오기 · 택배 API)은 연결 준비 단계`);
  push();
  push(`---`);
  push(`_시연 성과를 실제 운영 성과처럼 말하지 않습니다. 이 문서는 12주 실증 종료 시 실측값으로 다시 생성합니다._`);
  return L.join("\n");
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
