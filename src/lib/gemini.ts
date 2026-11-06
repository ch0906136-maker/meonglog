// 서버 전용: Gemini API 호출 (GEMINI_API_KEY는 브라우저로 전달되지 않아요)
import {
  ApiError,
  FileState,
  GoogleGenAI,
  Type,
  createPartFromUri,
  createUserContent,
} from "@google/genai";
import {
  BEHAVIOR_KEYS,
  BEHAVIOR_LABELS,
  formatClock,
  formatDuration,
  isBehaviorKey,
  type Segment,
  type Stat,
} from "./behaviors";

// 사용자에게 그대로 보여 줘도 되는 오류
export class UserFacingError extends Error {}

// 사용자에게 보여 줄 실제 원인 메시지
export const DAILY_QUOTA_MESSAGE =
  "오늘 AI 분석 한도를 모두 사용했어요. 한도는 하루에 한 번 초기화되니 잠시 뒤나 내일 다시 시도해 주세요.";
const BUSY_MESSAGE = "AI 분석 서버가 지금 바쁘거나 응답하지 않아요. 잠시 후 다시 시도해 주세요.";
const DEADLINE_MESSAGE = "분석 시간이 너무 오래 걸려 중단했어요. 잠시 후 다시 시도해 주세요.";
const UPLOAD_TIMEOUT_MESSAGE = "영상을 AI 서버로 보내는 데 시간이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.";
const FILE_PROCESS_MESSAGE = "영상 처리가 너무 오래 걸려요. 더 짧은 영상으로 다시 시도해 주세요.";

// 앞에서부터 시도하고, 모델이 바쁘거나(503/429) 없으면 다음 모델로 넘어가요.
// 데모 중 특정 모델이 몰려도 멈추지 않도록 여러 모델을 준비해 둬요. (뒤쪽일수록 가벼운 모델)
// 사용할 모델은 환경변수 GEMINI_MODEL로 정해요. (맨 앞에 시도하고, 나머지는 장애 대비용 예비 모델이에요.)
// GEMINI_MODEL이 없으면 아래 목록의 첫 모델을 써요.
const MODELS = [
  ...new Set(
    [
      process.env.GEMINI_MODEL?.trim(),
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ].filter((m): m is string => Boolean(m)),
  ),
];
const ROUNDS = 2; // 일시적인 오류로 모든 모델이 실패하면 잠시 쉬고 처음부터 한 번 더 시도해요.

// ───────── 호출별 시간 제한 ─────────
// Gemini가 에러도 응답도 없이 매달리는 경우가 있어요. (실제로 확인됨) 호출마다 제한 시간을 두고,
// 넘으면 그 호출을 끊고 다음 모델로 넘어가요. 전체 작업이 무한정 기다리지 않게 하는 핵심 장치예요.
const GENERATE_TIMEOUT_MS = 75_000; // 모델 한 번 호출 (보통 10~30초)
const RETRY_PASS_TIMEOUT_MS = 60_000; // 단일 구간 재분석 호출
const UPLOAD_TIMEOUT_MS = 120_000; // 영상 업로드
const FILE_GET_TIMEOUT_MS = 15_000; // 파일 상태 조회
const FILE_PROCESS_MAX_MS = 150_000; // 업로드한 영상이 처리(ACTIVE)될 때까지 기다리는 최대 시간
const MIN_CALL_MS = 8_000; // 남은 시간이 이보다 적으면 새 호출을 시작하지 않아요
const FILE_DELETE_TIMEOUT_MS = 10_000;

// 일일 한도 소진 표시는 짧게만 기억해요. (결제를 켜거나 한도가 초기화되면 곧바로 다시 시도해 볼 수 있게)
const DAILY_EXHAUSTED_MEMORY_MS = 10 * 60_000;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았어요.");
  return new GoogleGenAI({ apiKey });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 일시적인 오류(모델 바쁨/없음/한도/네트워크)면 다음 모델로 넘어가요.
function isRetryable(e: unknown) {
  if (e instanceof ApiError) return [404, 429, 500, 503, 504].includes(e.status);
  return e instanceof TypeError && /fetch failed/i.test(e.message);
}

class GeminiTimeoutError extends Error {}

// 429 중 "하루 요청 한도(PerDay)" 초과인지 확인해요. 같은 모델을 다시 불러도 소용없는 경우예요.
// (분당 한도 같은 다른 429는 잠시 뒤 다시 시도하면 되니 여기에 해당하지 않아요.)
function dailyQuotaInfo(e: unknown): { retryAfterMs: number } | null {
  if (!(e instanceof ApiError) || e.status !== 429) return null;
  const msg = e.message ?? "";
  if (!/PerDay|per day/i.test(msg)) return null;
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(msg);
  const ms = m ? Math.ceil(Number(m[1]) * 1000) : DAILY_EXHAUSTED_MEMORY_MS;
  return { retryAfterMs: Math.min(Math.max(ms, 60_000), DAILY_EXHAUSTED_MEMORY_MS) };
}

// 이 서버 인스턴스가 최근에 확인한 "일일 한도 소진" 모델 (모델 이름 → 이 시각까지는 건너뛰어요)
const dailyExhaustedUntil = new Map<string, number>();
const isDailyExhausted = (model: string) => (dailyExhaustedUntil.get(model) ?? 0) > Date.now();
const markDailyExhausted = (model: string, ms: number) => dailyExhaustedUntil.set(model, Date.now() + ms);
const anyDailyExhausted = () => MODELS.some(isDailyExhausted);

// 모든 모델의 일일 한도가 소진된 걸 이미 알고 있다면, 영상을 올리기 전에 바로 실패시켜요. (시간/트래픽 절약)
export function assertGeminiAvailable() {
  if (MODELS.every(isDailyExhausted)) throw new UserFacingError(DAILY_QUOTA_MESSAGE);
}

// ms 뒤에 끊기는 신호. 바깥(전체 작업) 신호가 끊겨도 함께 끊겨요.
function callSignal(ms: number, outer?: AbortSignal) {
  const timer = AbortSignal.timeout(ms);
  const signal = outer ? AbortSignal.any([timer, outer]) : timer;
  return { signal, timedOut: () => timer.aborted && !outer?.aborted };
}

// SDK가 abortSignal을 놓쳐도 우리 쪽 대기는 확실히 끝나도록, 신호가 끊기면 바로 거절해요.
function raceAbort<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new Error("aborted"));
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

type FallbackOptions = {
  deadline?: number; // 이 시각(ms)이 지나면 새 호출을 시작하지 않아요
  signal?: AbortSignal; // 전체 작업이 중단되면 진행 중인 호출도 끊어요
  models?: string[]; // 기본은 MODELS 전체
  timeoutMs: number; // 호출 한 번의 제한 시간
};

// 모델을 차례로 시도해요.
// - 호출마다 제한 시간이 있어서, 응답 없이 매달리는 모델은 끊고 다음 모델로 넘어가요.
// - 일일 한도(PerDay) 초과는 같은 모델을 다시 부르지 않고 바로 다음 모델로 넘어가요.
// - 모두 실패하면 실제 원인(일일 한도 소진 / 서버 바쁨)을 알 수 있는 메시지로 끝내요.
async function withModelFallback<T>(
  run: (model: string, signal: AbortSignal) => Promise<T>,
  opts: FallbackOptions,
): Promise<{ value: T; model: string; failedAttempts: number }> {
  const models = opts.models ?? MODELS;
  let lastError: unknown;
  let failedAttempts = 0;

  for (let round = 0; round < ROUNDS; round++) {
    let transientFailure = false; // 이번 회차에 "다시 해 볼 만한" 실패가 있었는지
    for (const model of models) {
      if (opts.signal?.aborted) throw new UserFacingError(DEADLINE_MESSAGE);
      if (isDailyExhausted(model)) continue; // 일일 한도가 이미 소진된 모델은 건너뛰어요
      const remaining = opts.deadline ? opts.deadline - Date.now() : Infinity;
      if (remaining < MIN_CALL_MS) throw new UserFacingError(DEADLINE_MESSAGE);

      const call = callSignal(Math.min(opts.timeoutMs, remaining), opts.signal);
      try {
        const value = await raceAbort(run(model, call.signal), call.signal);
        return { value, model, failedAttempts };
      } catch (e) {
        failedAttempts++;
        lastError = e;
        if (opts.signal?.aborted) throw new UserFacingError(DEADLINE_MESSAGE);

        const daily = dailyQuotaInfo(e);
        if (daily) {
          markDailyExhausted(model, daily.retryAfterMs);
          console.warn(`[gemini] ${model} 일일 한도 소진 → 다음 모델로 넘어가요`);
          continue;
        }
        if (call.timedOut()) {
          lastError = new GeminiTimeoutError(`${model} 응답 없음(${Math.round(opts.timeoutMs / 1000)}초 제한)`);
          console.warn(`[gemini] ${model} 응답 시간 초과 → 다음 모델로 넘어가요`);
          transientFailure = true;
          continue;
        }
        if (!isRetryable(e)) throw e;
        transientFailure = true;
        console.warn(`[gemini] ${model} 실패(${round + 1}회차):`, (e as Error).message.slice(0, 100));
      }
    }
    // 이번 회차의 실패가 전부 일일 한도 때문이었다면 다시 해도 소용없어요.
    if (!transientFailure) break;
    if (round < ROUNDS - 1) {
      if (opts.deadline && Date.now() + 4000 + MIN_CALL_MS > opts.deadline) break;
      await sleep(4000);
    }
  }

  if (models.every(isDailyExhausted)) throw new UserFacingError(DAILY_QUOTA_MESSAGE);
  if (lastError instanceof GeminiTimeoutError || isRetryable(lastError)) throw new UserFacingError(BUSY_MESSAGE);
  throw lastError;
}

// ───────────────────────── ① 영상 → 행동 구간 ─────────────────────────

const ANALYSIS_PROMPT = `너는 반려견 행동을 관찰하는 분석가야. 첨부된 영상은 보호자가 올린 반려견 홈캠/촬영 영상이고, 하루 중 일부를 담은 짧은 영상일 수 있어.
영상을 처음부터 끝까지 보고, 화면에서 실제로 관찰된 행동만 시간 구간으로 나눠서 기록해 줘.

행동 분류(behavior)는 반드시 아래 7가지 중 하나만 써:
- rest: 휴식/멈춤 (누워 있기, 엎드려 쉬기, 졸기, 잠자기, 가만히 앉거나 서서 쉬기, 특정 대상 없이 잠시 멈춰 있기)
- move: 걷기/이동 (걷기, 뛰어 이동하기, 서성이기, 돌아다니기)
- play: 놀이 (장난감 물기/흔들기, 뛰어다니며 놀기, 사람이나 다른 동물과 놀기)
- watch: 주변 관찰 (움직임을 멈추고 특정 방향, 물체, 사람, 물줄기 등을 분명하게 바라보거나 주변을 두리번거리며 살피는 모습)
- eat: 식사 (사료나 간식 먹기)
- drink: 물 마시기
- bark: 짖기 (짖는 소리를 내거나 짖는 동작)
- etc: 기타/판단 어려움 (긁기, 핥기, 몸 털기, 하품, 배변, 또는 위에 속하지 않거나 무슨 행동인지 판단하기 어려운 구간)

분류 주의사항:
- 강아지가 잠시 멈췄다고 해서 모두 etc로 넣지 마. 멈춰서 무언가를 바라보면 watch, 그냥 멈추거나 쉬고 있으면 rest로 분류해.
- watch는 강아지의 시선이나 고개 방향이 특정 대상/방향을 향하거나 주변을 살피는 장면이 영상에서 명확할 때만 써. 무엇을 보는지 불분명하면 watch로 단정하지 말고 rest 또는 etc로 하고 confidence를 낮게 줘.
- note에 바라보는 대상을 쓸 때는 화면에서 실제로 보이는 것만 써. (예: "멈춰 서서 물줄기 쪽을 바라봤어요") 대상이 안 보이면 "멈춰 서서 한쪽을 바라봤어요"처럼만 써.
- 행동을 억지로 분류하지 마. 확실하지 않으면 etc로 두거나 confidence를 낮춰.

구간 나누기 규칙:
- 영상 전체를 하나의 행동으로 뭉뚱그리지 마. 행동이 바뀌는 지점마다 구간을 나눠서 start_sec/end_sec를 따로 적어.
- 같은 분류라도 중간에 멈추거나, 다른 행동(냄새 맡기, 보호자 쳐다보기, 쉬기 등)이 끼어들면 구간을 나눠. 끊김 없이 이어지는 같은 행동만 하나로 합쳐.
- 영상이 10초 이상인데 구간이 하나뿐이라면, 답하기 전에 영상 전체를 다시 확인해서 중간에 행동 변화, 멈춤, 이동, 시선이나 머리 방향 변화 등 다른 관찰 가능한 행동이 있었는지 재검토해. 있었다면 그 지점에서 구간을 나눠. 다만 실제로 행동 변화가 없었다면 억지로 나누지 마. 실제로 확인된 행동만 기록해.
- 2초 미만의 아주 짧은 동작은 따로 만들지 말고 앞뒤 구간에 합쳐.
- 구간은 시간순으로, 서로 겹치지 않게 해. 시간은 영상 시작 기준 초(second) 숫자이고 start_sec < end_sec야.
- 강아지가 화면 밖에 있거나 가려져서 안 보이는 시간, 무슨 행동인지 알 수 없는 시간은 구간을 만들지 말고 비워 둬. 빈틈을 억지로 채우지 마.

관찰 근거 규칙:
- 화면에서 직접 보이거나 들리는 행동만 기록해. 짐작, 추측, 상상으로 행동을 만들지 마.
- 영상에 나오지 않은 행동(식사, 물 마시기, 짖기 등)은 구간을 만들지 마. 없는 행동을 0초짜리 구간으로 적지 마.
- note에는 그 구간에서 실제로 보인 동작을 근거로 한 짧은 한국어 한 문장을 써. (예: "장난감을 물고 좌우로 흔들며 뛰어다녔어요", "거실 바닥에 엎드려 눈을 감고 있었어요")
- note에는 영상 화면에서 실제로 확인되는 사람, 동물, 사물, 행동만 언급해. 화면에 명확하게 보이지 않는 보호자, 사물, 상황 등을 추측해서 쓰지 마. (예: 보호자가 화면에 보이지 않으면 "보호자가 뿌리는"처럼 쓰지 말고 "물줄기"라고만 써)
- note에 "오늘", "하루", "평소" 같은 표현이나 기분/감정/건강에 대한 추측을 쓰지 마.
- note에는 의도나 내면 상태를 추측하는 표현을 쓰지 마. 금지 표현: "유심히 바라보고", "유심히 관찰하고", "~하려고 하며", "~하려는 모습", "신나게", "즐겁게", "호기심 어린", "불안해 보이는". 대신 영상에서 직접 확인되는 동작으로 써. (예: "물줄기를 유심히 바라봤어요" → "멈춰 서서 물줄기 방향을 바라봤어요", "물을 물려고 했어요" → "물줄기 가까이에서 입을 움직였어요")
- confidence는 0~1 사이로, 그 구간의 행동 분류에 대한 확신 정도야. 동작이 선명하면 0.8 이상, 가려지거나 멀리 있어서 애매하면 0.6 미만으로 솔직하게 적어. 확신이 낮은 구간은 억지로 확정하지 말고 낮은 값을 줘.
- 질병이나 건강 상태, 통증, 스트레스, 불안 같은 것을 진단하거나 추측하지 마. 관찰된 행동만 써.
- 영상에 강아지가 전혀 보이지 않으면 dog_found를 false로 하고 segments는 빈 배열로 해.
- video_duration_sec에는 영상의 전체 길이(초)를 넣어.`;

// 단일 구간 재분석 (10초 이상 영상에서 구간이 1개뿐일 때, 최대 1회만 사용)
const SINGLE_SEGMENT_RETRY_MIN_SEC = 10;
// 남은 시간이 이보다 적으면 재분석은 건너뛰어요. (재분석 때문에 시간 제한에 걸리지 않도록)
const RETRY_MIN_REMAINING_MS = 120_000;
const RETRY_PROMPT = `${ANALYSIS_PROMPT}

[재분석 요청]
앞선 분석에서는 영상 전체가 하나의 행동 구간으로만 분류됐어. 영상 전체를 처음부터 끝까지 다시 확인해서 행동이 실제로 바뀌는 지점(행동 변화, 멈춤, 이동, 시선이나 머리 방향 변화 등)이 있는지 확인해 줘.
- 실제로 바뀌는 지점이 있으면 그 지점에서 구간을 나눠서 start_sec/end_sec를 각각 적어.
- 실제 변화가 없다면 억지로 구간을 나누지 마. 하나의 구간으로 답해도 돼.
- 화면에서 확인되는 행동만 기록하고, 지어내지 마.`;

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    dog_found: { type: Type.BOOLEAN },
    video_duration_sec: { type: Type.NUMBER },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          behavior: { type: Type.STRING, enum: [...BEHAVIOR_KEYS] },
          start_sec: { type: Type.NUMBER },
          end_sec: { type: Type.NUMBER },
          note: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["behavior", "start_sec", "end_sec", "note", "confidence"],
      },
    },
  },
  required: ["dog_found", "video_duration_sec", "segments"],
};

export type VideoAnalysis = {
  dogFound: boolean;
  durationSec: number;
  segments: (Segment & { confidence: number | null })[];
};

// 모델 응답을 그대로 믿지 않고 검증/보정해요: 잘못된 행동명 제거, 범위 보정, 겹침 정리.
export function sanitizeSegments(
  raw: unknown,
  durationSec: number,
): VideoAnalysis["segments"] {
  if (!Array.isArray(raw)) return [];
  const items = raw
    .map((r) => {
      const o = r as Record<string, unknown>;
      if (!isBehaviorKey(o?.behavior)) return null;
      let start = Number(o.start_sec);
      let end = Number(o.end_sec);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      if (durationSec > 0) {
        start = Math.min(Math.max(start, 0), durationSec);
        end = Math.min(Math.max(end, 0), durationSec);
      }
      const conf = Number(o.confidence);
      return {
        behavior: o.behavior,
        startSec: Math.round(Math.max(0, start)),
        endSec: Math.round(Math.max(0, end)),
        note: typeof o.note === "string" && o.note.trim() ? o.note.trim() : null,
        confidence: Number.isFinite(conf) ? Math.min(Math.max(conf, 0), 1) : null,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => a.startSec - b.startSec);

  const out: VideoAnalysis["segments"] = [];
  let cursor = 0;
  for (const s of items) {
    const start = Math.max(s.startSec, cursor); // 겹치는 부분은 잘라내요
    if (s.endSec <= start) continue;
    out.push({ ...s, startSec: start });
    cursor = s.endSec;
  }
  return out;
}

export async function analyzeDogVideo(
  video: Blob,
  mimeType: string,
  deadline?: number, // 이 시각(ms)이 지나면 새 호출을 시작하지 않고, 호출마다 남은 시간 안으로 제한해요
  signal?: AbortSignal, // 전체 작업이 중단되면(하드 시간 초과) 진행 중인 호출도 끊어요
): Promise<VideoAnalysis> {
  const ai = getClient();
  // 모든 모델의 일일 한도가 소진된 걸 이미 알고 있으면, 영상을 올리기 전에 바로 알려요.
  assertGeminiAvailable();
  const remaining = () => (deadline ? deadline - Date.now() : Infinity);

  // 1) Gemini에 영상 올리기 (제한 시간 있음) → 처리(ACTIVE)될 때까지 기다리기
  const uploadMs = Math.min(UPLOAD_TIMEOUT_MS, remaining() - MIN_CALL_MS);
  if (uploadMs < MIN_CALL_MS) throw new UserFacingError(DEADLINE_MESSAGE);
  const up = callSignal(uploadMs, signal);
  let file: Awaited<ReturnType<typeof ai.files.upload>>;
  try {
    file = await raceAbort(
      ai.files.upload({ file: video, config: { mimeType, abortSignal: up.signal } }),
      up.signal,
    );
  } catch (e) {
    if (signal?.aborted) throw new UserFacingError(DEADLINE_MESSAGE);
    if (up.timedOut()) throw new UserFacingError(UPLOAD_TIMEOUT_MESSAGE);
    throw e;
  }
  try {
    const processingDeadline = Math.min(
      Date.now() + FILE_PROCESS_MAX_MS,
      deadline ? deadline - MIN_CALL_MS * 2 : Infinity,
    );
    while (file.state === FileState.PROCESSING) {
      if (signal?.aborted) throw new UserFacingError(DEADLINE_MESSAGE);
      if (Date.now() > processingDeadline) throw new UserFacingError(FILE_PROCESS_MESSAGE);
      await sleep(2000);
      const get = callSignal(FILE_GET_TIMEOUT_MS, signal);
      try {
        file = await raceAbort(
          ai.files.get({ name: file.name!, config: { abortSignal: get.signal } }),
          get.signal,
        );
      } catch (e) {
        if (signal?.aborted) throw new UserFacingError(DEADLINE_MESSAGE);
        if (get.timedOut()) continue; // 상태 조회 한 번이 느린 것뿐이면 다시 조회해요 (전체 제한은 위에서 지켜요)
        throw e;
      }
    }
    if (file.state === FileState.FAILED || !file.uri) {
      throw new UserFacingError("영상을 처리하지 못했어요. 다른 영상(MP4 권장)으로 다시 시도해 주세요.");
    }
    const fileUri = file.uri;

    // 2) 행동 구간을 JSON으로 받기 (구조화 출력)
    type Pass = { analysis: VideoAnalysis; model: string; failedAttempts: number };
    const runPass = async (
      prompt: string,
      temperature: number,
      opts: { models?: string[]; timeoutMs: number },
    ): Promise<Pass> => {
      const r = await withModelFallback(
        async (model, callAbort) => {
          const res = await ai.models.generateContent({
            model,
            contents: createUserContent([
              createPartFromUri(fileUri, file.mimeType ?? mimeType),
              prompt,
            ]),
            config: {
              responseMimeType: "application/json",
              responseSchema: analysisSchema,
              temperature,
              abortSignal: callAbort,
            },
          });
          if (!res.text) throw new Error("Gemini가 빈 응답을 보냈어요.");
          return res.text;
        },
        { deadline, signal, models: opts.models, timeoutMs: opts.timeoutMs },
      );

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(r.value);
      } catch {
        throw new Error("Gemini 응답을 JSON으로 읽지 못했어요: " + r.value.slice(0, 200));
      }

      const durationSec = Number(parsed.video_duration_sec);
      const duration = Number.isFinite(durationSec) ? durationSec : 0;
      const segments = sanitizeSegments(parsed.segments, duration);
      return {
        analysis: {
          dogFound: parsed.dog_found !== false && segments.length > 0,
          durationSec: duration,
          segments,
        },
        model: r.model,
        failedAttempts: r.failedAttempts,
      };
    };

    const first = await runPass(ANALYSIS_PROMPT, 0.2, { timeoutMs: GENERATE_TIMEOUT_MS });
    const firstResult = first.analysis;

    // 3) 10초 이상 영상인데 구간이 1개뿐이면, 딱 1번만 재분석해요. (반복/재귀 없음)
    //    재분석 결과가 더 세분화됐을 때만 쓰고, 아니거나 실패하면 첫 결과를 그대로 써요.
    //    한도가 빠듯한 상황에서는 불필요한 추가 호출을 만들지 않도록 건너뛰어요:
    //    - 첫 분석에서 모델이 실패해 다른 모델로 넘어왔거나, 일일 한도가 소진된 모델이 있으면 건너뛰어요.
    //    - 재분석은 첫 분석이 성공한 그 모델 하나만 한 번 호출해요. (다른 모델로 번지지 않아요)
    const quotaPressure = first.failedAttempts > 0 || anyDailyExhausted();
    const knownDuration =
      firstResult.durationSec || Math.max(0, ...firstResult.segments.map((s) => s.endSec));
    if (
      firstResult.dogFound &&
      firstResult.segments.length === 1 &&
      !quotaPressure &&
      !signal?.aborted &&
      (!deadline || Date.now() < deadline - RETRY_MIN_REMAINING_MS) &&
      knownDuration >= SINGLE_SEGMENT_RETRY_MIN_SEC
    ) {
      try {
        const second = await runPass(RETRY_PROMPT, 0.4, {
          models: [first.model],
          timeoutMs: RETRY_PASS_TIMEOUT_MS,
        });
        if (second.analysis.dogFound && second.analysis.segments.length > firstResult.segments.length) {
          return second.analysis;
        }
      } catch (e) {
        console.warn("[gemini] 단일 구간 재분석 실패, 첫 결과 사용:", (e as Error).message.slice(0, 100));
      }
    }
    return firstResult;
  } finally {
    // 분석이 끝나면(성공/실패/시간 초과 모두) Gemini 쪽 임시 영상 파일을 지워요. (실패해도 무시)
    // 서버리스 함수가 곧 끝날 수 있어서 짧은 제한 시간을 두고 기다려요.
    if (file.name) {
      await ai.files
        .delete({ name: file.name, config: { abortSignal: AbortSignal.timeout(FILE_DELETE_TIMEOUT_MS) } })
        .catch(() => {});
    }
  }
}

// ───────────────────────── ② 통계 → 영상 속 멍로그 ─────────────────────────

const logSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    body: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["summary", "body"],
};

export type DailyLog = { summary: string; body: string[] };

// 영상 하나(보통 짧은 클립)를 보고 쓰는 글이라 "오늘 하루" 전체로 해석하지 않아요.
// 확신이 낮은 구간(uncertainSec)은 글에 쓰지 않고, 평소와의 비교도 하지 않아요.
export async function writeDailyLog(input: {
  segments: Segment[]; // 확신 있는 구간만
  stats: Stat[];
  durationSec: number;
  deadline?: number;
  signal?: AbortSignal; // 전체 작업이 중단되면 진행 중인 호출도 끊어요
}): Promise<DailyLog> {
  const ai = getClient();

  const statsText = input.stats
    .filter((s) => s.seconds > 0)
    .map((s) => `- ${s.label}: ${formatDuration(s.seconds)} (관찰된 시간 중 ${s.percent}%)`)
    .join("\n");
  const timelineText = input.segments
    .map(
      (s) =>
        `- ${formatClock(s.startSec)}~${formatClock(s.endSec)} ${BEHAVIOR_LABELS[s.behavior]}${s.note ? `: ${s.note}` : ""}`,
    )
    .join("\n");

  const prompt = `너는 반려견 보호자에게 영상 속 강아지의 모습을 다정하게 들려주는 "멍로그" 작가야.
아래는 AI가 ${formatDuration(input.durationSec)}짜리 영상 하나에서 관찰한 강아지의 행동 기록이야. 이 내용만 바탕으로 "영상 속 멍로그"를 써 줘.

[행동별 관찰 시간]
${statsText}

[시간순 기록]
${timelineText}

작성 규칙:
- summary: 이 영상에서 강아지가 한 일을 한두 문장으로 요약해.
- body: 2~3개의 짧은 문단. 영상의 시간 흐름에 따라 강아지가 무엇을 했는지 따뜻하고 담백하게 써.
- 이 글은 짧은 영상 하나에 대한 기록이야. "오늘", "하루", "오늘 하루는", "평소", "보통" 같은 표현은 쓰지 말고 "영상 속에서", "이 영상에서"처럼 영상 범위로 써.
- 강아지 이름을 모르니 "우리 강아지"라고 불러. 존댓말 대신 "~했어요" 체를 써.
- 위 기록에 없는 일은 절대 지어내지 마. 기록에 없는 행동은 "하지 않았다", "먹지 않았다"처럼 쓰지 말고 아예 언급하지 마.
- 이전 기록과 비교하거나 늘었다/줄었다 같은 변화를 말하지 마.
- 기타/판단 어려움으로 분류된 구간은 구체적으로 언급하지 마.
- 기분, 감정, 흥미, 의도, 눈빛 같은 내면 상태를 추측하거나 단정하지 마. "신나게", "즐겁게", "호기심 어린", "불안해 보이는", "집중하는 눈빛", "유심히 바라보고", "유심히 관찰하고", "~하려고 하며", "~하려는 모습" 같은 표현은 쓰지 말고, 영상에서 확인할 수 있는 동작과 상황만 서술해. (예: "신나게 뛰었어요" 대신 "물줄기를 향해 반복해서 뛰어올랐어요", "물줄기를 유심히 바라봤어요" 대신 "멈춰 서서 물줄기 방향을 바라봤어요", "물을 물려고 했어요" 대신 "물줄기 가까이에서 입을 움직였어요")
- 기록(note)에 의도나 내면 상태 표현이 섞여 있어도 그대로 옮기지 말고, 확인 가능한 동작으로 바꿔서 써.
- 의료적 진단은 하지 마. 질병, 통증, 건강 이상, 스트레스, 불안, 분리불안 같은 것을 판단하거나 암시하지 마.
- 과장하거나 유치한 표현, 이모지는 쓰지 마.`;

  const { value: text } = await withModelFallback(
    async (model, callAbort) => {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: logSchema,
          temperature: 0.7,
          abortSignal: callAbort,
        },
      });
      if (!res.text) throw new Error("Gemini가 빈 응답을 보냈어요.");
      return res.text;
    },
    { deadline: input.deadline, signal: input.signal, timeoutMs: GENERATE_TIMEOUT_MS },
  );

  const parsed = JSON.parse(text) as Partial<DailyLog>;
  const body = Array.isArray(parsed.body)
    ? parsed.body.filter((p): p is string => typeof p === "string" && p.trim() !== "")
    : [];
  if (!parsed.summary || body.length === 0) {
    throw new Error("멍로그 응답 형식이 올바르지 않아요.");
  }
  return { summary: parsed.summary.trim(), body };
}
