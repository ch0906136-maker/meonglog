import { MAX_ANALYSES_FOR_USUAL, type UsualPayload } from "@/lib/usual";
import { UUID, loadUsualAnalyses } from "@/lib/usual-data";

// "평소와 다른 점"에 쓸 분석 데이터(행동별 시간)만 돌려줘요. 읽기 전용이고, 브라우저가 DB를 직접 읽지 않도록 서버가 대신 읽어요.
// 요청: { ids: string[] (이 기기가 가진 분석 id), currentId?: string (지금 보는 분석) }
// 응답: { analyses: [{ id, seconds }] } — status='completed'이고 행동 데이터가 있는 것만, 같은 영상은 한 번만.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids)
    ? body.ids.filter((v: unknown): v is string => typeof v === "string" && UUID.test(v))
    : [];
  const currentId: string | null =
    typeof body?.currentId === "string" && UUID.test(body.currentId) ? body.currentId : null;

  if (ids.length === 0 && !currentId) {
    return Response.json({ analyses: [] } satisfies UsualPayload, { headers: { "Cache-Control": "no-store" } });
  }
  if (ids.length > MAX_ANALYSES_FOR_USUAL * 2) {
    return Response.json({ error: "too_many_ids" }, { status: 400 });
  }

  try {
    const analyses = await loadUsualAnalyses(ids, currentId);
    return Response.json({ analyses } satisfies UsualPayload, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[usual] 조회 실패:", e);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
