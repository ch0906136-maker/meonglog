import Link from "next/link";
import {
  BEHAVIOR_COLORS,
  BEHAVIOR_LABELS,
  formatClock,
  formatDuration,
  getChanges,
  getHighlights,
  getStats,
  type ResultData,
} from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import BehaviorDex from "./BehaviorDex";
import BehaviorTimeline, { type TimelineItem } from "./BehaviorTimeline";
import MyDogCharacter from "./MyDogCharacter";
import DogName from "./DogName";
import RecordReward from "./RecordReward";

const CARD = "rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:p-8";

export default function ResultView({
  data,
  analysisId,
}: {
  data: ResultData;
  analysisId?: string; // 실제 분석 결과일 때만 있어요 (내 강아지 도감에 담는 데 써요)
}) {
  const stats = getStats(data.seconds, data.usualRatio);
  const changes = getChanges(stats);
  const highlights = getHighlights(stats, data.segments);
  // 실제 과거 기록으로 만든 baseline(usualRatio)이 있을 때만 평소와 정량 비교해요. (지금은 항상 없음)
  const hasBaseline = data.usualRatio !== null;

  // 실제 분석 결과에는 구간의 시작/종료 시간이 있어요.
  const timelineItems: TimelineItem[] = data.timeline.flatMap((t) =>
    t.startSec !== undefined && t.endSec !== undefined
      ? [
          {
            behavior: t.behavior,
            startSec: t.startSec,
            endSec: t.endSec,
            note: t.note,
            confident: t.confident,
          },
        ]
      : [],
  );
  const hasTimes = timelineItems.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      {/* 완성 헤더 */}
      <section className="animate-fade-up relative overflow-hidden rounded-[2rem] bg-brand-soft p-6 sm:p-10">
        <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            {data.isDemo && (
              <p className="mb-3 inline-block rounded-full bg-pink-soft px-3 py-1 text-xs font-bold text-foreground/70">
                예시 화면이에요 · 실제 분석 결과가 아니에요
              </p>
            )}
            <h1 className="break-keep text-2xl font-bold leading-snug sm:text-3xl">
              {data.isDemo ? "오늘의 멍로그 예시" : "✨ 영상 속 멍로그가 완성됐어요!"}
            </h1>
            <p className="mt-2 text-foreground/80">
              {data.isDemo ? (
                `${data.dogName}의 하루를 이런 모습으로 기록해요.`
              ) : (
                <>
                  AI가 <DogName />의 행동을 분석했어요.
                </>
              )}
            </p>
            <p className="mt-3 text-xs text-muted">
              {data.dateLabel} · {data.sourceLabel}
            </p>
          </div>
          <MyDogCharacter
            mood="done"
            className="animate-float h-36 w-36 shrink-0 sm:h-44 sm:w-44"
            label="멍로그를 완성한 강아지"
          />
        </div>
      </section>

      {/* 이번 영상으로 얻은 기록: 도감/레벨 연결 (실제 분석 결과일 때만) */}
      {!data.isDemo && analysisId && (
        <RecordReward
          analysisId={analysisId}
          seconds={data.seconds}
          observedSec={highlights.observedSec}
          segments={timelineItems}
        />
      )}

      {/* AI 멍로그 */}
      <section className={`${CARD} animate-fade-up`}>
        <h2 className="text-lg font-bold">🐶 {data.isDemo ? `${data.dogName}의 하루` : "영상 속 멍로그"}</h2>
        <blockquote className="mt-4 rounded-2xl bg-beige/70 p-5 text-lg font-medium leading-relaxed">
          {data.summary}
        </blockquote>
        <div className="mt-5 space-y-3 leading-relaxed text-foreground/90">
          {data.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted">
          AI가 영상에서 실제로 확인된 행동을 바탕으로 작성했어요.
        </p>
      </section>

      {/* 행동 도감 */}
      <section className={CARD}>
        <h2 className="text-lg font-bold">📖 행동 도감</h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          {data.isDemo
            ? "행동별 시간과 비율이에요."
            : `이 영상에서 확실하게 구분된 ${formatDuration(highlights.observedSec)} 중 비율이에요. 못 본 행동은 영상에 담기지 않았다는 뜻이에요.`}
        </p>
        <BehaviorDex stats={stats} />
        {/* 행동 비율 막대 */}
        <div
          className="mt-6 flex h-4 overflow-hidden rounded-full bg-beige"
          role="img"
          aria-label="행동별 비율 막대"
        >
          {stats
            .filter((s) => s.percent > 0)
            .map((s) => (
              <div key={s.key} style={{ width: `${s.percent}%`, backgroundColor: s.color }} />
            ))}
        </div>
      </section>

      {/* 행동 타임라인 */}
      {hasTimes && (
        <section className={CARD}>
          <h2 className="text-lg font-bold">🕒 행동 타임라인</h2>
          <p className="mt-1 mb-5 text-sm text-muted">
            구간을 눌러 그 시간에 관찰된 내용을 확인해 보세요. 빗금 구간은 판단이 어려웠던 부분이에요.
          </p>
          <BehaviorTimeline items={timelineItems} observedSec={highlights.observedSec} />
        </section>
      )}

      {/* 행동 기록 */}
      <section className={CARD}>
        <h2 className="text-lg font-bold">📝 행동 기록</h2>
        {hasTimes ? (
          <ol className="mt-5 space-y-3">
            {timelineItems.map((t) => {
              const dur = t.endSec - t.startSec;
              const pct =
                t.confident && highlights.observedSec > 0
                  ? Math.round((dur / highlights.observedSec) * 100)
                  : null;
              return (
                <li
                  key={`${t.startSec}-${t.endSec}-${t.behavior}`}
                  className="rounded-2xl border border-line bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span aria-hidden className="text-xl">
                      {BEHAVIOR_ICONS[t.behavior]}
                    </span>
                    <span className="font-bold">{BEHAVIOR_LABELS[t.behavior]}</span>
                    {!t.confident && (
                      <span className="rounded-full bg-pink-soft px-2 py-0.5 text-xs text-foreground/70">
                        불확실
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {formatClock(t.startSec)}~{formatClock(t.endSec)} · {formatDuration(dur)}
                      {pct !== null && ` · ${pct}%`}
                    </span>
                  </div>
                  {pct !== null && (
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige">
                      <div
                        className="animate-grow h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: BEHAVIOR_COLORS[t.behavior] }}
                      />
                    </div>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{t.note}</p>
                </li>
              );
            })}
          </ol>
        ) : (
          <ol className="mt-5 space-y-3">
            {data.timeline.map((t) => (
              <li
                key={t.label + t.note}
                className="flex items-start gap-3 rounded-2xl border border-line bg-background p-4"
              >
                <span aria-hidden className="text-xl">
                  {BEHAVIOR_ICONS[t.behavior]}
                </span>
                <div>
                  <p className="text-xs text-muted">
                    {t.label} · {BEHAVIOR_LABELS[t.behavior]}
                  </p>
                  <p className="text-sm">{t.note}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {hasBaseline ? (
        /* 평소와 다른 점: 실제 과거 기록이 충분해서 baseline이 있을 때만 */
        <section className={CARD}>
          <h2 className="text-lg font-bold">평소와 다른 점</h2>
          <p className="mt-1 text-sm text-muted">
            지금까지 기록한 평소 행동 비율과 비교했어요.
          </p>
          {changes.length === 0 ? (
            <p className="mt-4 text-sm">평소와 비슷하게 지냈어요.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {changes.map((c) => {
                const up = c.changePercent > 0;
                return (
                  <li
                    key={c.key}
                    className="flex items-start gap-3 rounded-2xl bg-background p-4"
                  >
                    <span
                      className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        up ? "bg-pink-soft text-foreground/80" : "bg-sage-soft text-brand-dark"
                      }`}
                    >
                      {up ? "▲" : "▼"} {Math.abs(c.changePercent)}%
                    </span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-medium">{c.label}</span> 비율이 평소(
                      {c.usualPercent}%)보다 {up ? "높고" : "낮고"} 이번에는 {c.percent}%였어요.
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">
            멍로그는 의료 진단을 하지 않아요. 변화가 계속되거나 걱정되면 수의사와 상담해 주세요.
          </p>
        </section>
      ) : (
        /* 영상에서 확인된 특징: baseline 비교 없이 이번 영상만 설명 */
        <section className={CARD}>
          <h2 className="text-lg font-bold">🔎 영상에서 확인된 특징</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-relaxed sm:grid-cols-2">
            {highlights.top && (
              <li className="rounded-2xl bg-brand-soft p-4">
                <span aria-hidden className="mr-1">
                  {BEHAVIOR_ICONS[highlights.top.key]}
                </span>
                <span className="font-bold">{highlights.top.label} 시간이 가장 길었어요.</span>
                <span className="mt-1 block text-xs text-muted">
                  {formatDuration(highlights.top.seconds)} · {highlights.top.percent}%
                </span>
              </li>
            )}
            {highlights.flow && (
              <li className="rounded-2xl bg-beige/70 p-4">
                <span aria-hidden className="mr-1">
                  🐾
                </span>
                {highlights.flow}
              </li>
            )}
            {highlights.notObserved.length > 0 && (
              <li className="rounded-2xl bg-background p-4 sm:col-span-2">
                <span className="font-bold">이 영상에서 관찰되지 않은 행동</span> ·{" "}
                {highlights.notObserved.map((s) => s.label).join(", ")}
                <span className="mt-1 block text-xs text-muted">
                  영상에 담기지 않았다는 뜻이고, 하지 않았다는 뜻은 아니에요.
                </span>
              </li>
            )}
            {data.uncertainSec > 0 && (
              <li className="rounded-2xl bg-pink-soft/70 p-4 sm:col-span-2">
                <span className="font-bold">판단이 어려웠던 구간</span> ·{" "}
                {formatDuration(data.uncertainSec)}
                <span className="mt-1 block text-xs text-muted">
                  확신이 낮아 비율에는 넣지 않았어요.
                </span>
              </li>
            )}
          </ul>
          <p className="mt-5 text-xs text-muted">
            영상 하나만으로는 평소와 비교하지 않아요. 기록이 충분히 쌓이면 평소와 다른 점을 알려드릴게요.
            멍로그는 의료 진단을 하지 않아요.
          </p>
        </section>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Link
          href="/upload"
          className="rounded-full bg-brand px-8 py-4 text-center font-medium text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          🎥 다른 영상 분석하기
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line bg-surface px-8 py-4 text-center font-medium transition hover:-translate-y-0.5 hover:border-brand"
        >
          처음으로
        </Link>
      </div>
    </div>
  );
}
