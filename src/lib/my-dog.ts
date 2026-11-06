"use client";

// "내 강아지" 기록 보관함. 이 브라우저(localStorage)에만 저장해요.
// - 서버/DB(Supabase)나 API는 건드리지 않아요. 분석 결과 원본은 그대로 DB에 있고,
//   여기에는 도감/레벨을 채우기 위한 요약(행동별 관찰 시간)만 담아요.
// - 로그인이 없는 MVP라서 "기기별" 기록이에요. 브라우저 데이터를 지우면 함께 사라져요.
import { useSyncExternalStore } from "react";
import {
  BEHAVIOR_KEYS,
  isBehaviorKey,
  type BehaviorKey,
} from "./behaviors";
import { DOG_NAME } from "./behavior-ui";
import { BREEDS, COATS, GENDERS, MAX_AGE_YEARS } from "./dog-look";

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

// 강아지 프로필 (한 마리만 지원해요). 성별/나이는 화면 표시용이고 AI 분석에는 쓰지 않아요.
export type DogProfile = {
  photo: string | null; // 작게 줄인 JPEG data URL (이 기기에만 저장)
  breed: string; // "" = 선택 안 함
  coat: string; // COATS의 value, "" = 선택 안 함
  gender: string; // GENDERS의 value, "" = 선택 안 함
  ageYears: number | null; // 0 = 1살 미만
};

export type MyDogData = { name: string; records: MyDogRecord[]; profile: DogProfile };

export const EMPTY_PROFILE: DogProfile = { photo: null, breed: "", coat: "", gender: "", ageYears: null };

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
    breed: (BREEDS as readonly string[]).includes(o.breed as string) ? (o.breed as string) : "",
    coat: COATS.some((c) => c.value === o.coat) ? (o.coat as string) : "",
    gender: GENDERS.some((g) => g.value === o.gender) ? (o.gender as string) : "",
    ageYears:
      o.ageYears !== null && o.ageYears !== "" && Number.isInteger(age) && age >= 0 && age <= MAX_AGE_YEARS
        ? age
        : null,
  };
}

function parseSegments(raw: unknown[]): MyDogSegment[] {
  return raw.slice(0, MAX_SEGMENTS).flatMap((x) => {
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
  });
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
          const seconds: MyDogRecord["seconds"] = {};
          for (const k of BEHAVIOR_KEYS) {
            const v = Number(r.seconds?.[k]);
            if (Number.isFinite(v) && v > 0) seconds[k] = v;
          }
          return [
            {
              id: r.id,
              savedAt: r.savedAt,
              seconds,
              observedSec: Number.isFinite(Number(r.observedSec)) ? Number(r.observedSec) : 0,
              top: isBehaviorKey(r.top) ? r.top : null,
              ...(Array.isArray(r.segments) ? { segments: parseSegments(r.segments) } : {}),
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

// 기록 개수에 따라 올라가는 레벨 (경험치 = 저장된 멍로그 수)
const LEVELS = [
  { need: 0, name: "새내기 멍" },
  { need: 1, name: "기록 친구" },
  { need: 3, name: "일상 탐험가" },
  { need: 6, name: "멍로그 단골" },
  { need: 10, name: "멍로그 마스터" },
] as const;

export function getLevel(recordCount: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (recordCount >= l.need) idx = i;
  });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  return {
    level: idx + 1,
    name: cur.name,
    toNext: next ? next.need - recordCount : 0,
    progress: next ? (recordCount - cur.need) / (next.need - cur.need) : 1,
    isMax: !next,
  };
}
