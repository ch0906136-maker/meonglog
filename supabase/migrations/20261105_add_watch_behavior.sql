-- behaviors.behavior 에 'watch'(주변 관찰)를 허용하도록 CHECK 제약 조건을 교체합니다.
-- - 기존 제약 이름을 가정하지 않고, behavior 컬럼에만 걸린 CHECK 제약을 찾아서 제거해요.
-- - 데이터는 삭제/변경하지 않아요. (기존 값은 모두 새 허용 목록에 포함돼요)
-- - 여러 번 실행해도 안전해요.
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

-- 확인: 새 제약 조건 정의가 조회돼요.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.behaviors'::regclass and contype = 'c';
