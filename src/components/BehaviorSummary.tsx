import {
  BEHAVIOR_LABELS,
  formatDuration,
  formatRange,
  type BehaviorGroup,
  type BehaviorSummary as Summary,
} from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import BehaviorLegend from "./BehaviorLegend";

// 행동 기록: 같은 행동을 한 장으로 모아서 총 시간/횟수/비율과 AI가 적은 관찰 내용을 보여줘요.
// - 시간 순서의 원본 구간은 "행동 타임라인"에 그대로 있고, 여기서는 집계만 해요.
// - 구간을 이어 붙여 하나의 긴 구간처럼 만들지 않아요. 펼치면 원본 구간이 시간 순서대로 나와요.
// - 보여주는 문장은 모두 AI가 영상에서 실제로 적은 관찰 내용이에요. (새로 만들어 내지 않아요)
function SegmentList({ group }: { group: BehaviorGroup }) {
  return (
    <details className="group mt-3">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-full bg-beige/70 px-3 text-xs font-medium text-foreground/80 transition hover:bg-beige [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="transition group-open:rotate-90">
          ›
        </span>
        구간별 보기 ({group.segments.length})
      </summary>
      <ol className="mt-2 space-y-1.5">
        {group.segments.map((s) => (
          <li key={`${s.startSec}-${s.endSec}`} className="rounded-xl bg-surface px-3 py-2 text-xs leading-relaxed">
            <span className="font-mono text-muted">
              {formatRange(s.startSec, s.endSec)}
            </span>{" "}
            <span className="text-muted">· {formatDuration(s.endSec - s.startSec)}</span>
            {s.note && <p className="mt-0.5 text-foreground/85">{s.note}</p>}
          </li>
        ))}
      </ol>
    </details>
  );
}

export default function BehaviorSummary({ summary }: { summary: Summary }) {
  const { groups, uncertain } = summary;
  if (groups.length === 0 && uncertain.length === 0) return null;

  return (
    <div>
      {groups.length > 0 && (
        <>
          <div
            className="flex h-4 overflow-hidden rounded-full bg-beige"
            role="img"
            aria-label={`행동별 비율: ${groups.map((g) => `${g.label} ${g.percent ?? 0}%`).join(", ")}`}
          >
            {groups.map((g) => (
              <div
                key={g.key}
                className="h-full shadow-[inset_-1px_0_0_rgba(255,255,255,0.8)]"
                style={{ width: `${g.percent ?? 0}%`, backgroundColor: g.color }}
              />
            ))}
          </div>
          <BehaviorLegend keys={groups.map((g) => g.key)} />
        </>
      )}

      <ul className="mt-5 grid items-start gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <li key={g.key} className="tile">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ backgroundColor: `${g.color}66` }}
              >
                {BEHAVIOR_ICONS[g.key]}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{g.label}</h3>
                <p className="text-sm text-muted">
                  총 {formatDuration(g.seconds)} · {g.count}회
                </p>
              </div>
              {g.percent !== null && (
                <span className="shrink-0 text-xl font-bold tabular-nums">
                  {g.percent}
                  <span className="text-sm font-medium text-muted">%</span>
                </span>
              )}
            </div>
            {g.percent !== null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-beige">
                <div
                  className="animate-grow h-full rounded-full"
                  style={{ width: `${Math.max(g.percent, 2)}%`, backgroundColor: g.color }}
                />
              </div>
            )}
            {g.note && (
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                <span className="mr-1 text-xs font-bold text-muted">AI 관찰</span>
                {g.note}
              </p>
            )}
            <SegmentList group={g} />
          </li>
        ))}
      </ul>

      {uncertain.length > 0 && (
        <div className="mt-3 rounded-2xl bg-pink-soft/60 p-4 text-sm">
          <p className="font-bold">판단이 어려웠던 구간</p>
          <p className="mt-0.5 text-xs text-muted">
            확신이 낮아 위의 시간과 비율에는 넣지 않았어요.
          </p>
          <ul className="mt-3 space-y-1.5">
            {uncertain
              .flatMap((g) => g.segments.map((s) => ({ ...s, key: g.key })))
              .sort((x, y) => x.startSec - y.startSec)
              .map((s) => (
                <li key={`${s.key}-${s.startSec}`} className="rounded-xl bg-surface/80 px-3 py-2 text-xs leading-relaxed">
                  <span className="font-mono text-muted">
                    {formatRange(s.startSec, s.endSec)}
                  </span>{" "}
                  <span className="font-bold">{BEHAVIOR_LABELS[s.key]}?</span>
                  {s.note && <span className="text-foreground/85"> · {s.note}</span>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
