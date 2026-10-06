"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, Circle, FlaskConical, Download, ClipboardCopy, UserCheck, AlertTriangle } from "lucide-react";
import { BASELINE_KPIS, PILOT_CHECKLIST, ROLE_LABEL, ROLE_PERSON, useStore } from "@/lib/store";
import { useData } from "@/lib/hooks";
import type { RoleKey } from "@/lib/types";
import { buildEvidencePack, downloadText } from "@/lib/evidencePack";
import { Meter } from "@/components/shared/Charts";
import Badge from "@/components/shared/Badge";
import Overlay from "@/components/shared/Overlay";
import { Panel, Stat } from "./Widgets";
import { useToast } from "@/components/shared/Toast";
import { fmtDate } from "@/lib/format";
import { EVIDENCE_TYPE_LABEL, EVIDENCE_MODE_LABEL, STAGE_LABEL, BASELINE_GROUP_LABEL } from "@/lib/labels";

const GROUP_LABEL = { COST: "비용 · 효율", REVENUE: "매출 · 고객", SCALE: "확장성 · 처리능력" } as const;

export default function PilotPanel() {
  const data = useData();
  const ui = useStore((s) => s.ui);
  const setPilot = useStore((s) => s.setPilot);
  const setBaseline = useStore((s) => s.setBaseline);
  const setStage = useStore((s) => s.setStage);
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const pilot = ui.pilot;
  const role = ui.role;
  const canEdit = role === "owner";

  const entered = (g: "COST" | "REVENUE" | "SCALE") => BASELINE_KPIS.filter((k) => k.group === g && pilot.baselines[k.key]?.value !== undefined).length;
  const total = Object.values(pilot.baselines).filter((b) => b.value !== undefined).length;
  const checks = useMemo(() => {
    const auto: Record<string, boolean> = { owner: !!pilot.owner, baseline: entered("COST") > 0 && entered("REVENUE") > 0 && entered("SCALE") > 0 };
    return PILOT_CHECKLIST.map((c) => ({ ...c, done: c.auto ? auto[c.key] : !!pilot.checklist[c.key] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pilot]);
  const doneCount = checks.filter((c) => c.done).length;
  const ready = checks.filter((c) => c.auto).every((c) => c.done);
  const readiness = doneCount / checks.length;

  const exportPack = () => { downloadText(`NEXMART_성과보고서_${new Date().toISOString().slice(0, 10)}.md`, buildEvidencePack(data, ui)); toast({ title: "성과 보고서를 내려받았습니다", body: "문서(.md) · 기준값은 입력값, 나머지는 시뮬레이션 표기", tone: "success" }); };
  const copyPack = async () => { try { await navigator.clipboard.writeText(buildEvidencePack(data, ui)); toast({ title: "클립보드에 복사했습니다", tone: "success" }); } catch { toast({ title: "복사에 실패했습니다", body: "브라우저 권한을 확인하세요.", tone: "warn" }); } };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4"><div className="text-sm text-muted font-semibold">진행 단계</div><div className="mt-1 flex items-center gap-2"><Badge tone={ui.stage === "DEMO" ? "warn" : ui.stage === "PILOT" ? "secondary" : "success"} className="text-sm px-2.5 py-1">{STAGE_LABEL[ui.stage]}</Badge>{pilot.startedAt && <span className="text-xs text-muted">시작 {fmtDate(pilot.startedAt)}</span>}</div></div>
        <div className="card p-4"><div className="text-sm text-muted font-semibold">AX 책임자</div><div className="mt-1 font-bold text-lg truncate">{pilot.owner ?? <span className="text-danger text-base">미지정</span>}</div></div>
        <div className="card p-4"><div className="text-sm text-muted font-semibold">기준값 입력</div><div className="mt-1 font-bold text-lg">{total} <span className="text-sm text-muted font-semibold">/ {BASELINE_KPIS.length}</span></div><div className="text-xs text-muted">비용 {entered("COST")} · 매출 {entered("REVENUE")} · 확장성 {entered("SCALE")}</div></div>
        <div className="card p-4"><div className="text-sm text-muted font-semibold">실증 준비도</div><div className="mt-1 font-bold text-lg">{Math.round(readiness * 100)}%</div><Meter value={readiness} className="mt-1.5" color={ready ? "var(--t-primary)" : "#F47A3C"} /></div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Panel title={<span className="inline-flex items-center gap-2"><UserCheck size={18} className="text-primary" />AX 책임자 지정</span>} sub="책임자가 KPI · 데이터 품질 · 사용교육 · 이슈를 책임집니다. 대표에게만 좋은 시스템은 사용 정착 위험이 높습니다">
            <div className="grid sm:grid-cols-2 gap-2">
              {(Object.keys(ROLE_LABEL) as RoleKey[]).map((r) => { const on = pilot.ownerRole === r; return (
                <button key={r} disabled={!canEdit} onClick={() => setPilot({ owner: ROLE_PERSON[r], ownerRole: r })} className={`text-left rounded-xl border px-3 py-2.5 ${on ? "border-primary bg-soft" : "border-line hover:bg-mist"} disabled:opacity-60`}><div className="font-semibold">{ROLE_PERSON[r]}</div><div className="text-xs text-muted">{r === "buyer" ? "권장 — 재고·발주 KPI와 데이터 품질에 가장 가까움" : r === "owner" ? "겸임 시 실무 데이터 품질 관리가 약해질 수 있음" : r === "ops" ? "주문·출고 KPI 중심 실증에 적합" : "고객 문의·재구매 KPI 중심 실증에 적합"}</div></button>
              ); })}
            </div>
            <input className="input mt-2" placeholder="또는 직접 입력 (이름 · 직책)" value={pilot.ownerRole ? "" : pilot.owner ?? ""} disabled={!canEdit} onChange={(e) => setPilot({ owner: e.target.value || undefined, ownerRole: undefined })} />
            {!canEdit && <p className="text-xs text-muted mt-2">책임자 지정과 기준값 입력은 대표 권한에서만 가능합니다. (현재 {ROLE_LABEL[role]})</p>}
          </Panel>

          <Panel title="기준값 측정지점" sub="숫자를 지어내지 않습니다. 회사가 실측한 값만 입력하고, 비어 있으면 미측정 / 입력 필요로 남깁니다">
            {(["COST", "REVENUE", "SCALE"] as const).map((g) => (
              <div key={g} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-1.5"><div className="text-xs font-bold tracking-wide text-muted">{GROUP_LABEL[g]} KPI</div><span className="text-xs text-muted">{entered(g)} / {BASELINE_KPIS.filter((k) => k.group === g).length} 입력</span></div>
                <div className="table-wrap"><table className="table"><thead><tr><th>KPI</th><th>측정지점</th><th className="text-right w-36">기준값</th><th className="w-36">측정일</th><th>상태</th></tr></thead><tbody>
                  {BASELINE_KPIS.filter((k) => k.group === g).map((k) => { const b = pilot.baselines[k.key]; const has = b?.value !== undefined; return (
                    <tr key={k.key}><td className="font-semibold whitespace-nowrap">{k.label}</td><td className="text-xs text-muted min-w-[220px]">{k.point}</td>
                      <td><div className="flex items-center gap-1 justify-end"><input type="number" inputMode="decimal" min={0} max={k.unit === "%" ? 100 : undefined} step="any" aria-label={`${k.label} 기준값`} className="input !min-h-[40px] text-[15px] text-right w-24" disabled={!canEdit} value={b?.value ?? ""} placeholder="—" onChange={(e) => { const raw = e.target.value; if (raw === "") { setBaseline(k.key, { value: undefined }); return; } const n = Number(raw); if (!Number.isFinite(n)) return; /* 음수·100% 초과는 측정값이 될 수 없으므로 범위 안으로 */ const v = Math.max(0, k.unit === "%" ? Math.min(100, n) : n); setBaseline(k.key, { value: v, measuredAt: b?.measuredAt ?? new Date().toISOString().slice(0, 10) }); }} /><span className="text-xs text-muted whitespace-nowrap">{k.unit}</span></div></td>
                      <td><input type="date" aria-label={`${k.label} 측정일`} max={new Date().toISOString().slice(0, 10)} className="input !min-h-[40px] text-[15px]" disabled={!canEdit} value={b?.measuredAt ?? ""} onChange={(e) => { const d = e.target.value; if (d && d > new Date().toISOString().slice(0, 10)) return; /* 미래 날짜는 측정일이 될 수 없음 */ setBaseline(k.key, { measuredAt: d }); }} /></td>
                      <td>{has ? <Badge tone="success">입력됨</Badge> : <Badge tone="neutral">미측정</Badge>}</td></tr>
                  ); })}
                </tbody></table></div>
              </div>
            ))}
            <p className="text-xs text-muted">시연 화면의 KPI 수치는 기준값이 아닙니다. 기준값은 AX 도입 전 상태를 회사가 직접 측정한 값이어야 이전/이후 비교가 성립합니다.</p>
          </Panel>
        </div>

        <div className="space-y-4 min-w-0">
          <Panel title={<span className="inline-flex items-center gap-2"><FlaskConical size={18} className="text-accent" />실증 전환 체크리스트</span>}>
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.key}>
                  <button disabled={c.auto || !canEdit} onClick={() => setPilot({ checklist: { ...pilot.checklist, [c.key]: !pilot.checklist[c.key] } })} className={`w-full text-left flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${c.auto ? "" : "hover:bg-mist"} disabled:cursor-default`}>
                    {c.done ? <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" /> : <Circle size={18} className="text-line shrink-0 mt-0.5" />}
                    <span className={c.done ? "" : "text-muted"}>{c.label}{c.auto && <span className="ml-1 text-[12px] text-muted">(자동)</span>}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              {ui.stage === "DEMO" ? (
                <button className="btn-primary w-full" disabled={!ready || !canEdit} onClick={() => setConfirm(true)}>실증 단계로 전환</button>
              ) : (
                <button className="btn-outline w-full" disabled={!canEdit} onClick={() => { setStage("DEMO"); toast({ title: "시연 단계로 되돌렸습니다", tone: "info" }); }}>시연 단계로 되돌리기</button>
              )}
              {!ready && ui.stage === "DEMO" && <p className="text-xs text-muted mt-2 inline-flex items-start gap-1"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-orange" />책임자 지정과 비용·매출·확장성 각 1개 이상 기준값이 있어야 전환할 수 있습니다.</p>}
            </div>
          </Panel>

          <Panel title="성과 보고서" sub="12주 실증 보고서 초안 — 기준값 · 실행 → 결과 · KPI 변화 · 타임라인 · 사용 정착">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Stat label="실행" value={data.actions.length} sub={`완료 ${data.actions.filter((a) => a.stage === "done").length}`} />
              <Stat label="성과 기록" value={data.evidence.length} sub={`결과 ${data.evidence.filter((e) => e.type === "RESULT").length}`} />
              <Stat label="KPI 변화" value={data.evidence.filter((e) => e.kpiDelta).length} sub="기록" />
            </div>
            <div className="flex gap-2"><button className="btn-primary flex-1" onClick={exportPack}><Download size={16} />문서 내려받기 (.md)</button><button className="btn-outline" onClick={copyPack} aria-label="복사"><ClipboardCopy size={16} /></button></div>
            <p className="text-xs text-muted mt-2">시연 수치는 문서 안에서 "시뮬레이션"으로 표기됩니다. 실증 종료 시 실측값으로 다시 생성합니다.</p>
          </Panel>
        </div>
      </div>

      <Overlay open={confirm} onClose={() => setConfirm(false)} title="실증 단계로 전환" size="sm" footer={<div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setConfirm(false)}>취소</button><button className="btn-primary flex-1" onClick={() => { setStage("PILOT"); setConfirm(false); toast({ title: "실증 단계로 전환했습니다", body: "기준값 성과 기록이 남았습니다.", tone: "success" }); }}>전환</button></div>}>
        <div className="space-y-2 text-[17px]">
          <p>AX 책임자 <b>{pilot.owner}</b> · 기준값 <b>{total}개</b> 입력 상태로 12주 실증을 시작합니다.</p>
          <p className="text-sm text-muted">진행 단계 표시과 성과 기록만 바뀝니다. 화면의 상품·주문·재고 수치는 실데이터 연결(Supabase · CSV 가져오기, 연결 준비) 전까지 여전히 시연용 시뮬레이션이며, 실증 성과처럼 표시되지 않습니다.</p>
        </div>
      </Overlay>
    </div>
  );
}
