-- 멍로그 MVP 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 Run 하세요. (여러 번 실행해도 안전하게 작성했어요)
--
-- MVP는 로그인이 없어요. 대신 브라우저(anon)에는 어떤 권한도 열지 않고, 서버(service role)만 DB/Storage에 접근해요.
-- 결과 페이지는 추측하기 어려운 UUID 링크를 아는 사람만 볼 수 있어요. (서버가 id로 한 건씩만 조회)
-- 실제 서비스로 확장할 때는 user_id 컬럼과 로그인 기반 RLS 정책을 추가해야 해요.

-- 1) 영상
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null,
  original_name text,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

-- 2) 분석 작업 (진행 상태)
create table if not exists public.analyses (
  id           uuid primary key default gen_random_uuid(),
  video_id     uuid not null references public.videos(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'processing', 'completed', 'failed')),
  progress     int  not null default 0 check (progress between 0 and 100),
  error        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- 3) 시간순 행동 기록
create table if not exists public.behaviors (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  behavior    text not null
              check (behavior in ('rest', 'move', 'play', 'watch', 'eat', 'drink', 'bark', 'etc')),
  start_sec   int  not null check (start_sec >= 0),
  end_sec     int  not null check (end_sec >= start_sec),
  note        text,
  confidence  real check (confidence between 0 and 1)
);
-- 이미 테이블이 있는 경우를 위한 보정: CHECK 제약을 교체해 'watch'(주변 관찰)를 허용해요.
-- (create table if not exists 는 기존 제약을 바꾸지 않아서 필요해요. migrations/20261105_add_watch_behavior.sql 과 동일)
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.behaviors'::regclass
      and contype = 'c'
      and conkey = array[(
        select attnum from pg_attribute
        where attrelid = 'public.behaviors'::regclass and attname = 'behavior'
      )]
  loop
    execute format('alter table public.behaviors drop constraint %I', c.conname);
  end loop;

  alter table public.behaviors
    add constraint behaviors_behavior_check
    check (behavior in ('rest', 'move', 'play', 'watch', 'eat', 'drink', 'bark', 'etc'));
end $$;

create index if not exists behaviors_analysis_idx on public.behaviors(analysis_id, start_sec);

-- 4) 오늘의 멍로그 글
create table if not exists public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.analyses(id) on delete cascade,
  summary     text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- RLS: 켜기만 하고 anon/authenticated에는 어떤 정책도 만들지 않아요. (= 브라우저의 publishable key로는 읽기/쓰기 모두 불가)
-- 모든 DB/Storage 접근은 서버(service role 키)가 맡아요. service role은 RLS를 우회해요.
alter table public.videos     enable row level security;
alter table public.analyses   enable row level security;
alter table public.behaviors  enable row level security;
alter table public.daily_logs enable row level security;

-- 예전 MVP 버전에서 만들었던 익명 허용 정책 제거 (없으면 무시돼요)
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

-- Storage: 영상 버킷 (비공개, 200MB 제한, 영상 형식만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dog-videos', 'dog-videos', false, 209715200,
        array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage 정책: anon 업로드/읽기 정책을 모두 제거해요.
-- 업로드는 서버가 발급한 "서명된 업로드 URL"로만 가능하고, 영상 읽기는 서버(service role)만 해요.
drop policy if exists "mvp_upload_dog_videos" on storage.objects;
drop policy if exists "mvp_read_dog_videos" on storage.objects;
