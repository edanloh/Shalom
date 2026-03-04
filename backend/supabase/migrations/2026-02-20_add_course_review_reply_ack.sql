-- Phase 4: instructor reply + acknowledgement metadata for course reviews

alter table public.course_ratings
  add column if not exists instructor_reply text,
  add column if not exists instructor_replied_at timestamptz,
  add column if not exists acknowledged_at timestamptz;

comment on column public.course_ratings.instructor_reply is
  'Optional instructor-authored reply to a learner review';
comment on column public.course_ratings.instructor_replied_at is
  'Timestamp when instructor reply was last set';
comment on column public.course_ratings.acknowledged_at is
  'Timestamp when instructor acknowledged this review';
