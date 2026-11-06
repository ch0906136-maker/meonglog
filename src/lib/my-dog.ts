"use client";

// "내 강아지" 기록 보관함. 이 브라우저(localStorage)에만 저장해요.
// - 서버/DB(Supabase)나 API는 건드리지 않아요. 분석 결과 원본은 그대로 DB에 있고,
//   여기에는 도감/레벨을 채우기 위한 요약(행동별 관찰 시간)만 담아요.
// - 로그인이 없는 MVP라서 "기기별" 기록이에요. 브라우저 데이터를 지우면 함께 사라져요.
import { useSyncExternalStore } from "react";
import {
  BEHAVIOR_KEYS,
  MAX_PLAUSIBLE_VIDEO_SEC,
  isBehaviorKey,
  normalizeSegments,
  type BehaviorKey,
} from "./behaviors";
import { DOG_NAME } from "./behavior-ui";
import { normalizeBirthday } from "./birthday";
import { COATS, GENDERS, MAX_AGE_YEARS, normalizeBreed } from "./dog-look";

// 홈 타임라인용 행동 구간. 실제 분석 결과(behaviors)의 start_sec/end_sec/note를 그대로 담아요.
export type MyDogSegment = {
  behavior: BehaviorKey;
  startSec: number;
  endSec: number;
  note: string;
  confident: boolean;
};

export type MyDogRecord = {
  id: string; // analysis id (결과 페이지 주소에 쓰여요)
  savedAt: string; // ISO 시각
  seconds: Partial<Record<BehaviorKey, number>>; // 행동별 관찰 시간(초)
  observedSec: number;
  top: BehaviorKey | null; // 가장 많이 관찰된 행동
  segments?: MyDogSegment[]; // 이전 버전에서 저장된 기록에는 없을 수 있어요
};

// 강아지 프로필 (한 마리만 지원해요). 성별/생일은 화면 표시용이고 AI 분석에는 쓰지 않아요.
// 나이는 저장하지 않고 생일(birthday)에서 오늘 날짜 기준으로 계산해요. (lib/birthday.ts)
export type DogProfile = {
  photo: string | null; // 작게 줄인 JPEG data URL (이 기기에만 저장)
  breed: string; // BREEDS 중 하나, "" = 선택 안 함. 사용자가 직접 고르는 값이고 AI가 추측하지 않아요.
  coat: string; // COATS의 value, "" = 선택 안 함
  gender: string; // GENDERS의 value, "" = 선택 안 함
  birthday: string | null; // "YYYY-MM-DD", null = 입력 안 함. 이전 버전에서 저장된 프로필에는 없어요.
  // 이전 버전에서 직접 입력했던 나이예요. 생일이 없을 때만 보여주는 용도로 남겨 둬요. (새로 입력받지 않아요)
  ageYears: number | null; // 0 = 1살 미만
};

export type MyDogData = { name: string; records: MyDogRecord[]; profile: DogProfile };

export const EMPTY_PROFILE: DogProfile = {
  photo: null,
  breed: "",
  coat: "",
  gender: "",
  birthday: null,
  ageYears: null,
};

const KEY = "meonglog:my-dog:v1";
const MAX_RECORDS = 50;
const MAX_NAME = 10;
const MAX_SEGMENTS = 60;

const MAX_PHOTO_CHARS = 400_000;
const EMPTY: MyDogData = { name: DOG_NAME, records: [], profile: EMPTY_PROFILE };

function parseProfile(raw: unknown): DogProfile {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof DogProfile, unknown>>;
  const photo =
    typeof o.photo === "string" && o.photo.startsWith("data:image/") && o.photo.length <= MAX_PHOTO_CHARS
      ? o.photo
      : null;
  const age = Number(o.ageYears);
  return {
    photo,
    breed: normalizeBreed(o.breed), // 예전 이름("골든리트리버" 등)도 새 이름으로 읽어요
    coat: COATS.some((c) => c.value === o.coat) ? (o.coat as string) : "",
    gender: GENDERS.some((g) => g.value === o.gender) ? (o.gender as string) : "",
    birthday: normalizeBirthday(o.birthday), // 없거나 잘못된 값이면 null (이전 프로필도 오류 없이 열려요)
    ageYears:
      o.ageYears !== null && o.ageYears !== "" && Number.isInteger(age) && age >= 0 && age <= MAX_AGE_YEARS
        ? age
        : null,
  };
}

function parseSegments(raw: unknown[]): MyDogSegment[] {
  // 겹침/범위 밖 구간은 정리해서, 저장된 기록에서도 영상 길이를 넘는 시간이 나오지 않게 해요.
  return normalizeSegments(raw.slice(0, MAX_SEGMENTS).flatMap((x) => {
    const s = x as Partial<MyDogSegment> | null;
    if (!s || !isBehaviorKey(s.behavior)) return [];
    const start = Number(s.startSec);
    const end = Number(s.endSec);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    return [
      {
        behavior: s.behavior,
        startSec: start,
        endSec: end,
        note: typeof s.note === "string" ? s.note.slice(0, 300) : "",
        confident: s.confident !== false,
      },
    ];
  }));
}

function parse(raw: string | null): MyDogData {
  if (!raw) return EMPTY;
  try {
    const o = JSON.parse(raw) as Partial<MyDogData>;
    const name =
      typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, MAX_NAME) : DOG_NAME;
    const records: MyDogRecord[] = Array.isArray(o.records)
      ? o.records.flatMap((r) => {
          if (!r || typeof r.id !== "string" || typeof r.savedAt !== "string") return [];
          const segments = Array.isArray(r.segments) ? parseSegments(r.segments) : undefined;
          const seconds: MyDogRecord["seconds"] = {};
          if (segments && segments.length > 0) {
            // 구간이 있으면 시간은 항상 구간(end - start)에서 다시 계산해요. (저장된 합계를 믿지 않아요)
            for (const s of segments) {
              if (s.confident) seconds[s.behavior] = (seconds[s.behavior] ?? 0) + (s.endSec - s.startSec);
            }
          } else {
            for (const k of BEHAVIOR_KEYS) {
              const v = Number(r.seconds?.[k]);
              // 한 영상에서 나올 수 없는 값은 상한으로 잘라요.
              if (Number.isFinite(v) && v > 0) seconds[k] = Math.min(v, MAX_PLAUSIBLE_VIDEO_SEC);
            }
          }
          const observedFromSeconds = BEHAVIOR_KEYS.reduce((sum, k) => sum + (seconds[k] ?? 0), 0);
          // 구간이 없는 기록의 합계가 영상 하나로는 나올 수 없는 값이면 손상된 기록이에요. 값을 지어내지 않고 버려요.
          if (!(segments && segments.length > 0) && observedFromSeconds > MAX_PLAUSIBLE_VIDEO_SEC) return [];
          return [
            {
              id: r.id,
              savedAt: r.savedAt,
              seconds,
              // 확신 있게 관찰된 시간 합계 = 행동별 시간의 합 (행동별 시간이 이미 영상 길이 안에 있어요)
              observedSec: observedFromSeconds,
              top: isBehaviorKey(r.top) ? r.top : null,
              ...(segments ? { segments } : {}),
            },
          ];
        })
      : [];
    return { name, records, profile: parseProfile((o as Partial<MyDogData>).profile) };
  } catch {
    return EMPTY;
  }
}

// useSyncExternalStore용 저장소: 같은 문자열이면 같은 객체를 돌려줘서 불필요한 렌더링을 막아요.
let cachedRaw: string | null | undefined;
let cachedData: MyDogData = EMPTY;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): MyDogData {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedData;
  cachedRaw = raw;
  cachedData = parse(raw);
  return cachedData;
}

function getServerSnapshot(): MyDogData {
  return EMPTY;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(data: MyDogData) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장 공간이 막혀 있어도 화면은 계속 동작해요. (기록만 남지 않아요)
  }
  listeners.forEach((l) => l());
}

export function useMyDog(): MyDogData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// 프로필 저장: 이름은 비어 있으면 기존 이름을 유지해요.
export function saveProfile(name: string, profile: DogProfile) {
  const cur = getSnapshot();
  const v = name.trim().slice(0, MAX_NAME);
  write({ ...cur, name: v || cur.name, profile: parseProfile(profile) });
}

export function setDogName(name: string) {
  const v = name.trim().slice(0, MAX_NAME);
  if (!v) return;
  write({ ...getSnapshot(), name: v });
}

// 같은 분석 결과는 한 번만 담아요. (결과 페이지를 다시 열어도 중복되지 않아요)
// 이미 담긴 기록에 타임라인(segments)이 없으면(이전 버전 기록) 그것만 채워 줘요.
export function addRecord(rec: MyDogRecord) {
  const cur = getSnapshot();
  const existing = cur.records.find((r) => r.id === rec.id);
  if (existing) {
    if (!existing.segments && rec.segments) {
      write({
        ...cur,
        records: cur.records.map((r) => (r.id === rec.id ? { ...r, segments: rec.segments } : r)),
      });
    }
    return;
  }
  write({ ...cur, records: [rec, ...cur.records].slice(0, MAX_RECORDS) });
}

// 멍로그 기록(도감/레벨/타임라인)만 지워요. 이름과 프로필은 그대로 남겨요.
export function clearMyDog() {
  write({ ...getSnapshot(), records: [] });
}

// ───────── 도감/레벨 계산 ─────────

export type Collection = Record<BehaviorKey, { count: number; seconds: number }>;

export function getCollection(records: MyDogRecord[]): Collection {
  const c = Object.fromEntries(
    BEHAVIOR_KEYS.map((k) => [k, { count: 0, seconds: 0 }]),
  ) as Collection;
  for (const r of records) {
    for (const k of BEHAVIOR_KEYS) {
      const s = r.seconds[k] ?? 0;
      if (s > 0) {
        c[k].count += 1;
        c[k].seconds += s;
      }
    }
  }
  return c;
}

// ───────── 경험치 / 레벨 ─────────
// 경험치는 저장된 실제 분석 기록에서만 계산해요. (영상 1개 = 50XP, 도감에 처음 담긴 행동 1개 = 25XP)
export const XP_PER_RECORD = 50;
export const XP_PER_NEW_BEHAVIOR = 25;

const LEVELS = [
  { need: 0, name: "새내기 멍" },
  { need: 50, name: "기록 친구" },
  { need: 200, name: "일상 탐험가" },
  { need: 400, name: "멍로그 단골" },
  { need: 700, name: "멍로그 마스터" },
] as const;

// 기록 목록으로 총 경험치를 계산해요. 오래된 기록부터 보면서 "처음 발견한 행동"을 찾아요.
export function getXp(records: MyDogRecord[]): number {
  const seen = new Set<BehaviorKey>();
  let xp = 0;
  const ordered = [...records].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  for (const r of ordered) {
    xp += XP_PER_RECORD;
    for (const k of BEHAVIOR_KEYS) {
      if (k === "etc" || (r.seconds[k] ?? 0) <= 0 || seen.has(k)) continue;
      seen.add(k);
      xp += XP_PER_NEW_BEHAVIOR;
    }
  }
  return xp;
}

export function getProgress(records: MyDogRecord[]) {
  const xp = getXp(records);
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.need) idx = i;
  });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  return {
    xp,
    level: idx + 1,
    name: cur.name,
    intoLevel: xp - cur.need,
    span: next ? next.need - cur.need : 0,
    toNext: next ? next.need - xp : 0,
    progress: next ? (xp - cur.need) / (next.need - cur.need) : 1,
    isMax: !next,
  };
}
