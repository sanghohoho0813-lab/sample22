"use client";
import Link from "next/link";
import { ArrowRight, ExternalLink, Rocket } from "lucide-react";
import type { OpsException } from "@/lib/control";
import { EXCEPTION_LABEL } from "@/lib/control";
import { ACTION_STAGE_LABEL, ROLE_LABEL, useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import Overlay from "@/components/shared/Overlay";
import { useToast } from "@/components/shared/Toast";
import { Basis, Impact, LifecycleStepper, SeverityTag } from "./OpsUi";

/** 예외 하나: 근거 → 영향 → 상세 → 실행 */
export default function ExceptionDrawer({
  ex,
  onClose,
  onOpenAction,
}: {
  ex: OpsException | null;
  onClose: () => void;
  onOpenAction: (actionId: string) => void;
}) {
  const create = useStore((s) => s.createActionFromException);
  const role = useStore((s) => s.ui.role);
  const actions = useStore((s) => s.data.actions);
  const toast = useToast();
  if (!ex) return null;
  const linked = ex.action ? actions.find((a) => a.id === ex.action!.id) : undefined;
  const canCreate = role === "owner" || role === ex.owner;

  return (
    <Overlay
      open={!!ex}
      onClose={onClose}
      variant="drawer"
      size="md"
      title={ex.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <SeverityTag s={ex.severity} />
          <span className="text-[14px] font-semibold">{EXCEPTION_LABEL[ex.kind]}</span>
          <span className="text-[14px]">· 담당 {ROLE_LABEL[ex.owner]}</span>
          {ex.dueAt && <span className="text-[14px]">· 판단 기한 {fmtDate(ex.dueAt, "datetime")}</span>}
        </span>
      }
      footer={
        <div className="flex flex-wrap gap-2">
          {linked ? (
            <button className="btn-primary" onClick={() => onOpenAction(linked.id)}>
              <Rocket size={16} />
              연결된 실행 열기 · {ACTION_STAGE_LABEL[linked.stage]}
            </button>
          ) : ex.actionType ? (
            <button
              className="btn-primary"
              disabled={!canCreate}
              onClick={() => {
                const id = create(ex);
                if (id) {
                  toast({
                    title: "실행을 만들었습니다",
                    body: "근거·영향 대상·기준값이 함께 저장됐습니다.",
                    tone: "success",
                  });
                  onOpenAction(id);
                } else
                  toast({
                    title: "실행을 만들 수 없습니다",
                    body: "대상 데이터가 바뀌었는지 확인하세요.",
                    tone: "info",
                  });
              }}
            >
              <Rocket size={16} />
              실행 만들기
            </button>
          ) : null}
          <Link href={ex.href} className="btn-outline">
            상세 화면 <ExternalLink size={15} />
          </Link>
          {!canCreate && !linked && ex.actionType && (
            <span className="w-full text-xs text-muted">
              {ROLE_LABEL[ex.owner]} 권한에서 실행을 만듭니다.
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <ol
          className="grid grid-cols-4 gap-1 text-center text-[12px] font-semibold text-muted"
          aria-label="판단 흐름"
        >
          {["근거", "영향", "상세", "실행"].map((s, i) => (
            <li key={s} className="flex items-center justify-center gap-1 rounded-lg bg-mist py-1.5">
              <span className="text-ink">{i + 1}</span> {s}
              {i < 3 && <ArrowRight size={12} className="hidden sm:inline" />}
            </li>
          ))}
        </ol>

        <section>
          <h3 className="mb-2 text-sm font-bold">1. 근거 — 판단에 쓴 데이터</h3>
          <ul className="space-y-1.5">
            {ex.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-[15px]">
                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {e}
              </li>
            ))}
          </ul>
          {ex.subject && <p className="mt-2 text-sm text-muted">{ex.subject}</p>}
        </section>

        <section className="rounded-xl border border-line p-3">
          <h3 className="text-sm font-bold">2. 영향 — 아무것도 하지 않으면</h3>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="text-[15px] text-muted">{ex.impact.label}</span>
            <span className="text-[24px]">
              <Impact value={ex.impact.value} unit={ex.impact.unit} />
            </span>
          </div>
          <div className="mt-1">
            <Basis>계산식: {ex.impact.basis}. 노출 규모의 추정이며 성과·절감액으로 쓰지 않습니다.</Basis>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">3. 상세</h3>
          <Link
            href={ex.href}
            className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 hover:bg-mist"
          >
            <span className="text-[15px]">담당 화면에서 대상 데이터 전체 보기</span>
            <ArrowRight size={16} className="text-muted" />
          </Link>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">4. 실행</h3>
          {linked ? (
            <div className="space-y-2 rounded-xl border border-line p-3">
              <div className="text-[15px] font-semibold">{linked.title}</div>
              <LifecycleStepper stage={linked.stage} compact />
              <div className="text-sm text-muted">
                현재 {ACTION_STAGE_LABEL[linked.stage]} · 담당 {linked.assignee}
              </div>
            </div>
          ) : ex.actionType ? (
            <p className="text-[15px] text-muted">
              아직 실행이 없습니다. ‘실행 만들기’를 누르면 근거·영향 대상·실행 전 기준값이 담긴 실행이 추천됨
              단계로 생깁니다.
            </p>
          ) : (
            <p className="text-[15px] text-muted">
              정책 검토 항목입니다 — 상세 화면에서 가격·배송 기준을 확인하세요.
            </p>
          )}
        </section>
      </div>
    </Overlay>
  );
}
