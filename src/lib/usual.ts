// "평소와 다른 점": 이번 영상의 행동 비율을, 이전 분석 영상들의 평균 비율과 비교해요. (순수 계산, 서버/브라우저 공용)
// - 입력은 항상 실제 분석 결과(Supabase behaviors에서 계산한 행동별 초)예요. 가짜/샘플 수치는 쓰지 않아요.
// - 현재 영상은 평균(기준)에 넣지 않아요. 평균은 "현재 영상을 뺀 다른 분석들"로만 만들어요.
// - 평균은 영상마다 행동 비율을 먼저 구한 뒤 그 비율들을 평균내요. (긴 영상 하나가 평균을 좌우하지 않게)
import {
  BEHAVIOR_KEYS,
  BEHAVIOR_LABELS,
  type Baseline,
  type BehaviorKey,
  type SecondsByBehavior,
} from "./behaviors";

// 분석 완료된 서로 다른 영상이 이 개수 이상이면 기능이 열려요. (현재 영상 포함)
export const MIN_ANALYSES_FOR_USUAL = 5;
// 한 번에 비교에 쓰는 최대 분석 개수 (현재 영상 포함)
export const MAX_ANALYSES_FOR_USUAL = 50;

// 화면에 보여줄 "의미 있는 차이"의 기준 (퍼센트포인트)
const MIN_DIFF_POINTS = 10; // 이만큼 이상 차이 나면 항상 의미 있다고 봐요
const MIN_DIFF_POINTS_RELATIVE = 5; // 5%p 이상이면서
const MIN_RELATIVE_CHANGE = 0.5; // 평소 대비 50% 이상 변했을 때도 의미 있다고 봐요
export const MAX_DIFFS = 3;

// 서버(/api/usual)가 돌려주는 모양: 분석 하나의 행동별 관찰 시간(초, 확신 있는 구간만)
export type UsualAnalysis = { id: string; seconds: SecondsByBehavior };
export type UsualPayload = { analyses: UsualAnalysis[] };

function total(s: SecondsByBehavior): number {
  return BEHAVIOR_KEYS.reduce((sum, k) => sum + s[k], 0);
}

// 행동별 비율(합계 1). 관찰된 시간이 없으면 null이에요.
export function shares(s: SecondsByBehavior): Baseline | null {
  const t = total(s);
  if (!(t > 0)) return null;
  return Object.fromEntries(BEHAVIOR_KEYS.map((k) => [k, s[k] / t])) as Baseline;
}

// 여러 영상의 행동 비율 평균. 관찰 시간이 없는 영상은 건너뛰고, 쓸 수 있는 영상이 없으면 null이에요.
export function averageBaseline(list: SecondsByBehavior[]): { baseline: Baseline; count: number } | null {
  const ratios = list.map(shares).filter((r): r is Baseline => r !== null);
  if (ratios.length === 0) return null;
  const baseline = Object.fromEntries(
    BEHAVIOR_KEYS.map((k) => [k, ratios.reduce((sum, r) => sum + r[k], 0) / ratios.length]),
  ) as Baseline;
  return { baseline, count: ratios.length };
}

// 문장에서 쓰는 행동 이름 ("평소보다 ○○ 시간이 길어요")
const NOUN: Record<BehaviorKey, string> = {
  rest: "휴식",
  move: "걷기·이동",
  play: "놀이",
  watch: "주변 관찰",
  eat: "식사",
  drink: "물 마시기",
  bark: "짖는",
  etc: "기타",
};

export type UsualDiff = {
  key: BehaviorKey;
  label: string; // 행동 이름 (휴식/멈춤 등)
  direction: "up" | "down";
  usualPercent: number; // 평소 평균 (반올림 %)
  currentPercent: number; // 이번 영상 (반올림 %)
  diffPoints: number; // 차이 (%p, 부호 있음)
  text: string; // "평소보다 휴식 시간이 길어요"
};

export type UsualResult = {
  baselineCount: number; // 평균을 만든 이전 영상 수
  diffs: UsualDiff[]; // 의미 있는 차이 (큰 순서, 최대 MAX_DIFFS개)
};

// 이번 영상(current)을 이전 영상들(others)의 평균과 비교해요.
// 비교할 수 없으면(이번 영상에 관찰된 행동이 없거나 이전 영상이 없으면) null이에요.
export function compareToUsual(current: SecondsByBehavior, others: SecondsByBehavior[]): UsualResult | null {
  const cur = shares(current);
  const avg = averageBaseline(others);
  if (!cur || !avg) return null;

  const diffs: UsualDiff[] = [];
  for (const key of BEHAVIOR_KEYS) {
    if (key === "etc") continue; // 기타/판단 어려움은 의미를 해석하지 않아요
    const usual = avg.baseline[key] * 100;
    const now = cur[key] * 100;
    const diff = now - usual;
    const abs = Math.abs(diff);
    const relative = abs / Math.max(usual, 1);
    const meaningful =
      abs >= MIN_DIFF_POINTS || (abs >= MIN_DIFF_POINTS_RELATIVE && relative >= MIN_RELATIVE_CHANGE);
    if (!meaningful) continue;
    const up = diff > 0;
    // 식사/물 마시기가 "적다"는 짧은 영상에 그 장면이 없었을 뿐일 수 있어서 보여주지 않아요.
    if (!up && (key === "eat" || key === "drink")) continue;
    diffs.push({
      key,
      label: BEHAVIOR_LABELS[key],
      direction: up ? "up" : "down",
      usualPercent: Math.round(usual),
      currentPercent: Math.round(now),
      diffPoints: Math.round(diff),
      text: `평소보다 ${NOUN[key]} 시간이 ${up ? "길어요" : "적어요"}`,
    });
  }
  diffs.sort((a, b) => Math.abs(b.diffPoints) - Math.abs(a.diffPoints));
  return { baselineCount: avg.count, diffs: diffs.slice(0, MAX_DIFFS) };
}
