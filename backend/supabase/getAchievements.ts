// supabase/functions/getAchievements/index.ts
/**
 * Supabase Edge Function: getAchievements
 * Purpose: Get user's earned achievements
 * Endpoint: GET /getAchievements?userId={userId}
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
  const offset = Math.max(Number(offsetRaw) || 0, 0);

  if (!userId) {
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const to = offset + limit - 1;
  const { data: earnedRows, error } = await supabase
    .from("user_achievements")
    .select(
      "earned_at, value, source_event_type, source_course_id, source_instructor_id, source_reference_key, source_awarded_at, achievements!inner(id, name, description, icon, type, points, created_at, is_active, scope_type, scope_id)"
    )
    .eq("user_id", userId)
    .eq("achievements.is_active", true)
    .order("earned_at", { ascending: false })
    .range(offset, to);

  if (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const courseIds = Array.from(
    new Set(
      (earnedRows ?? [])
        .map((row: any) => row.source_course_id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    )
  );
  const instructorIds = Array.from(
    new Set(
      (earnedRows ?? [])
        .map((row: any) => row.source_instructor_id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    )
  );

  let courseById = new Map<string, any>();
  if (courseIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id,title")
      .in("id", courseIds);
    courseById = new Map((courses ?? []).map((c: any) => [c.id, c]));
  }

  let instructorById = new Map<string, any>();
  if (instructorIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id,name,email")
      .in("id", instructorIds);
    instructorById = new Map((users ?? []).map((u: any) => [u.id, u]));
  }

  const payload =
    earnedRows?.map((row: any) => ({
      id: row.achievements?.id,
      label: row.achievements?.name,
      description: row.achievements?.description,
      icon: row.achievements?.icon,
      type: row.achievements?.type,
      points: row.achievements?.points,
      createdAt: row.achievements?.created_at,
      earned: true,
      earnedAt: row.earned_at ?? null,
      achievementValue: row.value ?? null,
      scopeType: row.achievements?.scope_type ?? "global",
      scopeId: row.achievements?.scope_id ?? null,
      sourceEventType: row.source_event_type ?? null,
      sourceCourseId: row.source_course_id ?? null,
      sourceCourseTitle: row.source_course_id
        ? courseById.get(row.source_course_id)?.title ?? null
        : null,
      sourceInstructorId: row.source_instructor_id ?? null,
      sourceInstructorName: row.source_instructor_id
        ? instructorById.get(row.source_instructor_id)?.name ??
          instructorById.get(row.source_instructor_id)?.email ??
          null
        : null,
      sourceReferenceKey: row.source_reference_key ?? null,
      sourceAwardedAt: row.source_awarded_at ?? null,
    })) ?? [];

  return new Response(JSON.stringify({ success: true, data: payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
