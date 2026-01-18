


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") RETURNS TABLE("progress_percentage" numeric, "is_completed" boolean, "completed_items" integer, "total_items" integer, "completed_videos" integer, "total_videos" integer, "passed_quizzes" integer, "total_quizzes" integer, "completed_pdfs" integer, "total_pdfs" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_videos integer := 0;
  v_total_quizzes integer := 0;
  v_total_pdfs integer := 0;
  v_completed_videos integer := 0;
  v_passed_quizzes integer := 0;
  v_completed_pdfs integer := 0;
  v_total_items integer;
  v_completed_items integer;
  v_progress_pct numeric;
  v_is_completed boolean;
BEGIN
  -- Get all videos for this course
  SELECT COUNT(*) INTO v_total_videos
  FROM course_videos
  WHERE course_id = p_course_id;

  -- Get all quizzes for this course
  SELECT COUNT(*) INTO v_total_quizzes
  FROM course_quizzes
  WHERE course_id = p_course_id;

  -- Get all PDFs for this course
  SELECT COUNT(*) INTO v_total_pdfs
  FROM course_resources
  WHERE course_id = p_course_id AND resource_type = 'pdf';

  -- Get completed videos
  SELECT COUNT(DISTINCT vp.video_id) INTO v_completed_videos
  FROM video_progress vp
  INNER JOIN course_videos cv ON cv.id = vp.video_id
  WHERE vp.user_id = p_user_id 
    AND vp.is_completed = true
    AND cv.course_id = p_course_id;

  -- Get passed quizzes (only count latest attempt per quiz)
  SELECT COUNT(DISTINCT qa.quiz_id) INTO v_passed_quizzes
  FROM (
    SELECT DISTINCT ON (quiz_id) quiz_id, is_passed
    FROM quiz_attempts
    WHERE user_id = p_user_id
    ORDER BY quiz_id, attempt_number DESC
  ) qa
  INNER JOIN course_quizzes cq ON cq.id = qa.quiz_id
  WHERE qa.is_passed = true AND cq.course_id = p_course_id;

  -- Get completed PDFs
  SELECT COUNT(DISTINCT rp.resource_id) INTO v_completed_pdfs
  FROM resource_progress rp
  INNER JOIN course_resources cr ON cr.id = rp.resource_id
  WHERE rp.user_id = p_user_id 
    AND rp.is_completed = true
    AND cr.course_id = p_course_id
    AND cr.resource_type = 'pdf';

  -- Calculate totals
  v_total_items := v_total_videos + v_total_quizzes + v_total_pdfs;
  v_completed_items := v_completed_videos + v_passed_quizzes + v_completed_pdfs;

  -- Calculate percentage
  IF v_total_items > 0 THEN
    v_progress_pct := ROUND((v_completed_items::numeric / v_total_items::numeric) * 100, 2);
  ELSE
    v_progress_pct := 0;
  END IF;

  -- Check if completed
  v_is_completed := (v_total_items > 0 AND v_completed_items >= v_total_items);

  -- Return results
  RETURN QUERY SELECT 
    v_progress_pct,
    v_is_completed,
    v_completed_items,
    v_total_items,
    v_completed_videos,
    v_total_videos,
    v_passed_quizzes,
    v_total_quizzes,
    v_completed_pdfs,
    v_total_pdfs;
END;
$$;


ALTER FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") IS 'Calculates comprehensive course progress including videos, quizzes, and PDFs';



CREATE OR REPLACE FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") RETURNS TABLE("completed_videos" bigint, "passed_quizzes" bigint, "completed_pdfs" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT vp.video_id) FILTER (WHERE vp.is_completed = true) AS completed_videos,
    COUNT(DISTINCT qa.quiz_id) FILTER (WHERE qa.is_passed = true) AS passed_quizzes,
    COUNT(DISTINCT rp.resource_id) FILTER (WHERE rp.is_completed = true) AS completed_pdfs
  FROM course_sections cs
  LEFT JOIN course_videos cv ON cv.section_id = cs.id
  LEFT JOIN video_progress vp ON vp.video_id = cv.id AND vp.user_id = p_user_id
  LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (quiz_id) 
      quiz_id, 
      is_passed
    FROM quiz_attempts
    WHERE user_id = p_user_id 
      AND quiz_id = cq.id
    ORDER BY quiz_id, attempt_number DESC
  ) qa ON qa.quiz_id = cq.id
  LEFT JOIN course_resources cr ON cr.section_id = cs.id AND cr.resource_type = 'pdf'
  LEFT JOIN resource_progress rp ON rp.resource_id = cr.id AND rp.user_id = p_user_id
  WHERE cs.id = p_section_id
  GROUP BY cs.id;
END;
$$;


ALTER FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") IS 'Returns count of completed videos, passed quizzes, and completed PDFs for a user in a given section';



CREATE OR REPLACE FUNCTION "public"."get_section_totals"("p_section_id" "uuid") RETURNS TABLE("total_videos" bigint, "total_quizzes" bigint, "total_pdfs" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(cv.id) FILTER (WHERE cv.id IS NOT NULL) AS total_videos,
    COUNT(cq.id) FILTER (WHERE cq.id IS NOT NULL) AS total_quizzes,
    COUNT(cr.id) FILTER (WHERE cr.id IS NOT NULL) AS total_pdfs
  FROM course_sections cs
  LEFT JOIN course_videos cv ON cv.section_id = cs.id
  LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
  LEFT JOIN course_resources cr ON cr.section_id = cs.id AND cr.resource_type = 'pdf'
  WHERE cs.id = p_section_id
  GROUP BY cs.id;
END;
$$;


ALTER FUNCTION "public"."get_section_totals"("p_section_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_section_totals"("p_section_id" "uuid") IS 'Returns total count of videos, quizzes, and PDFs in a given section';



CREATE OR REPLACE FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_videos bigint;
  v_total_quizzes bigint;
  v_total_pdfs bigint;
  v_completed_videos bigint;
  v_passed_quizzes bigint;
  v_completed_pdfs bigint;
  v_has_content boolean;
  v_videos_complete boolean;
  v_quizzes_complete boolean;
  v_pdfs_complete boolean;
BEGIN
  -- Get totals
  SELECT total_videos, total_quizzes, total_pdfs
  INTO v_total_videos, v_total_quizzes, v_total_pdfs
  FROM get_section_totals(p_section_id);

  -- Get completed counts
  SELECT completed_videos, passed_quizzes, completed_pdfs
  INTO v_completed_videos, v_passed_quizzes, v_completed_pdfs
  FROM get_section_completion(p_user_id, p_section_id);

  -- Check if section has any content
  v_has_content := (v_total_videos > 0 OR v_total_quizzes > 0 OR v_total_pdfs > 0);

  -- Check completion for each type
  v_videos_complete := (v_total_videos = 0 OR v_completed_videos = v_total_videos);
  v_quizzes_complete := (v_total_quizzes = 0 OR v_passed_quizzes = v_total_quizzes);
  v_pdfs_complete := (v_total_pdfs = 0 OR v_completed_pdfs = v_total_pdfs);

  -- Section is complete if it has content AND all types are complete
  RETURN v_has_content AND v_videos_complete AND v_quizzes_complete AND v_pdfs_complete;
END;
$$;


ALTER FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") IS 'Returns true if all videos, quizzes, and PDFs in a section are completed by the user';



CREATE OR REPLACE FUNCTION "public"."update_course_resources_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_resources_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "icon" "text",
    "type" character varying(20) NOT NULL,
    "criteria" "jsonb",
    "points" integer DEFAULT 0,
    "color" character varying(7),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "achievements_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('streak'::character varying)::"text", ('certificate'::character varying)::"text", ('badge'::character varying)::"text", ('level'::character varying)::"text"])))
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignment_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "submission_text" "text",
    "file_urls" "text"[],
    "submission_status" character varying(50) DEFAULT 'draft'::character varying,
    "submitted_at" timestamp with time zone,
    "graded_at" timestamp with time zone,
    "score" integer,
    "feedback" "text",
    "graded_by" "uuid",
    "attempt_number" integer DEFAULT 1,
    "is_late" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."assignment_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "title" character varying(500) NOT NULL,
    "description" "text" NOT NULL,
    "instructions" "text",
    "assignment_type" character varying(50) NOT NULL,
    "max_points" integer DEFAULT 100,
    "due_date" timestamp with time zone,
    "submission_format" character varying(100),
    "allowed_file_types" "text"[],
    "max_file_size_mb" integer DEFAULT 10,
    "rubric" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "color" character varying(7),
    "course_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "learning_path_id" "uuid",
    "certificate_type" character varying(50) NOT NULL,
    "certificate_number" character varying(100) NOT NULL,
    "issued_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "issuer_name" character varying(500) DEFAULT 'Shalom Learning Platform'::character varying,
    "credential_url" "text",
    "metadata" "jsonb",
    "is_public" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "total_enrollments" integer DEFAULT 0,
    "new_enrollments" integer DEFAULT 0,
    "completions" integer DEFAULT 0,
    "average_progress" numeric(5,2) DEFAULT 0.00,
    "total_watch_time_minutes" integer DEFAULT 0,
    "quiz_attempts" integer DEFAULT 0,
    "assignment_submissions" integer DEFAULT 0,
    "dropout_rate" numeric(5,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."course_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_discussions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "content" "text" NOT NULL,
    "discussion_type" character varying(50) DEFAULT 'question'::character varying,
    "is_pinned" boolean DEFAULT false,
    "is_answered" boolean DEFAULT false,
    "upvotes" integer DEFAULT 0,
    "views" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."course_discussions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "enrollment_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "completion_date" timestamp with time zone,
    "progress_percentage" numeric(5,2) DEFAULT 0.00,
    "is_completed" boolean DEFAULT false,
    "current_video_id" "uuid",
    "total_watch_time_minutes" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "outcome" "text" NOT NULL,
    "order_index" integer NOT NULL
);


ALTER TABLE "public"."course_outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text" NOT NULL,
    "instructor_name" character varying(255) DEFAULT 'Shalom Instructor'::character varying,
    "category_id" "uuid" NOT NULL,
    "level" character varying(20) NOT NULL,
    "duration_hours" numeric(5,2) NOT NULL,
    "thumbnail_url" "text",
    "rating" numeric(3,2) DEFAULT 0.0,
    "is_published" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "language" character varying(10) DEFAULT 'EN'::character varying,
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "student_count" integer DEFAULT 0,
    "total_ratings" integer DEFAULT 0,
    CONSTRAINT "courses_level_check" CHECK ((("level")::"text" = ANY (ARRAY[('Beginner'::character varying)::"text", ('Intermediate'::character varying)::"text", ('Advanced'::character varying)::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."course_overview" AS
 SELECT "c"."id",
    "c"."title",
    "c"."description",
    "c"."level",
    "c"."duration_hours",
    "c"."rating",
    "c"."student_count",
    "c"."is_featured",
    "cat"."name" AS "category_name",
    "c"."instructor_name"
   FROM ("public"."courses" "c"
     JOIN "public"."categories" "cat" ON (("c"."category_id" = "cat"."id")))
  WHERE ("c"."is_published" = true);


ALTER VIEW "public"."course_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "section_id" "uuid",
    "title" character varying(500) NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "passing_score" integer DEFAULT 70,
    "time_limit_minutes" integer,
    "max_attempts" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."course_quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "review" "text",
    "is_anonymous" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."course_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "requirement" "text" NOT NULL,
    "order_index" integer NOT NULL
);


ALTER TABLE "public"."course_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "title" character varying(500) NOT NULL,
    "description" "text",
    "resource_type" character varying(50) NOT NULL,
    "resource_url" "text" NOT NULL,
    "file_size_bytes" bigint,
    "download_count" integer DEFAULT 0,
    "is_downloadable" boolean DEFAULT true,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "section_id" "uuid",
    "thumbnail_url" "text",
    "is_preview" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "estimated_read_minutes" integer DEFAULT 0,
    CONSTRAINT "course_resources_resource_type_check" CHECK ((("resource_type")::"text" = ANY ((ARRAY['pdf'::character varying, 'document'::character varying, 'slides'::character varying, 'worksheet'::character varying, 'ebook'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."course_resources" OWNER TO "postgres";


COMMENT ON COLUMN "public"."course_resources"."resource_type" IS 'Type of resource: pdf, document, slides, worksheet, ebook, other';



COMMENT ON COLUMN "public"."course_resources"."order_index" IS 'Order of the resource within the section (0-based)';



COMMENT ON COLUMN "public"."course_resources"."section_id" IS 'Links PDF resource to a specific course section, making it a lesson';



COMMENT ON COLUMN "public"."course_resources"."thumbnail_url" IS 'Preview image for the PDF/document';



COMMENT ON COLUMN "public"."course_resources"."is_preview" IS 'Whether this resource is available as a preview before enrollment';



COMMENT ON COLUMN "public"."course_resources"."estimated_read_minutes" IS 'Estimated reading time in minutes for PDF resources';



CREATE TABLE IF NOT EXISTS "public"."course_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "lessons_count" integer DEFAULT 0,
    "duration_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "section_order" integer
);


ALTER TABLE "public"."course_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "section_id" "uuid",
    "title" character varying(500) NOT NULL,
    "description" "text",
    "video_url" "text" NOT NULL,
    "duration_seconds" integer NOT NULL,
    "order_index" integer NOT NULL,
    "is_preview" boolean DEFAULT false,
    "thumbnail_url" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."course_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_wishlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."course_wishlist" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."courses_with_stats" AS
 SELECT "c"."id",
    "c"."title",
    "c"."description",
    "c"."instructor_name",
    "c"."category_id",
    "c"."level",
    "c"."duration_hours",
    "c"."thumbnail_url",
    "c"."is_published",
    "c"."is_featured",
    "c"."language",
    "c"."tags",
    "c"."created_at",
    "c"."updated_at",
    "count"(DISTINCT "ce"."id") AS "student_count",
    COALESCE("round"("avg"("cr"."rating"), 2), 0.00) AS "rating",
    "count"(DISTINCT "cr"."id") AS "total_ratings",
    "cat"."name" AS "category_name",
    "cat"."color" AS "category_color",
    "count"(DISTINCT "cs"."id") AS "total_sections",
    "count"(DISTINCT "cv"."id") AS "total_videos",
    "count"(DISTINCT "cq"."id") AS "total_quizzes",
    "count"(DISTINCT "cres"."id") AS "total_resources"
   FROM ((((((("public"."courses" "c"
     LEFT JOIN "public"."categories" "cat" ON (("c"."category_id" = "cat"."id")))
     LEFT JOIN "public"."course_sections" "cs" ON (("cs"."course_id" = "c"."id")))
     LEFT JOIN "public"."course_videos" "cv" ON (("cv"."course_id" = "c"."id")))
     LEFT JOIN "public"."course_quizzes" "cq" ON (("cq"."course_id" = "c"."id")))
     LEFT JOIN "public"."course_resources" "cres" ON (("cres"."course_id" = "c"."id")))
     LEFT JOIN "public"."course_enrollments" "ce" ON (("ce"."course_id" = "c"."id")))
     LEFT JOIN "public"."course_ratings" "cr" ON (("cr"."course_id" = "c"."id")))
  GROUP BY "c"."id", "c"."title", "c"."description", "c"."instructor_name", "c"."category_id", "c"."level", "c"."duration_hours", "c"."thumbnail_url", "c"."is_published", "c"."is_featured", "c"."language", "c"."tags", "c"."created_at", "c"."updated_at", "cat"."name", "cat"."color";


ALTER VIEW "public"."courses_with_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credits_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "points" integer NOT NULL,
    "course_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference_key" "text"
);


ALTER TABLE "public"."credits_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discussion_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_solution" boolean DEFAULT false,
    "upvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."discussion_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_template_batches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_ids" "uuid"[] NOT NULL,
    "is_consumed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."goal_template_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "difficulty" character varying(20) DEFAULT 'easy'::character varying,
    "target_hours" integer DEFAULT 0,
    "target_courses" integer DEFAULT 0,
    "target_points" integer DEFAULT 0,
    "target_lessons" integer DEFAULT 0,
    "target_quizzes" integer DEFAULT 0,
    "duration_days" integer DEFAULT 7,
    "reward_points" integer DEFAULT 50,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goal_templates_difficulty_check" CHECK ((("difficulty")::"text" = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::"text"[])))
);


ALTER TABLE "public"."goal_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "target_hours" numeric,
    "current_hours" numeric DEFAULT 0,
    "target_points" integer,
    "current_points" integer DEFAULT 0,
    "target_courses" integer,
    "current_courses" integer DEFAULT 0,
    "streak_days" integer DEFAULT 0,
    "deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT false,
    "reward_points" integer DEFAULT 0,
    "completed_at" timestamp with time zone,
    "target_lessons" integer DEFAULT 0,
    "current_lessons" integer DEFAULT 0,
    "target_quizzes" integer DEFAULT 0,
    "current_quizzes" integer DEFAULT 0,
    "template_id" "uuid"
);


ALTER TABLE "public"."learning_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_path_courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "learning_path_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "order_index" integer NOT NULL,
    "is_required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."learning_path_courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_paths" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text" NOT NULL,
    "difficulty_level" character varying(20) NOT NULL,
    "estimated_duration_hours" numeric(5,2) NOT NULL,
    "thumbnail_url" "text",
    "is_published" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "learning_paths_difficulty_level_check" CHECK ((("difficulty_level")::"text" = ANY (ARRAY[('Beginner'::character varying)::"text", ('Intermediate'::character varying)::"text", ('Advanced'::character varying)::"text"])))
);


ALTER TABLE "public"."learning_paths" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "message" "text" NOT NULL,
    "type" character varying(50) NOT NULL,
    "related_entity_type" character varying(50),
    "related_entity_id" "uuid",
    "is_read" boolean DEFAULT false,
    "action_url" "text",
    "priority" character varying(20) DEFAULT 'normal'::character varying,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_notification_tokens" (
    "user_id" "uuid" NOT NULL,
    "tokens" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_notification_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "total_questions" integer NOT NULL,
    "correct_answers" integer NOT NULL,
    "time_taken_minutes" integer,
    "is_passed" boolean DEFAULT false,
    "answers" "jsonb",
    "attempt_number" integer DEFAULT 1,
    "started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "question_type" character varying(20) NOT NULL,
    "options" "jsonb",
    "correct_answer" "text" NOT NULL,
    "explanation" "text",
    "points" integer DEFAULT 1,
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_questions_question_type_check" CHECK ((("question_type")::"text" = ANY (ARRAY[('multiple-choice'::character varying)::"text", ('true-false'::character varying)::"text", ('text'::character varying)::"text"])))
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "course_id" "uuid",
    "event_type" "text",
    "placement" "text",
    "context" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recommendation_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendations_view" (
    "id" "text" NOT NULL,
    "rank" integer,
    "score" numeric,
    "reason" "text",
    "course" "jsonb",
    "course_id" "uuid"
);


ALTER TABLE "public"."recommendations_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."resource_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "value" integer
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "total_time_minutes" integer DEFAULT 0,
    "courses_accessed" integer DEFAULT 0,
    "lessons_completed" integer DEFAULT 0,
    "quizzes_attempted" integer DEFAULT 0,
    "assignments_submitted" integer DEFAULT 0,
    "login_count" integer DEFAULT 0,
    "streak_days" integer DEFAULT 0,
    "points_earned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "avatar_url" "text",
    "points" integer DEFAULT 0,
    "joined_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_login" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "auth_provider" "text" NOT NULL,
    "role" character varying(20) DEFAULT 'student'::character varying,
    "location" "text",
    "bio" "text",
    "phone" "text",
    CONSTRAINT "valid_user_role" CHECK ((("role")::"text" = ANY ((ARRAY['student'::character varying, 'instructor'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_dashboard_summary" AS
 SELECT "u"."id" AS "user_id",
    "u"."name",
    "u"."email",
    "u"."points",
    "count"(DISTINCT "ce"."id") AS "enrolled_courses",
    "count"(DISTINCT
        CASE
            WHEN ("ce"."is_completed" = true) THEN "ce"."id"
            ELSE NULL::"uuid"
        END) AS "completed_courses",
    "count"(DISTINCT "cw"."id") AS "wishlist_count",
    "count"(DISTINCT "ua"."id") AS "achievements_count",
    "count"(DISTINCT
        CASE
            WHEN ("n"."is_read" = false) THEN "n"."id"
            ELSE NULL::"uuid"
        END) AS "unread_notifications",
    COALESCE("avg"("ce"."progress_percentage"), (0)::numeric) AS "avg_progress"
   FROM (((("public"."users" "u"
     LEFT JOIN "public"."course_enrollments" "ce" ON (("u"."id" = "ce"."user_id")))
     LEFT JOIN "public"."course_wishlist" "cw" ON (("u"."id" = "cw"."user_id")))
     LEFT JOIN "public"."user_achievements" "ua" ON (("u"."id" = "ua"."user_id")))
     LEFT JOIN "public"."notifications" "n" ON (("u"."id" = "n"."user_id")))
  GROUP BY "u"."id", "u"."name", "u"."email", "u"."points";


ALTER VIEW "public"."user_dashboard_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_learning_path_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "learning_path_id" "uuid" NOT NULL,
    "current_course_id" "uuid",
    "progress_percentage" numeric(5,2) DEFAULT 0.00,
    "is_completed" boolean DEFAULT false,
    "started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_learning_path_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "progress_percentage" numeric(5,2) DEFAULT 0.00,
    "is_completed" boolean DEFAULT false,
    "time_spent_minutes" integer DEFAULT 0,
    "last_position" "jsonb",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_module_progress" (
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "section_id" "uuid" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp without time zone
);


ALTER TABLE "public"."user_module_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "assignment_reminders" boolean DEFAULT true,
    "course_updates" boolean DEFAULT true,
    "marketing_emails" boolean DEFAULT false,
    "weekly_progress_summary" boolean DEFAULT true,
    "language_preference" character varying(10) DEFAULT 'en'::character varying,
    "timezone" character varying(50) DEFAULT 'UTC'::character varying,
    "theme_preference" character varying(20) DEFAULT 'light'::character varying,
    "auto_play_videos" boolean DEFAULT true,
    "video_quality" character varying(20) DEFAULT 'auto'::character varying,
    "subtitle_language" character varying(10) DEFAULT 'en'::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_progress_summary" AS
 SELECT "u"."id" AS "user_id",
    "u"."name",
    "u"."email",
    "count"("ce"."id") AS "enrolled_courses",
    "count"(
        CASE
            WHEN ("ce"."is_completed" = true) THEN 1
            ELSE NULL::integer
        END) AS "completed_courses",
    COALESCE("avg"("ce"."progress_percentage"), (0)::numeric) AS "avg_progress",
    "sum"("ce"."total_watch_time_minutes") AS "total_watch_time_minutes",
    "count"("ua"."id") AS "total_achievements"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."course_enrollments" "ce" ON (("u"."id" = "ce"."user_id")))
     LEFT JOIN "public"."user_achievements" "ua" ON (("u"."id" = "ua"."user_id")))
  GROUP BY "u"."id", "u"."name", "u"."email";


ALTER VIEW "public"."user_progress_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "video_id" "uuid" NOT NULL,
    "watch_time_seconds" integer DEFAULT 0,
    "is_completed" boolean DEFAULT false,
    "last_position_seconds" integer DEFAULT 0,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."video_progress" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_assignment_id_user_id_attempt_number_key" UNIQUE ("assignment_id", "user_id", "attempt_number");



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_certificate_number_key" UNIQUE ("certificate_number");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_analytics"
    ADD CONSTRAINT "course_analytics_course_id_date_key" UNIQUE ("course_id", "date");



ALTER TABLE ONLY "public"."course_analytics"
    ADD CONSTRAINT "course_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_discussions"
    ADD CONSTRAINT "course_discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_outcomes"
    ADD CONSTRAINT "course_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_quizzes"
    ADD CONSTRAINT "course_quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_ratings"
    ADD CONSTRAINT "course_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_requirements"
    ADD CONSTRAINT "course_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_resources"
    ADD CONSTRAINT "course_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_videos"
    ADD CONSTRAINT "course_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_wishlist"
    ADD CONSTRAINT "course_wishlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_wishlist"
    ADD CONSTRAINT "course_wishlist_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credits_events"
    ADD CONSTRAINT "credits_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_template_batches"
    ADD CONSTRAINT "goal_template_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_templates"
    ADD CONSTRAINT "goal_templates_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."goal_templates"
    ADD CONSTRAINT "goal_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_goals"
    ADD CONSTRAINT "learning_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_path_courses"
    ADD CONSTRAINT "learning_path_courses_learning_path_id_course_id_key" UNIQUE ("learning_path_id", "course_id");



ALTER TABLE ONLY "public"."learning_path_courses"
    ADD CONSTRAINT "learning_path_courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_paths"
    ADD CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_notification_tokens"
    ADD CONSTRAINT "push_notification_tokens_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendations_view"
    ADD CONSTRAINT "recommendations_view_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_progress"
    ADD CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_progress"
    ADD CONSTRAINT "resource_progress_user_id_resource_id_key" UNIQUE ("user_id", "resource_id");



ALTER TABLE ONLY "public"."course_ratings"
    ADD CONSTRAINT "uq_course_ratings_user_course" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_learning_path_progress"
    ADD CONSTRAINT "user_learning_path_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_learning_path_progress"
    ADD CONSTRAINT "user_learning_path_progress_user_id_learning_path_id_key" UNIQUE ("user_id", "learning_path_id");



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."user_module_progress"
    ADD CONSTRAINT "user_module_progress_pkey" PRIMARY KEY ("user_id", "course_id", "section_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_user_id_video_id_key" UNIQUE ("user_id", "video_id");



CREATE UNIQUE INDEX "credits_events_user_reference_key_uidx" ON "public"."credits_events" USING "btree" ("user_id", "reference_key") WHERE ("reference_key" IS NOT NULL);



CREATE INDEX "idx_assignments_course" ON "public"."assignments" USING "btree" ("course_id");



CREATE INDEX "idx_assignments_due_date" ON "public"."assignments" USING "btree" ("due_date");



CREATE INDEX "idx_certificates_course" ON "public"."certificates" USING "btree" ("course_id");



CREATE INDEX "idx_certificates_number" ON "public"."certificates" USING "btree" ("certificate_number");



CREATE INDEX "idx_certificates_user" ON "public"."certificates" USING "btree" ("user_id");



CREATE INDEX "idx_course_analytics_course_date" ON "public"."course_analytics" USING "btree" ("course_id", "date");



CREATE INDEX "idx_course_ratings_course" ON "public"."course_ratings" USING "btree" ("course_id");



CREATE INDEX "idx_course_ratings_course_created" ON "public"."course_ratings" USING "btree" ("course_id", "created_at" DESC);



CREATE INDEX "idx_course_ratings_user_created" ON "public"."course_ratings" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_course_resources_course_section" ON "public"."course_resources" USING "btree" ("course_id", "section_id");



CREATE INDEX "idx_course_resources_section_id" ON "public"."course_resources" USING "btree" ("section_id");



CREATE INDEX "idx_courses_category" ON "public"."courses" USING "btree" ("category_id");



CREATE INDEX "idx_courses_featured" ON "public"."courses" USING "btree" ("is_featured");



CREATE INDEX "idx_courses_published" ON "public"."courses" USING "btree" ("is_published");



CREATE INDEX "idx_discussions_course" ON "public"."course_discussions" USING "btree" ("course_id");



CREATE INDEX "idx_discussions_lesson" ON "public"."course_discussions" USING "btree" ("lesson_id");



CREATE INDEX "idx_discussions_user" ON "public"."course_discussions" USING "btree" ("user_id");



CREATE INDEX "idx_enrollments_course" ON "public"."course_enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_enrollments_progress" ON "public"."course_enrollments" USING "btree" ("progress_percentage");



CREATE INDEX "idx_enrollments_user" ON "public"."course_enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_goal_template_batches_user_active" ON "public"."goal_template_batches" USING "btree" ("user_id", "is_consumed", "created_at" DESC);



CREATE INDEX "idx_lesson_progress_lesson" ON "public"."user_lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_progress_user" ON "public"."user_lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_attempts_user" ON "public"."quiz_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_resource_progress_resource" ON "public"."resource_progress" USING "btree" ("resource_id");



CREATE INDEX "idx_resource_progress_user" ON "public"."resource_progress" USING "btree" ("user_id");



CREATE INDEX "idx_submissions_assignment" ON "public"."assignment_submissions" USING "btree" ("assignment_id");



CREATE INDEX "idx_submissions_status" ON "public"."assignment_submissions" USING "btree" ("submission_status");



CREATE INDEX "idx_submissions_user" ON "public"."assignment_submissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_user_analytics_user_date" ON "public"."user_analytics" USING "btree" ("user_id", "date");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_video_progress_user" ON "public"."video_progress" USING "btree" ("user_id");



CREATE INDEX "idx_wishlist_course" ON "public"."course_wishlist" USING "btree" ("course_id");



CREATE INDEX "idx_wishlist_user" ON "public"."course_wishlist" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "course_resources_updated_at_trigger" BEFORE UPDATE ON "public"."course_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_resources_updated_at"();



CREATE OR REPLACE TRIGGER "update_assignments_updated_at" BEFORE UPDATE ON "public"."assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_course_ratings_updated_at" BEFORE UPDATE ON "public"."course_ratings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discussion_replies_updated_at" BEFORE UPDATE ON "public"."discussion_replies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discussions_updated_at" BEFORE UPDATE ON "public"."course_discussions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_enrollments_updated_at" BEFORE UPDATE ON "public"."course_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_learning_path_progress_updated_at" BEFORE UPDATE ON "public"."user_learning_path_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_learning_paths_updated_at" BEFORE UPDATE ON "public"."learning_paths" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lesson_progress_updated_at" BEFORE UPDATE ON "public"."user_lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resource_progress_updated_at" BEFORE UPDATE ON "public"."resource_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_submissions_updated_at" BEFORE UPDATE ON "public"."assignment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_progress_updated_at" BEFORE UPDATE ON "public"."video_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_analytics"
    ADD CONSTRAINT "course_analytics_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_discussions"
    ADD CONSTRAINT "course_discussions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_discussions"
    ADD CONSTRAINT "course_discussions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_current_video_id_fkey" FOREIGN KEY ("current_video_id") REFERENCES "public"."course_videos"("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_outcomes"
    ADD CONSTRAINT "course_outcomes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_quizzes"
    ADD CONSTRAINT "course_quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_quizzes"
    ADD CONSTRAINT "course_quizzes_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_ratings"
    ADD CONSTRAINT "course_ratings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_ratings"
    ADD CONSTRAINT "course_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_requirements"
    ADD CONSTRAINT "course_requirements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_resources"
    ADD CONSTRAINT "course_resources_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_resources"
    ADD CONSTRAINT "course_resources_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "course_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_videos"
    ADD CONSTRAINT "course_videos_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_videos"
    ADD CONSTRAINT "course_videos_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_wishlist"
    ADD CONSTRAINT "course_wishlist_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_wishlist"
    ADD CONSTRAINT "course_wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."credits_events"
    ADD CONSTRAINT "credits_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."credits_events"
    ADD CONSTRAINT "credits_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."course_discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_template_batches"
    ADD CONSTRAINT "goal_template_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_goals"
    ADD CONSTRAINT "learning_goals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."goal_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."learning_goals"
    ADD CONSTRAINT "learning_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."learning_path_courses"
    ADD CONSTRAINT "learning_path_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_path_courses"
    ADD CONSTRAINT "learning_path_courses_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_paths"
    ADD CONSTRAINT "learning_paths_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."course_quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."course_quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."recommendations_view"
    ADD CONSTRAINT "recommendations_view_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."resource_progress"
    ADD CONSTRAINT "resource_progress_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."course_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_progress"
    ADD CONSTRAINT "resource_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_learning_path_progress"
    ADD CONSTRAINT "user_learning_path_progress_current_course_id_fkey" FOREIGN KEY ("current_course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_learning_path_progress"
    ADD CONSTRAINT "user_learning_path_progress_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_learning_path_progress"
    ADD CONSTRAINT "user_learning_path_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_module_progress"
    ADD CONSTRAINT "user_module_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."user_module_progress"
    ADD CONSTRAINT "user_module_progress_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id");



ALTER TABLE ONLY "public"."user_module_progress"
    ADD CONSTRAINT "user_module_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."course_videos"("id") ON DELETE CASCADE;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_section_totals"("p_section_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_section_totals"("p_section_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_section_totals"("p_section_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_resources_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_resources_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_resources_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."assignment_submissions" TO "anon";
GRANT ALL ON TABLE "public"."assignment_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."course_analytics" TO "anon";
GRANT ALL ON TABLE "public"."course_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."course_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."course_discussions" TO "anon";
GRANT ALL ON TABLE "public"."course_discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."course_discussions" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."course_outcomes" TO "anon";
GRANT ALL ON TABLE "public"."course_outcomes" TO "authenticated";
GRANT ALL ON TABLE "public"."course_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."course_overview" TO "anon";
GRANT ALL ON TABLE "public"."course_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."course_overview" TO "service_role";



GRANT ALL ON TABLE "public"."course_quizzes" TO "anon";
GRANT ALL ON TABLE "public"."course_quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."course_quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."course_ratings" TO "anon";
GRANT ALL ON TABLE "public"."course_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."course_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."course_requirements" TO "anon";
GRANT ALL ON TABLE "public"."course_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."course_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."course_resources" TO "anon";
GRANT ALL ON TABLE "public"."course_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."course_resources" TO "service_role";



GRANT ALL ON TABLE "public"."course_sections" TO "anon";
GRANT ALL ON TABLE "public"."course_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."course_sections" TO "service_role";



GRANT ALL ON TABLE "public"."course_videos" TO "anon";
GRANT ALL ON TABLE "public"."course_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."course_videos" TO "service_role";



GRANT ALL ON TABLE "public"."course_wishlist" TO "anon";
GRANT ALL ON TABLE "public"."course_wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."course_wishlist" TO "service_role";



GRANT ALL ON TABLE "public"."courses_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."courses_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."courses_with_stats" TO "service_role";



GRANT ALL ON TABLE "public"."credits_events" TO "anon";
GRANT ALL ON TABLE "public"."credits_events" TO "authenticated";
GRANT ALL ON TABLE "public"."credits_events" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_replies" TO "anon";
GRANT ALL ON TABLE "public"."discussion_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_replies" TO "service_role";



GRANT ALL ON TABLE "public"."goal_template_batches" TO "anon";
GRANT ALL ON TABLE "public"."goal_template_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_template_batches" TO "service_role";



GRANT ALL ON TABLE "public"."goal_templates" TO "anon";
GRANT ALL ON TABLE "public"."goal_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_templates" TO "service_role";



GRANT ALL ON TABLE "public"."learning_goals" TO "anon";
GRANT ALL ON TABLE "public"."learning_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_goals" TO "service_role";



GRANT ALL ON TABLE "public"."learning_path_courses" TO "anon";
GRANT ALL ON TABLE "public"."learning_path_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_path_courses" TO "service_role";



GRANT ALL ON TABLE "public"."learning_paths" TO "anon";
GRANT ALL ON TABLE "public"."learning_paths" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_paths" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."push_notification_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_notification_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notification_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."recommendation_events" TO "anon";
GRANT ALL ON TABLE "public"."recommendation_events" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendation_events" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations_view" TO "anon";
GRANT ALL ON TABLE "public"."recommendations_view" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations_view" TO "service_role";



GRANT ALL ON TABLE "public"."resource_progress" TO "anon";
GRANT ALL ON TABLE "public"."resource_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_analytics" TO "anon";
GRANT ALL ON TABLE "public"."user_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."user_dashboard_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_dashboard_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_dashboard_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_learning_path_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_learning_path_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_learning_path_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_module_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_module_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_module_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_progress_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress_summary" TO "service_role";



GRANT ALL ON TABLE "public"."video_progress" TO "anon";
GRANT ALL ON TABLE "public"."video_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."video_progress" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







