import { LIMITS, MAX_VIDEO_BYTES } from "@/lib/limits";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 브라우저가 Storage에 직접 올릴 수 있도록 "업로드 전용 서명 URL"과 videos 행을 만들어 줘요.
// 브라우저(publishable key)에는 Storage/DB 쓰기 권한을 열어 두지 않아요.
const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name: unknown = body?.name;
  const size: unknown = body?.size;
  const type: unknown = body?.type;
  if (typeof name !== "string" || typeof size !== "number" || typeof type !== "string") {
    return Response.json({ error: "업로드 정보가 올바르지 않아요." }, { status: 400 });
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (MIME_BY_EXT[ext] !== type) {
    return Response.json({ error: "MP4, MOV, WebM 형식의 영상만 올릴 수 있어요." }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
    return Response.json({ error: "파일 크기는 200MB 이하여야 해요." }, { status: 400 });
  }

  // 최근 1시간 업로드 수 제한 (저장소 도배 방지)
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("videos")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= LIMITS.maxUploadsPerHour) {
    return Response.json(
      { error: "지금은 업로드가 많아요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const storagePath = `${crypto.randomUUID()}.${ext}`;
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from("dog-videos")
    .createSignedUploadUrl(storagePath);
  if (signError || !signed) {
    return Response.json({ error: "업로드를 준비하지 못했어요." }, { status: 500 });
  }

  const { data: video, error: dbError } = await supabaseAdmin
    .from("videos")
    .insert({ storage_path: storagePath, original_name: name.slice(0, 200), size_bytes: size })
    .select("id")
    .single();
  if (dbError || !video) {
    return Response.json({ error: "영상 정보를 저장하지 못했어요." }, { status: 500 });
  }

  return Response.json({ videoId: video.id, path: storagePath, token: signed.token });
}
