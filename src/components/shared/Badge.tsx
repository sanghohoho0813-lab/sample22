import type { ReactNode } from "react";

export type Tone = "neutral" | "primary" | "secondary" | "accent" | "danger" | "warn" | "success" | "shell" | "soft";

const toneClass: Record<Tone, string> = {
  neutral: "bg-mist text-muted",
  primary: "bg-primary/12 text-primary",
  secondary: "bg-secondary/12 text-secondary",
  accent: "bg-accent/15 text-accent",
  danger: "bg-danger/10 text-danger",
  warn: "bg-orange/15 text-[#B84F1A]",
  success: "bg-teal/12 text-[#0B7D6E]",
  shell: "bg-shell text-white",
  soft: "bg-soft text-shell",
};

export default function Badge({ tone = "neutral", children, className = "", dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={`badge ${toneClass[tone]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function DemoBadge({ label = "DEMO", className = "" }: { label?: string; className?: string }) {
  return <span className={`badge bg-orange/15 text-[#B84F1A] tracking-wide ${className}`}>{label}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, Tone]> = {
    normal: ["정상", "success"], rising: ["관심상승", "secondary"], low: ["품절임박", "warn"], stockout: ["품절", "danger"], urgent: ["긴급발주", "danger"],
    po_review: ["발주검토", "warn"], po_progress: ["발주진행", "primary"], inbound: ["입고예정", "primary"], overstock: ["과잉", "warn"], slow: ["저회전", "neutral"],
    critical: ["긴급", "danger"], high: ["높음", "warn"], mid: ["보통", "secondary"], low_u: ["낮음", "neutral"],
    recommended: ["추천됨", "accent"], reviewing: ["검토중", "secondary"], approved: ["승인", "primary"], requested: ["발주요청", "primary"], in_progress: ["실행중", "primary"], done: ["완료", "success"], dismissed: ["보류해제", "neutral"], held: ["보류", "neutral"],
    new: ["신규주문", "accent"], confirmed: ["주문확인", "secondary"], picking_wait: ["피킹대기", "warn"], picking: ["피킹중", "primary"], packing_wait: ["포장대기", "primary"], ship_wait: ["출고대기", "primary"], shipped: ["출고완료", "success"], in_transit: ["배송중", "success"], delivered: ["배송완료", "neutral"], cancelled: ["취소", "neutral"], return: ["반품·교환", "danger"],
    draft: ["초안", "neutral"], received: ["입고완료", "success"], LIVE: ["LIVE", "success"], DEMO: ["DEMO", "warn"], READY: ["READY", "primary"], NEXT: ["NEXT", "neutral"], PILOT: ["PILOT", "secondary"],
    active: ["계약중", "success"], review: ["검토중", "warn"], paused: ["중지", "neutral"],
    running: ["진행중", "success"], planned: ["예정", "secondary"], ended: ["종료", "neutral"],
  };
  const [label, tone] = map[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}
