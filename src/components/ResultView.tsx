import Link from "next/link";
import {
  formatDuration,
  getChanges,
  getHighlights,
  getStats,
  normalizeSegments,
  secondsFromSegments,
  summarizeBehaviors,
  type ResultData,
  type Segment,
} from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import BehaviorSummary from "./BehaviorSummary";
import BehaviorTimeline, { type TimelineItem } from "./BehaviorTimeline";
import MyDogCharacter from "./MyDogCharacter";
import DogName from "./DogName";
import RecordReward from "./RecordReward";

const CARD = "card sm:!p-8";

export default function ResultView({
  data,
  analysisId,
}: {
  data: ResultData;
  analysisId?: string; // 실제 분석 결과일 때만 있어요 (내 강아지 도감에 담는 데 써요)
}) {
  // 실제 분석 결과에는 구간의 시작/종료 시간(start_sec/end_sec)이 있어요.
  // 화면에서 한 번 더 정리해요: 겹침/범위 밖 값을 걸러내서, 행동 시간 합계가 영상 길이(마지막 종료 시각)를 넘을 수 없어요.
  // 시간은 항상 end_sec - start_sec이고, 정상 데이터는 그대로예요.
  const timelineItems: TimelineItem[] = normalizeSegments(
    data.timeline.flatMap((t) =>
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
    ),
  );
  const hasTimes = timelineItems.length > 0;
  // 확신 있는 구간만 시간/비율 통계에 써요. (타임라인에는 불확실 구간도 빗금으로 보여줘요)
  const confidentSegments: Segment[] = timelineItems
    .filter((t) => t.confident)
    .map((t) => ({ behavior: t.behavior, startSec: t.startSec, endSec: t.endSec, note: t.note, confidence: null }));
  const seconds = secondsFromSegments(confidentSegments);
  const stats = getStats(seconds, data.usualRatio);
  const changes = getChanges(stats);
  const highlights = getHighlights(stats, confidentSegments);
  // 실제 과거 기록으로 만든 baseline(usualRatio)이 있을 때만 평소와 정량 비교해요. (지금은 항상 없음)
  const hasBaseline = data.usualRatio !== null;
  // 행동 기록: 원본 구간은 그대로 두고, 같은 행동만 모아서 집계해요.
  const summary = summarizeBehaviors(timelineItems);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-5 sm:py-10">
      {/* 완성 헤더 */}
      <section className="animate-fade-up relative overflow-hidden rounded-[1.75rem] bg-brand-soft p-6 sm:p-10">
        <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="break-keep text-2xl font-bold leading-snug sm:text-3xl">
              ✨ 영상 속 멍로그가 완성됐어요!
            </h1>
            <p className="mt-2 text-foreground/80">
              AI가 <DogName />의 행동을 분석했어요.
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

      {/* AI 멍로그 */}
      <section className={`${CARD} animate-fade-up`}>
        <h2 className="text-lg font-bold">🐶 영상 속 멍로그</h2>
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

      {hasTimes ? (
        <>
          {/* 행동 타임라인: 시간 순서의 원본 구간 */}
          <section className={CARD}>
            <h2 className="text-lg font-bold">🕒 행동 타임라인</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              시간 순서대로 관찰된 구간이에요. 구간을 눌러 그 시간에 관찰된 내용을 확인해 보세요.
            </p>
            <BehaviorTimeline items={timelineItems} observedSec={highlights.observedSec} />
          </section>

          {/* 행동 기록: 같은 행동을 모아서 보여주는 요약 */}
          <section className={CARD}>
            <h2 className="text-lg font-bold">📝 행동 기록</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              영상에서 확인된 행동을 종류별로 모았어요. {formatDuration(highlights.observedSec)} 중 비율이고,
              시간 순서는 위의 타임라인에서 볼 수 있어요.
            </p>
            <BehaviorSummary summary={summary} />
          </section>
        </>
      ) : (
        <section className={CARD}>
          <h2 className="text-lg font-bold">🕒 행동 타임라인</h2>
          <p className="mt-3 text-sm text-muted">표시할 행동 구간이 없어요. 시간은 임의로 만들어 보여주지 않아요.</p>
        </section>
      )}

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

      {/* 이번 영상으로 얻은 기록: AI 분석을 다 본 뒤에 도감/레벨/아이템 보상을 보여줘요 (실제 분석 결과일 때만) */}
      {analysisId && (
        <RecordReward
          analysisId={analysisId}
          seconds={seconds}
          observedSec={highlights.observedSec}
          segments={timelineItems}
        />
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Link
          href="/upload"
          className="btn-primary !py-4 text-base"
        >
          🎥 다른 영상 분석하기
        </Link>
        <Link
          href="/"
          className="btn-secondary !py-4 text-base"
        >
          처음으로
        </Link>
      </div>
    </div>
  );
}
