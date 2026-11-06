"use client";

import { useEffect, useRef, useState } from "react";
import { BREEDS, COATS, GENDERS, ageLabel } from "@/lib/dog-look";
import { MIN_BIRTH_YEAR, birthdayLine, isValidBirthday } from "@/lib/birthday";
import { useToday } from "@/lib/today";
import { saveProfile, useMyDog, type DogProfile } from "@/lib/my-dog";
import DogCharacter from "./DogCharacter";
import PetPhoto from "./PetPhoto";

const MAX_PHOTO_MB = 10;

// 사진을 원본 비율 그대로 작게 줄여요. (자르지 않아요 / localStorage에 가볍게 저장하려고 긴 변만 줄여요)
const MAX_PHOTO_CHARS = 400_000; // my-dog.ts의 저장 한도와 같아요
async function toResizedDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    // 한도를 넘으면 조금씩 더 줄여서 다시 시도해요.
    for (const [longSide, quality] of [[720, 0.85], [560, 0.8], [420, 0.75], [320, 0.7]] as const) {
      const scale = Math.min(1, longSide / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#fffdf8"; // 투명한 PNG가 검게 저장되지 않게 바탕을 깔아요
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= MAX_PHOTO_CHARS) return url;
    }
    throw new Error("too large");
  } finally {
    bmp.close();
  }
}

const BIRTHDAY_RANGE_MSG = `생일은 ${MIN_BIRTH_YEAR}년 이후, 오늘 이전의 날짜로 입력해 주세요.`;
const FIELD = "w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand";
const LABEL = "mb-1.5 block text-sm font-bold";

export default function ProfileEditor({ onClose }: { onClose: () => void }) {
  const dog = useMyDog();
  // 열릴 때의 값으로 시작하고, "저장"을 눌러야 반영돼요.
  const [name, setName] = useState(dog.name);
  const [profile, setProfile] = useState<DogProfile>(dog.profile);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const today = useToday();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPhotoError(null);
    if (!f.type.startsWith("image/")) {
      setPhotoError("사진 파일(JPG, PNG 등)만 올릴 수 있어요.");
      return;
    }
    if (f.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`사진은 ${MAX_PHOTO_MB}MB 이하여야 해요.`);
      return;
    }
    try {
      const photo = await toResizedDataUrl(f);
      setProfile((p) => ({ ...p, photo }));
    } catch {
      setPhotoError("이 사진은 불러오지 못했어요. 다른 사진으로 시도해 주세요.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // 직접 타이핑해서 미래/없는 날짜를 넣는 경우를 막아요. (today가 비어 있으면 서버 렌더링 직후라 검사를 건너뛰어요)
    if (profile.birthday && today && !isValidBirthday(profile.birthday, today)) {
      setBirthdayError(BIRTHDAY_RANGE_MSG);
      return;
    }
    saveProfile(name, profile);
    onClose();
  }

  const set = <K extends keyof DogProfile>(k: K, v: DogProfile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  // 생일을 입력하면 예전에 직접 입력한 나이는 더 쓰지 않아요. (나이는 생일로 계산해요)
  function setBirthday(value: string) {
    setBirthdayError(null);
    setProfile((p) => ({ ...p, birthday: value || null, ageYears: value ? null : p.ageYears }));
  }
  // 미래/범위 밖 날짜는 입력하는 즉시 에러로 안내해요. (저장은 막혀요)
  const birthdayInvalid = !!profile.birthday && !!today && !isValidBirthday(profile.birthday, today);
  const birthdayMsg = birthdayError ?? (birthdayInvalid ? BIRTHDAY_RANGE_MSG : null);
  const ageNow = profile.birthday && today && !birthdayInvalid ? birthdayLine(profile.birthday, today) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        onSubmit={submit}
        className="animate-fade-up max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-surface p-5 shadow-soft sm:rounded-[1.75rem] sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="profile-title" className="text-xl font-bold">
            🐾 내 강아지 프로필
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full px-3 py-1 text-lg text-muted transition hover:bg-beige"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">한 마리의 프로필을 만들 수 있어요.</p>

        {/* 사진 */}
        <div className="mt-6 flex items-center gap-5">
          {profile.photo ? (
            <PetPhoto
              src={profile.photo}
              alt="등록한 강아지 사진 미리보기"
              className="h-28 w-28 shrink-0 rounded-3xl ring-4 ring-brand-soft"
            />
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-beige ring-4 ring-brand-soft">
              <DogCharacter
                className="h-24 w-24"
                label="기본 강아지 캐릭터"
                look={{ breed: profile.breed, coat: profile.coat }}
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-dark focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
                📷 사진 {profile.photo ? "바꾸기" : "등록"}
                <input type="file" accept="image/*" onChange={onPhoto} className="sr-only" />
              </label>
              {profile.photo && (
                <button
                  type="button"
                  onClick={() => set("photo", null)}
                  className="rounded-full border border-line px-4 py-2.5 text-sm transition hover:border-brand"
                >
                  사진 지우기
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              사진은 잘리지 않고 원본 비율 그대로 보여요. 이 기기에만 저장되고, 사진이 없으면 기본 캐릭터가 보여요.
            </p>
            {photoError && (
              <p role="alert" className="mt-1 text-xs text-red-700">
                {photoError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="dog-name" className={LABEL}>
              이름
            </label>
            <input
              id="dog-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={10}
              required
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="dog-breed" className={LABEL}>
              견종
            </label>
            <p id="dog-breed-hint" className="-mt-0.5 mb-2 text-xs leading-relaxed text-muted">
              직접 고르는 정보예요. AI가 영상으로 견종을 알아맞히지 않아요.
            </p>
            <select
              id="dog-breed"
              aria-describedby="dog-breed-hint"
              value={profile.breed}
              onChange={(e) => set("breed", e.target.value)}
              className={FIELD}
            >
              <option value="">선택 안 함</option>
              {BREEDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className={LABEL}>털색</legend>
            <div className="flex flex-wrap gap-2">
              {COATS.map((c) => {
                const on = profile.coat === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("coat", on ? "" : c.value)}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                      on ? "border-brand bg-brand-soft font-bold" : "border-line bg-background hover:border-brand"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: c.swatch }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 견종 + 털색을 합친 캐릭터 모습을 바로 보여줘요 */}
          <div className="flex items-center gap-4 rounded-2xl bg-brand-soft p-3.5" aria-live="polite">
            <DogCharacter
              className="h-28 w-28 shrink-0"
              label={`${profile.breed || "기본"} 캐릭터 미리보기`}
              look={{ breed: profile.breed, coat: profile.coat }}
            />
            <div className="min-w-0 text-sm">
              <p className="font-bold text-brand-dark">캐릭터 미리보기</p>
              <p className="mt-1 leading-relaxed text-foreground/80">
                견종은 귀, 털, 체형 같은 모습에, 털색은 색에 반영돼요.
                {!profile.coat && profile.breed && " 털색을 고르지 않으면 그 견종에 흔한 색으로 보여줘요."}
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className={LABEL}>성별</legend>
              <div className="flex gap-2">
                {GENDERS.map((g) => {
                  const on = profile.gender === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("gender", on ? "" : g.value)}
                      className={`flex-1 rounded-full border px-3.5 py-2.5 text-sm transition ${
                        on ? "border-brand bg-brand-soft font-bold" : "border-line bg-background hover:border-brand"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="dog-birthday" className={LABEL}>
                생일
              </label>
              <input
                id="dog-birthday"
                type="date"
                value={profile.birthday ?? ""}
                min={`${MIN_BIRTH_YEAR}-01-01`}
                max={today || undefined}
                onChange={(e) => setBirthday(e.target.value)}
                aria-describedby="dog-birthday-hint"
                aria-invalid={birthdayMsg ? true : undefined}
                className={FIELD}
              />
            </div>
          </div>
          <div id="dog-birthday-hint" className="-mt-2 text-xs leading-relaxed text-muted">
            {birthdayMsg ? (
              <p role="alert" className="text-red-700">
                {birthdayMsg}
              </p>
            ) : ageNow ? (
              <p>
                🎂 {ageNow} · 나이는 생일로 자동 계산돼요.
                <button
                  type="button"
                  onClick={() => setBirthday("")}
                  className="ml-2 inline-flex min-h-9 items-center underline underline-offset-2 hover:text-foreground"
                >
                  생일 지우기
                </button>
              </p>
            ) : profile.ageYears !== null ? (
              <p>
                예전에 입력한 나이: {ageLabel(profile.ageYears)}. 생일을 고르면 나이가 자동으로 계산돼요.
              </p>
            ) : (
              <p>생일을 고르면 나이가 자동으로 계산돼요.</p>
            )}
          </div>
        </div>

        <p className="mt-5 rounded-2xl bg-brand-soft p-3.5 text-xs leading-relaxed text-brand-dark">
          견종과 털색은 캐릭터 모습에 반영돼요. 성별과 생일은 프로필에 표시만 하고 AI 분석에는 쓰지 않아요.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
          >
            저장하기
          </button>
        </div>
      </form>
    </div>
  );
}
