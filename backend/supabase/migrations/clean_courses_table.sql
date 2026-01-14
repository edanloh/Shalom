-- 1. Drop the columns you no longer want
ALTER TABLE "public"."courses"
    DROP COLUMN IF EXISTS "video_preview_url",
    DROP COLUMN IF EXISTS "subtitles",
    DROP COLUMN IF EXISTS "rating_breakdown";

