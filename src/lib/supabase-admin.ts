// 서버 전용: service role 키로 DB/Storage에 접근해요. (RLS를 우회하므로 절대 브라우저로 보내면 안 돼요)
// 브라우저에서는 lib/supabase.ts(publishable key)만 쓰고, 그쪽에는 어떤 정책도 열어 두지 않아요.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 처음 사용할 때 만들어요. (키가 없어도 빌드는 되고, 실제 요청 때 분명한 오류로 알려줘요)
function getAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 서버 환경변수(.env.local / Vercel)에 설정해 주세요.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (_target, prop) => Reflect.get(getAdmin(), prop),
});
