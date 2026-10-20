/**
 * 빈 상태 일러스트 — 고객 화면 전용. 테마 색(--t-*)만 써서 9개 테마 어디서나 어울리게 한다.
 * 운영(AX) 화면은 업무 도구답게 아이콘만 쓴다.
 */
export type EmptyArtKind = "cart" | "search" | "heart" | "box" | "bell";

const P = "rgb(var(--t-primary-rgb))";
const S = "rgb(var(--t-soft-rgb))";
const A = "rgb(var(--t-accent-rgb))";

function Spark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -6 L1.6 -1.6 6 0 1.6 1.6 0 6 -1.6 1.6 -6 0 -1.6 -1.6z"
      fill={A}
      opacity="0.8"
    />
  );
}

export default function EmptyArt({
  kind,
  className = "h-20 w-28",
}: {
  kind: EmptyArtKind;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 112 80" className={`mx-auto ${className}`} aria-hidden="true">
      <ellipse cx="56" cy="72" rx="32" ry="4.5" fill="#1B2733" opacity="0.08" />
      {kind === "cart" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 18 h9 l8 34 h36 l7 -24 H34" fill="none" stroke={P} strokeWidth="3" />
          <path d="M36 28 h44 l-6 20 H41z" fill={S} />
          <circle cx="44" cy="62" r="4.5" fill={P} />
          <circle cx="70" cy="62" r="4.5" fill={P} />
          <path d="M50 36 h18" stroke={P} strokeWidth="2.5" opacity="0.5" />
          <Spark x={88} y={16} />
          <Spark x={20} y={44} s={0.6} />
        </g>
      )}
      {kind === "search" && (
        <g strokeLinecap="round">
          <circle cx="50" cy="36" r="20" fill={S} stroke={P} strokeWidth="3" />
          <path d="M65 51 L80 66" stroke={P} strokeWidth="6" />
          <path d="M43 33 q7 -7 14 0" fill="none" stroke={P} strokeWidth="2.5" opacity="0.55" />
          <circle cx="44" cy="41" r="2" fill={P} opacity="0.55" />
          <circle cx="56" cy="41" r="2" fill={P} opacity="0.55" />
          <Spark x={86} y={20} />
        </g>
      )}
      {kind === "heart" && (
        <g>
          <path
            d="M56 64 C30 48 24 36 30 26 C36 16 50 18 56 28 C62 18 76 16 82 26 C88 36 82 48 56 64z"
            fill={S}
            stroke={P}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M40 30 q4 -5 10 -2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <Spark x={90} y={18} />
          <Spark x={22} y={52} s={0.6} />
        </g>
      )}
      {kind === "box" && (
        <g strokeLinejoin="round">
          <path d="M28 30 L56 20 L84 30 L84 60 L56 70 L28 60z" fill={S} stroke={P} strokeWidth="3" />
          <path d="M28 30 L56 40 L84 30 M56 40 V70" fill="none" stroke={P} strokeWidth="3" />
          <path d="M42 25 L70 35 V45" fill="none" stroke={P} strokeWidth="2.5" opacity="0.5" />
          <Spark x={92} y={16} />
        </g>
      )}
      {kind === "bell" && (
        <g>
          <path d="M36 54 Q38 26 56 24 Q74 26 76 54 L80 60 L32 60 Z" fill={S} stroke={P} strokeWidth="3" />
          <circle cx="56" cy="65" r="4.5" fill={P} />
          <path d="M56 17 L56 24" stroke={P} strokeWidth="3" strokeLinecap="round" />
          <Spark x={88} y={20} />
        </g>
      )}
    </svg>
  );
}
