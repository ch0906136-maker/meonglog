import { after } from "next/server";
import { runAnalysis } from "@/lib/analysis-job";
import { LIMITS } from "@/lib/limits";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

// 분석은 응답 이후(after)에 이어서 실행돼요. 1~3분 영상 분석 시간을 위해 넉넉히 잡아요.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const videoId: unknown = body?.videoId;
  if (typeof videoId !== "string" || !UUID.test(videoId)) {
    return Response.json({ error: "videoId가 올바르지 않아요." }, { status: 400 });
  }

  const { data: video } = await supabase
    .from("videos")
    .select("id, storage_path")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) {
    return Response.json({ error: "영상을 찾을 수 없어요." }, { status: 404 });
  }

  // 1) 같은 영상은 중복 분석하지 않아요. (Gemini 호출 방지)
  //    진행 중이거나 이미 성공한 분석이 있으면 그걸 돌려주고, 실패만 있으면 제한된 횟수까지만 다시 시도해요.
  const { data: previous } = await supabase
    .from("analyses")
    .select("id, status, created_at")
    .eq("video_id", video.id)
    .order("created_at", { ascending: false });
  const now = Date.now();
  const reusable = (previous ?? []).find(
    (a) =>
      a.status === "completed" ||
      ((a.status === "pending" || a.status === "processing") &&
        now - new Date(a.created_at).getTime() < LIMITS.staleAnalysisMs),
  );
  if (reusable) return Response.json({ analysisId: reusable.id });
  if ((previous ?? []).length >= LIMITS.maxAttemptsPerVideo) {
    return Response.json(
      { error: "이 영상은 여러 번 분석에 실패했어요. 다른 영상으로 시도해 주세요." },
      { status: 429 },
    );
  }

  // 2) 전체 호출 제한: 동시 진행 수 / 24시간 총량
  const staleBefore = new Date(now - LIMITS.staleAnalysisMs).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: running }, { count: today }] = await Promise.all([
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"])
      .gte("created_at", staleBefore),
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo),
  ]);
  if ((running ?? 0) >= LIMITS.maxConcurrentAnalyses) {
    return Response.json(
      { error: "지금 분석 요청이 많아요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }
  if ((today ?? 0) >= LIMITS.maxAnalysesPerDay) {
    return Response.json(
      { error: "오늘 분석 가능 횟수를 모두 사용했어요. 내일 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert({ video_id: video.id, status: "pending", progress: 0 }) // 이후 job이 processing → completed/failed로 바꿔요
    .select("id")
    .single();
  if (error || !analysis) {
    return Response.json({ error: "분석 작업을 만들지 못했어요." }, { status: 500 });
  }

  after(() => runAnalysis(analysis.id, video));

  return Response.json({ analysisId: analysis.id });
}
