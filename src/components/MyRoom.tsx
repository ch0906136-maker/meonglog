"use client";

import { useState, type ReactNode } from "react";
import { BEHAVIOR_LABELS, formatDuration, type BehaviorKey } from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import { useMyDog, type Collection } from "@/lib/my-dog";
import { DogArt } from "./DogCharacter";

// 방 안의 물건과 행동 도감을 연결해요. 해당 행동이 영상에서 실제로 관찰되어 도감에 담기면 물건에 ✓가 켜져요.
const ITEMS: { key: BehaviorKey; name: string }[] = [
  { key: "rest", name: "포근한 침대" },
  { key: "eat", name: "밥그릇" },
  { key: "drink", name: "물그릇" },
  { key: "play", name: "공 장난감" },
  { key: "watch", name: "창문" },
  { key: "move", name: "산책 목줄" },
  { key: "bark", name: "현관 종" },
];

function Hotspot({
  id,
  label,
  found,
  selected,
  onSelect,
  badgeX,
  badgeY,
  children,
}: {
  id: BehaviorKey;
  label: string;
  found: boolean;
  selected: boolean;
  onSelect: (k: BehaviorKey) => void;
  badgeX: number;
  badgeY: number;
  children: ReactNode;
}) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${label} (${found ? "도감에 담긴 행동" : "아직 못 만난 행동"})`}
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      className="cursor-pointer outline-none transition-transform [transform-box:fill-box] origin-center hover:scale-[1.04] focus-visible:scale-[1.04]"
    >
      <g style={found ? undefined : { filter: "saturate(0.5)", opacity: 0.82 }}>{children}</g>
      {selected && (
        <circle cx={badgeX} cy={badgeY} r="24" fill="none" stroke="#3f6a4c" strokeWidth="3" strokeDasharray="5 5" />
      )}
      <circle cx={badgeX} cy={badgeY} r="12" fill={found ? "#52805f" : "#fffdf8"} stroke={found ? "#fffdf8" : "#cbbfae"} strokeWidth="2" />
      <text x={badgeX} y={badgeY + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill={found ? "#fff" : "#9a8c7e"}>
        {found ? "✓" : "?"}
      </text>
    </g>
  );
}

export default function MyRoom({ collection }: { collection: Collection }) {
  const [selected, setSelected] = useState<BehaviorKey | null>(null);
  const { profile } = useMyDog();
  const found = (k: BehaviorKey) => collection[k].count > 0;
  const sel = selected ? ITEMS.find((i) => i.key === selected) : null;
  const props = (k: BehaviorKey, bx: number, by: number) => ({
    id: k,
    label: ITEMS.find((i) => i.key === k)!.name,
    found: found(k),
    selected: selected === k,
    onSelect: setSelected,
    badgeX: bx,
    badgeY: by,
  });

  return (
    <div>
      <svg
        viewBox="0 0 640 420"
        role="group"
        aria-label="내 강아지의 방. 물건을 누르면 행동 도감 정보를 볼 수 있어요"
        className="h-auto w-full rounded-[2rem] shadow-soft"
      >
        {/* 벽 */}
        <rect width="640" height="420" fill="#eaf2e7" />
        <rect y="236" width="640" height="60" fill="#dbe8d7" />
        <path d="M0 236 H640" stroke="#cfe0cb" strokeWidth="4" />
        {/* 바닥 */}
        <rect y="296" width="640" height="124" fill="#f3e3c7" />
        <path d="M0 296 H640 M0 336 H640 M0 380 H640" stroke="#e8d3ae" strokeWidth="3" />

        {/* 액자 · 선반 · 화분 (꾸미기 요소) */}
        <rect x="246" y="52" width="96" height="76" rx="14" fill="#fffdf8" />
        <rect x="256" y="62" width="76" height="56" rx="9" fill="#fbe6e1" />
        {profile.photo ? (
          <>
            <clipPath id="room-frame-clip">
              <rect x="256" y="62" width="76" height="56" rx="9" />
            </clipPath>
            <image
              href={profile.photo}
              x="244"
              y="62"
              width="100"
              height="100"
              preserveAspectRatio="xMidYMin slice"
              clipPath="url(#room-frame-clip)"
            />
          </>
        ) : (
          <text x="294" y="100" textAnchor="middle" fontSize="28">🐾</text>
        )}
        <rect x="236" y="170" width="170" height="11" rx="5.5" fill="#d9c3a0" />
        <path d="M356 170 h38 l-5 -26 h-28z" fill="#c98f6b" />
        <ellipse cx="375" cy="138" rx="9" ry="22" fill="#6f9a78" transform="rotate(-18 375 138)" />
        <ellipse cx="383" cy="134" rx="9" ry="24" fill="#58855f" transform="rotate(14 383 134)" />
        <ellipse cx="367" cy="140" rx="8" ry="18" fill="#7fae86" transform="rotate(-42 367 140)" />
        <rect x="262" y="146" width="22" height="24" rx="4" fill="#e9b949" />
        <rect x="288" y="154" width="18" height="16" rx="4" fill="#f2c9c2" />
        {/* 큰 화분 */}
        <path d="M596 296 h-38 l5 -44 h28z" fill="#c98f6b" />
        <ellipse cx="577" cy="226" rx="12" ry="36" fill="#58855f" transform="rotate(-16 577 226)" />
        <ellipse cx="590" cy="222" rx="11" ry="38" fill="#6f9a78" transform="rotate(14 590 222)" />
        <ellipse cx="568" cy="232" rx="10" ry="28" fill="#7fae86" transform="rotate(-42 568 232)" />

        {/* 러그 */}
        <ellipse cx="322" cy="362" rx="168" ry="34" fill="#fbe6e1" />
        <ellipse cx="322" cy="362" rx="124" ry="23" fill="#f6d4cd" />

        {/* 창문 → 주변 관찰 */}
        <Hotspot {...props("watch", 190, 46)}>
          <rect x="34" y="40" width="152" height="124" rx="20" fill="#fffdf8" />
          <rect x="44" y="50" width="132" height="104" rx="14" fill="#d8eaf2" />
          <path d="M110 50 V154 M44 102 H176" stroke="#fffdf8" strokeWidth="6" />
          <circle cx="70" cy="76" r="10" fill="#fbe9a8" />
          <path d="M126 134 q10 -15 25 -4 q15 -8 19 4z" fill="#fff" opacity="0.9" />
          <rect x="28" y="162" width="164" height="12" rx="6" fill="#e3d2b6" />
        </Hotspot>

        {/* 산책 목줄 → 걷기/이동 */}
        <Hotspot {...props("move", 484, 64)}>
          <circle cx="452" cy="74" r="6" fill="#b9a58a" />
          <path d="M452 74 C428 100 428 140 452 152 C476 140 476 100 452 74" stroke="#d96c5f" strokeWidth="7" fill="none" strokeLinecap="round" />
          <rect x="440" y="150" width="24" height="14" rx="5" fill="#c9594d" />
        </Hotspot>

        {/* 현관 종 → 짖기 */}
        <Hotspot {...props("bark", 604, 62)}>
          <rect x="536" y="64" width="64" height="24" rx="12" fill="#d9c3a0" />
          <path d="M568 92 q-20 0 -20 24 v8 h40 v-8 q0 -24 -20 -24z" fill="#e9b949" />
          <circle cx="568" cy="132" r="6" fill="#c99a2e" />
        </Hotspot>

        {/* 침대 → 휴식 */}
        <Hotspot {...props("rest", 190, 304)}>
          <ellipse cx="108" cy="378" rx="82" ry="24" fill="#cdb592" />
          <path d="M34 362 q-8 -46 30 -50 h88 q38 4 30 50z" fill="#d9c3a0" />
          <ellipse cx="108" cy="362" rx="66" ry="17" fill="#fff6e6" />
          <path d="M70 360 q38 -16 76 0" stroke="#f2c9c2" strokeWidth="9" fill="none" strokeLinecap="round" />
          <text x="156" y="330" fontSize="20" fill="#8aa6b8" fontWeight="700">z</text>
        </Hotspot>

        {/* 공 → 놀이 */}
        <Hotspot {...props("play", 440, 330)}>
          <circle cx="414" cy="372" r="19" fill="#e9b949" />
          <path d="M396 366 q18 11 36 0" stroke="#fffdf8" strokeWidth="3" fill="none" />
          <rect x="380" y="384" width="26" height="9" rx="4.5" fill="#fffdf8" transform="rotate(-18 393 388)" />
        </Hotspot>

        {/* 밥그릇 → 식사 */}
        <Hotspot {...props("eat", 520, 336)}>
          <ellipse cx="494" cy="388" rx="32" ry="9" fill="#cfa88f" />
          <path d="M466 372 h56 q-2 18 -28 18 t-28 -18z" fill="#c9594d" />
          <ellipse cx="494" cy="372" rx="28" ry="7" fill="#7a3f33" />
          <circle cx="484" cy="369" r="4" fill="#c98f6b" />
          <circle cx="496" cy="367" r="4" fill="#d9a37f" />
          <circle cx="505" cy="371" r="4" fill="#c98f6b" />
        </Hotspot>

        {/* 물그릇 → 물 마시기 */}
        <Hotspot {...props("drink", 604, 336)}>
          <ellipse cx="572" cy="388" rx="32" ry="9" fill="#a9c3d0" />
          <path d="M544 372 h56 q-2 18 -28 18 t-28 -18z" fill="#6c9bb5" />
          <ellipse cx="572" cy="372" rx="28" ry="7" fill="#bfe0ee" />
          <path d="M560 371 q6 -4 12 0 t12 0" stroke="#fff" strokeWidth="2" fill="none" />
        </Hotspot>

        {/* 강아지 캐릭터 */}
        <g transform="translate(222 148) scale(0.98)">
          <g className="animate-float">
            <DogArt mood="idle" look={{ breed: profile.breed, coat: profile.coat }} />
          </g>
        </g>
      </svg>

      {/* 선택한 물건 정보 */}
      <div
        aria-live="polite"
        className="mt-4 rounded-3xl border border-line bg-surface p-4 text-sm shadow-soft sm:p-5"
      >
        {sel ? (
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-beige text-2xl"
            >
              {BEHAVIOR_ICONS[sel.key]}
            </span>
            <div className="min-w-0">
              <p className="font-bold">
                {sel.name} · {BEHAVIOR_LABELS[sel.key]}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                    found(sel.key) ? "bg-brand-soft text-brand-dark" : "bg-beige text-muted"
                  }`}
                >
                  {found(sel.key) ? "도감에 담겼어요 ✓" : "아직 못 만났어요"}
                </span>
              </p>
              <p className="mt-1 leading-relaxed text-muted">
                {found(sel.key)
                  ? `지금까지 ${collection[sel.key].count}개의 영상에서 총 ${formatDuration(collection[sel.key].seconds)} 관찰됐어요.`
                  : "이 행동은 아직 올린 영상에서 확인되지 않았어요. 영상에 담기면 도감이 채워져요."}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted">
            🐾 방 안의 물건을 눌러 보세요. 영상에서 확인된 행동은 도감에 담기고, 물건에 ✓가 켜져요.
          </p>
        )}
      </div>
    </div>
  );
}
