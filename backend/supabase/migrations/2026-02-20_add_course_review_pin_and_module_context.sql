-- Phase 4: review pin workflow + optional module context

alter table public.course_ratings
  add column if not exists context_section_id uuid references public.course_sections(id) on delete set null,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.users(id) on delete set null;

create index if not exists idx_course_ratings_context_section_id
  on public.course_ratings(context_section_id);
create index if not exists idx_course_ratings_is_pinned
  on public.course_ratings(is_pinned);

comment on column public.course_ratings.context_section_id is
  'Optional module/section context where learner submitted this review';
comment on column public.course_ratings.is_pinned is
  'Whether instructor pinned this review in instructor management view';
comment on column public.course_ratings.pinned_at is
  'Timestamp when review was pinned';
comment on column public.course_ratings.pinned_by is
  'Instructor/admin that pinned the review';
