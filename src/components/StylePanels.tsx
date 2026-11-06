"use client";

// 옷장 / 방 꾸미기 패널. 선택하면 캐릭터와 방에 바로 적용되고 이 기기에 저장돼요.
// 잠긴 아이템은 해금 조건을 보여줘요. 해금은 실제 분석 기록(레벨, 도감)으로만 열려요.
import { useState } from "react";
import { useStyle, resetRoom, setOutfit, setRoomItem } from "@/lib/my-style";
import { useMyDog } from "@/lib/my-dog";
import { ROOM_CATEGORIES, ROOM_SLOTS, type RoomCategoryId } from "@/lib/room-decor";
import { isUnlocked, unlockText, type UnlockRule } from "@/lib/unlocks";
import { OUTFIT_SLOTS, OUTFITS, outfitById } from "@/lib/wardrobe";
import DogCharacter from "./DogCharacter";

function ItemChip({
  icon,
  name,
  selected,
  rule,
  unlocked,
  onPick,
}: {
  icon: string;
  name: string;
  selected: boolean;
  rule?: UnlockRule;
  unlocked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!unlocked}
      aria-pressed={selected}
      className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2.5 text-center text-sm transition active:scale-[0.97] ${
        selected
          ? "bg-brand-soft font-bold text-brand-dark ring-2 ring-brand"
          : unlocked
            ? "bg-background hover:-translate-y-0.5 hover:bg-beige/70"
            : "cursor-not-allowed bg-background/60 text-muted"
      }`}
    >
      <span aria-hidden className={`text-2xl leading-none ${unlocked ? "" : "grayscale opacity-60"}`}>
        {unlocked ? icon : "🔒"}
      </span>
      <span className="leading-tight">{name}</span>
      {!unlocked && rule && <span className="text-[11px] leading-tight">{unlockText(rule)}</span>}
      {selected && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
          착용·선택
        </span>
      )}
    </button>
  );
}

function PanelHeader({ title, hint, onClose }: { title: string; hint: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-muted transition hover:bg-beige active:scale-95"
      >
        ✕
      </button>
    </div>
  );
}

export function WardrobePanel({ onClose }: { onClose: () => void }) {
  const { style, ctx } = useStyle();
  const { profile } = useMyDog();
  const worn = OUTFIT_SLOTS.map((s) => outfitById(style.outfit[s.slot])).filter(Boolean);
  const unlockedCount = OUTFITS.filter((o) => isUnlocked(o.unlock, ctx)).length;

  return (
    <section aria-label="옷장" className="card animate-fade-up">
      <PanelHeader
        title="👕 옷장"
        hint={`선택하면 바로 입혀져요 · 해금 ${unlockedCount}/${OUTFITS.length}`}
        onClose={onClose}
      />

      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-brand-soft p-3.5">
        <DogCharacter
          className="h-24 w-24 shrink-0"
          label="옷을 입은 강아지 미리보기"
          look={{ breed: profile.breed, coat: profile.coat }}
          outfit={style.outfit}
        />
        <div className="min-w-0 text-sm">
          <p className="font-bold text-brand-dark">지금 입고 있는 옷</p>
          <p className="mt-1 leading-relaxed text-foreground/80">
            {worn.length > 0 ? worn.map((o) => `${o!.icon} ${o!.name}`).join("  ") : "기본 모습이에요"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {OUTFIT_SLOTS.map(({ slot, label, basic }) => (
          <div key={slot}>
            <h3 className="mb-2 text-sm font-bold text-foreground/80">{label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ItemChip
                icon="🐶"
                name={basic}
                selected={style.outfit[slot] === null}
                unlocked
                onPick={() => setOutfit(slot, null)}
              />
              {OUTFITS.filter((o) => o.slot === slot).map((o) => (
                <ItemChip
                  key={o.id}
                  icon={o.icon}
                  name={o.name}
                  rule={o.unlock}
                  unlocked={isUnlocked(o.unlock, ctx)}
                  selected={style.outfit[slot] === o.id}
                  onPick={() => setOutfit(slot, style.outfit[slot] === o.id ? null : o.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted">
        영상을 분석해서 레벨이 오르거나 새 행동을 발견하면 새 옷이 열려요. 선택은 이 기기에 저장돼요.
      </p>
    </section>
  );
}

export function DecorPanel({ onClose }: { onClose: () => void }) {
  const { style, ctx } = useStyle();
  const [category, setCategory] = useState<RoomCategoryId>("wall");
  const all = ROOM_SLOTS.flatMap((s) => s.options);
  const unlockedCount = all.filter((o) => isUnlocked(o.unlock, ctx)).length;

  return (
    <section aria-label="방 꾸미기" className="card animate-fade-up">
      <PanelHeader
        title="🏠 방 꾸미기"
        hint={`고르면 방에 바로 적용돼요 · 해금 ${unlockedCount}/${all.length}`}
        onClose={onClose}
      />

      <div role="tablist" aria-label="꾸미기 종류" className="mt-4 flex flex-wrap gap-2">
        {ROOM_CATEGORIES.map((c) => {
          const on = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setCategory(c.id)}
              className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition active:scale-95 ${
                on ? "bg-brand text-white shadow-soft" : "bg-beige text-foreground/80 hover:bg-beige/70"
              }`}
            >
              <span aria-hidden>{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-5 space-y-5">
        {ROOM_SLOTS.filter((s) => s.category === category).map((def) => (
          <div key={def.slot}>
            <h3 className="mb-2 text-sm font-bold text-foreground/80">{def.label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {def.options.map((o) => (
                <ItemChip
                  key={o.id}
                  icon={o.icon}
                  name={o.name}
                  rule={o.unlock}
                  unlocked={isUnlocked(o.unlock, ctx)}
                  selected={style.room[def.slot] === o.id}
                  onPick={() => setRoomItem(def.slot, o.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-muted">
          영상을 분석하면 새 아이템이 열려요. 선택은 이 기기에 저장돼요.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("방을 처음 모습으로 되돌릴까요?")) resetRoom();
          }}
          className="btn-secondary"
        >
          ↺ 기본 방으로
        </button>
      </div>
    </section>
  );
}
