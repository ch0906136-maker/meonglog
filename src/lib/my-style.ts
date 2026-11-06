"use client";

// 옷장/방 꾸미기 선택 상태. 이 브라우저(localStorage)에만 저장해요.
// - 기록(my-dog)과 키를 분리해서, "기록 지우기"를 해도 꾸민 모습은 그대로 남아요.
// - 서버/DB/API는 건드리지 않아요.
import { useMemo, useSyncExternalStore } from "react";
import { useMyDog } from "./my-dog";
import { DEFAULT_ROOM, ROOM_SLOTS, type RoomSlot, type RoomState } from "./room-decor";
import { isUnlocked, unlockCtx, type UnlockCtx } from "./unlocks";
import { NO_OUTFIT, OUTFITS, type OutfitSelection, type OutfitSlot } from "./wardrobe";

export type StyleState = { outfit: OutfitSelection; room: RoomState };

const KEY = "meonglog:my-style:v1";
const EMPTY: StyleState = { outfit: NO_OUTFIT, room: DEFAULT_ROOM };

function parse(raw: string | null): StyleState {
  if (!raw) return EMPTY;
  try {
    const o = JSON.parse(raw) as { outfit?: Record<string, unknown>; room?: Record<string, unknown> };
    const outfit: OutfitSelection = { ...NO_OUTFIT };
    for (const slot of Object.keys(NO_OUTFIT) as OutfitSlot[]) {
      const id = o.outfit?.[slot];
      if (OUTFITS.some((i) => i.id === id && i.slot === slot)) outfit[slot] = id as string;
    }
    const room: RoomState = { ...DEFAULT_ROOM };
    for (const def of ROOM_SLOTS) {
      const id = o.room?.[def.slot];
      if (def.options.some((op) => op.id === id)) room[def.slot] = id as string;
    }
    return { outfit, room };
  } catch {
    return EMPTY;
  }
}

let cachedRaw: string | null | undefined;
let cachedData: StyleState = EMPTY;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): StyleState {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedData;
  cachedRaw = raw;
  cachedData = parse(raw);
  return cachedData;
}

function getServerSnapshot(): StyleState {
  return EMPTY;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(data: StyleState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장 공간이 막혀 있어도 화면은 계속 동작해요. (선택이 새로고침 후 유지되지 않을 뿐이에요)
  }
  // 저장에 실패해도 이번 화면에는 바로 반영해요.
  cachedRaw = readRaw();
  cachedData = data;
  listeners.forEach((l) => l());
}

export function setOutfit(slot: OutfitSlot, id: string | null) {
  const cur = getSnapshot();
  write({ ...cur, outfit: { ...cur.outfit, [slot]: id } });
}

export function setRoomItem(slot: RoomSlot, id: string) {
  const cur = getSnapshot();
  write({ ...cur, room: { ...cur.room, [slot]: id } });
}

export function resetRoom() {
  write({ ...getSnapshot(), room: DEFAULT_ROOM });
}

// 저장된 선택 중 아직 잠겨 있는 것(예: 기록을 지운 뒤)은 기본값으로 보여줘요. 선택 자체는 지우지 않아요.
export function resolveStyle(style: StyleState, ctx: UnlockCtx): StyleState {
  const outfit: OutfitSelection = { ...NO_OUTFIT };
  for (const slot of Object.keys(NO_OUTFIT) as OutfitSlot[]) {
    const item = OUTFITS.find((i) => i.id === style.outfit[slot]);
    if (item && isUnlocked(item.unlock, ctx)) outfit[slot] = item.id;
  }
  const room: RoomState = { ...DEFAULT_ROOM };
  for (const def of ROOM_SLOTS) {
    const op = def.options.find((o) => o.id === style.room[def.slot]);
    if (op && isUnlocked(op.unlock, ctx)) room[def.slot] = op.id;
  }
  return { outfit, room };
}

// 화면에 실제로 보여줄 모습(해금된 것만) + 해금 판단에 쓴 ctx
export function useStyle(): { style: StyleState; ctx: UnlockCtx } {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { records } = useMyDog();
  const ctx = useMemo(() => unlockCtx(records), [records]);
  const style = useMemo(() => resolveStyle(raw, ctx), [raw, ctx]);
  return { style, ctx };
}
