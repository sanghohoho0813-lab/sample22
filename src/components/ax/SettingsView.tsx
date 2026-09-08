"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Palette, Type, Users, Database, Sparkles, FlaskConical, RotateCcw, Smartphone, FileBadge2 } from "lucide-react";
import { ROLE_LABEL, ROLE_PERSON, useStore } from "@/lib/store";
import { THEMES } from "@/lib/themes";
import type { RoleKey } from "@/lib/types";
import { Panel } from "./Widgets";
import { Tabs, Term, TERMS } from "@/components/shared/Bits";
import { StatusBadge } from "@/components/shared/Badge";
import Badge from "@/components/shared/Badge";
import Overlay from "@/components/shared/Overlay";
import { useToast } from "@/components/shared/Toast";
import { DevicePreview } from "./AxShell";
import { useIsInIframe } from "@/lib/hooks";

export default function SettingsView() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<"theme" | "display" | "role" | "data" | "ai" | "tech" | "demo">((sp.get("tab") as never) || "theme");
  const theme = useStore((s) => s.ui.theme);
  const setTheme = useStore((s) => s.setTheme);
  const fontScale = useStore((s) => s.ui.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  const role = useStore((s) => s.ui.role);
  const setRole = useStore((s) => s.setRole);
  const setTutorialDone = useStore((s) => s.setTutorialDone);
  const resetDemo = useStore((s) => s.resetDemo);
  const stage = useStore((s) => s.ui.stage);
  const generatedAt = useStore((s) => s.data.generatedAt);
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inIframe = useIsInIframe();

  return (
    <div className="space-y-4">
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "theme", label: "Theme (9)" }, { key: "display", label: "표시" }, { key: "role", label: "역할·권한" }, { key: "data", label: "데이터·연결" }, { key: "ai", label: "AI 상태" }, { key: "tech", label: "기술·사업화 자산" }, { key: "demo", label: "Demo" }]} />

      {tab === "theme" && (
        <Panel title={<span className="inline-flex items-center gap-2"><Palette size={18} />Canonical 9 Theme</span>} sub="Sidebar·Header·CTA·Active Nav·KPI·Chart·AI Card·Badge·Table·Modal·Drawer·Sheet·Tooltip·Mobile·Preview에 일관 적용됩니다. 본문·표·Form의 Neutral은 Theme와 분리됩니다">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {THEMES.map((t) => { const on = t.key === theme; return (
              <button key={t.key} onClick={() => { setTheme(t.key); toast({ title: `${t.no} ${t.name} 적용`, tone: "info" }); }} aria-pressed={on} className={`text-left rounded-2xl border-2 overflow-hidden transition-all ${on ? "border-primary shadow-raised" : "border-line hover:border-muted"}`}>
                <div className="p-3 flex gap-2" style={{ background: t.shell }}>
                  <div className="w-14 rounded-lg bg-white/10 p-1.5 space-y-1"><div className="h-1.5 rounded bg-white/80 w-3/4" /><div className="h-1.5 rounded w-full" style={{ background: t.primary }} /><div className="h-1.5 rounded bg-white/30 w-2/3" /></div>
                  <div className="flex-1 rounded-lg bg-white p-2 space-y-1.5"><div className="flex gap-1"><div className="h-2 flex-1 rounded" style={{ background: t.soft }} /><div className="h-2 w-6 rounded" style={{ background: t.primary }} /></div><div className="flex gap-1"><div className="h-4 flex-1 rounded" style={{ background: t.soft }} /><div className="h-4 flex-1 rounded" style={{ background: t.highlight }} /></div><div className="h-2 w-1/2 rounded" style={{ background: t.accent }} /></div>
                </div>
                <div className="px-3 py-2 flex items-center justify-between"><div><div className="font-bold text-sm">{t.no} {t.name}</div><div className="flex gap-1 mt-1">{[t.shell, t.primary, t.secondary, t.accent, t.highlight, t.soft].map((c) => <i key={c} className="w-4 h-4 rounded-full border border-line" style={{ background: c }} />)}</div></div>{on && <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><Check size={14} /></span>}</div>
              </button>
            ); })}
          </div>
          <p className="text-xs text-muted mt-3">기본값: 05 Deep Teal. Customer Public 화면에는 Theme Picker를 노출하지 않으며, 관리자 Preview에서는 Customer Surface Token에도 함께 적용됩니다. Error Red는 오류·위험 의미로만 사용합니다.</p>
        </Panel>
      )}

      {tab === "display" && (
        <Panel title={<span className="inline-flex items-center gap-2"><Type size={18} />표시</span>}>
          <div className="space-y-4">
            <div><div className="font-semibold mb-2">글자 크기</div><div className="flex gap-2">{(["normal", "large"] as const).map((f) => <button key={f} onClick={() => setFontScale(f)} aria-pressed={fontScale === f} className={`btn-outline ${fontScale === f ? "border-primary bg-soft text-shell" : ""}`}>{f === "normal" ? "기본" : "크게 (+12%)"}</button>)}</div><p className="text-xs text-muted mt-1">대표·관리자 가독성을 위해 일반 SaaS보다 큰 글자와 넓은 클릭영역을 기본으로 합니다.</p></div>
            <div><div className="font-semibold mb-2">튜토리얼</div><button className="btn-outline" onClick={() => { setTutorialDone(false); toast({ title: "대시보드에서 튜토리얼이 다시 시작됩니다", tone: "info" }); }}>튜토리얼 다시 보기</button></div>
            {!inIframe && <div><div className="font-semibold mb-2">Device Preview</div><div className="flex gap-2 flex-wrap"><button className="btn-outline" onClick={() => setPreview("/ax?embed=1")}><Smartphone size={16} />Business AX 모바일</button><button className="btn-outline" onClick={() => setPreview("/")}><Smartphone size={16} />Customer 모바일</button></div><p className="text-xs text-muted mt-1">실제 반응형 UI를 360/390/430px 폭으로 표시합니다. 가짜 스크린샷이 아닙니다. Esc로 닫습니다.</p></div>}
          </div>
        </Panel>
      )}

      {tab === "role" && (
        <Panel title={<span className="inline-flex items-center gap-2"><Users size={18} />역할·권한 (Demo Role Switch)</span>} sub={<span>실제 운영에서는 Supabase Auth + <Term term="RLS" desc={TERMS.rls}>RLS</Term>로 강제됩니다. Demo에서는 역할 전환 시 메뉴·KPI·테이블·민감정보가 실제로 달라집니다</span>}>
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(ROLE_LABEL) as RoleKey[]).map((r) => { const on = r === role; const desc: Record<RoleKey, string[]> = { owner: ["전체 매출·추정 마진·재고금액", "품절·과잉·공급사·배송 위험", "전체 Action · Evidence", "설정·권한"], buyer: ["담당 상품·SKU · 현재고 · 판매속도", "공급사 · 발주추천 · 입고예정 · 원가", "담당 Action", "제한: 전체 자금·손익·사용자 권한"], ops: ["신규주문 · 피킹 · 포장 · 출고 · 배송위험", "재고이동 · 오늘의 운영 Action", "제한: 원가·마진·고객 연락처"], cs: ["고객 주문 · 배송상태 · 취소·반품·교환", "문의 · 고객알림", "제한: 원가·마진·발주"] }; return (
              <button key={r} onClick={() => { setRole(r); toast({ title: `${ROLE_PERSON[r]} 화면`, tone: "info" }); }} aria-pressed={on} className={`text-left rounded-2xl border-2 p-4 ${on ? "border-primary bg-soft" : "border-line hover:bg-mist"}`}><div className="flex items-center justify-between"><b>{ROLE_PERSON[r]}</b>{on && <Badge tone="primary">현재</Badge>}</div><ul className="mt-2 text-sm text-muted space-y-0.5">{desc[r].map((d) => <li key={d}>· {d}</li>)}</ul></button>
            ); })}
          </div>
          <div className="mt-4 rounded-xl bg-mist p-3 text-sm"><b>고객</b>은 공개 상품·본인 장바구니·주문·배송·Repeat Basket·문의만 접근하며 Business AX에 들어올 수 없습니다. 일반 고객에게 관리자 전환을 보여주지 않습니다.</div>
        </Panel>
      )}

      {tab === "data" && (
        <Panel title={<span className="inline-flex items-center gap-2"><Database size={18} />데이터 · 연결 상태</span>} sub={<span>Customer와 AX가 동일한 Store를 사용합니다 (<Term term="SSOT" desc={TERMS.ssot}>SSOT</Term>). 향후 Supabase·CSV·외부 API로 전환 가능한 Adapter Layer가 있습니다</span>}>
          <div className="table-wrap"><table className="table"><thead><tr><th>항목</th><th>상태</th><th>설명</th></tr></thead><tbody>
            {[["Shared Demo Repository", "LIVE", "브라우저 localStorage 기반 · 고객·AX 동일 데이터"], ["Data Freshness", "LIVE", `Demo 생성 ${generatedAt.slice(0, 16).replace("T", " ")} · 실시간 시각 표시`], ["Event Tracking (19 events)", "READY", "Adapter 구조 · GA4/PostHog/Supabase로 교체 가능"], ["Supabase (DB · Auth · RLS)", "READY", "Entity 스키마 정의됨 · 연결 시 Adapter 교체"], ["CSV Import (상품·재고·주문)", "READY", "Data Intake Ready · 템플릿 정의"], ["실제 결제 (PG)", "READY", "DEMO Checkout → PG 연동 지점 분리"], ["택배사 API", "READY", "Shipment · DeliveryEvent Entity 준비"], ["외부 쇼핑채널", "READY", "채널별 주문 Adapter"], ["정기배송", "NEXT", "Repeat Basket 이후 확장"], ["B2B 대량구매 · 공급사 Portal · 다창고", "NEXT", "실증 후"]].map(([k, s, d]) => <tr key={k}><td className="font-semibold">{k}</td><td><StatusBadge status={s} /></td><td className="text-muted text-sm">{d}</td></tr>)}
          </tbody></table></div>
          <div className="mt-3 text-sm"><b>Delivery Stage:</b> <Badge tone="warn">{stage}</Badge> <span className="text-muted">— 시연 데이터. Pilot은 실제 데이터 일부 + 현장 실증, Production은 실제 업무·고객 사용.</span></div>
        </Panel>
      )}

      {tab === "ai" && (
        <Panel title={<span className="inline-flex items-center gap-2"><Sparkles size={18} />AI 적용 상태</span>} sub="AI 기능 개수를 목표로 하지 않습니다. 규칙이면 충분한 것은 규칙으로, 근거 없는 추천은 없습니다">
          <div className="table-wrap"><table className="table"><thead><tr><th>Engine</th><th>Method</th><th>Level</th><th>상태</th><th>설명</th></tr></thead><tbody>
            {[["Demand & Purchase Recommendation", "RULE + STATISTICAL + OPTIMIZATION", "L3", "LIVE", "규칙 기반 계산 동작 중"], ["Supplier Decision", "RULE + OPTIMIZATION", "L2/L3", "LIVE", "가중 점수 · 상황별 가중치"], ["Fulfillment Risk", "RULE + STATISTICAL", "L2", "LIVE", "마감·약속·적체·재고예외 점수"], ["Repeat Purchase Opportunity", "RULE + STATISTICAL", "L2", "LIVE", "구매주기 평균"], ["Executive Briefing 자연어 설명", "Structured Rule + LLM", "L1", "READY", "API 키 연결 시 이 기능 1개부터 실제 연결"]].map(([k, m, l, s, d]) => <tr key={k}><td className="font-semibold">{k}</td><td className="text-xs">{m}</td><td>{l}</td><td><StatusBadge status={s} /></td><td className="text-muted text-sm">{d}</td></tr>)}
          </tbody></table></div>
          <div className="mt-3 rounded-xl border border-dashed border-secondary/60 bg-secondary/8 p-3 text-sm"><b className="text-secondary">AI READY</b> · 현재: 규칙 기반 Demo. 향후: LLM이 여러 지표와 Action을 자연어로 설명 가능. 자동발주 L4는 구현하지 않습니다.</div>
        </Panel>
      )}

      {tab === "tech" && (
        <Panel title={<span className="inline-flex items-center gap-2"><FileBadge2 size={18} />기술·사업화 자산</span>} sub="구축 후 회사에 남는 자산 — 기술스택 자체는 자산이 아닙니다">
          <div className="grid sm:grid-cols-2 gap-3">
            {[["Data Asset", "SKU별 수요신호 · 공급사 실제 납기 · 고객 구매주기 · 반품 원인", "12개월 축적 시 예측·안전재고·실질마진 판단 가능"], ["Workflow Asset", "KPI → Detail → Insight → Action → Result → Evidence 표준 흐름", "담당자가 바뀌어도 판단기준이 남음"], ["AI / Logic Asset", "Demand·Supplier·Fulfillment·Repeat 4개 엔진의 규칙과 가중치", "실측으로 가중치 보정"], ["Software Asset", "Customer Platform + Business AX + Shared Data Bridge", "Adapter로 실데이터 전환"], ["IP Asset (미출원)", "수요신호 기반 발주 우선순위 산정 방식 · 재구매 주기 기반 Repeat Basket 구성", "실증 후 출원 여부 검토 — 보장 표현 금지"], ["Network Asset", "계약 공급사 11 · 반복구매 고객", "공급사 Portal은 NEXT"]].map(([t, a, b]) => <div key={t} className="card p-4"><div className="font-bold">{t}</div><div className="text-sm mt-1">{a}</div><div className="text-xs text-muted mt-1">{b}</div></div>)}
          </div>
          <p className="text-xs text-muted mt-3">정책자금·보증·투자와의 연결은 실제 사업가치와 실증구조 이후 Growth Story에서만 다룹니다. "보장" 표현은 사용하지 않습니다.</p>
        </Panel>
      )}

      {tab === "demo" && (
        <Panel title={<span className="inline-flex items-center gap-2"><FlaskConical size={18} />Demo 제어</span>}>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-mist p-3"><b>시나리오</b> · A 물티슈 수요급증·품절위험 · B 주방세제 공급사 납기지연 · C 미니가습기 저회전·마진주의 · D C구역 Fulfillment 지연위험 · E 재구매 기회 (김서연)</div>
            <button className="btn-danger" onClick={() => setResetOpen(true)}><RotateCcw size={16} />Demo Reset — 초기 시나리오로</button>
            <p className="text-xs text-muted">주문·Action·Evidence·장바구니·알림이 초기화됩니다. Theme·글자크기·튜토리얼 완료 여부는 유지됩니다.</p>
          </div>
        </Panel>
      )}

      <Overlay open={resetOpen} onClose={() => setResetOpen(false)} title="Demo Reset" size="sm" footer={<div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setResetOpen(false)}>취소</button><button className="btn-danger flex-1" onClick={() => { resetDemo(); setResetOpen(false); toast({ title: "초기화 완료", tone: "info" }); }}>초기화</button></div>}><p>모든 시연 상태를 초기 시나리오로 되돌립니다.</p></Overlay>
      {preview && <DevicePreview src={preview} title="스마트폰 미리보기" onClose={() => setPreview(null)} />}
    </div>
  );
}
