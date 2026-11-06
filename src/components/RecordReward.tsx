"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  BEHAVIOR_KEYS,
  BEHAVIOR_LABELS,
  type BehaviorKey,
  type SecondsByBehavior,
} from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import { addRecord, getCollection, getLevel, useMyDog, type MyDogSegment } from "@/lib/my-dog";

// 분석 결과를 "내 강아지" 도감/레벨에 담고, 이번 영상으로 새로 생긴 기록을 보여줘요.
// 표시하는 내용은 모두 실제 분석 결과(행동별 관찰 시간)에서 계산해요.
export default function RecordReward({
  analysisId,
  seconds,
  observedSec,
  segments,
}: {
  analysisId: string;
  seconds: SecondsByBehavior;
  observedSec: number;
  segments: MyDogSegment[]; // 이번 영상의 실제 행동 구간 (홈 타임라인에 보여줘요)
}) {
  const dog = useMyDog();

  const observed = BEHAVIOR_KEYS.filter((k) => seconds[k] > 0);
  const top = observed.reduce<BehaviorKey | null>(
    (best, k) => (best === null || seconds[k] > seconds[best] ? k : best),
    null,
  );

  useEffect(() => {
    addRecord({
      id: analysisId,
      savedAt: new Date().toISOString(),
      seconds: Object.fromEntries(observed.map((k) => [k, seconds[k]])),
      observedSec,
      top,
      segments,
    });
    // 결과 페이지를 열 때 한 번만 담아요. (같은 분석은 addRecord가 중복 저장을 막아요)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  // "새로운 기록"은 이 영상보다 먼저 저장된 기록들과 비교해서 정해요. (다시 열어도 같은 결과)
  const mine = dog.records.find((r) => r.id === analysisId);
  const before = dog.records.filter((r) => r.id !== analysisId && (!mine || r.savedAt < mine.savedAt));
  const seen = getCollection(before);
  const fresh = observed.filter((k) => k !== "etc" && seen[k].count === 0);
  const lvBefore = getLevel(before.length);
  const lvAfter = getLevel(before.length + 1);

  return (
    <section className="animate-fade-up rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="text-lg font-bold">🎁 이번 영상으로 얻은 기록</h2>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-3 rounded-2xl bg-brand-soft p-3.5 font-medium text-brand-dark">
          <span aria-hidden className="text-xl">
            📖
          </span>
          멍로그에 영상 속 기록이 저장됐어요
        </li>
        {fresh.map((k) => (
          <li key={k} className="flex items-center gap-3 rounded-2xl bg-pink-soft/80 p-3.5 font-medium">
            <span aria-hidden className="text-xl">
              {BEHAVIOR_ICONS[k]}
            </span>
            <span>
              새로운 {BEHAVIOR_LABELS[k]} 기록이 추가됐어요
              <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-foreground/70">
                도감 첫 발견
              </span>
            </span>
          </li>
        ))}
        {fresh.length === 0 && observed.length > 0 && (
          <li className="flex items-center gap-3 rounded-2xl bg-background p-3.5 text-muted">
            <span aria-hidden className="text-xl">
              🗂️
            </span>
            도감에 이미 담긴 행동이에요. 기록이 한 번 더 쌓였어요
          </li>
        )}
        {lvAfter.level > lvBefore.level && (
          <li className="flex items-center gap-3 rounded-2xl bg-beige p-3.5 font-medium">
            <span aria-hidden className="text-xl">
              ⭐
            </span>
            Lv.{lvAfter.level} {lvAfter.name} 달성!
          </li>
        )}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        도감과 레벨은 이 기기의 브라우저에 저장돼요.{" "}
        <Link href="/#my-dog" className="font-medium text-brand-dark underline underline-offset-2">
          내 강아지의 방 보러 가기
        </Link>
      </p>
    </section>
  );
}
