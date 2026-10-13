"use client";
import { useMemo } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { CHANNEL_LABEL, CHANNELS, COST_MODEL_FIELDS, DEFAULT_COST_MODEL, type CostModel } from "@/lib/costs";
import { marginReport } from "@/lib/margin";
import { useCustomerName, useData, useLedger, useMargin, useMinute } from "@/lib/hooks";
import { useToast } from "@/components/shared/Toast";
import { Panel } from "./Widgets";
import { Basis, money, pctText } from "./OpsUi";

/**
 * 공헌이익 계산에 쓰는 변동비 기준. 회사마다 택배 계약·채널 수수료가 다르므로 운영자가 직접 맞춘다.
 * 바꾸는 즉시 매출·이익, 컨트롤 타워의 저마진 판단이 같은 기준으로 다시 계산된다.
 */
export default function CostModelPanel() {
  const model = useStore((s) => s.ui.costModel) ?? DEFAULT_COST_MODEL;
  const set = useStore((s) => s.setCostModel);
  const role = useStore((s) => s.ui.role);
  const toast = useToast();
  const data = useData();
  const ledger = useLedger();
  const now = useMinute();
  const name = useCustomerName();
  const cur = useMargin(30).total;
  const def = useMemo(
    () => marginReport(data, ledger, now, { days: 30, model: DEFAULT_COST_MODEL, customerName: name }).total,
    [data, ledger, now, name],
  );
  const changed = JSON.stringify(model) !== JSON.stringify(DEFAULT_COST_MODEL);
  const canEdit = role === "owner" || role === "buyer";
  const num = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^0-9.]/g, "")) || 0));

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <Calculator size={18} />
          비용 기준
        </span>
      }
      sub="공헌이익 = 순매출 + 고객 배송비 − 상품원가 − 운임 − 포장 − 채널 수수료 − 반품 손실. 회사 계약 조건으로 맞추면 모든 이익 판단이 같은 기준으로 다시 계산됩니다."
      right={
        changed && canEdit ? (
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              set(DEFAULT_COST_MODEL);
              toast({ title: "기본값으로 되돌렸습니다", tone: "info" });
            }}
          >
            <RotateCcw size={14} /> 기본값
          </button>
        ) : null
      }
    >
      <div id="cost-model" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="space-y-5">
          <fieldset disabled={!canEdit}>
            <legend className="mb-2 text-sm font-bold">물류·배송</legend>
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {COST_MODEL_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[13px] text-muted">{f.label}</span>
                  <span className="relative mt-1 block">
                    <input
                      className="input !min-h-[40px] pr-9 text-right tabular-nums"
                      inputMode="numeric"
                      value={model[f.key].toLocaleString("ko-KR")}
                      onChange={(e) => set({ [f.key]: num(e.target.value) } as Partial<CostModel>)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">
                      {f.unit}
                    </span>
                  </span>
                  {model[f.key] !== DEFAULT_COST_MODEL[f.key] && (
                    <span className="mt-0.5 block text-[12px] text-muted">
                      기본 {DEFAULT_COST_MODEL[f.key].toLocaleString()}원
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={!canEdit}>
            <legend className="mb-2 text-sm font-bold">채널 수수료</legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {CHANNELS.map((c) => (
                <label key={c} className="block">
                  <span className="text-[13px] text-muted">{CHANNEL_LABEL[c]}</span>
                  <span className="relative mt-1 block">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={50}
                      className="input !min-h-[40px] pr-8 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={Math.round(model.feeRate[c] * 1000) / 10}
                      onChange={(e) => {
                        const v = Math.min(50, Math.max(0, Number(e.target.value) || 0));
                        set({ feeRate: { ...model.feeRate, [c]: v / 100 } });
                      }}
                      aria-label={`${CHANNEL_LABEL[c]} 수수료율 (%)`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">
                      %
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {!canEdit && (
            <p className="text-[13px] text-muted">비용 기준은 대표·구매 담당만 바꿀 수 있습니다.</p>
          )}
        </div>

        <div className="rounded-xl border border-line p-4">
          <h3 className="text-sm font-bold">이 기준으로 본 최근 30일</h3>
          <dl className="mt-3 space-y-2 text-[14px]">
            {[
              ["순매출", money(cur.revenue), null],
              ["순운임", money(cur.shipping), cur.shipping - def.shipping],
              ["포장", money(cur.packaging), cur.packaging - def.packaging],
              ["채널 수수료", money(cur.channelFee), cur.channelFee - def.channelFee],
              ["반품 손실", money(cur.returnLoss), cur.returnLoss - def.returnLoss],
            ].map(([k, v, d]) => (
              <div key={k as string} className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">{k}</dt>
                <dd className="tabular-nums">
                  {v}
                  {typeof d === "number" && Math.abs(d) >= 1 && (
                    <span className="ml-1.5 text-[12px] text-muted">
                      ({d > 0 ? "+" : "−"}
                      {money(Math.abs(d))})
                    </span>
                  )}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-2 border-t border-line pt-2">
              <dt className="font-bold">공헌이익</dt>
              <dd className="text-[18px] font-black tabular-nums">
                {money(cur.contribution)}{" "}
                <span className="text-[13px] font-semibold text-muted">{pctText(cur.marginRate)}</span>
              </dd>
            </div>
            {changed && (
              <p className="text-[13px] text-muted">
                기본 기준 대비 {cur.contribution >= def.contribution ? "+" : "−"}
                {money(Math.abs(cur.contribution - def.contribution))}
              </p>
            )}
          </dl>
          <div className="mt-3">
            <Basis>
              고객 배송비·무료배송 기준은 이미 받은 주문에 소급하지 않고 이후 새 주문부터 적용합니다.
              운임·포장·수수료·반품 운임은 과거 주문까지 다시 계산합니다.
            </Basis>
          </div>
        </div>
      </div>
    </Panel>
  );
}
