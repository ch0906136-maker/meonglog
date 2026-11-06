// 서버 전용: 영상 분석 전체 파이프라인
//   Storage 다운로드 → Gemini 행동 분석 → behaviors 저장 → 멍로그 생성 → daily_logs 저장
// 진행 상태는 analyses 테이블(status, progress)에 기록하고, 화면이 이 값을 읽어요.
import { getBaseline } from "./baseline";
import { getStats, isConfident, secondsFromSegments } from "./behaviors";
import { UserFacingError, analyzeDogVideo, writeDailyLog } from "./gemini";
import { supabaseAdmin as supabase } from "./supabase-admin";

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

async function setState(
  analysisId: string,
  patch: { status?: string; progress?: number; error?: string | null; completed_at?: string },
) {
  const { error } = await supabase.from("analyses").update(patch).eq("id", analysisId);
  if (error) console.error("[analysis] 상태 저장 실패:", error.message);
}

// 함수 최대 실행 시간(maxDuration 300초) 안에서 끝내기 위한 분석 예산.
// 넘기면 모델 재시도/재분석을 멈추고 실패로 기록해요. (남은 시간은 저장 작업 몫이에요)
const ANALYSIS_BUDGET_MS = 270_000;

export async function runAnalysis(
  analysisId: string,
  video: { id: string; storage_path: string },
) {
  const deadline = Date.now() + ANALYSIS_BUDGET_MS;
  try {
    await setState(analysisId, { status: "processing", progress: 5 });

    // 1) Storage에서 영상 내려받기
    const { data: blob, error: dlError } = await supabase.storage
      .from("dog-videos")
      .download(video.storage_path);
    if (dlError || !blob) {
      throw new Error("영상 다운로드 실패: " + (dlError?.message ?? "빈 파일"));
    }
    const ext = video.storage_path.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MIME_BY_EXT[ext] ?? (blob.type || "video/mp4");
    await setState(analysisId, { progress: 10 });

    // 2) Gemini로 행동 구간 분석 (가장 오래 걸리는 단계)
    const analysis = await analyzeDogVideo(blob, mimeType, deadline);
    await setState(analysisId, { progress: 60 });

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
    await setState(analysisId, { progress: 75 });

    // 4) 통계는 코드로 계산하고(확신 있는 구간만), 멍로그 글은 Gemini가 써요.
    //    평소와의 비교는 과거 데이터가 충분할 때만 해요. (MVP에서는 baseline이 null)
    const stats = getStats(secondsFromSegments(confidentSegments), await getBaseline());
    const log = await writeDailyLog({
      segments: confidentSegments,
      stats,
      durationSec: analysis.durationSec || Math.max(...confidentSegments.map((s) => s.endSec)),
      deadline,
    });

    const { error: logError } = await supabase.from("daily_logs").insert({
      analysis_id: analysisId,
      summary: log.summary,
      body: log.body.join("\n\n"),
    });
    if (logError) throw new Error("멍로그 저장 실패: " + logError.message);

    await setState(analysisId, {
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[analysis] 실패:", e);
    await setState(analysisId, {
      status: "failed",
      error:
        e instanceof UserFacingError
          ? e.message
          : "분석 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
    });
  }
}
