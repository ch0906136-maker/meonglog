// 행동 분류, 통계, "평소와 다른 점" 계산 (데모/실제 결과 공용)

export const BEHAVIOR_KEYS = [
  "rest",
  "move",
  "play",
  "watch",
  "eat",
  "drink",
  "bark",
  "etc",
] as const;

export type BehaviorKey = (typeof BEHAVIOR_KEYS)[number];

export function isBehaviorKey(v: unknown): v is BehaviorKey {
  return typeof v === "string" && (BEHAVIOR_KEYS as readonly string[]).includes(v);
}

export const BEHAVIOR_LABELS: Record<BehaviorKey, string> = {
  rest: "휴식/멈춤",
  move: "걷기/이동",
  play: "놀이",
  watch: "주변 관찰",
  eat: "식사",
  drink: "물 마시기",
  bark: "짖기",
  etc: "기타/판단 어려움",
};

export const BEHAVIOR_COLORS: Record<BehaviorKey, string> = {
  rest: "#6f8f72",
  move: "#c8772e",
  play: "#e0a458",
  watch: "#d4b04a",
  eat: "#b5654a",
  drink: "#6c9bb5",
  bark: "#8c6a9e",
  etc: "#b8aca1",
};

// 영상 속 행동 구간 (초 단위)
export type Segment = {
  behavior: BehaviorKey;
  startSec: number;
  endSec: number;
  note: string | null;
  confidence?: number | null; // 0~1. 없으면(null/undefined) 확신 있는 것으로 봐요.
};

// 이 값 미만의 구간은 "불확실"로 처리해서 통계/글에 반영하지 않고 따로 보여줘요.
export const MIN_CONFIDENCE = 0.6;

export function isConfident(s: { confidence?: number | null }): boolean {
  return s.confidence == null || s.confidence >= MIN_CONFIDENCE;
}

// "평소" 행동 비율 (행동별 0~1, 합계 1). 값은 baseline.ts의 getBaseline()에서 가져와요.
export type Baseline = Record<BehaviorKey, number>;

export type SecondsByBehavior = Record<BehaviorKey, number>;

export function emptySeconds(): SecondsByBehavior {
  return { rest: 0, move: 0, play: 0, watch: 0, eat: 0, drink: 0, bark: 0, etc: 0 };
}

export function secondsFromSegments(segments: Segment[]): SecondsByBehavior {
  const seconds = emptySeconds();
  for (const s of segments) seconds[s.behavior] += Math.max(0, s.endSec - s.startSec);
  return seconds;
}

export type Stat = {
  key: BehaviorKey;
  label: string;
  color: string;
  seconds: number;
  percent: number;
  // 과거 데이터가 충분해서 baseline이 있을 때만 값이 있어요. (없으면 null)
  usualPercent: number | null;
  changePercent: number | null;
};

export function getStats(seconds: SecondsByBehavior, usual: Baseline | null): Stat[] {
  const total = BEHAVIOR_KEYS.reduce((sum, k) => sum + seconds[k], 0);
  return BEHAVIOR_KEYS.map((key) => {
    const share = total > 0 ? seconds[key] / total : 0;
    return {
      key,
      label: BEHAVIOR_LABELS[key],
      color: BEHAVIOR_COLORS[key],
      seconds: seconds[key],
      percent: Math.round(share * 100),
      usualPercent: usual ? Math.round(usual[key] * 100) : null,
      changePercent:
        usual && usual[key] > 0 ? Math.round(((share - usual[key]) / usual[key]) * 100) : null,
    };
  });
}

// 평소 비율과 30% 이상, 그리고 2%p 이상 차이 나는 행동만 "평소와 다른 점"으로 보여줘요.
// 의료적 판단 없이 관찰된 변화만 표현합니다.
// 식사/물 마시기가 "줄어든" 것은 짧은 영상에 장면이 없었을 뿐일 수 있어서 제외해요.
export type ChangedStat = Stat & { usualPercent: number; changePercent: number };

export function getChanges(stats: Stat[]): ChangedStat[] {
  return stats
    .filter(
      (s): s is ChangedStat =>
        s.usualPercent !== null &&
        s.changePercent !== null &&
        s.key !== "etc" &&
        !((s.key === "eat" || s.key === "drink") && s.changePercent < 0) &&
        Math.abs(s.changePercent) >= 30 &&
        Math.abs(s.percent - s.usualPercent) >= 2,
    )
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

// 영상 하나만으로 만든 결과에서 보여줄 "영상에서 확인된 특징" (baseline 비교 없이 계산)
export type VideoHighlights = {
  observedSec: number; // 확신 있게 분류된 시간 합계
  top: Stat | null; // 가장 많이 관찰된 행동
  observed: Stat[]; // 관찰된 행동 (시간 많은 순)
  notObserved: Stat[]; // (기타 제외) 이 영상에서 관찰되지 않은 행동 (실제로 0초였다는 뜻이 아니에요)
  flow: string | null; // 행동 흐름을 사람이 읽기 좋게 풀어 쓴 문장
};

export function getHighlights(stats: Stat[], segments: Segment[]): VideoHighlights {
  const observed = stats.filter((s) => s.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  return {
    observedSec: observed.reduce((sum, s) => sum + s.seconds, 0),
    top: observed[0] ?? null,
    observed,
    notObserved: stats.filter((s) => s.seconds === 0 && s.key !== "etc"),
    flow: describeFlow(segments),
  };
}

// 문장 속에서 쓰는 행동 표현. 모두 "모습"으로 끝나서 조사를 고민하지 않아도 돼요.
const FLOW_PHRASES: Partial<Record<BehaviorKey, string>> = {
  play: "놀이하는 모습",
  move: "걷거나 이동하는 모습",
  rest: "잠시 멈추거나 쉬는 모습",
  watch: "멈춰서 주변을 살피는 모습",
  eat: "식사하는 모습",
  drink: "물을 마시는 모습",
  bark: "짖는 모습",
};

// 구간 전환 횟수 대신, 어떤 행동이 어떤 흐름으로 나타났는지 자연스러운 한 문장으로 설명해요.
// "기타/판단 어려움"은 내용을 알 수 없으므로 문장에 넣지 않아요.
export function describeFlow(segments: Segment[]): string | null {
  const seq: BehaviorKey[] = [];
  for (const s of [...segments].sort((x, y) => x.startSec - y.startSec)) {
    if (!FLOW_PHRASES[s.behavior]) continue;
    if (seq[seq.length - 1] !== s.behavior) seq.push(s.behavior);
  }
  const distinct = [...new Set(seq)];
  if (distinct.length === 0) return null;
  const phrase = (k: BehaviorKey) => FLOW_PHRASES[k]!;
  if (distinct.length === 1) return `영상 내내 ${phrase(distinct[0])}이 이어졌어요.`;
  if (seq.length > distinct.length) {
    const names = distinct.map(phrase);
    const head = names.slice(0, -1).join(", ");
    return `${head}과 ${names[names.length - 1]}이 번갈아 나타났어요.`;
  }
  return `먼저 ${distinct.map(phrase).join(", 이어서 ")}이 나타났어요.`;
}

export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s}초`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  return r === 0 ? `${m}분` : `${m}분 ${r}초`;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// 결과 화면에 필요한 데이터 모양 (데모/실제 공용)
export type ResultData = {
  isDemo: boolean;
  dogName: string;
  dateLabel: string;
  sourceLabel: string;
  summary: string;
  body: string[];
  seconds: SecondsByBehavior;
  // 과거 데이터가 충분할 때만 값이 있어요. null이면 "평소와 비교"를 보여주지 않아요.
  usualRatio: Baseline | null;
  uncertainSec: number; // 확신이 낮아 통계에서 제외한 구간의 합계(초)
  timeline: {
    label: string;
    behavior: BehaviorKey;
    note: string;
    confident: boolean;
    // 실제 분석 결과에만 있어요. (데모에는 없어요)
    startSec?: number;
    endSec?: number;
  }[];
  // 영상 속 행동 구간 (통계/하이라이트 계산용, 확신 있는 구간만)
  segments: Segment[];
};
