// 방 꾸미기 아이템의 그림 (인라인 SVG, 좌표는 MyRoom의 640x420 기준)
// 기본 선택(mint/wood/pink/cozy/books/classic/big/none/ball/photo)은 꾸미기 전의 방과 같은 모습이에요.
// 새 아이템: lib/room-decor.ts의 options에 같은 id를 추가하고 여기에 그림을 넣어 주세요.

// ───────── 벽 ─────────
const WALLS: Record<string, { wall: string; dado: string; trim: string; stripe?: string }> = {
  mint: { wall: "#eaf2e7", dado: "#dbe8d7", trim: "#cfe0cb" },
  cream: { wall: "#fbf0dc", dado: "#f3e3c4", trim: "#e8d3ae" },
  pink: { wall: "#fbe9e6", dado: "#f6d8d3", trim: "#efc7c0" },
  sky: { wall: "#e4f0f7", dado: "#d3e6f0", trim: "#c3dbe8" },
  stripe: { wall: "#fcf5e8", dado: "#f0e2c8", trim: "#e6d3b0", stripe: "#f4e6cd" },
};

export function Wallpaper({ id }: { id: string }) {
  const w = WALLS[id] ?? WALLS.mint;
  return (
    <g>
      <rect width="640" height="420" fill={w.wall} />
      {w.stripe &&
        Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={i * 84 + 20} y="0" width="42" height="236" fill={w.stripe} />
        ))}
      <rect y="236" width="640" height="60" fill={w.dado} />
      <path d="M0 236 H640" stroke={w.trim} strokeWidth="4" />
    </g>
  );
}

// ───────── 바닥 ─────────
const FLOORS: Record<string, { fill: string; line: string }> = {
  wood: { fill: "#f3e3c7", line: "#e8d3ae" },
  green: { fill: "#dcebd2", line: "#cadcbf" },
  dark: { fill: "#e2c196", line: "#cfa878" },
};

export function FloorArt({ id }: { id: string }) {
  if (id === "tile") {
    return (
      <g>
        <rect y="296" width="640" height="124" fill="#f4efe6" />
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 11 }, (_, c) =>
            (r + c) % 2 === 0 ? (
              <rect key={`${r}-${c}`} x={c * 64 - 32} y={296 + r * 32} width="64" height="32" fill="#e8e0d2" />
            ) : null,
          ),
        )}
      </g>
    );
  }
  const f = FLOORS[id] ?? FLOORS.wood;
  return (
    <g>
      <rect y="296" width="640" height="124" fill={f.fill} />
      <path d="M0 296 H640 M0 336 H640 M0 380 H640" stroke={f.line} strokeWidth="3" />
    </g>
  );
}

// ───────── 러그 ─────────
const RUGS: Record<string, { outer: string; inner: string }> = {
  pink: { outer: "#fbe6e1", inner: "#f6d4cd" },
  sky: { outer: "#dcecf5", inner: "#c4dff0" },
  sunny: { outer: "#fbefc4", inner: "#f6e19a" },
};

export function RugArt({ id }: { id: string }) {
  const r = RUGS[id];
  if (!r) return null;
  return (
    <g>
      <ellipse cx="322" cy="362" rx="168" ry="34" fill={r.outer} />
      <ellipse cx="322" cy="362" rx="124" ry="23" fill={r.inner} />
    </g>
  );
}

// ───────── 벽 장식 ─────────
// 가랜드/조명이 걸리는 줄: 양 끝은 벽 위쪽, 가운데는 살짝 처져요.
function stringPoints(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    // 줄 모양(Q 곡선)과 같은 식: 양 끝 y=22, 가운데 y=36
    return { x: 20 + 600 * t, y: 22 + 56 * t * (1 - t) };
  });
}

const FLAG_COLORS = ["#f2a0bd", "#f2d06b", "#7fb0e8", "#9fd0a8"];

export function WallArt({ id, photo }: { id: string; photo: string | null }) {
  if (id === "none") return null;
  const pts = stringPoints(11);
  return (
    <g>
      {/* 사진 액자: 사진은 잘리지 않게 원본 비율 그대로(meet) 담아요 */}
      {(id === "photo" || id === "garland" || id === "lights") && (
        <g>
          <rect x="246" y="56" width="96" height="76" rx="14" fill="#fffdf8" />
          <rect x="256" y="66" width="76" height="56" rx="9" fill="#fbe6e1" />
          {photo ? (
            <>
              <clipPath id="room-frame-clip">
                <rect x="256" y="66" width="76" height="56" rx="9" />
              </clipPath>
              <image
                href={photo}
                x="256"
                y="66"
                width="76"
                height="56"
                preserveAspectRatio="xMidYMid meet"
                clipPath="url(#room-frame-clip)"
              />
            </>
          ) : (
            <text x="294" y="104" textAnchor="middle" fontSize="28">
              🐾
            </text>
          )}
        </g>
      )}
      {id === "garland" && (
        <g>
          <path d="M20 22 Q320 50 620 22" stroke="#cdb592" strokeWidth="2.5" fill="none" />
          {pts.map((p, i) => (
            <path
              key={i}
              d={`M${p.x - 10} ${p.y + 2} L${p.x + 10} ${p.y + 2} L${p.x} ${p.y + 22}Z`}
              fill={FLAG_COLORS[i % FLAG_COLORS.length]}
            />
          ))}
        </g>
      )}
      {id === "lights" && (
        <g>
          <path d="M20 22 Q320 50 620 22" stroke="#cdb592" strokeWidth="2.5" fill="none" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y + 8} r="9" fill="#fbe9a8" opacity="0.5" />
              <circle cx={p.x} cy={p.y + 8} r="4.5" fill="#f2c14e" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

// ───────── 선반 ─────────
export function ShelfArt({ id }: { id: string }) {
  if (id === "none") return null;
  return (
    <g>
      <rect x="236" y="170" width="170" height="11" rx="5.5" fill="#d9c3a0" />
      {id === "books" && (
        <>
          <path d="M356 170 h38 l-5 -26 h-28z" fill="#c98f6b" />
          <ellipse cx="375" cy="138" rx="9" ry="22" fill="#6f9a78" transform="rotate(-18 375 138)" />
          <ellipse cx="383" cy="134" rx="9" ry="24" fill="#58855f" transform="rotate(14 383 134)" />
          <ellipse cx="367" cy="140" rx="8" ry="18" fill="#7fae86" transform="rotate(-42 367 140)" />
          <rect x="262" y="146" width="22" height="24" rx="4" fill="#e9b949" />
          <rect x="288" y="154" width="18" height="16" rx="4" fill="#f2c9c2" />
        </>
      )}
      {id === "plants" && (
        <>
          <path d="M266 170 h28 l-4 -20 h-20z" fill="#e8b4a6" />
          <ellipse cx="280" cy="140" rx="7" ry="16" fill="#6f9a78" transform="rotate(-14 280 140)" />
          <ellipse cx="288" cy="142" rx="6" ry="13" fill="#7fae86" transform="rotate(24 288 142)" />
          <path d="M340 170 h30 l-4 -22 h-22z" fill="#c98f6b" />
          <ellipse cx="355" cy="136" rx="8" ry="18" fill="#58855f" transform="rotate(-10 355 136)" />
          <ellipse cx="364" cy="140" rx="7" ry="15" fill="#7fae86" transform="rotate(26 364 140)" />
          <ellipse cx="347" cy="142" rx="6" ry="13" fill="#6f9a78" transform="rotate(-36 347 142)" />
        </>
      )}
    </g>
  );
}

// ───────── 큰 화분 ─────────
export function PlantArt({ id }: { id: string }) {
  if (id === "none") return null;
  if (id === "small") {
    return (
      <g>
        <path d="M596 296 h-30 l4 -26 h22z" fill="#c98f6b" />
        <ellipse cx="581" cy="252" rx="8" ry="20" fill="#58855f" transform="rotate(-14 581 252)" />
        <ellipse cx="590" cy="254" rx="7" ry="18" fill="#6f9a78" transform="rotate(16 590 254)" />
        <ellipse cx="573" cy="258" rx="6" ry="14" fill="#7fae86" transform="rotate(-40 573 258)" />
      </g>
    );
  }
  return (
    <g>
      <path d="M596 296 h-38 l5 -44 h28z" fill="#c98f6b" />
      <ellipse cx="577" cy="226" rx="12" ry="36" fill="#58855f" transform="rotate(-16 577 226)" />
      <ellipse cx="590" cy="222" rx="11" ry="38" fill="#6f9a78" transform="rotate(14 590 222)" />
      <ellipse cx="568" cy="232" rx="10" ry="28" fill="#7fae86" transform="rotate(-42 568 232)" />
      {id === "flower" && (
        <g>
          <circle cx="562" cy="196" r="7" fill="#f2a0bd" />
          <circle cx="562" cy="196" r="2.6" fill="#f2d06b" />
          <circle cx="592" cy="184" r="7.5" fill="#f2a0bd" />
          <circle cx="592" cy="184" r="2.8" fill="#f2d06b" />
          <circle cx="580" cy="204" r="6" fill="#fbd0dd" />
          <circle cx="580" cy="204" r="2.2" fill="#f2d06b" />
        </g>
      )}
    </g>
  );
}

// ───────── 창문 주변 ─────────
export function WindowDeco({ id }: { id: string }) {
  if (id === "curtain") {
    return (
      <g pointerEvents="none">
        {/* 창문 오른쪽 위의 ✓ 표시를 가리지 않도록 폭을 좁게 잡았어요 */}
        <rect x="22" y="32" width="150" height="6" rx="3" fill="#cfae84" />
        <path d="M28 38 H62 Q54 100 58 168 H28Z" fill="#f6c9c3" />
        <path d="M172 38 H146 Q152 100 148 168 H172Z" fill="#f6c9c3" />
        <path d="M42 38 Q40 104 44 168 M160 38 Q162 104 158 168" stroke="#eeb2ab" strokeWidth="3" fill="none" />
      </g>
    );
  }
  if (id === "sillplant") {
    return (
      <g pointerEvents="none">
        <path d="M138 162 h24 l-3 -16 h-18z" fill="#c98f6b" />
        <ellipse cx="146" cy="136" rx="5.5" ry="13" fill="#6f9a78" transform="rotate(-18 146 136)" />
        <ellipse cx="156" cy="134" rx="5.5" ry="14" fill="#58855f" transform="rotate(16 156 134)" />
        <ellipse cx="151" cy="132" rx="5" ry="12" fill="#7fae86" />
      </g>
    );
  }
  return null;
}

// ───────── 침대 (행동: 휴식) ─────────
const BEDS: Record<string, { base: string; wall: string; inner: string; blanket: string; z: string }> = {
  cozy: { base: "#cdb592", wall: "#d9c3a0", inner: "#fff6e6", blanket: "#f2c9c2", z: "#8aa6b8" },
  rose: { base: "#e3b3b0", wall: "#efc5c1", inner: "#fff3f1", blanket: "#f2a0bd", z: "#c98aa0" },
  sky: { base: "#a9c7dc", wall: "#bcd8ea", inner: "#f3fafe", blanket: "#8fb8e0", z: "#7f9ec0" },
};

export function BedArt({ id }: { id: string }) {
  const b = BEDS[id] ?? BEDS.cozy;
  return (
    <>
      <ellipse cx="108" cy="378" rx="82" ry="24" fill={b.base} />
      <path d="M34 362 q-8 -46 30 -50 h88 q38 4 30 50z" fill={b.wall} />
      <ellipse cx="108" cy="362" rx="66" ry="17" fill={b.inner} />
      <path d="M70 360 q38 -16 76 0" stroke={b.blanket} strokeWidth="9" fill="none" strokeLinecap="round" />
      <text x="156" y="330" fontSize="20" fill={b.z} fontWeight="700">
        z
      </text>
    </>
  );
}

// ───────── 식기 (행동: 식사/물 마시기) ─────────
const BOWLS: Record<
  string,
  { eat: string; eatIn: string; eatShadow: string; water: string; waterIn: string; waterShadow: string }
> = {
  classic: { eat: "#c9594d", eatIn: "#7a3f33", eatShadow: "#cfa88f", water: "#6c9bb5", waterIn: "#bfe0ee", waterShadow: "#a9c3d0" },
  pastel: { eat: "#f4b6a8", eatIn: "#c98f6b", eatShadow: "#e7cfc2", water: "#a8d8c8", waterIn: "#e1f4ee", waterShadow: "#cfe6de" },
  wood: { eat: "#b98a5e", eatIn: "#7a4f2e", eatShadow: "#d9c3a0", water: "#c9a06f", waterIn: "#cfe6f0", waterShadow: "#d9c3a0" },
};

export function EatBowl({ id }: { id: string }) {
  const b = BOWLS[id] ?? BOWLS.classic;
  return (
    <>
      <ellipse cx="494" cy="388" rx="32" ry="9" fill={b.eatShadow} />
      <path d="M466 372 h56 q-2 18 -28 18 t-28 -18z" fill={b.eat} />
      <ellipse cx="494" cy="372" rx="28" ry="7" fill={b.eatIn} />
      <circle cx="484" cy="369" r="4" fill="#c98f6b" />
      <circle cx="496" cy="367" r="4" fill="#d9a37f" />
      <circle cx="505" cy="371" r="4" fill="#c98f6b" />
    </>
  );
}

export function WaterBowl({ id }: { id: string }) {
  const b = BOWLS[id] ?? BOWLS.classic;
  return (
    <>
      <ellipse cx="572" cy="388" rx="32" ry="9" fill={b.waterShadow} />
      <path d="M544 372 h56 q-2 18 -28 18 t-28 -18z" fill={b.water} />
      <ellipse cx="572" cy="372" rx="28" ry="7" fill={b.waterIn} />
      <path d="M560 371 q6 -4 12 0 t12 0" stroke="#fff" strokeWidth="2" fill="none" />
    </>
  );
}

// ───────── 장난감 (행동: 놀이) ─────────
export function ToyArt({ id }: { id: string }) {
  if (id === "bone") {
    return (
      <g transform="rotate(-16 414 376)">
        <rect x="392" y="370" width="44" height="12" rx="6" fill="#fffdf8" stroke="#e3d2b6" strokeWidth="2" />
        <circle cx="392" cy="370" r="7" fill="#fffdf8" stroke="#e3d2b6" strokeWidth="2" />
        <circle cx="392" cy="382" r="7" fill="#fffdf8" stroke="#e3d2b6" strokeWidth="2" />
        <circle cx="436" cy="370" r="7" fill="#fffdf8" stroke="#e3d2b6" strokeWidth="2" />
        <circle cx="436" cy="382" r="7" fill="#fffdf8" stroke="#e3d2b6" strokeWidth="2" />
        <rect x="394" y="371" width="40" height="10" rx="5" fill="#fffdf8" />
      </g>
    );
  }
  if (id === "bear") {
    return (
      <g>
        <circle cx="414" cy="377" r="14" fill="#c98f6b" />
        <circle cx="404" cy="368" r="4.5" fill="#c98f6b" />
        <circle cx="424" cy="368" r="4.5" fill="#c98f6b" />
        <circle cx="414" cy="364" r="12" fill="#d9a37f" />
        <circle cx="405" cy="354" r="5" fill="#d9a37f" />
        <circle cx="423" cy="354" r="5" fill="#d9a37f" />
        <ellipse cx="414" cy="368" rx="6" ry="4.5" fill="#f3dcc0" />
        <circle cx="414" cy="366.5" r="1.8" fill="#4a3a30" />
        <circle cx="409" cy="361" r="1.6" fill="#4a3a30" />
        <circle cx="419" cy="361" r="1.6" fill="#4a3a30" />
        <path d="M406 376 q8 6 16 0" stroke="#f2a0bd" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <>
      <circle cx="414" cy="372" r="19" fill="#e9b949" />
      <path d="M396 366 q18 11 36 0" stroke="#fffdf8" strokeWidth="3" fill="none" />
      <rect x="380" y="384" width="26" height="9" rx="4.5" fill="#fffdf8" transform="rotate(-18 393 388)" />
    </>
  );
}
