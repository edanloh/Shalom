alter table public.course_ratings
  add column if not exists review_status text not null default 'visible',
  add column if not exists flag_reason text,
  add column if not exists moderation_note text,
  add column if not exists moderated_by uuid references public.users(id),
  add column if not exists moderated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_ratings_review_status_check'
  ) then
    alter table public.course_ratings
      add constraint course_ratings_review_status_check
      check (review_status in ('visible', 'hidden', 'flagged', 'resolved'));
  end if;
end
$$;

update public.course_ratings
set review_status = 'visible'
where review_status is null;

create index if not exists idx_course_ratings_course_status
  on public.course_ratings (course_id, review_status, created_at desc);

create index if not exists idx_course_ratings_moderated_by
  on public.course_ratings (moderated_by, moderated_at desc);
