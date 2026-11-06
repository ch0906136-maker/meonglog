// 서버 전용: "평소와 다른 점" 계산에 쓸 실제 분석 데이터를 Supabase에서 읽어요.
// - 이 기기가 가진 분석 id 목록을 받아서, 그중 status='completed'인 것만 사용해요. (실패/진행 중/없는 id는 무시)
// - 같은 영상(video_id)을 여러 번 분석한 경우 한 번만 세요. (현재 영상이 있으면 그걸 우선해요)
// - 행동별 시간은 behaviors의 end_sec - start_sec으로 계산하고, 확신 있는 구간만 써요. (결과 화면과 같은 규칙)
// - 가짜/샘플 데이터는 쓰지 않아요. 노트(note) 같은 상세 내용은 돌려주지 않고 행동별 초만 돌려줘요.
import {
  isBehaviorKey,
  isConfident,
  normalizeSegments,
  secondsFromSegments,
  type Segment,
} from "./behaviors";
import { supabaseAdmin as supabase } from "./supabase-admin";
import { MAX_ANALYSES_FOR_USUAL, type UsualAnalysis } from "./usual";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadUsualAnalyses(rawIds: string[], currentId: string | null): Promise<UsualAnalysis[]> {
  // 형식이 맞는 id만, 중복 없이, 현재 영상을 맨 앞에 두고 최대 개수까지
  const ids = [...new Set([...(currentId ? [currentId] : []), ...rawIds])]
    .filter((id) => UUID.test(id))
    .slice(0, MAX_ANALYSES_FOR_USUAL);
  if (ids.length === 0) return [];

  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, video_id, created_at")
    .in("id", ids)
    .eq("status", "completed");
  if (error || !analyses?.length) return [];

  // 같은 영상은 한 번만: 현재 영상 > 가장 최근 분석 순으로 하나만 남겨요.
  const byVideo = new Map<string, (typeof analyses)[number]>();
  for (const a of analyses) {
    const kept = byVideo.get(a.video_id);
    const better =
      !kept ||
      a.id === currentId ||
      (kept.id !== currentId && new Date(a.created_at).getTime() > new Date(kept.created_at).getTime());
    if (better) byVideo.set(a.video_id, a);
  }
  const chosen = [...byVideo.values()].sort(
    (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime(),
  );

  const { data: rows, error: bhError } = await supabase
    .from("behaviors")
    .select("analysis_id, behavior, start_sec, end_sec, confidence")
    .in(
      "analysis_id",
      chosen.map((a) => a.id),
    );
  if (bhError) return [];

  const segmentsById = new Map<string, Segment[]>();
  for (const r of rows ?? []) {
    if (!isBehaviorKey(r.behavior)) continue;
    const list = segmentsById.get(r.analysis_id) ?? [];
    list.push({
      behavior: r.behavior,
      startSec: Number(r.start_sec),
      endSec: Number(r.end_sec),
      note: null,
      confidence: r.confidence,
    });
    segmentsById.set(r.analysis_id, list);
  }

  const out: UsualAnalysis[] = [];
  for (const a of chosen) {
    // 겹침/범위 밖 구간을 정리해서, 시간 합계가 영상 길이를 넘지 않게 해요. (결과 화면과 같은 규칙)
    const segs = normalizeSegments(segmentsById.get(a.id) ?? []).filter(isConfident);
    const seconds = secondsFromSegments(segs);
    const observed = Object.values(seconds).reduce((sum, v) => sum + v, 0);
    if (observed > 0) out.push({ id: a.id, seconds }); // 행동 데이터가 없는 분석은 비교에 쓰지 않아요
  }
  return out;
}
