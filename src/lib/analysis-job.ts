// 서버 전용: 영상 분석 전체 파이프라인
//   Storage 다운로드 → Gemini 행동 분석 → behaviors 저장 → 멍로그 생성 → daily_logs 저장
// 진행 상태는 analyses 테이블(status, progress)에 기록하고, 화면이 이 값을 읽어요.
//
// 종료 보장: 어떤 이유로든(Gemini가 응답 없이 매달림, 한도 소진, 네트워크 문제 …) 이 작업은
// 정해진 시간 안에 끝나고, analyses 상태가 processing으로 영원히 남지 않아요.
//   - 소프트 예산(ANALYSIS_BUDGET_MS): 이 시간이 지나면 Gemini 새 호출을 시작하지 않고, 호출마다 남은 시간 안으로 제한해요.
//   - 하드 제한(HARD_STOP_MS): 그래도 안 끝나면 진행 중인 호출을 끊고 failed로 기록한 뒤 임시 파일을 정리해요.
//   - 둘 다 함수 최대 실행 시간(maxDuration 300초)보다 충분히 앞에 있어요.
import { getBaseline } from "./baseline";
import { getStats, isConfident, secondsFromSegments } from "./behaviors";
import { UserFacingError, analyzeDogVideo, assertGeminiAvailable, writeDailyLog } from "./gemini";
import { supabaseAdmin as supabase } from "./supabase-admin";

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const ANALYSIS_BUDGET_MS = 230_000; // 소프트 예산
const HARD_STOP_MS = 255_000; // 하드 제한 (maxDuration 300초보다 45초 앞)
const CLEANUP_GRACE_MS = 10_000; // 중단 후 Gemini 임시 파일 정리를 기다려 주는 최대 시간
const STORAGE_DOWNLOAD_TIMEOUT_MS = 60_000;

const TIMEOUT_MESSAGE = "분석 시간이 너무 오래 걸려 중단됐어요. 잠시 후 다시 시도해 주세요.";
const DOWNLOAD_TIMEOUT_MESSAGE = "영상을 불러오는 데 시간이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.";
const GENERIC_ERROR_MESSAGE = "분석 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";

// 아직 끝나지 않은 상태. 상태 변경은 항상 이 상태일 때만 해서, 이미 failed로 끝난 분석을 나중에 덮어쓰지 않아요.
const ACTIVE = ["pending", "processing"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new UserFacingError(message)), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function setProgress(analysisId: string, patch: { status?: string; progress?: number }) {
  const { error } = await supabase.from("analyses").update(patch).eq("id", analysisId).in("status", ACTIVE);
  if (error) console.error("[analysis] 상태 저장 실패:", error.message);
}

// failed 기록은 일시적인 DB 오류로 빠지지 않게 몇 번 재시도해요. (processing으로 남는 걸 막는 마지막 안전장치)
async function failAnalysis(analysisId: string, message: string) {
  for (let i = 0; i < 3; i++) {
    const { error } = await supabase
      .from("analyses")
      .update({ status: "failed", error: message })
      .eq("id", analysisId)
      .in("status", ACTIVE);
    if (!error) return;
    console.error(`[analysis] failed 기록 실패(${i + 1}/3):`, error.message);
    await sleep(500 * (i + 1));
  }
}

async function runPipeline(
  analysisId: string,
  video: { id: string; storage_path: string },
  deadline: number,
  signal: AbortSignal,
  ctx: { stage: string },
) {
  // 하드 제한으로 중단된 뒤에는 더 이상 DB에 쓰지 않아요.
  const alive = () => {
    if (signal.aborted) throw new UserFacingError(TIMEOUT_MESSAGE);
  };

  // 모든 모델의 일일 한도가 소진된 걸 이미 알고 있으면 영상을 받기 전에 바로 알려요.
  ctx.stage = "preflight";
  assertGeminiAvailable();
  await setProgress(analysisId, { status: "processing", progress: 5 });

  // 1) Storage에서 영상 내려받기
  ctx.stage = "storage-download";
  const { data: blob, error: dlError } = await withTimeout(
    supabase.storage.from("dog-videos").download(video.storage_path),
    STORAGE_DOWNLOAD_TIMEOUT_MS,
    DOWNLOAD_TIMEOUT_MESSAGE,
  );
  if (dlError || !blob) {
    throw new Error("영상 다운로드 실패: " + (dlError?.message ?? "빈 파일"));
  }
  alive();
  const ext = video.storage_path.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXT[ext] ?? (blob.type || "video/mp4");
  await setProgress(analysisId, { progress: 10 });

  // 2) Gemini로 행동 구간 분석 (가장 오래 걸리는 단계. 호출마다 제한 시간이 있어요)
  ctx.stage = "gemini-analyze";
  const analysis = await analyzeDogVideo(blob, mimeType, deadline, signal);
  alive();
  await setProgress(analysisId, { progress: 60 });

  if (!analysis.dogFound) {
    throw new UserFacingError(
      "영상에서 강아지를 찾지 못했어요. 강아지가 화면에 잘 보이는 영상으로 다시 시도해 주세요.",
    );
  }

  // 확신이 낮은 구간은 DB에는 confidence와 함께 저장하되, 통계/글에는 쓰지 않아요.
  const confidentSegments = analysis.segments.filter(isConfident);
  if (confidentSegments.length === 0) {
    throw new UserFacingError(
      "영상에서 강아지의 행동을 확실하게 구분하지 못했어요. 강아지가 더 선명하게 보이는 영상으로 다시 시도해 주세요.",
    );
  }

  // 3) 행동 구간 저장
  ctx.stage = "save-behaviors";
  alive();
  const { error: bhError } = await supabase.from("behaviors").insert(
    analysis.segments.map((s) => ({
      analysis_id: analysisId,
      behavior: s.behavior,
      start_sec: s.startSec,
      end_sec: s.endSec,
      note: s.note,
      confidence: s.confidence,
    })),
  );
  if (bhError) throw new Error("행동 기록 저장 실패: " + bhError.message);
  await setProgress(analysisId, { progress: 75 });

  // 4) 통계는 코드로 계산하고(확신 있는 구간만), 멍로그 글은 Gemini가 써요.
  //    평소와의 비교는 과거 데이터가 충분할 때만 해요. (MVP에서는 baseline이 null)
  ctx.stage = "gemini-write-log";
  const stats = getStats(secondsFromSegments(confidentSegments), await getBaseline());
  const log = await writeDailyLog({
    segments: confidentSegments,
    stats,
    durationSec: analysis.durationSec || Math.max(...confidentSegments.map((s) => s.endSec)),
    deadline,
    signal,
  });

  ctx.stage = "save-log";
  alive();
  const { error: logError } = await supabase.from("daily_logs").insert({
    analysis_id: analysisId,
    summary: log.summary,
    body: log.body.join("\n\n"),
  });
  if (logError) throw new Error("멍로그 저장 실패: " + logError.message);

  alive();
  const { data: done } = await supabase
    .from("analyses")
    .update({ status: "completed", progress: 100, completed_at: new Date().toISOString() })
    .eq("id", analysisId)
    .in("status", ACTIVE)
    .select("id");
  if (!done?.length) console.warn("[analysis] 이미 종료 처리된 분석이라 완료 표시를 건너뛰었어요:", analysisId);
}

export async function runAnalysis(
  analysisId: string,
  video: { id: string; storage_path: string },
) {
  const startedAt = Date.now();
  const deadline = startedAt + ANALYSIS_BUDGET_MS;
  const controller = new AbortController();
  const ctx = { stage: "start" };

  // 하드 제한: 시간이 다 되면 진행 중인 Gemini 호출을 끊고 실패로 처리해요.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hardStop = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new UserFacingError(TIMEOUT_MESSAGE));
    }, HARD_STOP_MS);
  });

  const pipeline = runPipeline(analysisId, video, deadline, controller.signal, ctx);
  pipeline.catch(() => {}); // 하드 제한이 먼저 끝났을 때 뒤늦은 오류가 처리되지 않은 채 남지 않게 해요.

  try {
    await Promise.race([pipeline, hardStop]);
    console.log(`[analysis] 완료 ${analysisId} (${Math.round((Date.now() - startedAt) / 1000)}초)`);
  } catch (e) {
    const message = e instanceof UserFacingError ? e.message : GENERIC_ERROR_MESSAGE;
    console.error(
      `[analysis] 실패 ${analysisId} stage=${ctx.stage} (${Math.round((Date.now() - startedAt) / 1000)}초):`,
      e,
    );
    controller.abort(); // 아직 남아 있는 호출이 있다면 끊어요.
    await failAnalysis(analysisId, message);
    // 중단된 작업이 Gemini 임시 영상 파일을 지울 시간을 잠깐 줘요.
    await Promise.race([pipeline.catch(() => {}), sleep(CLEANUP_GRACE_MS)]);
  } finally {
    clearTimeout(timer);
  }
}
