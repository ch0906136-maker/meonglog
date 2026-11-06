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

// 행동별 색: 타임라인/비율 막대/범례가 모두 같은 색을 써요. (같은 행동은 몇 번 나와도 항상 같은 색이에요)
// 너무 쨍한 원색 대신 파스텔톤으로, 서로 확실히 구분되게 골랐어요.
// 놀이=핑크/코랄, 휴식=하늘, 이동=민트/초록, 식사=노랑, 물=파랑, 관찰=라벤더, 짖기=오렌지, 기타=회색
export const BEHAVIOR_COLORS: Record<BehaviorKey, string> = {
  play: "#f4a3b8",
  rest: "#9fd3f0",
  move: "#8fd9b6",
  eat: "#f6dc78",
  drink: "#6f9fe8",
  watch: "#b9a6e8",
  bark: "#f5b06e",
  etc: "#c4c0ba",
};

// 범례용 하트 (색과 짝을 이뤄요)
export const BEHAVIOR_HEARTS: Record<BehaviorKey, string> = {
  play: "🩷",
  rest: "🩵",
  move: "💚",
  eat: "💛",
  drink: "💙",
  watch: "💜",
  bark: "🧡",
  etc: "🩶",
};

// 영상 속 행동 구간 (초 단위)
export type Segment = {
  behavior: BehaviorKey;
  startSec: number;
  endSec: number;
  note: string | null;
  confidence?: number | null; // 0~1. 없으면(null/undefined) 확신 있는 것으로 봐요.
};

// 화면에서 영상 길이를 넘는 시간이 나오지 않게 하는 안전장치예요.
// - 시작/종료가 숫자가 아니거나 종료 <= 시작이면 버려요.
// - 겹치는 부분은 잘라내요. (그래서 구간 길이의 합계는 마지막 종료 시각을 넘을 수 없어요)
// - 이 서비스는 1~3분짜리 짧은 영상을 분석해요. 한 영상에서 나올 수 없는 값(10분 초과)은 10분으로 잘라요.
// 분석 결과가 정상이면 아무것도 바꾸지 않아요. (실제 구간은 그대로 보존해요)
export const MAX_PLAUSIBLE_VIDEO_SEC = 10 * 60;

export function normalizeSegments<T extends { startSec: number; endSec: number }>(
  items: T[],
  maxSec: number = MAX_PLAUSIBLE_VIDEO_SEC,
): T[] {
  const sorted = items
    .filter((i) => Number.isFinite(i.startSec) && Number.isFinite(i.endSec))
    .map((i) => ({ ...i, startSec: Math.max(0, i.startSec), endSec: Math.min(maxSec, i.endSec) }))
    .filter((i) => i.endSec > i.startSec)
    .sort((x, y) => x.startSec - y.startSec);
  const out: T[] = [];
  let cursor = 0;
  for (const seg of sorted) {
    const start = Math.max(seg.startSec, cursor);
    if (seg.endSec <= start) continue;
    out.push({ ...seg, startSec: start });
    cursor = seg.endSec;
  }
  return out;
}

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

// ───────── 행동 기록(요약) ─────────
// 타임라인은 시간 순서의 원본 구간을 그대로 보여주고, 행동 기록은 같은 행동을 한 장으로 모아서 보여줘요.
// 원본 구간(segments)은 합치거나 이어 붙이지 않고 그대로 보존해요. 시간/횟수/비율만 집계해요.
export type SummarySegment = {
  startSec: number;
  endSec: number;
  note: string | null;
  confident: boolean;
};

export type BehaviorGroup = {
  key: BehaviorKey;
  label: string;
  color: string;
  seconds: number; // 이 행동으로 확인된 시간 합계
  count: number; // 원본 구간 개수
  percent: number | null; // 확신 있게 분류된 시간 중 비율 (불확실 구간만 있으면 null)
  note: string | null; // 가장 길게 관찰된 구간에서 AI가 적은 관찰 내용 (새로 만들어 내지 않아요)
  segments: SummarySegment[]; // 시간 순서의 원본 구간
};

export type BehaviorSummary = {
  groups: BehaviorGroup[]; // 확신 있는 구간, 시간 많은 순
  uncertain: BehaviorGroup[]; // 확신이 낮아 비율에서 제외한 구간 (행동별)
  observedSec: number;
};

export function summarizeBehaviors(
  items: { behavior: BehaviorKey; startSec: number; endSec: number; note: string | null; confident: boolean }[],
): BehaviorSummary {
  const sorted = [...items].sort((a, b) => a.startSec - b.startSec);
  const build = (confident: boolean): BehaviorGroup[] => {
    const groups: BehaviorGroup[] = [];
    for (const key of BEHAVIOR_KEYS) {
      const segs = sorted.filter((i) => i.behavior === key && i.confident === confident);
      if (segs.length === 0) continue;
      const dur = (s: { startSec: number; endSec: number }) => Math.max(0, s.endSec - s.startSec);
      const longest = segs.reduce((best, s) => (dur(s) > dur(best) ? s : best), segs[0]);
      groups.push({
        key,
        label: BEHAVIOR_LABELS[key],
        color: BEHAVIOR_COLORS[key],
        seconds: segs.reduce((sum, s) => sum + dur(s), 0),
        count: segs.length,
        percent: null,
        note: longest.note?.trim() ? longest.note.trim() : null,
        segments: segs.map(({ startSec, endSec, note, confident: c }) => ({ startSec, endSec, note, confident: c })),
      });
    }
    return groups.sort((a, b) => b.seconds - a.seconds);
  };
  const groups = build(true);
  const observedSec = groups.reduce((sum, g) => sum + g.seconds, 0);
  for (const g of groups) g.percent = observedSec > 0 ? Math.round((g.seconds / observedSec) * 100) : null;
  return { groups, uncertain: build(false), observedSec };
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

// 영상 시작 기준 구간 표기: "0:07 ~ 0:09"
export function formatRange(startSec: number, endSec: number): string {
  return `${formatClock(startSec)} ~ ${formatClock(endSec)}`;
}

// 결과 화면에 필요한 데이터 모양 (데모/실제 공용)
export type ResultData = {
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
