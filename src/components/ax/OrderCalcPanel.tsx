"use client";
import { useId, useMemo } from "react";
import type { SkuInsight } from "@/lib/engines";
import { projectStock, REVIEW_DAYS, ORDER_PACK } from "@/lib/engines";
import { useMinute } from "@/lib/hooks";
import { Basis } from "./OpsUi";

const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("ko-KR");
const n0 = (n: number) => Math.round(n).toLocaleString("ko-KR");

/** 추천 발주량의 계산 과정 + 발주 여부에 따른 21일 재고 투영 */
export default function OrderCalcPanel({ ins }: { ins: SkuInsight }) {
  const now = useMinute();
  const c = ins.calc;
  const without = useMemo(() => projectStock(ins, now, 21, 0), [ins, now]);
  const withOrder = useMemo(
    () => projectStock(ins, now, 21, c.recommendedQty, c.leadTimeDays),
    [ins, now, c],
  );
  const firstOut = without.find((p) => p.day > 0 && p.available <= 0)?.day;
  const rows: { k: string; v: string; note?: string; strong?: boolean; sign?: string }[] = [
    { k: "최근 7일 일평균 판매", v: `${f1(c.avgDaily)}개/일` },
    {
      k: "수요 추세 반영",
      sign: "×",
      v: f1(c.trendFactor),
      note: "주문 증가율의 절반만 반영 (과잉발주 방지)",
    },
    { k: "예측 일판매", sign: "=", v: `${f1(c.forecastDaily)}개/일` },
    {
      k: "버틸 기간",
      sign: "×",
      v: `${c.coverDays}일`,
      note: `공급 리드타임 ${c.leadTimeDays}일 + 검토주기 ${REVIEW_DAYS}일`,
    },
    { k: "필요 수량", sign: "=", v: `${n0(c.grossNeed)}개` },
    {
      k: "가용재고",
      sign: "−",
      v: `${n0(c.available)}개`,
      note: `보유 ${n0(ins.inv.onHand)} − 미출고 주문 예약 ${n0(ins.inv.reserved)}`,
    },
    { k: "기간 내 입고예정", sign: "−", v: `${n0(c.inbound)}개` },
    { k: "순 필요 수량", sign: "=", v: `${n0(Math.max(0, c.netNeed))}개` },
    {
      k: "추천 발주량",
      sign: "→",
      v: c.recommendedQty ? `${n0(c.recommendedQty)}개` : "발주 불필요",
      note: `${ORDER_PACK}개 단위 올림 · 최소주문수량 ${c.moq}개`,
      strong: true,
    },
  ];
  return (
    <section className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="mb-2 text-sm font-bold">왜 이 수량인가</h3>
          <table className="w-full text-[14px]">
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} className={`border-b border-line/60 ${r.strong ? "bg-soft" : ""}`}>
                  <td className="w-6 py-1.5 text-center font-bold text-muted">{r.sign ?? ""}</td>
                  <td className="py-1.5 pr-2">
                    <span className={r.strong ? "font-bold" : ""}>{r.k}</span>
                    {r.note && <span className="block text-[12px] text-muted">{r.note}</span>}
                  </td>
                  <td
                    className={`whitespace-nowrap py-1.5 pr-2 text-right tabular-nums ${r.strong ? "text-[16px] font-bold" : "font-semibold"}`}
                  >
                    {r.v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">앞으로 21일 가용재고</h3>
          <ProjectionChart
            without={without}
            withOrder={c.recommendedQty ? withOrder : null}
            lead={c.leadTimeDays}
          />
          <ul className="mt-2 space-y-1 text-[13px]">
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-5 bg-danger" /> 발주하지 않으면{" "}
              {firstOut ? <b className="text-danger">{firstOut}일째 소진</b> : "21일 안에 소진 없음"}
            </li>
            {c.recommendedQty > 0 && (
              <li className="flex items-center gap-2">
                <span className="h-0.5 w-5 bg-primary" /> 지금 {n0(c.recommendedQty)}개 발주 시{" "}
                {c.leadTimeDays}일째 입고
                {c.gapDays > 0 && <b className="text-orange"> — 그 전 {f1(c.gapDays)}일 공백</b>}
              </li>
            )}
          </ul>
        </div>
      </div>
      <Basis>
        결품 공백 {f1(c.gapDays)}일 × 예측 일판매 {f1(c.forecastDaily)}개 = 놓치는 판매 약 {n0(c.lostUnits)}개
        (추정). 입고 예정분이 먼저 들어오면 공백에서 뺍니다.
      </Basis>
    </section>
  );
}

function ProjectionChart({
  without,
  withOrder,
  lead,
}: {
  without: { day: number; available: number }[];
  withOrder: { day: number; available: number }[] | null;
  lead: number;
}) {
  const id = useId();
  const W = 360;
  const H = 150;
  const pad = { l: 34, r: 8, t: 10, b: 20 };
  const all = [...without, ...(withOrder ?? [])].map((p) => p.available);
  const max = Math.max(10, ...all);
  const min = Math.min(0, ...all);
  const x = (d: number) => pad.l + ((W - pad.l - pad.r) * d) / 21;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min || 1));
  const path = (pts: { day: number; available: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.available).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t`}>
      <title id={`${id}-t`}>발주 여부에 따른 21일 가용재고 예상</title>
      {/* 0선 아래 = 결품 */}
      <rect
        x={pad.l}
        y={y(0)}
        width={W - pad.l - pad.r}
        height={Math.max(0, H - pad.b - y(0))}
        fill="rgb(191 51 51 / 0.06)"
      />
      <line
        x1={pad.l}
        x2={W - pad.r}
        y1={y(0)}
        y2={y(0)}
        stroke="#BF3333"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {[0, Math.round(max / 2), Math.round(max)].map((v) => (
        <text key={v} x={pad.l - 4} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#5A6470">
          {v}
        </text>
      ))}
      {[0, 7, 14, 21].map((d) => (
        <text key={d} x={x(d)} y={H - 4} textAnchor="middle" fontSize="10" fill="#5A6470">
          {d === 0 ? "오늘" : `+${d}일`}
        </text>
      ))}
      <line
        x1={x(lead)}
        x2={x(lead)}
        y1={pad.t}
        y2={H - pad.b}
        stroke="rgb(var(--t-primary-ink-rgb))"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <text x={x(lead) + 3} y={pad.t + 9} fontSize="10" fill="rgb(var(--t-primary-ink-rgb))">
        리드타임
      </text>
      <path d={path(without)} fill="none" stroke="#BF3333" strokeWidth={2} />
      {withOrder && (
        <path d={path(withOrder)} fill="none" stroke="rgb(var(--t-primary-rgb))" strokeWidth={2.5} />
      )}
    </svg>
  );
}
