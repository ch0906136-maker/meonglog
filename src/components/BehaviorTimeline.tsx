"use client";

import { useState } from "react";
import {
  BEHAVIOR_COLORS,
  BEHAVIOR_LABELS,
  formatClock,
  formatDuration,
  type BehaviorKey,
} from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";

export type TimelineItem = {
  behavior: BehaviorKey;
  startSec: number;
  endSec: number;
  note: string;
  confident: boolean;
};

// 행동이 바뀌는 구간을 가로 막대로 보여줘요. 구간을 누르면 아래에 자세한 내용이 나와요.
// (영상 파일은 비공개라서 화면에서 영상으로 이동하는 기능은 넣지 않았어요.)
export default function BehaviorTimeline({
  items,
  observedSec,
}: {
  items: TimelineItem[];
  observedSec: number; // 확신 있게 분류된 시간 합계 (구간별 비율 계산용)
}) {
  const [selected, setSelected] = useState(0);
  const total = Math.max(1, ...items.map((i) => i.endSec));
  const current = items[Math.min(selected, items.length - 1)];
  if (!current) return null;

  const dur = current.endSec - current.startSec;
  const share = current.confident && observedSec > 0 ? Math.round((dur / observedSec) * 100) : null;

  return (
    <div>
      <div
        className="relative h-14 w-full overflow-hidden rounded-2xl bg-beige"
        role="group"
        aria-label="행동 타임라인"
      >
        {items.map((it, i) => {
          const left = (it.startSec / total) * 100;
          const width = Math.max(((it.endSec - it.startSec) / total) * 100, 1.2);
          const active = i === selected;
          return (
            <button
              key={`${it.startSec}-${it.endSec}-${i}`}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={active}
              aria-label={`${formatClock(it.startSec)}부터 ${formatClock(it.endSec)}까지 ${BEHAVIOR_LABELS[it.behavior]}${it.confident ? "" : " (불확실)"}`}
              className={`absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-xl text-base transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                active ? "z-10 ring-2 ring-foreground/70" : "opacity-85 hover:opacity-100"
              }`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: BEHAVIOR_COLORS[it.behavior],
                backgroundImage: it.confident
                  ? undefined
                  : "repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 4px, transparent 4px 8px)",
              }}
            >
              {width > 7 && <span aria-hidden>{BEHAVIOR_ICONS[it.behavior]}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted" aria-hidden>
        <span>0:00</span>
        <span>{formatClock(total)}</span>
      </div>

      <div
        aria-live="polite"
        className="mt-4 flex items-start gap-4 rounded-3xl border border-line bg-surface p-5 shadow-soft"
      >
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${BEHAVIOR_COLORS[current.behavior]}33` }}
        >
          {BEHAVIOR_ICONS[current.behavior]}
        </span>
        <div className="min-w-0">
          <p className="font-bold">
            {BEHAVIOR_LABELS[current.behavior]}
            {!current.confident && (
              <span className="ml-2 rounded-full bg-pink-soft px-2 py-0.5 text-xs font-medium text-foreground/70">
                불확실
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {formatClock(current.startSec)}~{formatClock(current.endSec)} · {formatDuration(dur)}
            {share !== null && ` · 관찰된 시간의 ${share}%`}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{current.note}</p>
        </div>
      </div>
    </div>
  );
}
