// 내 강아지 프로필의 선택지와 캐릭터 외형 규칙 (화면 표시용)
// - 성별/나이 등 프로필 정보는 AI 분석(Gemini)에 전달하지 않아요. 화면에서 보여주기만 해요.

export const BREEDS = [
  "말티즈",
  "푸들",
  "포메라니안",
  "비숑",
  "치와와",
  "시츄",
  "골든리트리버",
  "웰시코기",
  "믹스견",
  "잘 모르겠어요",
] as const;
export type Breed = (typeof BREEDS)[number];

export const COATS = [
  { value: "white", label: "화이트", swatch: "#fbf7f0" },
  { value: "cream", label: "크림", swatch: "#f0dcb4" },
  { value: "gold", label: "골드", swatch: "#e2a955" },
  { value: "brown", label: "갈색", swatch: "#a97a50" },
  { value: "black", label: "검정", swatch: "#403933" },
  { value: "gray", label: "회색", swatch: "#aeb2b9" },
  { value: "two", label: "투톤", swatch: "#c28d5b" },
] as const;
export type CoatValue = (typeof COATS)[number]["value"];

export const GENDERS = [
  { value: "male", label: "남아" },
  { value: "female", label: "여아" },
] as const;
export type GenderValue = (typeof GENDERS)[number]["value"];

export const MAX_AGE_YEARS = 20;

export function coatLabel(v: string): string {
  return COATS.find((c) => c.value === v)?.label ?? "";
}
export function genderLabel(v: string): string {
  return GENDERS.find((g) => g.value === v)?.label ?? "";
}
export function ageLabel(years: number | null): string {
  if (years === null) return "";
  return years === 0 ? "1살 미만" : `${years}살`;
}

// ───────── 캐릭터 외형 ─────────

export type DogLook = { breed?: string; coat?: string };

export type Palette = {
  head: string;
  shade: string;
  body: string;
  belly: string;
  feet: string;
  ear: string;
  snout: string;
  tail: string;
  nose: string;
};

// 털색을 고르지 않았을 때 쓰는 기본 캐릭터 색 (처음 만든 캐릭터 그대로예요)
const DEFAULT_PALETTE: Palette = {
  head: "#f3dcb9",
  shade: "#e2bd8c",
  body: "#ecd0a8",
  belly: "#fff4e3",
  feet: "#f6e2c4",
  ear: "#b98a5e",
  snout: "#fff6e8",
  tail: "#e0bd8e",
  nose: "#4a3a30",
};

const PALETTES: Record<CoatValue, Palette> = {
  white: { head: "#fbf7f0", shade: "#eee5d6", body: "#f3ece1", belly: "#fffdf8", feet: "#f8f2e8", ear: "#e6dccb", snout: "#fffdf8", tail: "#eee5d6", nose: "#3a2e26" },
  cream: { head: "#f6e6c4", shade: "#e9d3a6", body: "#f0dcb4", belly: "#fff4de", feet: "#f7e9cc", ear: "#dfc08a", snout: "#fff6e4", tail: "#ead3a4", nose: "#4a3a30" },
  gold: { head: "#eab96a", shade: "#d49a45", body: "#e2a955", belly: "#f7dba8", feet: "#efc27f", ear: "#bf7f2e", snout: "#f8e3b8", tail: "#d79c48", nose: "#4a3a30" },
  brown: { head: "#b98a5e", shade: "#9d7048", body: "#a97a50", belly: "#e8cfae", feet: "#c19468", ear: "#7d5233", snout: "#ecd6b6", tail: "#9d7048", nose: "#2f241d" },
  black: { head: "#4b433d", shade: "#3a332e", body: "#403933", belly: "#6b625b", feet: "#51493f", ear: "#2d2824", snout: "#7a7067", tail: "#3a332e", nose: "#1b1613" },
  gray: { head: "#bcc0c6", shade: "#a3a8b0", body: "#aeb2b9", belly: "#e3e5e8", feet: "#c4c7cd", ear: "#8c919a", snout: "#eceef0", tail: "#a3a8b0", nose: "#3a3d42" },
  two: { head: "#fbf3e6", shade: "#c28d5b", body: "#f5ead8", belly: "#fffaf0", feet: "#f8efdf", ear: "#b98a5e", snout: "#fffaf0", tail: "#e6d3b6", nose: "#3a2e26" },
};

export function paletteFor(coat?: string): Palette {
  return (PALETTES as Record<string, Palette | undefined>)[coat ?? ""] ?? DEFAULT_PALETTE;
}

// 견종에 따라 귀 모양만 살짝 달라져요. (정교한 견종별 일러스트는 아직 아니에요)
export type EarStyle = "floppy" | "pointy" | "puff";

export function earStyleFor(breed?: string): EarStyle {
  if (breed === "치와와" || breed === "웰시코기" || breed === "포메라니안") return "pointy";
  if (breed === "푸들" || breed === "비숑") return "puff";
  return "floppy";
}
