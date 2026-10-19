/**
 * 상품 패키지 일러스트 — 상품 사진이 아직 없을 때 쓰는 대체 이미지.
 *
 * 글자 한 개짜리 자리표시 대신, 상품명에서 형태(물티슈 팩·세제 통·생수 묶음·화장지 팩·상자·파우치·캔·가전 …)를
 * 골라 패키지를 그리고 가상 브랜드명·상품명·규격을 붙인다. 실제 브랜드 로고·디자인은 쓰지 않는다.
 * 순수 SVG라 어떤 크기에서도 선명하고, 이미지 요청이 없다.
 */
import { useId, type ReactNode } from "react";

type Pal = { base: string; main: string; deep: string };
const P: Record<string, Pal> = {
  mint: { base: "#EAF7F2", main: "#1BA683", deep: "#0E6650" },
  teal: { base: "#E6F4F5", main: "#16929A", deep: "#0B5C61" },
  blue: { base: "#EAF1FB", main: "#3170D4", deep: "#1C4690" },
  sky: { base: "#E9F5FC", main: "#2E9AD6", deep: "#16618E" },
  navy: { base: "#E9EDF4", main: "#2C4672", deep: "#15284A" },
  lavender: { base: "#F0ECFA", main: "#7B60D2", deep: "#4A3797" },
  pink: { base: "#FCEEF3", main: "#DC6893", deep: "#9C3B60" },
  coral: { base: "#FDEFE8", main: "#E26A41", deep: "#9E4122" },
  red: { base: "#FDECEB", main: "#D6453D", deep: "#952620" },
  yellow: { base: "#FFF7DD", main: "#E5A117", deep: "#8F6200" },
  green: { base: "#EDF6E6", main: "#4F9B32", deep: "#2D6617" },
  olive: { base: "#F1F3E3", main: "#6F7F2A", deep: "#434E12" },
  brown: { base: "#F5EDE5", main: "#8B5C3D", deep: "#583723" },
  gray: { base: "#EEF1F4", main: "#56616D", deep: "#262E37" },
};

type Kind =
  | "softpack"
  | "jug"
  | "bottle"
  | "pump"
  | "water"
  | "rolls"
  | "box"
  | "dispenser"
  | "longbox"
  | "pouch"
  | "bag"
  | "can"
  | "cans"
  | "jar"
  | "cups"
  | "ramen"
  | "trays"
  | "kettle"
  | "humidifier"
  | "lamp"
  | "vacuum"
  | "speaker"
  | "cable"
  | "powerstrip"
  | "battery"
  | "thermometer"
  | "mat"
  | "waterer"
  | "pots"
  | "pan"
  | "boards"
  | "containers"
  | "sponges"
  | "rack"
  | "hangers"
  | "storage"
  | "folded"
  | "curtain"
  | "tub"
  | "diffuser";

/** 상품명 키워드 → 형태·색 (위에서부터 먼저 맞는 규칙) */
/** [규칙, 형태, 색, 패키지에 쓸 이름(생략하면 상품명에서 추출)] */
const RULES: [RegExp, Kind, keyof typeof P, string?][] = [
  [/아기 물티슈/, "softpack", "pink", "아기물티슈"],
  [/물티슈/, "softpack", "mint"],
  [/손소독 티슈/, "softpack", "teal", "손소독티슈"],
  [/청소포/, "softpack", "sky"],
  [/배변패드/, "softpack", "blue"],
  [/기저귀/, "softpack", "pink", "기저귀"],
  [/온열 안대/, "box", "lavender", "온열안대"],
  [/아기 세탁세제/, "jug", "pink"],
  [/세탁세제/, "jug", "blue"],
  [/섬유유연제/, "jug", "lavender"],
  [/롤화장지/, "rolls", "sky"],
  [/키친타월/, "rolls", "green"],
  [/쓰레기봉투/, "box", "yellow"],
  [/건조대/, "rack", "gray"],
  [/세정제/, "bottle", "teal"],
  [/위생장갑/, "dispenser", "blue"],
  [/주방세제/, "pouch", "green", "주방세제"],
  [/냄비/, "pots", "navy"],
  [/밀폐용기/, "containers", "mint"],
  [/수세미/, "sponges", "yellow"],
  [/지퍼백/, "dispenser", "teal", "지퍼백"],
  [/종이호일/, "longbox", "coral"],
  [/프라이팬/, "pan", "coral"],
  [/커피포트/, "kettle", "gray"],
  [/도마/, "boards", "green"],
  [/탄산수/, "water", "green"],
  [/생수/, "water", "sky"],
  [/흰밥/, "trays", "red"],
  [/드립 커피/, "box", "brown"],
  [/컵라면/, "ramen", "red"],
  [/요거트/, "cups", "lavender"],
  [/견과/, "pouch", "brown"],
  [/만두/, "bag", "coral"],
  [/올리브유/, "bottle", "olive"],
  [/이불/, "folded", "lavender", "극세사 이불"],
  [/리빙박스/, "storage", "teal"],
  [/욕실 .*매트/, "mat", "teal"],
  [/옷걸이/, "hangers", "gray"],
  [/커튼/, "curtain", "navy"],
  [/디퓨저/, "diffuser", "lavender", "디퓨저"],
  [/매트리스 커버/, "folded", "blue", "방수커버"],
  [/가습기/, "humidifier", "mint"],
  [/케이블/, "cable", "gray"],
  [/스탠드|조명/, "lamp", "gray"],
  [/청소기/, "vacuum", "lavender"],
  [/온열매트|방석/, "mat", "coral"],
  [/멀티탭/, "powerstrip", "gray"],
  [/스피커/, "speaker", "navy"],
  [/건전지/, "battery", "yellow"],
  [/사료/, "bag", "brown", "사료"],
  [/고양이 모래/, "bag", "gray", "모래"],
  [/습식캔/, "cans", "coral", "습식캔"],
  [/간식|저키/, "pouch", "brown"],
  [/배변봉투/, "dispenser", "green"],
  [/급수기/, "waterer", "mint"],
  [/분유/, "can", "yellow", "분유"],
  [/이유식/, "box", "green", "이유식"],
  [/욕조/, "tub", "pink"],
  [/비타민/, "jar", "yellow"],
  [/마스크/, "box", "navy"],
  [/오메가/, "jar", "teal", "오메가3"],
  [/손소독제/, "pump", "teal"],
  [/유산균/, "box", "green"],
  [/체온계/, "thermometer", "gray"],
  [/구강청결제/, "bottle", "sky"],
];

const CAT_PAL: Record<string, keyof typeof P> = {
  food: "coral",
  living: "sky",
  kitchen: "green",
  home: "lavender",
  digital: "gray",
  pet: "brown",
  baby: "pink",
  health: "teal",
};

/** 상품명 → 큰 이름 · 앞 수식어 · 규격 ("프리미엄 물티슈 100매" → 물티슈 / 프리미엄 / 100매) */
export function splitName(name: string) {
  const toks = name.split(/\s+/);
  const isSpec = (t: string) => (/\d/.test(t) && !/^USB|^AA$|^KF|^LED/.test(t)) || /^[A-Z]$/.test(t);
  const spec = toks.filter(isSpec).join(" ");
  const words = toks.filter((t) => !isSpec(t));
  const title = words.at(-1) ?? name;
  const lead = words.slice(0, -1).join(" ");
  return { title, lead, spec };
}

export function artFor(name: string, category?: string) {
  const r = RULES.find(([re]) => re.test(name));
  return {
    kind: (r?.[1] ?? "box") as Kind,
    pal: P[r?.[2] ?? CAT_PAL[category ?? ""] ?? "teal"],
    title: r?.[3],
  };
}

/** 배너·안내 문구용 짧은 상품 이름 ("기저귀 밴드형 M 4팩" → "기저귀") */
export const shortName = (name: string) => artFor(name).title ?? splitName(name).title;

// ---------- 색 계산 ----------
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};
const shade = (c: string, t: number) => (t >= 0 ? mix(c, "#ffffff", t) : mix(c, "#000000", -t));

/** 라벨: 브랜드(작게) · 이름(굵게) · 규격(알약) */
function Label({
  x,
  y,
  w,
  brand,
  title,
  spec,
  pal,
  onDark = false,
  size = 1,
}: {
  x: number;
  y: number;
  w: number;
  brand?: string;
  title: string;
  spec?: string;
  pal: Pal;
  onDark?: boolean;
  size?: number;
}) {
  const fs = Math.min(17, (w / Math.max(2.2, title.length)) * 1.05) * size;
  const ink = onDark ? "#ffffff" : pal.deep;
  const cx = x + w / 2;
  return (
    <g fontFamily="inherit" textAnchor="middle">
      {brand && (
        <text
          x={cx}
          y={y}
          fontSize={7.6 * size}
          fontWeight={700}
          letterSpacing={0.6}
          fill={ink}
          opacity={0.72}
        >
          {brand}
        </text>
      )}
      <text x={cx} y={y + 6 + fs} fontSize={fs} fontWeight={800} fill={ink} letterSpacing={-0.3}>
        {title}
      </text>
      {spec && (
        <g>
          <rect
            x={cx - Math.min(w - 8, spec.length * 5.4 + 14) / 2}
            y={y + 12 + fs}
            width={Math.min(w - 8, spec.length * 5.4 + 14)}
            height={13 * size}
            rx={6.5 * size}
            fill={onDark ? "#ffffff" : pal.main}
          />
          <text
            x={cx}
            y={y + 21.4 * size + fs}
            fontSize={8.2 * size}
            fontWeight={700}
            fill={onDark ? pal.deep : "#ffffff"}
          >
            {spec}
          </text>
        </g>
      )}
    </g>
  );
}

/** 왼쪽 반사광 — 모든 용기에 같은 방향으로 */
const Gloss = ({ d, o = 0.38 }: { d: string; o?: number }) => <path d={d} fill="#ffffff" opacity={o} />;

export default function ProductArt({
  name,
  brand,
  category,
  className = "",
}: {
  name: string;
  brand?: string;
  category?: string;
  className?: string;
}) {
  const uid = `pa${useId().replace(/[^\w-]/g, "")}`;
  const art = artFor(name, category);
  const { kind, pal } = art;
  const parts = splitName(name);
  const title = art.title ?? parts.title;
  const spec = parts.spec.replace(/^오메가3\s*/, "");
  const lead = parts.lead;
  const g = (n: string) => `url(#${uid}${n})`;
  const body = shade(pal.base, -0.03);
  const L = { brand: brand ?? lead, title, spec, pal };

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={name}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(body, 0.35)} />
          <stop offset="0.55" stopColor={body} />
          <stop offset="1" stopColor={shade(body, -0.07)} />
        </linearGradient>
        <linearGradient id={`${uid}m`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(pal.main, 0.18)} />
          <stop offset="0.6" stopColor={pal.main} />
          <stop offset="1" stopColor={shade(pal.main, -0.15)} />
        </linearGradient>
        <linearGradient id={`${uid}w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#F4F6F8" />
          <stop offset="1" stopColor="#E3E8ED" />
        </linearGradient>
        <linearGradient id={`${uid}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E9F4FB" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#D3E8F5" stopOpacity="0.9" />
          <stop offset="1" stopColor="#B9D6EA" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${uid}k`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5B6672" />
          <stop offset="0.5" stopColor="#3A434D" />
          <stop offset="1" stopColor="#262D35" />
        </linearGradient>
        <radialGradient id={`${uid}s`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1B2733" stopOpacity="0.22" />
          <stop offset="1" stopColor="#1B2733" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="174" rx="74" ry="9" fill={g("s")} />
      {draw(kind, { g, pal, L, body })}
    </svg>
  );
}

type Ctx = {
  g: (n: string) => string;
  pal: Pal;
  body: string;
  L: { brand?: string; title: string; spec?: string; pal: Pal };
};

function draw(kind: Kind, c: Ctx): ReactNode {
  const { g, pal, L } = c;
  switch (kind) {
    case "softpack":
      return (
        <g>
          <path
            d="M26 92 Q26 74 44 72 L156 72 Q174 74 174 92 L174 150 Q174 168 156 170 L44 170 Q26 168 26 150 Z"
            fill={g("b")}
          />
          <path
            d="M30 76 L170 76"
            stroke={pal.deep}
            strokeOpacity="0.12"
            strokeWidth="3"
            strokeDasharray="3 3"
          />
          <path
            d="M30 166 L170 166"
            stroke={pal.deep}
            strokeOpacity="0.12"
            strokeWidth="3"
            strokeDasharray="3 3"
          />
          <rect x="68" y="82" width="64" height="26" rx="12" fill={g("m")} />
          <rect x="78" y="89" width="44" height="12" rx="6" fill={shade(pal.main, -0.25)} opacity="0.55" />
          <Gloss
            d="M34 96 Q34 84 44 82 L60 82 Q48 90 48 104 L48 150 Q48 158 44 160 Q34 158 34 150 Z"
            o={0.45}
          />
          <Label x={40} y={124} w={120} {...L} />
        </g>
      );
    case "jug":
      return (
        <g>
          <rect x="62" y="40" width="36" height="20" rx="5" fill={g("m")} />
          <rect x="62" y="54" width="36" height="5" fill={pal.deep} opacity="0.35" />
          <path
            fillRule="evenodd"
            d="M58 60 L112 60 Q122 60 126 70 L130 80 L140 80 Q156 80 156 96 L156 158 Q156 170 144 170 L56 170 Q44 170 44 158 L44 76 Q44 60 58 60 Z M134 92 L142 92 Q146 92 146 96 L146 116 Q146 120 142 120 L134 120 Q130 120 130 116 L130 96 Q130 92 134 92 Z"
            fill={g("m")}
          />
          <rect x="52" y="92" width="74" height="70" rx="9" fill="#ffffff" opacity="0.94" />
          <rect x="52" y="92" width="74" height="10" rx="5" fill={pal.deep} opacity="0.18" />
          <Gloss d="M50 78 Q50 66 58 64 L66 64 Q56 74 56 88 L56 150 Q52 152 50 148 Z" />
          <Label x={54} y={112} w={70} {...L} />
        </g>
      );
    case "bottle":
      return (
        <g>
          <rect x="84" y="24" width="32" height="18" rx="4" fill={pal.deep} />
          <path
            d="M88 42 L112 42 L112 56 Q136 64 136 88 L136 160 Q136 170 126 170 L74 170 Q64 170 64 160 L64 88 Q64 64 88 56 Z"
            fill={g("m")}
          />
          <rect x="70" y="94" width="60" height="62" rx="8" fill="#ffffff" opacity="0.94" />
          <Gloss d="M70 90 Q70 72 86 64 L90 64 Q78 76 78 92 L78 158 Q72 160 70 154 Z" />
          <Label x={70} y={110} w={60} {...L} size={0.92} />
        </g>
      );
    case "pump":
      return (
        <g>
          <path d="M92 30 L126 30 Q132 30 132 36 L132 40 L106 40 L106 50 L94 50 L94 40 Z" fill={pal.deep} />
          <rect x="90" y="50" width="20" height="14" rx="3" fill={shade(pal.deep, 0.2)} />
          <rect x="62" y="64" width="76" height="106" rx="18" fill={g("m")} />
          <rect x="70" y="92" width="60" height="62" rx="8" fill="#ffffff" opacity="0.94" />
          <Gloss d="M68 82 Q68 70 80 68 L84 68 Q76 76 76 88 L76 160 Q70 160 68 154 Z" />
          <Label x={70} y={108} w={60} {...L} size={0.92} />
        </g>
      );
    case "water": {
      const bottle = (x: number, s: number, front: boolean) => (
        <g transform={`translate(${x} ${170 - 140 * s}) scale(${s})`}>
          <rect x="16" y="0" width="20" height="12" rx="3" fill={pal.main} />
          <path
            d="M18 12 L34 12 L34 22 Q50 30 50 50 L50 132 Q50 140 42 140 L10 140 Q2 140 2 132 L2 50 Q2 30 18 22 Z"
            fill={g("c")}
            stroke="#9DC4DE"
            strokeWidth="1"
          />
          <rect x="2" y="64" width="48" height={front ? 40 : 30} fill={pal.main} />
          <Gloss d="M8 46 Q8 34 18 28 Q12 40 12 52 L12 130 Q8 130 8 126 Z" o={0.6} />
        </g>
      );
      return (
        <g>
          {bottle(36, 0.82, false)}
          {bottle(112, 0.82, false)}
          {bottle(70, 1, true)}
          <Label x={72} y={98} w={48} title={L.title} spec={L.spec} pal={pal} onDark size={0.86} />
        </g>
      );
    }
    case "rolls":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={36 + i * 44} y="56" width="40" height="112" rx="10" fill={g("w")} />
              <ellipse cx={56 + i * 44} cy="62" rx="19" ry="7" fill="#ffffff" stroke="#DCE3EA" />
              <ellipse cx={56 + i * 44} cy="62" rx="6" ry="2.6" fill="#C9D3DC" />
            </g>
          ))}
          <rect
            x="30"
            y="52"
            width="140"
            height="120"
            rx="14"
            fill="none"
            stroke={pal.main}
            strokeOpacity="0.25"
            strokeWidth="2"
          />
          <rect x="30" y="102" width="140" height="50" fill={g("m")} />
          <Label
            x={30}
            y={108}
            w={140}
            brand={L.brand}
            title={L.title}
            spec={L.spec}
            pal={pal}
            onDark
            size={0.9}
          />
        </g>
      );
    case "box":
    case "dispenser":
      return (
        <g>
          <path d="M46 76 L64 58 L160 58 L142 76 Z" fill={shade(pal.main, 0.22)} />
          <path d="M142 76 L160 58 L160 152 L142 170 Z" fill={shade(pal.main, -0.22)} />
          <rect x="46" y="76" width="96" height="94" fill={g("m")} />
          {kind === "dispenser" ? (
            <ellipse cx="94" cy="66" rx="24" ry="5" fill={pal.deep} opacity="0.55" />
          ) : (
            <rect x="46" y="76" width="96" height="6" fill={pal.deep} opacity="0.18" />
          )}
          <rect x="54" y="102" width="80" height="60" rx="8" fill="#ffffff" opacity="0.95" />
          <Label x={54} y={108} w={80} title={L.title} spec={L.spec} pal={pal} size={0.92} />
          <text
            x="94"
            y="94"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fill="#ffffff"
            opacity="0.9"
            letterSpacing="0.6"
          >
            {L.brand}
          </text>
        </g>
      );
    case "longbox":
      return (
        <g>
          <path d="M22 104 L38 90 L178 90 L162 104 Z" fill={shade(pal.main, 0.22)} />
          <path d="M162 104 L178 90 L178 138 L162 152 Z" fill={shade(pal.main, -0.22)} />
          <rect x="22" y="104" width="140" height="48" fill={g("m")} />
          <path d="M22 104 L162 104 L162 112 L22 112 Z" fill="#ffffff" opacity="0.25" />
          <text x="92" y="128" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ffffff">
            {L.title}
          </text>
          <text
            x="92"
            y="143"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="700"
            fill="#ffffff"
            opacity="0.85"
          >
            {[L.brand, L.spec].filter(Boolean).join(" · ")}
          </text>
        </g>
      );
    case "pouch":
      return (
        <g>
          <path d="M56 50 L144 50 L150 158 Q150 170 138 170 L62 170 Q50 170 50 158 Z" fill={g("m")} />
          <path
            d="M58 62 L142 62"
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <path
            d="M52 156 Q100 146 148 156"
            stroke={pal.deep}
            strokeOpacity="0.25"
            strokeWidth="2"
            fill="none"
          />
          {/주방세제|리필/.test(L.title + (L.brand ?? "")) && (
            <rect
              x="120"
              y="34"
              width="16"
              height="20"
              rx="3"
              fill={pal.deep}
              transform="rotate(14 128 44)"
            />
          )}
          <circle cx="100" cy="112" r="34" fill="#ffffff" opacity="0.95" />
          <Gloss d="M62 58 Q58 90 58 150 Q56 160 60 164 Q66 120 70 58 Z" o={0.3} />
          <Label x={70} y={94} w={60} title={L.title} spec={L.spec} pal={pal} size={0.9} />
          <text
            x="100"
            y="80"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fill="#ffffff"
            letterSpacing="0.6"
          >
            {L.brand}
          </text>
        </g>
      );
    case "bag":
      return (
        <g>
          <path d="M42 58 L158 58 L162 160 Q162 170 152 170 L48 170 Q38 170 38 160 Z" fill={g("m")} />
          <rect x="40" y="44" width="120" height="18" rx="4" fill={shade(pal.main, -0.25)} />
          <rect x="62" y="122" width="76" height="36" rx="10" fill="#ffffff" opacity="0.4" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <circle
              key={i}
              cx={70 + (i % 4) * 20}
              cy={132 + Math.floor(i / 4) * 14}
              r="4.5"
              fill={shade(pal.main, -0.35)}
              opacity="0.55"
            />
          ))}
          <Gloss d="M46 64 Q44 110 46 158 Q50 164 54 160 Q52 110 56 64 Z" o={0.28} />
          <Label
            x={50}
            y={74}
            w={100}
            brand={L.brand}
            title={L.title}
            spec={L.spec}
            pal={pal}
            onDark
            size={0.95}
          />
        </g>
      );
    case "can":
      return (
        <g>
          <rect x="58" y="62" width="84" height="104" fill={g("m")} />
          <ellipse cx="100" cy="166" rx="42" ry="9" fill={shade(pal.main, -0.25)} />
          <ellipse cx="100" cy="62" rx="42" ry="10" fill="#D7DEE5" stroke="#B7C1CB" />
          <ellipse cx="100" cy="62" rx="34" ry="7" fill="#EEF2F5" />
          <rect x="58" y="96" width="84" height="56" fill="#ffffff" opacity="0.95" />
          <Gloss d="M62 66 L72 66 L72 160 L62 158 Z" o={0.3} />
          <Label x={60} y={106} w={80} {...L} size={0.9} />
        </g>
      );
    case "cans":
      return (
        <g>
          {[
            [52, 120],
            [100, 120],
            [76, 76],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect x={x - 22} y={y} width="44" height="44" fill={g("m")} />
              <ellipse cx={x} cy={y + 44} rx="22" ry="5" fill={shade(pal.main, -0.25)} />
              <ellipse cx={x} cy={y} rx="22" ry="5.5" fill="#DCE3E9" stroke="#BCC6CF" />
              <rect x={x - 22} y={y + 14} width="44" height="16" fill="#ffffff" opacity="0.92" />
              <text x={x} y={y + 25.5} textAnchor="middle" fontSize="8" fontWeight="800" fill={pal.deep}>
                {i === 2 ? L.title : (L.spec ?? "")}
              </text>
            </g>
          ))}
          <text x="148" y="150" fontSize="8" fontWeight="700" fill={pal.deep} opacity="0.7">
            {L.brand}
          </text>
        </g>
      );
    case "jar":
      return (
        <g>
          <rect x="66" y="54" width="68" height="24" rx="6" fill={pal.deep} />
          <rect x="66" y="58" width="68" height="3" fill="#ffffff" opacity="0.2" />
          <rect x="60" y="76" width="80" height="94" rx="16" fill={g("m")} />
          <rect x="66" y="96" width="68" height="60" rx="8" fill="#ffffff" opacity="0.95" />
          <Gloss d="M66 84 Q66 80 72 80 L76 80 L76 160 Q68 160 66 154 Z" o={0.35} />
          <Label x={66} y={110} w={68} {...L} size={0.9} />
        </g>
      );
    case "cups":
      return (
        <g>
          {[
            [56, 104],
            [144, 104],
            [100, 88],
          ].map(([x, y], i) => (
            <g key={i}>
              <path
                d={`M${x - 28} ${y} L${x + 28} ${y} L${x + 22} ${y + 66} Q${x + 22} ${y + 70} ${x + 18} ${y + 70} L${x - 18} ${y + 70} Q${x - 22} ${y + 70} ${x - 22} ${y + 66} Z`}
                fill={g("w")}
                stroke="#DCE3EA"
              />
              <ellipse cx={x} cy={y} rx="30" ry="7" fill={g("m")} />
              <rect x={x - 25} y={y + 22} width="50" height="20" fill={pal.main} opacity="0.92" />
              {i === 2 && (
                <text
                  x={x}
                  y={y + 35.5}
                  textAnchor="middle"
                  fontSize={L.title.length > 4 ? 8 : 10}
                  fontWeight="800"
                  fill="#ffffff"
                >
                  {L.title}
                </text>
              )}
            </g>
          ))}
          <text
            x="100"
            y="186"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill={pal.deep}
            opacity="0.75"
          >
            {[L.brand, L.spec].filter(Boolean).join(" · ")}
          </text>
        </g>
      );
    case "ramen":
      return (
        <g>
          <path d="M44 70 L156 70 L144 166 Q143 170 138 170 L62 170 Q57 170 56 166 Z" fill={g("m")} />
          <ellipse cx="100" cy="70" rx="58" ry="12" fill="#ECEFF2" stroke="#C9D2DA" />
          <ellipse cx="100" cy="70" rx="46" ry="8" fill="#F7F8FA" />
          <path d="M60 100 Q100 92 140 100 L138 116 Q100 108 62 116 Z" fill="#ffffff" opacity="0.9" />
          <text x="100" y="138" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ffffff">
            {L.title}
          </text>
          <text
            x="100"
            y="154"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="700"
            fill="#ffffff"
            opacity="0.85"
          >
            {[L.brand, L.spec].filter(Boolean).join(" · ")}
          </text>
        </g>
      );
    case "trays":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0 ${-i * 22})`}>
              <path d="M40 150 L160 150 L154 170 L46 170 Z" fill="#F7F8FA" stroke="#D5DCE3" />
              <rect x="38" y="144" width="124" height="8" rx="3" fill="#ffffff" stroke="#D5DCE3" />
            </g>
          ))}
          <rect x="58" y="80" width="84" height="44" rx="8" fill={g("m")} />
          <text x="100" y="101" textAnchor="middle" fontSize="15" fontWeight="900" fill="#ffffff">
            {L.title}
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="#ffffff"
            opacity="0.9"
          >
            {[L.brand, L.spec].filter(Boolean).join(" · ")}
          </text>
        </g>
      );
    case "kettle":
      return (
        <g>
          <rect x="54" y="158" width="92" height="12" rx="6" fill={g("k")} />
          <path d="M64 70 L136 70 L144 158 L56 158 Z" fill={g("w")} stroke="#CBD3DB" />
          <path
            d="M136 82 Q166 84 162 116 Q160 140 142 146"
            stroke={pal.deep}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M64 82 L42 72 L46 86 L60 96 Z" fill="#D5DCE3" />
          <rect x="70" y="60" width="60" height="12" rx="6" fill={pal.deep} />
          <rect x="94" y="52" width="12" height="10" rx="3" fill={pal.main} />
          <rect x="90" y="110" width="20" height="30" rx="4" fill="#9FD3EF" opacity="0.7" />
          <Gloss d="M70 76 L78 76 L72 154 L62 154 Z" o={0.6} />
        </g>
      );
    case "humidifier":
      return (
        <g>
          <path
            d="M92 52 Q84 40 92 30 M100 50 Q108 36 100 24 M108 52 Q118 42 112 30"
            stroke="#B8DCEB"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
          <rect x="66" y="58" width="68" height="112" rx="32" fill={g("w")} stroke="#D4DCE3" />
          <ellipse cx="100" cy="64" rx="26" ry="6" fill={pal.main} opacity="0.85" />
          <rect x="66" y="128" width="68" height="42" rx="20" fill={g("m")} />
          <circle cx="100" cy="146" r="5" fill="#ffffff" opacity="0.9" />
          <Gloss d="M72 84 Q72 66 86 62 Q78 76 78 92 L78 120 Q72 120 72 114 Z" o={0.7} />
        </g>
      );
    case "lamp":
      return (
        <g>
          <ellipse cx="78" cy="164" rx="34" ry="8" fill={g("k")} />
          <path
            d="M78 160 L78 112 L128 68"
            stroke="#4A545F"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="78" cy="112" r="6" fill="#2F3740" />
          <path d="M116 56 L160 74 L150 92 L106 74 Z" fill={g("k")} />
          <path d="M108 80 L150 96" stroke="#FFE7A3" strokeWidth="4" strokeLinecap="round" />
          <path d="M112 90 L96 140 L176 140 L152 98 Z" fill="#FFF2C6" opacity="0.45" />
        </g>
      );
    case "vacuum":
      return (
        <g>
          <path
            d="M60 46 Q50 46 52 58 L74 118"
            stroke="#3C4652"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="66" y="96" width="70" height="38" rx="18" fill={g("m")} transform="rotate(-24 100 115)" />
          <circle cx="118" cy="100" r="10" fill="#ffffff" opacity="0.55" />
          <path d="M124 128 L156 166" stroke="#3C4652" strokeWidth="10" strokeLinecap="round" />
          <rect x="140" y="160" width="40" height="10" rx="5" fill={g("k")} />
          <rect x="48" y="42" width="22" height="34" rx="8" fill={pal.deep} />
        </g>
      );
    case "speaker":
      return (
        <g>
          <rect x="42" y="82" width="116" height="80" rx="38" fill={g("m")} />
          <rect x="52" y="92" width="96" height="60" rx="30" fill={shade(pal.main, -0.25)} />
          {Array.from({ length: 24 }, (_, i) => (
            <circle
              key={i}
              cx={64 + (i % 8) * 10}
              cy={108 + Math.floor(i / 8) * 12}
              r="2.2"
              fill="#ffffff"
              opacity="0.28"
            />
          ))}
          <rect x="88" y="74" width="24" height="10" rx="4" fill={pal.deep} />
          <Gloss d="M50 108 Q52 90 72 86 Q58 98 58 116 Z" o={0.4} />
        </g>
      );
    case "cable":
      return (
        <g fill="none">
          {[0, 1, 2, 3].map((i) => (
            <ellipse
              key={i}
              cx="100"
              cy={112 + i * 4}
              rx={46 - i * 2}
              ry={28 - i}
              stroke={i % 2 ? shade(pal.main, 0.1) : pal.main}
              strokeWidth="7"
            />
          ))}
          <path d="M146 116 Q160 110 164 92" stroke={pal.main} strokeWidth="7" strokeLinecap="round" />
          <rect x="156" y="70" width="16" height="26" rx="4" fill="#D9DFE5" stroke="#AEB8C2" />
          <rect x="160" y="62" width="8" height="10" rx="2" fill="#AEB8C2" />
          <path d="M54 118 Q40 126 42 146" stroke={pal.main} strokeWidth="7" strokeLinecap="round" />
          <rect x="34" y="144" width="16" height="24" rx="4" fill="#D9DFE5" stroke="#AEB8C2" />
        </g>
      );
    case "powerstrip":
      return (
        <g>
          <path
            d="M32 132 Q20 150 40 162 Q60 172 80 166"
            stroke="#3C4652"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="30" y="96" width="148" height="40" rx="12" fill={g("w")} stroke="#CDD5DD" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <circle cx={50 + i * 21} cy="116" r="7.5" fill="#E7ECF0" stroke="#C3CCD5" />
              <circle cx={47.5 + i * 21} cy="116" r="1.4" fill="#5B6672" />
              <circle cx={52.5 + i * 21} cy="116" r="1.4" fill="#5B6672" />
            </g>
          ))}
          <rect x="166" y="108" width="8" height="16" rx="3" fill={pal.main} />
        </g>
      );
    case "battery":
      return (
        <g>
          <rect x="44" y="40" width="112" height="130" rx="10" fill={g("m")} />
          <circle cx="100" cy="52" r="5" fill={shade(pal.base, 0.6)} />
          <text x="100" y="78" textAnchor="middle" fontSize="15" fontWeight="900" fill="#ffffff">
            {L.title}
          </text>
          <rect x="54" y="88" width="92" height="74" rx="8" fill="#ffffff" opacity="0.35" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={60 + i * 21} y="96" width="16" height="58" rx="5" fill={g("k")} />
              <rect x={60 + i * 21} y="96" width="16" height="16" rx="4" fill="#E9B42A" />
              <rect x={65 + i * 21} y="92" width="6" height="5" rx="1.5" fill="#B7C1CB" />
            </g>
          ))}
        </g>
      );
    case "thermometer":
      return (
        <g>
          <path
            d="M60 70 Q60 56 76 56 L146 56 Q160 56 160 72 L160 92 Q160 102 150 104 L108 108 L104 160 Q103 170 92 170 L82 170 Q72 170 74 160 L80 106 Q60 104 60 90 Z"
            fill={g("w")}
            stroke="#CDD5DD"
          />
          <rect x="108" y="66" width="40" height="20" rx="4" fill={pal.deep} />
          <text x="128" y="80" textAnchor="middle" fontSize="10" fontWeight="800" fill="#9BF0C9">
            36.5
          </text>
          <circle cx="72" cy="80" r="6" fill={pal.main} />
          <rect x="86" y="118" width="12" height="6" rx="3" fill={pal.main} />
        </g>
      );
    case "mat":
      return (
        <g>
          <path d="M34 112 L150 92 L172 130 L56 152 Z" fill={g("m")} />
          <path d="M34 112 L56 152 L56 160 L34 120 Z" fill={shade(pal.main, -0.3)} />
          <path d="M56 152 L172 130 L172 138 L56 160 Z" fill={shade(pal.main, -0.18)} />
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${45 + i * 23} ${110 - i * 4} L${66 + i * 23} ${148 - i * 4}`}
              stroke="#ffffff"
              strokeOpacity="0.35"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          ))}
          {/온열|방석/.test(L.title + (L.brand ?? "")) && (
            <rect
              x="140"
              y="132"
              width="20"
              height="12"
              rx="3"
              fill="#2F3740"
              transform="rotate(-10 150 138)"
            />
          )}
        </g>
      );
    case "waterer":
      return (
        <g>
          <ellipse cx="100" cy="160" rx="62" ry="12" fill={shade(pal.main, -0.2)} />
          <path d="M38 140 Q38 120 100 120 Q162 120 162 140 L160 158 Q100 172 40 158 Z" fill={g("m")} />
          <ellipse cx="100" cy="132" rx="52" ry="10" fill="#BFE6F2" />
          <path d="M100 132 Q100 108 100 100" stroke="#8FD0E6" strokeWidth="6" strokeLinecap="round" />
          <path d="M70 80 Q70 60 100 58 Q130 60 130 80 L130 118 L70 118 Z" fill={g("c")} stroke="#9DC4DE" />
          <Gloss d="M76 82 Q78 66 92 62 Q82 72 82 86 L82 114 L76 114 Z" o={0.6} />
        </g>
      );
    case "pots":
      return (
        <g>
          <g transform="translate(-22 18) scale(0.82)">
            <rect x="60" y="96" width="120" height="62" rx="10" fill={g("w")} stroke="#C9D2DA" />
            <rect x="44" y="104" width="20" height="10" rx="5" fill="#2F3740" />
            <rect x="176" y="104" width="20" height="10" rx="5" fill="#2F3740" />
          </g>
          <rect x="66" y="96" width="104" height="72" rx="10" fill={g("w")} stroke="#C9D2DA" />
          <ellipse cx="118" cy="94" rx="56" ry="10" fill={g("m")} />
          <rect x="108" y="78" width="20" height="10" rx="4" fill={pal.deep} />
          <rect x="166" y="106" width="22" height="10" rx="5" fill="#2F3740" />
          <rect x="48" y="106" width="22" height="10" rx="5" fill="#2F3740" />
          <Gloss d="M72 104 L80 104 L80 160 L72 158 Z" o={0.7} />
        </g>
      );
    case "pan":
      return (
        <g>
          <path d="M118 124 L182 104" stroke="#2F3740" strokeWidth="11" strokeLinecap="round" />
          <ellipse cx="80" cy="128" rx="62" ry="22" fill={g("k")} />
          <ellipse cx="80" cy="124" rx="54" ry="17" fill={g("m")} />
          <ellipse cx="72" cy="120" rx="26" ry="7" fill="#ffffff" opacity="0.25" />
        </g>
      );
    case "boards":
      return (
        <g>
          <rect x="44" y="52" width="80" height="116" rx="14" fill={g("m")} transform="rotate(-8 84 110)" />
          <rect
            x="82"
            y="62"
            width="76"
            height="108"
            rx="14"
            fill={g("w")}
            stroke="#CBD3DB"
            transform="rotate(6 120 116)"
          />
          <circle cx="126" cy="74" r="6" fill="#ffffff" stroke="#CBD3DB" transform="rotate(6 120 116)" />
          <circle cx="80" cy="66" r="6" fill={shade(pal.base, 0.5)} transform="rotate(-8 84 110)" />
        </g>
      );
    case "containers":
      return (
        <g>
          {[
            [40, 132, 120, 38],
            [52, 98, 96, 32],
            [64, 70, 72, 26],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="8" fill={g("c")} stroke="#A9CBE0" />
              <rect x={x - 3} y={y - 6} width={w + 6} height="9" rx="4" fill={g("m")} />
            </g>
          ))}
        </g>
      );
    case "sponges":
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${i % 2 ? 6 : 0} ${-i * 24})`}>
              <rect x="50" y="138" width="100" height="16" rx="6" fill={g("m")} />
              <rect x="50" y="152" width="100" height="10" rx="4" fill="#3E8E3A" />
            </g>
          ))}
        </g>
      );
    case "rack":
      return (
        <g stroke="#7A8794" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M40 170 L100 58 L160 170" />
          <path d="M54 146 L146 146 M64 126 L136 126 M74 106 L126 106" stroke={pal.main} />
          <path d="M100 58 L100 50" />
        </g>
      );
    case "hangers":
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${(i - 1) * 16} ${i * 10})`}>
              <path
                d="M100 66 Q100 54 110 56 Q118 60 110 70 L100 80 L44 120 Q38 126 46 128 L154 128 Q162 126 156 120 L100 80"
                stroke={i === 2 ? pal.deep : shade(pal.main, 0.3)}
                strokeWidth="5"
              />
            </g>
          ))}
        </g>
      );
    case "storage":
      return (
        <g>
          <path d="M40 84 L160 84 L152 168 L48 168 Z" fill={g("c")} stroke="#A9CBE0" />
          <rect x="34" y="70" width="132" height="18" rx="6" fill={g("m")} />
          <rect x="30" y="92" width="10" height="20" rx="3" fill={pal.deep} />
          <rect x="160" y="92" width="10" height="20" rx="3" fill={pal.deep} />
          <Gloss d="M50 92 L60 92 L58 160 L52 160 Z" o={0.6} />
        </g>
      );
    case "folded":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0 ${-i * 26})`}>
              <rect
                x="36"
                y="134"
                width="128"
                height="30"
                rx="14"
                fill={i === 1 ? "#ffffff" : g("m")}
                stroke={i === 1 ? "#D8DEE5" : "none"}
              />
              <path
                d="M44 149 L156 149"
                stroke={i === 1 ? pal.main : "#ffffff"}
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </g>
          ))}
          <rect
            x={150 - L.title.length * 8.5}
            y="74"
            width={L.title.length * 8.5 + 8}
            height="20"
            rx="5"
            fill="#ffffff"
            stroke="#D8DEE5"
          />
          <text
            x={154 - (L.title.length * 8.5) / 2}
            y="87.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fill={pal.deep}
          >
            {L.title}
          </text>
        </g>
      );
    case "curtain":
      return (
        <g>
          <rect x="30" y="40" width="140" height="6" rx="3" fill="#7A8794" />
          {[0, 1].map((s) => (
            <g key={s}>
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={36 + s * 72 + i * 15}
                  y="46"
                  width="16"
                  height="124"
                  rx="6"
                  fill={i % 2 ? shade(pal.main, -0.15) : pal.main}
                />
              ))}
            </g>
          ))}
        </g>
      );
    case "tub":
      return (
        <g>
          <path
            d="M26 98 Q26 90 34 90 L166 90 Q174 90 174 98 L162 156 Q160 166 148 166 L52 166 Q40 166 38 156 Z"
            fill={g("m")}
          />
          <ellipse cx="100" cy="96" rx="64" ry="10" fill={shade(pal.base, 0.4)} />
          <path
            d="M48 166 L40 176 M152 166 L160 176"
            stroke={pal.deep}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="132" cy="76" r="12" fill="#FFD84D" />
          <path d="M140 74 L150 72 L142 80 Z" fill="#F29A2E" />
        </g>
      );
    case "diffuser":
      return (
        <g>
          {[-14, -4, 6, 16].map((a, i) => (
            <path
              key={i}
              d={`M100 96 L${100 + a * 2.6} 30`}
              stroke="#8B6A4E"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ))}
          <rect x="92" y="92" width="16" height="12" rx="3" fill={pal.deep} />
          <path
            d="M84 104 L116 104 Q140 112 140 140 L140 158 Q140 170 128 170 L72 170 Q60 170 60 158 L60 140 Q60 112 84 104 Z"
            fill={g("c")}
            stroke="#B6CADB"
          />
          <rect x="70" y="128" width="60" height="30" rx="5" fill="#ffffff" opacity="0.92" />
          <text x="100" y="146" textAnchor="middle" fontSize="9" fontWeight="800" fill={pal.deep}>
            {L.title}
          </text>
          <path
            d="M60 150 Q100 140 140 150 L140 158 Q140 170 128 170 L72 170 Q60 170 60 158 Z"
            fill={pal.main}
            opacity="0.25"
          />
        </g>
      );
    default:
      return null;
  }
}
