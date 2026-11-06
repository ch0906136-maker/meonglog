// 옷/방 아이템 해금 규칙. 해금은 실제 분석 기록(레벨, 도감에 담긴 행동)으로만 결정돼요.
import { BEHAVIOR_KEYS, BEHAVIOR_LABELS, type BehaviorKey } from "./behaviors";
import { getCollection, getProgress, type MyDogRecord } from "./my-dog";

export type UnlockRule =
  | { type: "free" }
  | { type: "level"; level: number }
  | { type: "dex"; behavior: BehaviorKey }
  | { type: "soon" }; // 아직 만들지 않은 아이템 (잠금 + "준비 중")

export type UnlockCtx = { level: number; found: ReadonlySet<BehaviorKey> };

export const FREE: UnlockRule = { type: "free" };
export const lv = (level: number): UnlockRule => ({ type: "level", level });
export const dex = (behavior: BehaviorKey): UnlockRule => ({ type: "dex", behavior });
export const SOON: UnlockRule = { type: "soon" };

export function unlockCtx(records: MyDogRecord[]): UnlockCtx {
  const collection = getCollection(records);
  return {
    level: getProgress(records).level,
    found: new Set(BEHAVIOR_KEYS.filter((k) => collection[k].count > 0)),
  };
}

export function isUnlocked(rule: UnlockRule, ctx: UnlockCtx): boolean {
  switch (rule.type) {
    case "free":
      return true;
    case "level":
      return ctx.level >= rule.level;
    case "dex":
      return ctx.found.has(rule.behavior);
    case "soon":
      return false;
  }
}

export function unlockText(rule: UnlockRule): string {
  switch (rule.type) {
    case "free":
      return "기본 제공";
    case "level":
      return `Lv.${rule.level} 달성하면 해금`;
    case "dex":
      return `${BEHAVIOR_LABELS[rule.behavior]} 행동을 발견하면 해금`;
    case "soon":
      return "준비 중";
  }
}
