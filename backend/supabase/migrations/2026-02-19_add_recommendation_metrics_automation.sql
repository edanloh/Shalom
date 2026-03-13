-- Automate recommendation metrics snapshots (daily)
-- Creates:
-- 1) recommendation_metrics_daily table
-- 2) capture_recommendation_metrics_daily(start_at, end_at) function
-- 3) recommendation_metrics_7d_summary view
-- 4) pg_cron job (if pg_cron extension is enabled)

create table if not exists public.recommendation_metrics_daily (
  day date not null,
  placement text not null,
  model_version text not null default 'unknown',
  impression_requests integer not null default 0,
  impression_items integer not null default 0,
  clicks integer not null default 0,
  saves integer not null default 0,
  dismisses integer not null default 0,
  enroll_like_actions integer not null default 0,
  ctr_percent numeric(8, 2) not null default 0,
  save_rate_percent numeric(8, 2) not null default 0,
  dismiss_rate_percent numeric(8, 2) not null default 0,
  enroll_like_rate_percent numeric(8, 2) not null default 0,
  unique_courses_shown integer not null default 0,
  unique_categories_shown integer not null default 0,
  captured_at timestamptz not null default now(),
  primary key (day, placement, model_version)
);

create index if not exists idx_reco_metrics_daily_day
  on public.recommendation_metrics_daily (day desc);

create index if not exists idx_reco_metrics_daily_model
  on public.recommendation_metrics_daily (model_version, placement, day desc);

create or replace function public.capture_recommendation_metrics_daily(
  p_start_at timestamptz default (date_trunc('day', now()) - interval '1 day'),
  p_end_at timestamptz default date_trunc('day', now())
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  with base_events as (
    select
      re.user_id,
      re.course_id,
      re.event_type,
      re.placement,
      re.timestamp,
      coalesce(re.context->>'modelVersion', 'unknown') as model_version,
      re.context
    from recommendation_events re
    where re.timestamp >= p_start_at
      and re.timestamp < p_end_at
  ),
  impression_lists as (
    select
      date_trunc('day', timestamp)::date as day,
      placement,
      model_version,
      count(*) as impression_requests,
      sum(greatest(
        coalesce(jsonb_array_length(context->'courseIds'), 0),
        case when course_id is not null then 1 else 0 end
      ))::integer as impression_items
    from base_events
    where event_type = 'impression'
    group by 1, 2, 3
  ),
  actions as (
    select
      date_trunc('day', timestamp)::date as day,
      placement,
      model_version,
      count(*) filter (where event_type = 'click')::integer as clicks,
      count(*) filter (where event_type = 'save')::integer as saves,
      count(*) filter (where event_type = 'dismiss')::integer as dismisses,
      count(*) filter (where event_type in ('start', 'complete'))::integer as enroll_like_actions
    from base_events
    group by 1, 2, 3
  ),
  combined as (
    select
      coalesce(i.day, a.day) as day,
      coalesce(i.placement, a.placement) as placement,
      coalesce(i.model_version, a.model_version) as model_version,
      coalesce(i.impression_requests, 0)::integer as impression_requests,
      coalesce(i.impression_items, 0)::integer as impression_items,
      coalesce(a.clicks, 0)::integer as clicks,
      coalesce(a.saves, 0)::integer as saves,
      coalesce(a.dismisses, 0)::integer as dismisses,
      coalesce(a.enroll_like_actions, 0)::integer as enroll_like_actions
    from impression_lists i
    full outer join actions a
      on i.day = a.day
     and i.placement = a.placement
     and i.model_version = a.model_version
  ),
  impression_course_ids as (
    select
      date_trunc('day', re.timestamp)::date as day,
      re.placement,
      coalesce(re.context->>'modelVersion', 'unknown') as model_version,
      jsonb_array_elements_text(re.context->'courseIds') as course_id
    from recommendation_events re
    where re.timestamp >= p_start_at
      and re.timestamp < p_end_at
      and re.event_type = 'impression'
      and jsonb_typeof(re.context->'courseIds') = 'array'
  ),
  diversity as (
    select
      i.day,
      i.placement,
      i.model_version,
      count(distinct c.id)::integer as unique_courses_shown,
      count(distinct coalesce(cat.name, 'uncategorized'))::integer as unique_categories_shown
    from impression_course_ids i
    left join courses c on c.id::text = i.course_id
    left join categories cat on cat.id = c.category_id
    group by 1, 2, 3
  ),
  final_rows as (
    select
      c.day,
      c.placement,
      c.model_version,
      c.impression_requests,
      c.impression_items,
      c.clicks,
      c.saves,
      c.dismisses,
      c.enroll_like_actions,
      round((c.clicks::numeric / nullif(c.impression_items, 0)) * 100, 2) as ctr_percent,
      round((c.saves::numeric / nullif(c.impression_items, 0)) * 100, 2) as save_rate_percent,
      round((c.dismisses::numeric / nullif(c.impression_items, 0)) * 100, 2) as dismiss_rate_percent,
      round((c.enroll_like_actions::numeric / nullif(c.impression_items, 0)) * 100, 2) as enroll_like_rate_percent,
      coalesce(d.unique_courses_shown, 0) as unique_courses_shown,
      coalesce(d.unique_categories_shown, 0) as unique_categories_shown
    from combined c
    left join diversity d
      on d.day = c.day
     and d.placement = c.placement
     and d.model_version = c.model_version
  )
  insert into public.recommendation_metrics_daily (
    day,
    placement,
    model_version,
    impression_requests,
    impression_items,
    clicks,
    saves,
    dismisses,
    enroll_like_actions,
    ctr_percent,
    save_rate_percent,
    dismiss_rate_percent,
    enroll_like_rate_percent,
    unique_courses_shown,
    unique_categories_shown,
    captured_at
  )
  select
    day,
    placement,
    model_version,
    impression_requests,
    impression_items,
    clicks,
    saves,
    dismisses,
    enroll_like_actions,
    ctr_percent,
    save_rate_percent,
    dismiss_rate_percent,
    enroll_like_rate_percent,
    unique_courses_shown,
    unique_categories_shown,
    now()
  from final_rows
  on conflict (day, placement, model_version)
  do update set
    impression_requests = excluded.impression_requests,
    impression_items = excluded.impression_items,
    clicks = excluded.clicks,
    saves = excluded.saves,
    dismisses = excluded.dismisses,
    enroll_like_actions = excluded.enroll_like_actions,
    ctr_percent = excluded.ctr_percent,
    save_rate_percent = excluded.save_rate_percent,
    dismiss_rate_percent = excluded.dismiss_rate_percent,
    enroll_like_rate_percent = excluded.enroll_like_rate_percent,
    unique_courses_shown = excluded.unique_courses_shown,
    unique_categories_shown = excluded.unique_categories_shown,
    captured_at = now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

grant execute on function public.capture_recommendation_metrics_daily(timestamptz, timestamptz)
  to service_role;

create or replace view public.recommendation_metrics_7d_summary as
select
  model_version,
  placement,
  round(avg(ctr_percent), 2) as avg_ctr_percent,
  round(avg(save_rate_percent), 2) as avg_save_rate_percent,
  round(avg(dismiss_rate_percent), 2) as avg_dismiss_rate_percent,
  round(avg(enroll_like_rate_percent), 2) as avg_enroll_like_rate_percent,
  round(avg(unique_courses_shown), 2) as avg_unique_courses_shown,
  round(avg(unique_categories_shown), 2) as avg_unique_categories_shown,
  min(day) as window_start_day,
  max(day) as window_end_day
from public.recommendation_metrics_daily
where day >= (current_date - interval '7 days')::date
group by model_version, placement
order by model_version, placement;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('recommendation_metrics_daily');
    exception
      when others then
        null;
    end;

    perform cron.schedule(
      'recommendation_metrics_daily',
      '15 1 * * *',
      $job$select public.capture_recommendation_metrics_daily(
          date_trunc('day', now()) - interval '1 day',
          date_trunc('day', now())
        );$job$
    );
  end if;
exception
  when undefined_function then
    -- pg_cron not available in this environment
    null;
end;
$do$;
