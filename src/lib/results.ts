// 서버 전용: DB에서 분석 결과를 읽어 화면용 데이터(ResultData)로 바꿔요.
import { getBaseline } from "./baseline";
import { LIMITS } from "./limits";
import {
  BEHAVIOR_LABELS,
  formatClock,
  formatDuration,
  isBehaviorKey,
  isConfident,
  normalizeSegments,
  secondsFromSegments,
  type ResultData,
  type Segment,
} from "./behaviors";
import { supabaseAdmin as supabase } from "./supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LoadedResult =
  | { state: "not_found" }
  | { state: "pending" }
  | { state: "failed"; error: string }
  | { state: "completed"; data: ResultData };

export async function loadResult(analysisId: string): Promise<LoadedResult> {
  if (!UUID.test(analysisId)) return { state: "not_found" };

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, status, error, created_at, videos(original_name)")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) return { state: "not_found" };

  if (analysis.status === "failed") {
    return { state: "failed", error: analysis.error ?? "분석에 실패했어요." };
  }
  if (analysis.status !== "completed") {
    // 시간 제한으로 중단된 분석은 pending에 멈춰 있어요. 오래됐으면 실패로 보여줘요.
    if (Date.now() - new Date(analysis.created_at).getTime() > LIMITS.staleAnalysisMs) {
      return {
        state: "failed",
        error: "분석 시간이 너무 오래 걸려 중단됐어요. 더 짧은 영상으로 다시 시도해 주세요.",
      };
    }
    return { state: "pending" };
  }

  const [{ data: rows }, { data: log }] = await Promise.all([
    supabase
      .from("behaviors")
      .select("behavior, start_sec, end_sec, note, confidence")
      .eq("analysis_id", analysisId)
      .order("start_sec"),
    supabase
      .from("daily_logs")
      .select("summary, body")
      .eq("analysis_id", analysisId)
      .maybeSingle(),
  ]);
  if (!log) return { state: "failed", error: "멍로그를 찾을 수 없어요." };

  // 시간은 항상 end_sec - start_sec으로 계산하고, 겹침/범위 밖 값은 정리해요. (정상 데이터는 그대로예요)
  const segments: Segment[] = normalizeSegments(
    (rows ?? [])
    .filter((r) => isBehaviorKey(r.behavior))
    .map((r) => ({
      behavior: r.behavior,
      startSec: Number(r.start_sec),
      endSec: Number(r.end_sec),
      note: r.note,
      confidence: r.confidence,
    })),
  );
  const confident = segments.filter(isConfident);
  const uncertainSec = segments
    .filter((s) => !isConfident(s))
    .reduce((sum, s) => sum + Math.max(0, s.endSec - s.startSec), 0);

  const videoRel = analysis.videos as { original_name: string | null } | { original_name: string | null }[] | null;
  const videoName = (Array.isArray(videoRel) ? videoRel[0] : videoRel)?.original_name;
  const totalSec = segments.length ? Math.max(...segments.map((s) => s.endSec)) : 0;

  return {
    state: "completed",
    data: {
      dogName: "우리 강아지",
      dateLabel: new Date(analysis.created_at).toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      sourceLabel: `영상 ${formatDuration(totalSec)} 분석${videoName ? ` · ${videoName}` : ""}`,
      summary: log.summary,
      body: log.body.split(/\n{2,}/).filter(Boolean),
      seconds: secondsFromSegments(confident),
      segments: confident,
      uncertainSec,
      usualRatio: await getBaseline(),
      timeline: segments.map((s) => ({
        label: `${formatClock(s.startSec)}~${formatClock(s.endSec)}`,
        behavior: s.behavior,
        note: s.note ?? BEHAVIOR_LABELS[s.behavior],
        confident: isConfident(s),
        startSec: s.startSec,
        endSec: s.endSec,
      })),
    },
  };
}
