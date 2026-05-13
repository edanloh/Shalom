-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  icon text,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['streak'::character varying::text, 'certificate'::character varying::text, 'badge'::character varying::text, 'level'::character varying::text])),
  criteria jsonb,
  points integer DEFAULT 0,
  color character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  scope_type text DEFAULT 'global'::text CHECK (scope_type = ANY (ARRAY['global'::text, 'instructor'::text, 'course'::text])),
  scope_id uuid,
  CONSTRAINT achievements_pkey PRIMARY KEY (id),
  CONSTRAINT achievements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  color character varying,
  course_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid,
  certificate_type character varying NOT NULL,
  certificate_number character varying NOT NULL UNIQUE,
  issued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  issuer_name character varying DEFAULT 'Shalom Learning Platform'::character varying,
  credential_url text,
  metadata jsonb,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT certificates_pkey PRIMARY KEY (id),
  CONSTRAINT certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.course_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  date date NOT NULL,
  total_enrollments integer DEFAULT 0,
  new_enrollments integer DEFAULT 0,
  completions integer DEFAULT 0,
  average_progress numeric DEFAULT 0.00,
  total_watch_time_minutes integer DEFAULT 0,
  quiz_attempts integer DEFAULT 0,
  assignment_submissions integer DEFAULT 0,
  dropout_rate numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT course_analytics_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  enrollment_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  completion_date timestamp with time zone,
  progress_percentage numeric DEFAULT 0.00,
  is_completed boolean DEFAULT false,
  current_video_id uuid,
  total_watch_time_minutes integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  last_activity_at timestamp with time zone,
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.course_outcomes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  outcome text NOT NULL,
  order_index integer NOT NULL,
  CONSTRAINT course_outcomes_pkey PRIMARY KEY (id),
  CONSTRAINT course_outcomes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  section_id uuid,
  title character varying NOT NULL,
  description text,
  order_index integer NOT NULL,
  passing_score integer DEFAULT 70,
  time_limit_minutes integer,
  max_attempts integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT course_quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_quizzes_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.course_sections(id)
);
CREATE TABLE public.course_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  is_anonymous boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  review_status text NOT NULL DEFAULT 'visible'::text CHECK (review_status = ANY (ARRAY['visible'::text, 'hidden'::text, 'flagged'::text, 'resolved'::text])),
  flag_reason text,
  moderation_note text,
  moderated_by uuid,
  moderated_at timestamp with time zone,
  instructor_reply text,
  instructor_replied_at timestamp with time zone,
  acknowledged_at timestamp with time zone,
  context_section_id uuid,
  is_pinned boolean NOT NULL DEFAULT false,
  pinned_at timestamp with time zone,
  pinned_by uuid,
  CONSTRAINT course_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT course_ratings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT course_ratings_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.users(id),
  CONSTRAINT course_ratings_context_section_id_fkey FOREIGN KEY (context_section_id) REFERENCES public.course_sections(id),
  CONSTRAINT course_ratings_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES public.users(id)
);
CREATE TABLE public.course_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  lesson_id uuid,
  title character varying NOT NULL,
  description text,
  resource_type character varying NOT NULL CHECK (resource_type::text = ANY (ARRAY['pdf'::character varying::text, 'document'::character varying::text, 'ppt'::character varying::text, 'ppt'::character varying::text, 'other'::character varying::text])),
  resource_url text NOT NULL,
  file_size_bytes bigint,
  download_count integer DEFAULT 0,
  is_downloadable boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  section_id uuid,
  is_preview boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  estimated_read_minutes integer DEFAULT 0,
  CONSTRAINT course_resources_pkey PRIMARY KEY (id),
  CONSTRAINT course_resources_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_resources_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.course_sections(id)
);
CREATE TABLE public.course_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  order_index integer NOT NULL,
  lessons_count integer DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  section_order integer,
  CONSTRAINT course_sections_pkey PRIMARY KEY (id),
  CONSTRAINT course_sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  section_id uuid,
  title character varying NOT NULL,
  description text,
  video_url text NOT NULL,
  duration_seconds integer NOT NULL,
  order_index integer NOT NULL,
  is_preview boolean DEFAULT false,
  thumbnail_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_videos_pkey PRIMARY KEY (id),
  CONSTRAINT course_videos_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_videos_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.course_sections(id)
);
CREATE TABLE public.course_wishlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_wishlist_pkey PRIMARY KEY (id),
  CONSTRAINT course_wishlist_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text NOT NULL,
  instructor_name character varying DEFAULT 'Shalom Instructor'::character varying,
  category_id uuid NOT NULL,
  duration_hours numeric NOT NULL,
  thumbnail_url text,
  rating numeric DEFAULT 0.0,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  language character varying DEFAULT 'EN'::character varying,
  tags ARRAY,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  student_count integer DEFAULT 0,
  total_ratings integer DEFAULT 0,
  instructor_id uuid,
  embedding USER-DEFINED,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);
CREATE TABLE public.credits_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  points integer NOT NULL,
  course_id uuid,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  reference_key text,
  CONSTRAINT credits_events_pkey PRIMARY KEY (id),
  CONSTRAINT credits_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT credits_events_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean DEFAULT false,
  CONSTRAINT direct_messages_pkey PRIMARY KEY (id),
  CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT direct_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id)
);
CREATE TABLE public.goal_template_batches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  template_ids ARRAY NOT NULL,
  is_consumed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goal_template_batches_pkey PRIMARY KEY (id),
  CONSTRAINT goal_template_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.goal_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  label text NOT NULL UNIQUE,
  description text,
  difficulty character varying DEFAULT 'easy'::character varying CHECK (difficulty::text = ANY (ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying]::text[])),
  target_hours integer DEFAULT 0,
  target_courses integer DEFAULT 0,
  target_points integer DEFAULT 0,
  target_lessons integer DEFAULT 0,
  target_quizzes integer DEFAULT 0,
  duration_days integer DEFAULT 7,
  reward_points integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goal_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.instructor_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  instructor_id uuid NOT NULL,
  title text NOT NULL,
  count integer DEFAULT 0,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'overdue'::character varying]::text[])),
  due_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT instructor_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT instructor_tasks_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);
CREATE TABLE public.learning_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  target_hours numeric,
  current_hours numeric DEFAULT 0,
  target_points integer,
  current_points integer DEFAULT 0,
  target_courses integer,
  current_courses integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  deadline timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT false,
  reward_points integer DEFAULT 0,
  completed_at timestamp with time zone,
  target_lessons integer DEFAULT 0,
  current_lessons integer DEFAULT 0,
  target_quizzes integer DEFAULT 0,
  current_quizzes integer DEFAULT 0,
  template_id uuid,
  CONSTRAINT learning_goals_pkey PRIMARY KEY (id),
  CONSTRAINT learning_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT learning_goals_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.goal_templates(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  related_entity_type character varying,
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  action_url text,
  priority character varying DEFAULT 'normal'::character varying,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  read_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.push_notification_tokens (
  user_id uuid NOT NULL,
  tokens ARRAY NOT NULL DEFAULT '{}'::text[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_notification_tokens_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  correct_answers integer NOT NULL,
  time_taken_minutes integer,
  is_passed boolean DEFAULT false,
  answers jsonb,
  attempt_number integer DEFAULT 1,
  started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp with time zone,
  graded_answers jsonb DEFAULT '{}'::jsonb,
  grades_released boolean DEFAULT true,
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.course_quizzes(id),
  CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  question text NOT NULL,
  question_type character varying NOT NULL CHECK (question_type::text = ANY (ARRAY['multiple-choice'::character varying, 'multiple-correct'::character varying, 'true-false'::character varying, 'short-answer'::character varying, 'matching'::character varying, 'text'::character varying]::text[])),
  options jsonb,
  correct_answer text NOT NULL,
  explanation text,
  points integer DEFAULT 1,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  image_url text,
  graded_variations jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT quiz_questions_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.course_quizzes(id)
);
CREATE TABLE public.recommendation_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  course_id uuid,
  event_type text,
  placement text,
  context jsonb,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT recommendation_events_pkey PRIMARY KEY (id),
  CONSTRAINT recommendation_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT recommendation_events_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.recommendation_metrics_daily (
  day date NOT NULL,
  placement text NOT NULL,
  model_version text NOT NULL DEFAULT 'unknown'::text,
  impression_requests integer NOT NULL DEFAULT 0,
  impression_items integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  dismisses integer NOT NULL DEFAULT 0,
  enroll_like_actions integer NOT NULL DEFAULT 0,
  ctr_percent numeric NOT NULL DEFAULT 0,
  save_rate_percent numeric NOT NULL DEFAULT 0,
  dismiss_rate_percent numeric NOT NULL DEFAULT 0,
  enroll_like_rate_percent numeric NOT NULL DEFAULT 0,
  unique_courses_shown integer NOT NULL DEFAULT 0,
  unique_categories_shown integer NOT NULL DEFAULT 0,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_metrics_daily_pkey PRIMARY KEY (day, placement, model_version)
);
CREATE TABLE public.recommendations_view (
  id text NOT NULL,
  rank integer,
  score numeric,
  reason text,
  course jsonb,
  course_id uuid,
  CONSTRAINT recommendations_view_pkey PRIMARY KEY (id),
  CONSTRAINT recommendations_view_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.resource_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT resource_progress_pkey PRIMARY KEY (id),
  CONSTRAINT resource_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT resource_progress_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.course_resources(id)
);
CREATE TABLE public.shop_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'title'::text,
  cost integer NOT NULL DEFAULT 0 CHECK (cost >= 0) NOT VALI),
  icon text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rarity text NOT NULL DEFAULT 'common'::text,
  collection text,
  is_featured boolean NOT NULL DEFAULT false,
  is_limited boolean NOT NULL DEFAULT false,
  CONSTRAINT shop_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  value integer,
  source_event_type text,
  source_course_id uuid,
  source_instructor_id uuid,
  source_reference_key text,
  source_awarded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_achievements_source_course_id_fkey FOREIGN KEY (source_course_id) REFERENCES public.courses(id),
  CONSTRAINT user_achievements_source_instructor_id_fkey FOREIGN KEY (source_instructor_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  total_time_minutes integer DEFAULT 0,
  courses_accessed integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  quizzes_attempted integer DEFAULT 0,
  assignments_submitted integer DEFAULT 0,
  login_count integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT user_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_module_progress (
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  section_id uuid NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamp without time zone,
  CONSTRAINT user_module_progress_pkey PRIMARY KEY (user_id, course_id, section_id),
  CONSTRAINT user_module_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT user_module_progress_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.course_sections(id),
  CONSTRAINT user_module_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  assignment_reminders boolean DEFAULT true,
  course_updates boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  weekly_progress_summary boolean DEFAULT true,
  language_preference character varying DEFAULT 'en'::character varying,
  timezone character varying DEFAULT 'UTC'::character varying,
  theme_preference character varying DEFAULT 'light'::character varying,
  auto_play_videos boolean DEFAULT true,
  video_quality character varying DEFAULT 'auto'::character varying,
  subtitle_language character varying DEFAULT 'en'::character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  achievements boolean NOT NULL DEFAULT true,
  study_reminders boolean NOT NULL DEFAULT true,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_unlocked_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  is_equipped boolean NOT NULL DEFAULT false,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_unlocked_items_pkey PRIMARY KEY (id),
  CONSTRAINT user_unlocked_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_unlocked_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.shop_items(id)
);
CREATE TABLE public.user_video_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  watch_time_seconds integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  last_position_seconds integer DEFAULT 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_video_progress_pkey PRIMARY KEY (id),
  CONSTRAINT video_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT video_progress_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.course_videos(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  avatar_url text,
  points integer DEFAULT 0,
  joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  last_login timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  auth_provider text NOT NULL,
  role character varying DEFAULT 'student'::character varying CHECK (role::text = ANY (ARRAY['student'::character varying, 'instructor'::character varying, 'admin'::character varying]::text[])),
  location text,
  bio text,
  phone text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);