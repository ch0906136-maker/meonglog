// 견종별 외형 조각 (인라인 SVG, 좌표는 DogCharacter의 200x200 기준)
// DogArt가 그리는 순서에 맞춰 조각을 나눠 뒀어요:
//   꼬리 → 몸 뒤 털 → (몸) → 몸 무늬 → (발) → 옷 → 앞 털(치마/발 방울) → 귀 → 머리 뒤 털 → (머리)
//   → 얼굴 무늬 → 머리 위 장식 → (주둥이/눈) → 주둥이 앞 털
// 기본 견종(믹스견/기타/선택 안 함)은 아무것도 그리지 않아서 처음 만든 캐릭터 그대로예요.
import type { BodyBox, BreedTraits, Palette } from "@/lib/dog-look";

const WHITE = "#fffaf0";
const rad = (deg: number) => (deg * Math.PI) / 180;

// 타원 위에 동그란 털뭉치를 둘러서 "곱슬곱슬/솜뭉치" 윤곽을 만들어요.
function Bumps({
  cx,
  cy,
  rx,
  ry,
  from,
  to,
  n,
  r,
  fill,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  from: number;
  to: number;
  n: number;
  r: number;
  fill: string;
}) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = rad(from + ((to - from) * i) / Math.max(1, n - 1));
        return <circle key={i} cx={cx + rx * Math.cos(a)} cy={cy + ry * Math.sin(a)} r={r} fill={fill} />;
      })}
    </>
  );
}

// ───────── 꼬리 ─────────
export function BreedTail({ t, p }: { t: BreedTraits; p: Palette }) {
  switch (t.tail) {
    case "curl":
      return (
        <g>
          <path d="M142 160 C158 156 160 140 152 130" stroke={p.tail} strokeWidth="13" strokeLinecap="round" fill="none" />
          <circle cx="152" cy="124" r="17" fill={p.tail} />
          <circle cx="152" cy="124" r="8" fill={p.shade} opacity="0.45" />
        </g>
      );
    case "plume":
      return (
        <g>
          <path d="M140 162 C170 160 180 132 166 106" stroke={p.tail} strokeWidth="17" strokeLinecap="round" fill="none" />
          <path d="M146 156 C168 152 172 134 164 116" stroke={p.belly} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
      );
    case "stub":
      return <circle cx="146" cy="172" r="9" fill={p.tail} />;
    case "pom":
      return (
        <g>
          <path d="M142 162 C158 152 162 140 158 128" stroke={p.tail} strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="158" cy="118" r="12" fill={p.head} />
          <circle cx="150" cy="124" r="8" fill={p.head} />
          <circle cx="166" cy="124" r="8" fill={p.head} />
        </g>
      );
    default:
      return (
        <path d="M142 158 C166 148 172 128 160 116" stroke={p.tail} strokeWidth="12" strokeLinecap="round" fill="none" />
      );
  }
}

// ───────── 몸 뒤쪽 털(윤곽) — 몸통보다 먼저 그려서 둘레가 몽글몽글해져요 ─────────
export function BreedBodyBack({ t, p }: { t: BreedTraits; p: Palette }) {
  const b = t.body;
  if (t.fur === "curly") return <Bumps cx={100} cy={b.cy} rx={b.rx + 1} ry={b.ry} from={5} to={175} n={8} r={8} fill={p.body} />;
  if (t.fur === "cloud") return <Bumps cx={100} cy={b.cy} rx={b.rx + 1} ry={b.ry} from={0} to={180} n={9} r={9.5} fill={p.body} />;
  if (t.fur === "fluffy") return <Bumps cx={100} cy={b.cy} rx={b.rx + 1} ry={b.ry} from={5} to={175} n={9} r={8} fill={p.body} />;
  return null;
}

// ───────── 몸 무늬 (배/가슴의 흰 털) ─────────
export function BreedBodyMarks({ t }: { t: BreedTraits }) {
  if (t.marking === "corgi") return <ellipse cx="100" cy="166" rx="32" ry="24" fill={WHITE} />;
  if (t.marking === "shiba") return <ellipse cx="100" cy="162" rx="22" ry="22" fill={WHITE} />;
  return null;
}

// ───────── 발 (짧은 다리는 작고 몸에 붙어 있어요) ─────────
export function Feet({ t, p }: { t: BreedTraits; p: Palette }) {
  const { dx, rx, ry, y } = t.feet;
  const fill = t.marking === "corgi" ? WHITE : p.feet;
  return (
    <>
      <ellipse cx={100 - dx} cy={y} rx={rx} ry={ry} fill={fill} />
      <ellipse cx={100 + dx} cy={y} rx={rx} ry={ry} fill={fill} />
    </>
  );
}

// ───────── 옷 위로 내려오는 털 (긴 털 치마 / 깃털 / 발 방울) ─────────
export function BreedFrontFur({ t, p }: { t: BreedTraits; p: Palette }) {
  const { dx, y } = t.feet;
  if (t.fur === "silky" || t.fur === "feathered") {
    const fill = t.fur === "silky" ? p.head : p.body;
    return (
      <g pointerEvents="none">
        <path
          d="M54 176 Q58 192 68 186 Q76 194 86 188 Q100 194 114 188 Q124 194 132 186 Q142 192 146 176 Q100 188 54 176Z"
          fill={fill}
        />
        <path d="M70 182 q2 6 -1 9 M100 186 q1 6 -1 9 M130 182 q-1 6 2 9" stroke={p.shade} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55" />
        {t.fur === "feathered" && (
          <path d="M84 150 q-4 10 2 18 M100 154 q-2 12 2 20 M116 150 q4 10 -2 18" stroke={p.shade} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.5" />
        )}
      </g>
    );
  }
  if (t.fur === "curly" || t.fur === "cloud" || t.fur === "fluffy") {
    const r = t.fur === "curly" ? 11 : 10;
    return (
      <g pointerEvents="none">
        <circle cx={100 - dx} cy={y + 1} r={r} fill={p.head} />
        <circle cx={100 + dx} cy={y + 1} r={r} fill={p.head} />
        <circle cx={100 - dx - 7} cy={y + 5} r={r - 4} fill={p.head} />
        <circle cx={100 + dx + 7} cy={y + 5} r={r - 4} fill={p.head} />
      </g>
    );
  }
  return null;
}

// ───────── 귀 (머리 뒤에 그려요) ─────────
export function BreedEars({ t, p }: { t: BreedTraits; p: Palette }) {
  const big = t.fur === "feathered"; // 골든은 귀가 더 크고 길어요
  switch (t.ears) {
    case "floppy":
      return (
        <>
          <ellipse cx={big ? 53 : 55} cy={big ? 90 : 84} rx={big ? 21 : 19} ry={big ? 38 : 33} fill={p.ear} transform={`rotate(14 ${big ? 53 : 55} ${big ? 90 : 84})`} />
          <ellipse cx={big ? 147 : 145} cy={big ? 90 : 84} rx={big ? 21 : 19} ry={big ? 38 : 33} fill={p.ear} transform={`rotate(-14 ${big ? 147 : 145} ${big ? 90 : 84})`} />
        </>
      );
    case "round":
      // 작고 둥근 귀 (말티즈): 머리 옆에 살짝 보이는 동글동글한 귀
      return (
        <>
          <ellipse cx="52" cy="84" rx="16" ry="21" fill={p.ear} transform="rotate(10 52 84)" />
          <ellipse cx="148" cy="84" rx="16" ry="21" fill={p.ear} transform="rotate(-10 148 84)" />
        </>
      );
    case "curlydrop":
      // 곱슬곱슬 늘어진 귀 (푸들): 동그란 털뭉치가 아래로 이어져요
      return (
        <>
          {[
            [46, 78, 15],
            [42, 94, 15],
            [43, 110, 14],
            [47, 124, 11],
          ].map(([x, y, r]) => (
            <circle key={x + "-" + y} cx={x} cy={y} r={r} fill={p.ear} />
          ))}
          {[
            [154, 78, 15],
            [158, 94, 15],
            [157, 110, 14],
            [153, 124, 11],
          ].map(([x, y, r]) => (
            <circle key={x + "-" + y} cx={x} cy={y} r={r} fill={p.ear} />
          ))}
        </>
      );
    case "silky":
      // 긴 털이 늘어진 귀: 머리색에 가깝고 결이 보여요
      return (
        <g>
          <ellipse cx="52" cy="96" rx="17" ry="42" fill={p.ear} transform="rotate(7 52 96)" />
          <ellipse cx="148" cy="96" rx="17" ry="42" fill={p.ear} transform="rotate(-7 148 96)" />
          <path d="M50 66 Q43 98 49 132 M56 70 Q50 98 55 126" stroke={p.shade} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M150 66 Q157 98 151 132 M144 70 Q150 98 145 126" stroke={p.shade} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.55" />
        </g>
      );
    case "pointy":
      return (
        <>
          <path d="M40 76 L50 22 L84 56 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="8" />
          <path d="M160 76 L150 22 L116 56 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="8" />
          <path d="M52 44 L53 60 L66 54 Z" fill="#f6b9b0" opacity="0.7" />
          <path d="M148 44 L147 60 L134 54 Z" fill="#f6b9b0" opacity="0.7" />
        </>
      );
    case "bigpointy":
      // 큰 귀 (치와와/웰시코기)
      return (
        <>
          <path d="M36 84 L32 14 L88 54 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="9" />
          <path d="M164 84 L168 14 L112 54 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="9" />
          <path d="M46 40 L46 66 L68 56 Z" fill="#f6b9b0" opacity="0.75" />
          <path d="M154 40 L154 66 L132 56 Z" fill="#f6b9b0" opacity="0.75" />
        </>
      );
    case "upright":
      // 작고 뾰족하게 서 있는 귀 (시바견)
      return (
        <>
          <path d="M54 64 L62 22 L90 46 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="7" />
          <path d="M146 64 L138 22 L110 46 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="7" />
          <path d="M63 36 L64 52 L76 46 Z" fill="#f6b9b0" opacity="0.7" />
          <path d="M137 36 L136 52 L124 46 Z" fill="#f6b9b0" opacity="0.7" />
        </>
      );
    case "puff":
      return (
        <>
          <circle cx="48" cy="86" r="24" fill={p.ear} />
          <circle cx="152" cy="86" r="24" fill={p.ear} />
          <circle cx="42" cy="100" r="14" fill={p.ear} />
          <circle cx="158" cy="100" r="14" fill={p.ear} />
        </>
      );
    default:
      return null;
  }
}

// ───────── 머리 뒤쪽 털(윤곽) — 머리 동그라미보다 먼저 그려서 둘레가 몽글몽글해져요 ─────────
export function BreedHeadBack({ t, p }: { t: BreedTraits; p: Palette }) {
  if (t.fur === "curly") return <Bumps cx={100} cy={96} rx={49} ry={49} from={0} to={360} n={14} r={10} fill={p.head} />;
  if (t.fur === "cloud") return <Bumps cx={100} cy={96} rx={46} ry={46} from={0} to={360} n={16} r={14} fill={p.head} />;
  if (t.fur === "fluffy") {
    // 사자갈기처럼 뾰족뾰족 퍼지는 털
    const pts = Array.from({ length: 24 }, (_, i) => {
      const a = rad((360 / 24) * i);
      const rr = i % 2 === 0 ? 64 : 50;
      return `${(100 + rr * Math.cos(a)).toFixed(1)},${(98 + rr * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return <polygon points={pts} fill={p.head} strokeLinejoin="round" stroke={p.head} strokeWidth="5" />;
  }
  return null;
}

// ───────── 얼굴 무늬 (머리 위, 주둥이 아래) ─────────
export function BreedFaceMarks({ t }: { t: BreedTraits }) {
  if (t.marking === "corgi") {
    return (
      <g>
        <path d="M100 52 C92 70 91 92 87 110 L113 110 C109 92 108 70 100 52Z" fill={WHITE} />
        <ellipse cx="74" cy="118" rx="20" ry="16" fill={WHITE} />
        <ellipse cx="126" cy="118" rx="20" ry="16" fill={WHITE} />
      </g>
    );
  }
  if (t.marking === "shiba") {
    // 시바 특유의 하얀 볼(우라지로)과 눈썹 점
    return (
      <g>
        <ellipse cx="72" cy="116" rx="24" ry="20" fill="#fff7ea" />
        <ellipse cx="128" cy="116" rx="24" ry="20" fill="#fff7ea" />
        <circle cx="80" cy="78" r="4.2" fill="#fff7ea" />
        <circle cx="120" cy="78" r="4.2" fill="#fff7ea" />
      </g>
    );
  }
  return null;
}

// ───────── 머리 위 장식 (머리 동그라미 위) ─────────
export function BreedHeadTop({ t, p }: { t: BreedTraits; p: Palette }) {
  if (t.fur === "curly") {
    return (
      <>
        <circle cx="100" cy="46" r="20" fill={p.head} />
        <circle cx="80" cy="50" r="14" fill={p.head} />
        <circle cx="120" cy="50" r="14" fill={p.head} />
      </>
    );
  }
  if (t.fur === "silky") {
    // 머리 위로 묶은 털 (말티즈/시츄)
    return (
      <g>
        <ellipse cx="92" cy="42" rx="9" ry="15" fill={p.head} stroke={p.shade} strokeWidth="1.6" transform="rotate(-22 92 42)" />
        <ellipse cx="108" cy="42" rx="9" ry="15" fill={p.head} stroke={p.shade} strokeWidth="1.6" transform="rotate(22 108 42)" />
        <rect x="93" y="50" width="14" height="6" rx="3" fill="#f2a0bd" />
      </g>
    );
  }
  return null;
}

// ───────── 주둥이 앞 털 (시츄의 수염털) ─────────
export function BreedMuzzleFront({ t, p }: { t: BreedTraits; p: Palette }) {
  if (t.face !== "flat") return null;
  return (
    <g>
      <ellipse cx="82" cy="122" rx="11" ry="7" fill={p.snout} />
      <ellipse cx="118" cy="122" rx="11" ry="7" fill={p.snout} />
    </g>
  );
}

export type { BodyBox };
