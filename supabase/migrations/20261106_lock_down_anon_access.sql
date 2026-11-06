-- 보안 강화: anon(브라우저)의 모든 DB/Storage 접근 정책을 제거해요.
-- 선행 조건: 서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되고, 이 변경이 포함된 코드가 배포된 뒤에 실행하세요.
-- (먼저 실행하면 이전 버전 코드의 업로드/조회가 막혀요.) 데이터는 삭제/변경하지 않아요. 여러 번 실행해도 안전해요.
alter table public.videos     enable row level security;
alter table public.analyses   enable row level security;
alter table public.behaviors  enable row level security;
alter table public.daily_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['videos', 'analyses', 'behaviors', 'daily_logs'] loop
    execute format('drop policy if exists "mvp_select_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "mvp_insert_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "mvp_update_%1$s" on public.%1$s', t);
  end loop;
end $$;
drop policy if exists "mvp_update_analyses" on public.analyses;

drop policy if exists "mvp_upload_dog_videos" on storage.objects;
drop policy if exists "mvp_read_dog_videos" on storage.objects;

-- 확인: 아래 두 결과에서 mvp_ 로 시작하는 정책이 없어야 해요.
select schemaname, tablename, policyname from pg_policies
where (schemaname = 'public' and tablename in ('videos','analyses','behaviors','daily_logs'))
   or (schemaname = 'storage' and tablename = 'objects');
