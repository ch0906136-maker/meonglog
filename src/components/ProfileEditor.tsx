"use client";

import { useEffect, useRef, useState } from "react";
import {
  BREEDS,
  COATS,
  GENDERS,
  MAX_AGE_YEARS,
  ageLabel,
} from "@/lib/dog-look";
import { saveProfile, useMyDog, type DogProfile } from "@/lib/my-dog";
import DogCharacter from "./DogCharacter";

const MAX_PHOTO_MB = 10;

// 사진을 정사각형으로 잘라 작게 줄여요. (localStorage에 가볍게 저장하려고)
async function toSquareDataUrl(file: File, size = 320): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

const FIELD = "w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand";
const LABEL = "mb-1.5 block text-sm font-bold";

export default function ProfileEditor({ onClose }: { onClose: () => void }) {
  const dog = useMyDog();
  // 열릴 때의 값으로 시작하고, "저장"을 눌러야 반영돼요.
  const [name, setName] = useState(dog.name);
  const [profile, setProfile] = useState<DogProfile>(dog.profile);
  const [photoError, setPhotoError] = useState<string | null>(null);
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
      const photo = await toSquareDataUrl(f);
      setProfile((p) => ({ ...p, photo }));
    } catch {
      setPhotoError("이 사진은 불러오지 못했어요. 다른 사진으로 시도해 주세요.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveProfile(name, profile);
    onClose();
  }

  const set = <K extends keyof DogProfile>(k: K, v: DogProfile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

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
        className="animate-fade-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-surface p-6 shadow-soft sm:rounded-[2rem] sm:p-8"
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
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-brand-soft bg-beige">
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo} alt="등록한 강아지 사진" className="h-full w-full object-cover" />
            ) : (
              <DogCharacter
                className="h-full w-full translate-y-2 scale-125"
                label="기본 강아지 캐릭터"
                look={{ breed: profile.breed, coat: profile.coat }}
              />
            )}
          </div>
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
              사진은 이 기기에만 저장돼요. 사진이 없으면 기본 캐릭터가 보여요.
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
            <select
              id="dog-breed"
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
              <label htmlFor="dog-age" className={LABEL}>
                나이
              </label>
              <select
                id="dog-age"
                value={profile.ageYears === null ? "" : String(profile.ageYears)}
                onChange={(e) => set("ageYears", e.target.value === "" ? null : Number(e.target.value))}
                className={FIELD}
              >
                <option value="">선택 안 함</option>
                {Array.from({ length: MAX_AGE_YEARS + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {ageLabel(i)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="mt-5 rounded-2xl bg-brand-soft p-3.5 text-xs leading-relaxed text-brand-dark">
          견종과 털색은 캐릭터 모습에 반영돼요. 성별과 나이는 프로필에 표시만 하고 AI 분석에는 쓰지 않아요.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-line bg-surface px-6 py-3.5 font-medium transition hover:border-brand"
          >
            취소
          </button>
          <button
            type="submit"
            className="flex-1 rounded-full bg-brand px-6 py-3.5 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            저장하기
          </button>
        </div>
      </form>
    </div>
  );
}
