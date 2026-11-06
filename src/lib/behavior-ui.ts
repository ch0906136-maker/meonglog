// 화면 표시용: 행동 아이콘과 기본 강아지 이름 (데이터/DB와 무관한 UI 상수)
import type { BehaviorKey } from "./behaviors";

export const BEHAVIOR_ICONS: Record<BehaviorKey, string> = {
  rest: "💤",
  move: "🐾",
  play: "🎾",
  watch: "👀",
  eat: "🍚",
  drink: "💧",
  bark: "🔊",
  etc: "❔",
};

// 아직 강아지 프로필 기능이 없어서 화면 문구에 쓰는 기본 이름이에요. (분석 데이터에는 저장되지 않아요)
export const DOG_NAME = "초코";
