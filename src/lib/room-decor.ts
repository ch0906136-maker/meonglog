// 방 꾸미기 카탈로그. 항목(slot)마다 선택지(options)가 있고, 하나씩 고를 수 있어요.
// 새 아이템: options에 한 줄 추가 + RoomArt.tsx에 같은 id의 그림 추가.
import { dex, FREE, lv, SOON, type UnlockRule } from "./unlocks";

export type RoomSlot =
  | "wall"
  | "wallArt"
  | "floor"
  | "rug"
  | "bed"
  | "shelf"
  | "bowls"
  | "plant"
  | "windowDeco"
  | "toy";

export type RoomOption = { id: string; name: string; icon: string; unlock: UnlockRule };

export type RoomCategoryId = "wall" | "floor" | "furniture" | "props" | "toys";

export const ROOM_CATEGORIES: { id: RoomCategoryId; label: string; icon: string }[] = [
  { id: "wall", label: "벽", icon: "🧱" },
  { id: "floor", label: "바닥", icon: "🪵" },
  { id: "furniture", label: "가구", icon: "🛏" },
  { id: "props", label: "소품", icon: "🌱" },
  { id: "toys", label: "장난감", icon: "🧸" },
];

export type RoomSlotDef = {
  slot: RoomSlot;
  label: string;
  category: RoomCategoryId;
  defaultId: string; // 처음 방 모습 (꾸미기 전 기본 방과 같아요)
  options: RoomOption[];
};

export const ROOM_SLOTS: RoomSlotDef[] = [
  {
    slot: "wall",
    label: "벽지",
    category: "wall",
    defaultId: "mint",
    options: [
      { id: "mint", name: "민트", icon: "🟩", unlock: FREE },
      { id: "cream", name: "크림", icon: "🟨", unlock: FREE },
      { id: "pink", name: "핑크", icon: "🩷", unlock: FREE },
      { id: "sky", name: "하늘", icon: "🟦", unlock: lv(2) },
      { id: "stripe", name: "줄무늬", icon: "📏", unlock: lv(3) },
      { id: "starry", name: "별무늬", icon: "✨", unlock: SOON },
    ],
  },
  {
    slot: "wallArt",
    label: "벽 장식",
    category: "wall",
    defaultId: "photo",
    options: [
      { id: "photo", name: "사진 액자", icon: "🖼️", unlock: FREE },
      { id: "garland", name: "가랜드", icon: "🎏", unlock: lv(2) },
      { id: "lights", name: "별 조명", icon: "💡", unlock: dex("watch") },
      { id: "none", name: "없음", icon: "⬜", unlock: FREE },
    ],
  },
  {
    slot: "floor",
    label: "바닥",
    category: "floor",
    defaultId: "wood",
    options: [
      { id: "wood", name: "나무", icon: "🪵", unlock: FREE },
      { id: "tile", name: "체크 타일", icon: "🏁", unlock: FREE },
      { id: "green", name: "연두 매트", icon: "🟢", unlock: lv(2) },
      { id: "dark", name: "진한 나무", icon: "🟫", unlock: lv(3) },
    ],
  },
  {
    slot: "rug",
    label: "러그",
    category: "floor",
    defaultId: "pink",
    options: [
      { id: "pink", name: "핑크", icon: "🩷", unlock: FREE },
      { id: "sky", name: "하늘", icon: "🩵", unlock: lv(2) },
      { id: "sunny", name: "노랑", icon: "💛", unlock: dex("play") },
      { id: "none", name: "없음", icon: "⬜", unlock: FREE },
    ],
  },
  {
    slot: "bed",
    label: "침대",
    category: "furniture",
    defaultId: "cozy",
    options: [
      { id: "cozy", name: "포근 침대", icon: "🛏️", unlock: FREE },
      { id: "rose", name: "로즈 침대", icon: "🌸", unlock: FREE },
      { id: "sky", name: "하늘 침대", icon: "☁️", unlock: lv(2) },
      { id: "cloud", name: "구름 침대", icon: "🫧", unlock: SOON },
    ],
  },
  {
    slot: "shelf",
    label: "선반",
    category: "furniture",
    defaultId: "books",
    options: [
      { id: "books", name: "책 선반", icon: "📚", unlock: FREE },
      { id: "plants", name: "화분 선반", icon: "🪴", unlock: lv(2) },
      { id: "none", name: "없음", icon: "⬜", unlock: FREE },
    ],
  },
  {
    slot: "bowls",
    label: "식기",
    category: "props",
    defaultId: "classic",
    options: [
      { id: "classic", name: "기본 식기", icon: "🥣", unlock: FREE },
      { id: "pastel", name: "파스텔 식기", icon: "🍥", unlock: lv(2) },
      { id: "wood", name: "원목 식기", icon: "🥢", unlock: dex("eat") },
    ],
  },
  {
    slot: "plant",
    label: "화분",
    category: "props",
    defaultId: "big",
    options: [
      { id: "big", name: "큰 화분", icon: "🌿", unlock: FREE },
      { id: "small", name: "작은 화분", icon: "🪴", unlock: FREE },
      { id: "flower", name: "꽃 화분", icon: "🌷", unlock: lv(3) },
      { id: "none", name: "없음", icon: "⬜", unlock: FREE },
    ],
  },
  {
    slot: "windowDeco",
    label: "창문 소품",
    category: "props",
    defaultId: "none",
    options: [
      { id: "none", name: "없음", icon: "⬜", unlock: FREE },
      { id: "curtain", name: "커튼", icon: "🎀", unlock: FREE },
      { id: "sillplant", name: "창틀 화분", icon: "🌱", unlock: lv(2) },
    ],
  },
  {
    slot: "toy",
    label: "작은 장난감",
    category: "toys",
    defaultId: "ball",
    options: [
      { id: "ball", name: "공", icon: "🎾", unlock: FREE },
      { id: "bone", name: "뼈다귀", icon: "🦴", unlock: lv(2) },
      { id: "bear", name: "곰인형", icon: "🧸", unlock: dex("play") },
      { id: "duck", name: "오리 인형", icon: "🦆", unlock: SOON },
    ],
  },
];

export type RoomState = Record<RoomSlot, string>;

export const DEFAULT_ROOM: RoomState = Object.fromEntries(
  ROOM_SLOTS.map((s) => [s.slot, s.defaultId]),
) as RoomState;

export function slotDef(slot: RoomSlot): RoomSlotDef {
  return ROOM_SLOTS.find((s) => s.slot === slot)!;
}
