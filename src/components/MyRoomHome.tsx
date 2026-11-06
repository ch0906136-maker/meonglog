"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BEHAVIOR_KEYS,
  BEHAVIOR_LABELS,
  formatDuration,
  getStats,
  type SecondsByBehavior,
} from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import { birthdayLine } from "@/lib/birthday";
import { ageLabel, coatLabel, genderLabel } from "@/lib/dog-look";
import { clearMyDog, getCollection, getProgress, useMyDog } from "@/lib/my-dog";
import { useStyle } from "@/lib/my-style";
import { useToday } from "@/lib/today";
import { ROOM_SLOTS } from "@/lib/room-decor";
import { isUnlocked } from "@/lib/unlocks";
import { OUTFITS } from "@/lib/wardrobe";
import BehaviorDex from "./BehaviorDex";
import HomeTimeline from "./HomeTimeline";
import MyDogCharacter from "./MyDogCharacter";
import MyRoom from "./MyRoom";
import PetPhoto from "./PetPhoto";
import ProfileEditor from "./ProfileEditor";
import UsualPattern from "./UsualPattern";
import { DecorPanel, WardrobePanel } from "./StylePanels";

function dateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

// 멍로그의 성장 흐름: 항상 "영상 → AI 분석"이 먼저이고, 게임 요소는 그 결과로 쌓여요.
const LOOP = [
  { icon: "🐶", label: "내 강아지" },
  { icon: "🎥", label: "영상 업로드" },
  { icon: "🔍", label: "AI 분석" },
  { icon: "📝", label: "행동 기록" },
  { icon: "📖", label: "멍로그" },
  { icon: "⭐", label: "경험치" },
  { icon: "🎀", label: "꾸미기" },
];

type Panel = "wardrobe" | "decor" | null;

export default function MyRoomHome() {
  const dog = useMyDog();
  const { ctx } = useStyle();
  const [editorOpen, setEditorOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const today = useToday();

  const collection = getCollection(dog.records);
  const foundKeys = BEHAVIOR_KEYS.filter((k) => k !== "etc" && collection[k].count > 0);
  const dexTotal = BEHAVIOR_KEYS.filter((k) => k !== "etc").length;
  const lv = getProgress(dog.records);
  const latest = dog.records[0];

  // 아이템 해금 현황: 영상 분석(레벨/도감)으로 얻는 아이템만 세요. 기본 제공/준비 중 아이템은 제외해요.
  const earnable = [...OUTFITS, ...ROOM_SLOTS.flatMap((s) => s.options)].filter(
    (i) => i.unlock.type === "level" || i.unlock.type === "dex",
  );
  const unlockedItems = earnable.filter((i) => isUnlocked(i.unlock, ctx)).length;

  // 누적 도감: 지금까지 모은 행동별 관찰 시간으로 카드를 채워요.
  const totals = Object.fromEntries(
    BEHAVIOR_KEYS.map((k) => [k, collection[k].seconds]),
  ) as SecondsByBehavior;
  const dexStats = getStats(totals, null);

  // 프로필 요약: 입력한 항목만 보여줘요.
  const { profile } = dog;
  // 나이는 생일에서 오늘 날짜 기준으로 계산해요. 생일이 없는 예전 프로필만 직접 입력했던 나이를 보여줘요.
  const birthdayText = profile.birthday && today ? birthdayLine(profile.birthday, today) : null;
  const profileChips = [
    profile.breed,
    coatLabel(profile.coat),
    genderLabel(profile.gender),
    profile.birthday ? "" : ageLabel(profile.ageYears),
  ].filter(Boolean);
  const hasProfileInfo = profileChips.length > 0 || profile.birthday !== null;

  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const tabClass = (on: boolean) =>
    `flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition active:scale-[0.97] ${
      on ? "bg-brand text-white shadow-soft" : "bg-surface shadow-soft ring-1 ring-black/5 hover:-translate-y-0.5"
    }`;

  return (
    <>
      {/* 내 강아지 + 방 */}
      <section id="my-dog" className="mx-auto max-w-5xl scroll-mt-24 px-4 pb-8 pt-6 sm:px-5 sm:pb-10 sm:pt-10">
        {/* 성장 흐름 + 업로드 */}
        <div className="animate-fade-up mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ol aria-label="멍로그 성장 흐름" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-foreground/80 sm:text-sm">
            {LOOP.map((s, i) => (
              <li key={s.label} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden className="text-muted">
                    ›
                  </span>
                )}
                <span className={`chip ${i === 2 ? "!bg-brand-soft !text-brand-dark font-bold" : ""}`}>
                  <span aria-hidden>{s.icon}</span>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          <Link href="/upload" className="btn-primary hidden shrink-0 sm:inline-flex">
            🎥 영상 분석하기
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          {/* 프로필 카드 */}
          <aside className="card animate-fade-up self-start">
            <div className="flex items-center gap-4 lg:flex-col lg:text-center">
              <div className="relative shrink-0 lg:w-full lg:max-w-60">
                {profile.photo ? (
                  <PetPhoto
                    src={profile.photo}
                    alt={`${dog.name}의 사진`}
                    className="h-28 w-28 rounded-3xl shadow-soft ring-4 ring-brand-soft lg:aspect-square lg:h-auto lg:w-full"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-brand-soft ring-4 ring-brand-soft/60 lg:aspect-square lg:h-auto lg:w-full">
                    <MyDogCharacter className="h-24 w-24 lg:h-4/5 lg:w-4/5" label="내 강아지 캐릭터" />
                  </div>
                )}
                {/* 사진 속 아이와 닮은 캐릭터가 함께 있어요 (털색/견종/옷이 반영돼요) */}
                {profile.photo && (
                  <span className="absolute -bottom-2 -right-2 flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-soft ring-2 ring-brand-soft lg:-bottom-3 lg:-right-3 lg:h-16 lg:w-16">
                    <MyDogCharacter className="h-12 w-12 lg:h-14 lg:w-14" label="내 강아지 캐릭터" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 lg:w-full">
                <h1 className="break-keep text-2xl font-bold">{dog.name}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted lg:justify-center">
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
                    Lv.{lv.level}
                  </span>
                  {lv.name}
                </p>
              </div>
            </div>

            {hasProfileInfo && (
              <ul className="mt-4 flex flex-wrap gap-1.5 lg:justify-center" aria-label="강아지 정보">
                {profileChips.map((c) => (
                  <li key={c} className="chip text-foreground/80">
                    {c}
                  </li>
                ))}
                {profile.birthday && (
                  <li className="chip bg-pink-soft text-foreground/80">
                    <span aria-hidden>🎂</span>
                    {/* 서버 렌더링 직후(오늘 날짜를 아직 모를 때)에는 생일만 보여줘요 */}
                    {birthdayText ?? profile.birthday.replaceAll("-", ".")}
                  </li>
                )}
              </ul>
            )}
            <button type="button" onClick={() => setEditorOpen(true)} className="btn-secondary mt-4 w-full">
              ✏️ {hasProfileInfo || profile.photo ? "프로필 수정" : "프로필 만들기"}
            </button>
            {!profile.photo && (
              <p className="mt-2 text-center text-xs text-muted">사진을 등록하면 프로필과 방 액자에 함께 걸려요.</p>
            )}

            {/* 경험치 */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-bold text-foreground/80">경험치</span>
                <span className="text-muted">
                  {lv.isMax ? `${lv.xp}XP · 최고 레벨` : `${lv.intoLevel} / ${lv.span} XP`}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(lv.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="다음 레벨까지"
                className="h-3 overflow-hidden rounded-full bg-beige"
              >
                <div
                  className="h-full rounded-full bg-brand transition-all duration-700"
                  style={{ width: `${Math.round(lv.progress * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {lv.isMax ? "최고 레벨이에요!" : `다음 레벨까지 ${lv.toNext}XP · 영상 분석으로 쌓여요`}
              </p>
            </div>

            {/* 기록 요약 */}
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="tile !p-2.5">
                <dt className="text-[11px] text-muted">멍로그 기록</dt>
                <dd className="mt-0.5 text-base font-bold">{dog.records.length}개</dd>
              </div>
              <div className="tile !p-2.5">
                <dt className="text-[11px] text-muted">행동 도감</dt>
                <dd className="mt-0.5 text-base font-bold">
                  {foundKeys.length}/{dexTotal}
                </dd>
              </div>
              <div className="tile !p-2.5">
                <dt className="text-[11px] text-muted">해금 아이템</dt>
                <dd className="mt-0.5 text-base font-bold">
                  {unlockedItems}/{earnable.length}
                </dd>
              </div>
            </dl>

            {/* 상태 */}
            <div className="mt-3 rounded-2xl bg-brand-soft p-3.5 text-sm leading-relaxed text-brand-dark">
              {latest ? (
                <>
                  <p className="font-bold">최근 기록 · {dateLabel(latest.savedAt)}</p>
                  <p className="mt-0.5">
                    {latest.top
                      ? `가장 많이 관찰된 행동: ${BEHAVIOR_ICONS[latest.top]} ${BEHAVIOR_LABELS[latest.top]}`
                      : "관찰된 행동이 기록됐어요."}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold">영상을 기다리고 있어요</p>
                  <p className="mt-0.5">첫 영상을 분석하면 도감과 경험치가 쌓이고, 방과 옷이 열려요.</p>
                </>
              )}
            </div>
          </aside>

          {/* 방 + 옷장/꾸미기 */}
          <div className="animate-fade-up min-w-0">
            <MyRoom collection={collection} pinned={panel !== null}>
              <div className="mt-4 flex gap-2" role="group" aria-label="꾸미기">
                <button
                  type="button"
                  aria-expanded={panel === "wardrobe"}
                  onClick={() => toggle("wardrobe")}
                  className={tabClass(panel === "wardrobe")}
                >
                  <span aria-hidden>👕</span> 옷장
                </button>
                <button
                  type="button"
                  aria-expanded={panel === "decor"}
                  onClick={() => toggle("decor")}
                  className={tabClass(panel === "decor")}
                >
                  <span aria-hidden>🏠</span> 방 꾸미기
                </button>
              </div>
              {panel === "wardrobe" && (
                <div className="mt-4">
                  <WardrobePanel onClose={() => setPanel(null)} />
                </div>
              )}
              {panel === "decor" && (
                <div className="mt-4">
                  <DecorPanel onClose={() => setPanel(null)} />
                </div>
              )}
            </MyRoom>
          </div>
        </div>
      </section>

      {/* 방 아래: 실제 분석 결과의 행동 타임라인 */}
      <HomeTimeline />

      {/* 퀘스트 CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-5 sm:pb-10">
        <div className="flex flex-col items-center gap-4 rounded-[1.75rem] bg-beige/70 p-5 text-center sm:flex-row sm:justify-between sm:p-6 sm:text-left">
          <div>
            <p className="font-bold">
              🎥 새 영상을 올리면 AI가 {dog.name}의 행동을 분석해서 도감과 방을 채워요
            </p>
            <p className="mt-1 text-sm text-muted">1~3분 정도의 강아지 영상을 올려주세요.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <Link href="/upload" className="btn-primary !py-3.5 text-base">
              🎥 영상 업로드하기
            </Link>
          </div>
        </div>
      </section>

      {/* 최근 멍로그 */}
      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-5 sm:pb-10">
        <div className="card">
          <h2 className="text-lg font-bold">📖 내 멍로그 기록</h2>
          {dog.records.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl bg-background px-5 py-8 text-center">
              <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-beige text-3xl">
                📖
              </span>
              <p className="mt-3 font-bold">아직 저장된 기록이 없어요</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
                영상을 분석하면 결과가 이곳에 차곡차곡 쌓여요.
              </p>
              <Link href="/upload" className="btn-primary mt-4">
                🎥 첫 영상 분석하기
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {dog.records.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/result/${r.id}`}
                    className="flex min-h-16 items-center gap-3 rounded-2xl bg-background p-3 transition hover:-translate-y-0.5 hover:bg-beige/60 active:scale-[0.99]"
                  >
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-beige text-xl"
                    >
                      {r.top ? BEHAVIOR_ICONS[r.top] : "🐾"}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-bold">영상 속 멍로그 · {dateLabel(r.savedAt)}</span>
                      <span className="block text-xs text-muted">
                        {r.top ? `${BEHAVIOR_LABELS[r.top]} 중심` : "관찰된 행동 기록"} ·{" "}
                        {formatDuration(r.observedSec)} 관찰
                      </span>
                    </span>
                    <span aria-hidden className="text-muted">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            이 기록과 레벨, 도감은 이 기기의 브라우저에만 저장돼요. (로그인 기능은 아직 없어요)
            {dog.records.length > 0 && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("이 기기에 저장된 내 강아지 기록을 모두 지울까요?")) clearMyDog();
                  }}
                  className="inline-flex min-h-9 items-center underline underline-offset-2 hover:text-foreground"
                >
                  기록 지우기
                </button>
              </>
            )}
          </p>
        </div>
      </section>

      {/* 행동 도감 */}
      <section id="dex" className="mx-auto max-w-5xl scroll-mt-24 px-4 pb-8 sm:px-5 sm:pb-10">
        <h2 className="text-xl font-bold">📖 행동 도감</h2>
        <p className="mb-5 mt-2 text-sm leading-relaxed text-muted">
          영상에서 실제로 확인된 행동만 도감에 담겨요. 못 만난 행동은 영상에 아직 담기지 않았다는 뜻이에요.
          {dog.records.length > 0 && ` 지금까지 분석한 영상 ${dog.records.length}개에서 모은 누적 시간이에요.`}
        </p>
        <BehaviorDex stats={dexStats} missingText="아직 못 만났어요" />
      </section>

      {/* 평소 패턴과 비교하기 / 평소와 다른 점: 분석 완료 영상이 5개 이상이면 열려요 (가장 최근 영상 기준) */}
      <UsualPattern currentId={dog.records[0]?.id ?? null} variant="home" />
      {editorOpen && <ProfileEditor onClose={() => setEditorOpen(false)} />}
    </>
  );
}
