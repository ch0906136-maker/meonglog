"use client";

import { useState, type ReactNode } from "react";
import { BEHAVIOR_LABELS, formatDuration, type BehaviorKey } from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import { useMyDog, type Collection } from "@/lib/my-dog";
import { useStyle } from "@/lib/my-style";
import { DogArt } from "./DogCharacter";
import {
  BedArt,
  EatBowl,
  FloorArt,
  PlantArt,
  RugArt,
  ShelfArt,
  ToyArt,
  WallArt,
  Wallpaper,
  WaterBowl,
  WindowDeco,
} from "./RoomArt";

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

export default function MyRoom({
  collection,
  children,
  pinned = false,
}: {
  collection: Collection;
  pinned?: boolean; // 꾸미기 패널이 열려 있을 때 모바일에서 방을 화면 위에 고정해서, 바뀌는 모습을 바로 볼 수 있게 해요
  children?: ReactNode; // 방 아래에 붙는 영역 (옷장/방 꾸미기 버튼과 패널)
}) {
  const [selected, setSelected] = useState<BehaviorKey | null>(null);
  const { profile } = useMyDog();
  const {
    style: { room, outfit },
  } = useStyle();
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
      <div
        className={
          pinned
            ? "sticky top-[7.25rem] z-10 -mx-1 bg-background px-1 pb-2 pt-1 lg:static lg:mx-0 lg:bg-transparent lg:p-0"
            : ""
        }
      >
      <svg
        viewBox="0 0 640 420"
        role="group"
        aria-label="내 강아지의 방. 물건을 누르면 행동 도감 정보를 볼 수 있어요"
        className="h-auto w-full rounded-[1.75rem] shadow-soft"
      >
        {/* 벽 · 바닥 · 장식은 방 꾸미기에서 고른 모습이에요 (기본값은 꾸미기 전과 같아요) */}
        <Wallpaper id={room.wall} />
        <FloorArt id={room.floor} />
        <WallArt id={room.wallArt} photo={profile.photo} />
        <ShelfArt id={room.shelf} />
        <PlantArt id={room.plant} />
        <RugArt id={room.rug} />

        {/* 창문 → 주변 관찰 */}
        <Hotspot {...props("watch", 190, 46)}>
          <rect x="34" y="40" width="152" height="124" rx="20" fill="#fffdf8" />
          <rect x="44" y="50" width="132" height="104" rx="14" fill="#d8eaf2" />
          <path d="M110 50 V154 M44 102 H176" stroke="#fffdf8" strokeWidth="6" />
          <circle cx="70" cy="76" r="10" fill="#fbe9a8" />
          <path d="M126 134 q10 -15 25 -4 q15 -8 19 4z" fill="#fff" opacity="0.9" />
          <rect x="28" y="162" width="164" height="12" rx="6" fill="#e3d2b6" />
        </Hotspot>
        <WindowDeco id={room.windowDeco} />

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
          <BedArt id={room.bed} />
        </Hotspot>

        {/* 장난감 → 놀이 */}
        <Hotspot {...props("play", 440, 330)}>
          <ToyArt id={room.toy} />
        </Hotspot>

        {/* 밥그릇 → 식사 */}
        <Hotspot {...props("eat", 520, 336)}>
          <EatBowl id={room.bowls} />
        </Hotspot>

        {/* 물그릇 → 물 마시기 */}
        <Hotspot {...props("drink", 604, 336)}>
          <WaterBowl id={room.bowls} />
        </Hotspot>

        {/* 강아지 캐릭터 */}
        <g transform="translate(222 148) scale(0.98)">
          <g className="animate-float">
            <DogArt mood="idle" look={{ breed: profile.breed, coat: profile.coat }} outfit={outfit} />
          </g>
        </g>
      </svg>
      </div>

      {/* 선택한 물건 정보 */}
      <div
        aria-live="polite"
        className="card mt-4 !p-4 text-sm sm:!p-5"
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
      {children}
    </div>
  );
}
