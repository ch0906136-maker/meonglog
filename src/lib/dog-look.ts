// 내 강아지 프로필의 선택지와 캐릭터 외형 규칙 (화면 표시용)
// - 견종/털색/성별/생일은 사용자가 직접 고르는 프로필 정보예요. AI 분석(Gemini)에는 전달하지 않고,
//   AI가 영상에서 견종을 추측하거나 판별하지도 않아요. 화면에서 보여주고 캐릭터 모습에만 쓰여요.

export const BREEDS = [
  "말티즈",
  "푸들",
  "포메라니안",
  "비숑",
  "치와와",
  "골든 리트리버",
  "웰시코기",
  "시바견",
  "시츄",
  "믹스견",
  "기타/모름",
] as const;
export type Breed = (typeof BREEDS)[number];

// 이전 버전에서 저장된 이름도 읽을 수 있게 바꿔 줘요. 모르는 값은 "" (선택 안 함)이에요.
const LEGACY_BREEDS: Record<string, Breed> = {
  골든리트리버: "골든 리트리버",
  "잘 모르겠어요": "기타/모름",
};
export function normalizeBreed(v: unknown): string {
  if (typeof v !== "string") return "";
  if ((BREEDS as readonly string[]).includes(v)) return v;
  return LEGACY_BREEDS[v] ?? "";
}

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

// 털색을 고르지 않았을 때, 견종을 고른 경우에는 그 견종에 흔한 털색으로 보여줘요.
// (사용자가 털색을 고르면 항상 그 색이 우선이에요. 믹스견/기타는 기본 캐릭터 색 그대로예요.)
const BREED_DEFAULT_COAT: Record<string, CoatValue> = {
  말티즈: "white",
  푸들: "cream",
  포메라니안: "gold",
  비숑: "white",
  치와와: "cream",
  "골든 리트리버": "gold",
  웰시코기: "gold",
  시바견: "gold",
  시츄: "two",
};

export function effectiveCoat(coat?: string, breed?: string): CoatValue | "" {
  if (COATS.some((c) => c.value === coat)) return coat as CoatValue;
  return BREED_DEFAULT_COAT[breed ?? ""] ?? "";
}

export function paletteFor(coat?: string, breed?: string): Palette {
  const c = effectiveCoat(coat, breed);
  return c ? PALETTES[c] : DEFAULT_PALETTE;
}

// ───────── 견종별 체형/특징 ─────────
// 실제 견종 사진처럼 그리지 않고, 몽글몽글한 캐릭터 스타일 안에서 그 견종답게 보이는 특징만 살려요.
// 새 견종을 추가하려면 BREEDS에 이름을 넣고 아래 TRAITS에 특징을 적으면 돼요. (없으면 기본 모습이에요)

export type EarStyle =
  | "floppy"
  | "round" // 작고 둥근 귀 (말티즈)
  | "silky" // 길게 늘어진 털 귀 (시츄)
  | "curlydrop" // 곱슬곱슬하게 늘어진 귀 (푸들)
  | "pointy"
  | "bigpointy"
  | "upright"
  | "puff"
  | "none";
export type FurStyle = "none" | "curly" | "cloud" | "fluffy" | "silky" | "feathered";
export type TailStyle = "plain" | "curl" | "plume" | "stub" | "pom";
export type FaceStyle = "round" | "flat";
export type MarkingStyle = "none" | "corgi" | "shiba";

export type BodyBox = { rx: number; ry: number; cy: number };

export type BreedTraits = {
  ears: EarStyle; // 귀 모양
  fur: FurStyle; // 털 질감 (곱슬/솜뭉치/풍성/긴 털/깃털)
  tail: TailStyle;
  face: FaceStyle; // flat = 납작한 얼굴(짧은 주둥이)
  marking: MarkingStyle; // 견종 특유의 흰 무늬
  scale: number; // 전체 크기 (작은 견종은 작게, 큰 견종은 크게)
  body: BodyBox; // 몸통 크기/위치
  feet: { dx: number; rx: number; ry: number; y: number }; // 발 (짧은 다리 표현)
  eye: number; // 눈 크기 배율
  head: number; // 머리 크기 배율 (작은 얼굴/큰 얼굴)
};

export const DEFAULT_TRAITS: BreedTraits = {
  ears: "floppy",
  fur: "none",
  tail: "plain",
  face: "round",
  marking: "none",
  scale: 1,
  body: { rx: 46, ry: 34, cy: 158 },
  feet: { dx: 28, rx: 15, ry: 9, y: 188 },
  eye: 1,
  head: 1,
};

const TRAITS: Record<string, Partial<BreedTraits>> = {
  // 작고 둥근 귀에 풍성한 흰 털: 머리 위 묶음 털과 몸 아래로 내려오는 긴 털
  말티즈: { ears: "round", fur: "silky", scale: 0.93 },
  // 곱슬곱슬: 곱슬곱슬 늘어진 귀, 머리 장식, 다리/꼬리에 포근한 방울
  푸들: { ears: "curlydrop", fur: "curly", tail: "pom", scale: 0.97 },
  // 풍성한 털: 목 주변이 사자갈기처럼 퍼지고 꼬리가 둥글게 말려요
  포메라니안: { ears: "pointy", fur: "fluffy", tail: "curl", scale: 0.94 },
  // 솜뭉치: 귀가 털에 묻힌 동그란 구름 머리
  비숑: { ears: "none", fur: "cloud", tail: "curl", scale: 0.95 },
  // 작은 체구와 작은 얼굴에 크고 쫑긋한 귀, 큰 눈
  치와와: { ears: "bigpointy", scale: 0.88, eye: 1.2, head: 0.88 },
  // 큰 체형, 처진 귀, 깃털 같은 털과 풍성한 꼬리
  "골든 리트리버": {
    ears: "floppy",
    fur: "feathered",
    tail: "plume",
    scale: 1.05,
    body: { rx: 50, ry: 36, cy: 157 },
    feet: { dx: 30, rx: 16, ry: 9, y: 188 },
  },
  // 짧은 다리(낮고 긴 몸 + 아주 작은 발), 큰 귀, 흰 얼굴 줄무늬와 가슴
  웰시코기: {
    ears: "bigpointy",
    marking: "corgi",
    tail: "stub",
    body: { rx: 54, ry: 28, cy: 164 },
    feet: { dx: 36, rx: 11, ry: 6, y: 193 },
  },
  // 작고 뾰족한 서 있는 귀, 하얀 볼과 눈썹 점(시바 특유의 얼굴), 말린 꼬리
  시바견: { ears: "upright", marking: "shiba", tail: "curl", scale: 0.98 },
  // 납작한 얼굴, 길게 늘어진 귀와 머리 위 묶음 털
  시츄: { ears: "silky", fur: "silky", face: "flat", scale: 0.93, eye: 1.1 },
};

export function traitsFor(breed?: string): BreedTraits {
  return { ...DEFAULT_TRAITS, ...(TRAITS[breed ?? ""] ?? {}) };
}
