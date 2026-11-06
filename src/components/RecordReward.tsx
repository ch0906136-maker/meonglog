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
import {
  addRecord,
  getCollection,
  getProgress,
  getXp,
  useMyDog,
  type MyDogRecord,
  type MyDogSegment,
} from "@/lib/my-dog";
import { ROOM_SLOTS } from "@/lib/room-decor";
import { isUnlocked, unlockCtx } from "@/lib/unlocks";
import { OUTFITS } from "@/lib/wardrobe";

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
  const thisRecord: MyDogRecord = {
    id: analysisId,
    savedAt: mine?.savedAt ?? "9999", // 아직 저장 전이면 가장 마지막 기록으로 계산해요
    seconds: Object.fromEntries(observed.map((k) => [k, seconds[k]])),
    observedSec,
    top,
  };
  const after = [...before, thisRecord];

  const seen = getCollection(before);
  const fresh = observed.filter((k) => k !== "etc" && seen[k].count === 0);
  const lvBefore = getProgress(before);
  const lvAfter = getProgress(after);
  const gainedXp = getXp(after) - getXp(before);

  // 이번 영상으로 새로 열린 옷/방 아이템 (레벨/도감 조건이 이번 기록으로 충족된 것만)
  const ctxBefore = unlockCtx(before);
  const ctxAfter = unlockCtx(after);
  const newlyUnlocked = [
    ...OUTFITS.map((o) => ({ ...o, kind: "옷" as const, uid: `outfit-${o.id}`, title: o.name })),
    ...ROOM_SLOTS.flatMap((d) =>
      d.options.map((o) => ({
        ...o,
        kind: "방" as const,
        uid: `room-${d.slot}-${o.id}`, // 같은 id(예: sky)가 항목마다 있어서 항목 이름까지 넣어요
        title: `${d.label} · ${o.name}`,
      })),
    ),
  ].filter(
    (o) =>
      (o.unlock.type === "level" || o.unlock.type === "dex") &&
      !isUnlocked(o.unlock, ctxBefore) &&
      isUnlocked(o.unlock, ctxAfter),
  );

  return (
    <section className="card animate-fade-up sm:!p-8">
      <h2 className="text-lg font-bold">🎁 이번 영상으로 얻은 기록</h2>
      <p className="mt-1 text-sm text-muted">AI 분석 결과가 내 강아지의 기록으로 쌓였어요.</p>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-3 rounded-2xl bg-brand-soft p-3.5 font-medium text-brand-dark">
          <span aria-hidden className="text-xl">
            📖
          </span>
          멍로그에 영상 속 기록이 저장됐어요
        </li>
        <li className="flex items-center gap-3 rounded-2xl bg-beige p-3.5 font-medium">
          <span aria-hidden className="text-xl">
            ⭐
          </span>
          <span>
            경험치 +{gainedXp}XP
            <span className="ml-2 text-xs font-normal text-muted">
              (영상 1개 + 새로 발견한 행동)
            </span>
          </span>
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
              🏅
            </span>
            Lv.{lvAfter.level} {lvAfter.name} 달성!
          </li>
        )}
        {newlyUnlocked.map((o) => (
          <li key={o.uid} className="flex items-center gap-3 rounded-2xl bg-sage-soft p-3.5 font-medium">
            <span aria-hidden className="text-xl">
              {o.icon}
            </span>
            <span>
              새 {o.kind === "옷" ? "옷" : "방 아이템"} 해금: {o.title}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        도감, 레벨, 아이템은 이 기기의 브라우저에 저장돼요.{" "}
        <Link href="/#my-dog" className="font-medium text-brand-dark underline underline-offset-2">
          내 강아지의 방에서 옷 입히고 방 꾸미기
        </Link>
      </p>
    </section>
  );
}
