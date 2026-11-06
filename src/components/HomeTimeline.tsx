"use client";

import Link from "next/link";
import { useState } from "react";
import { BEHAVIOR_LABELS, formatClock, formatDuration } from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import { useMyDog } from "@/lib/my-dog";
import BehaviorTimeline from "./BehaviorTimeline";

function dateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

// 홈의 "영상 속 멍로그 · 행동 타임라인".
// 결과 페이지에서 저장된 실제 분석 결과(행동 구간의 start_sec/end_sec/note)만 보여줘요.
// 시간은 영상 시작 기준이에요. (영상을 찍은 실제 시각은 알 수 없어서 만들어 내지 않아요)
export default function HomeTimeline() {
  const dog = useMyDog();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const withTimeline = dog.records.filter((r) => r.segments && r.segments.length > 0);
  const current = withTimeline.find((r) => r.id === pickedId) ?? withTimeline[0];

  return (
    <section className="mx-auto max-w-5xl px-5 pb-10">
      <div className="rounded-[2rem] border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">🕒 영상 속 멍로그 · 행동 타임라인</h2>
          {current && (
            <Link
              href={`/result/${current.id}`}
              className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline"
            >
              결과 자세히 보기 →
            </Link>
          )}
        </div>

        {!current ? (
          <div className="mt-5 flex flex-col items-center rounded-3xl bg-background px-5 py-10 text-center">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-beige text-3xl">
              🕒
            </span>
            <p className="mt-4 font-bold">아직 보여드릴 타임라인이 없어요</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
              {dog.records.length > 0
                ? "이전에 저장된 기록에는 타임라인이 없어요. 그 기록의 결과 페이지를 한 번 열면 이곳에 채워져요."
                : "영상을 분석하면 강아지의 행동이 바뀐 순서대로 시간, 행동, 관찰 내용이 이곳에 나타나요."}
            </p>
            <Link
              href="/upload"
              className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              🎥 영상 업로드하기
            </Link>
          </div>
        ) : (
          <>
            {withTimeline.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="기록 선택">
                {withTimeline.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPickedId(r.id)}
                    aria-pressed={r.id === current.id}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      r.id === current.id
                        ? "bg-brand text-white"
                        : "bg-beige text-foreground/80 hover:bg-beige/70"
                    }`}
                  >
                    {dateLabel(r.savedAt)}
                    {r.top ? ` ${BEHAVIOR_ICONS[r.top]}` : ""}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 mb-4 text-sm text-muted">
              {dateLabel(current.savedAt)}에 분석한 영상 · 시간은 영상 시작 기준이에요. 구간을 누르면 관찰 내용을 볼 수 있어요.
            </p>

            <BehaviorTimeline
              key={current.id}
              items={current.segments!}
              observedSec={current.observedSec}
            />

            <ol className="mt-5 space-y-2">
              {current.segments!.map((s) => (
                <li
                  key={`${s.startSec}-${s.endSec}-${s.behavior}`}
                  className="flex items-start gap-3 rounded-2xl bg-background p-3.5"
                >
                  <span aria-hidden className="mt-0.5 text-xl">
                    {BEHAVIOR_ICONS[s.behavior]}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs text-muted">
                        {formatClock(s.startSec)}~{formatClock(s.endSec)}
                      </span>
                      <span className="font-bold">{BEHAVIOR_LABELS[s.behavior]}</span>
                      <span className="text-xs text-muted">{formatDuration(s.endSec - s.startSec)}</span>
                      {!s.confident && (
                        <span className="rounded-full bg-pink-soft px-2 py-0.5 text-xs text-foreground/70">
                          불확실
                        </span>
                      )}
                    </p>
                    {s.note && <p className="mt-0.5 leading-relaxed text-foreground/80">{s.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
