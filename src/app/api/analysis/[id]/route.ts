import { LIMITS } from "@/lib/limits";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 분석 진행 상태만 돌려줘요. (브라우저가 DB를 직접 읽지 않도록 서버가 대신 읽어요)
export async function GET(_request: Request, ctx: RouteContext<"/api/analysis/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "not_found" }, { status: 404 });

  const { data } = await supabaseAdmin
    .from("analyses")
    .select("status, progress, error, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });

  // 함수가 시간 제한으로 중단되면 상태가 processing에 멈춰요. 오래된 작업은 실패로 보여줘요.
  const stale =
    (data.status === "pending" || data.status === "processing") &&
    Date.now() - new Date(data.created_at).getTime() > LIMITS.staleAnalysisMs;
  if (stale) {
    return Response.json({
      status: "failed",
      progress: data.progress,
      error: "분석 시간이 너무 오래 걸려 중단됐어요. 더 짧은 영상으로 다시 시도해 주세요.",
    });
  }
  return Response.json(
    { status: data.status, progress: data.progress, error: data.error },
    { headers: { "Cache-Control": "no-store" } },
  );
}
