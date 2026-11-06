// 옷장 카탈로그. 새 옷을 추가하려면 OUTFITS에 한 줄을 넣고, DogOutfit.tsx에 같은 id의 그림만 추가하면 돼요.
import { dex, FREE, SOON, type UnlockRule } from "./unlocks";

export type OutfitSlot = "body" | "head" | "neck";

export type OutfitItem = {
  id: string;
  name: string;
  slot: OutfitSlot;
  icon: string;
  unlock: UnlockRule;
};

export const OUTFIT_SLOTS: { slot: OutfitSlot; label: string; basic: string }[] = [
  { slot: "body", label: "옷", basic: "기본" },
  { slot: "head", label: "머리", basic: "없음" },
  { slot: "neck", label: "목", basic: "없음" },
];

export const OUTFITS: OutfitItem[] = [
  { id: "hoodie", name: "후드티", slot: "body", icon: "🧥", unlock: FREE },
  { id: "knit", name: "니트", slot: "body", icon: "🧶", unlock: FREE },
  { id: "overalls", name: "멜빵", slot: "body", icon: "👖", unlock: FREE },
  { id: "raincoat", name: "레인코트", slot: "body", icon: "🌧️", unlock: SOON },
  { id: "ribbon", name: "리본", slot: "head", icon: "🎀", unlock: FREE },
  { id: "hat", name: "모자", slot: "head", icon: "🧢", unlock: FREE },
  { id: "crown", name: "왕관", slot: "head", icon: "👑", unlock: SOON },
  { id: "scarf", name: "목도리", slot: "neck", icon: "🧣", unlock: FREE },
  { id: "bell", name: "방울 목걸이", slot: "neck", icon: "🔔", unlock: dex("bark") },
];

export type OutfitSelection = Record<OutfitSlot, string | null>;
export const NO_OUTFIT: OutfitSelection = { body: null, head: null, neck: null };

export function outfitById(id: string | null | undefined): OutfitItem | undefined {
  return OUTFITS.find((o) => o.id === id);
}
