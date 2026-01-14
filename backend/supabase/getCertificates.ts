// supabase/functions/getCertificates/index.ts
/**
 * Supabase Edge Function: getCertificates
 * Purpose: Get user's certificates
 * Endpoint: GET /getCertificates?userId={userId}
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

  try {
    const to = offset + limit - 1;
    const { data, error } = await supabase
      .from("certificates")
      .select("id, user_id, course_id, learning_path_id, certificate_type, certificate_number, issued_at, issuer_name, credential_url, metadata, courses(title,duration_hours,instructor_name)")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false })
      .range(offset, to);

    if (error) throw error;

    const payload = (data || []).map((c) => ({
      id: c.id,
      name:
        (c.metadata as any)?.course_title ||
        (c as any)?.courses?.title ||
        c.certificate_type ||
        c.certificate_number ||
        "Certificate",
      requiredPoints: (c.metadata as any)?.required_points ?? 0,
      earnedPoints: (c.metadata as any)?.earned_points ?? 0,
      requiredCourses: (c.metadata as any)?.required_courses ?? 0,
      completedCourses: (c.metadata as any)?.completed_courses ?? 0,
      progressPercent: (c.metadata as any)?.progress_percent ?? 0,
      issuedAt: c.issued_at,
      issuer: c.issuer_name,
      credentialUrl: c.credential_url,
      courseId: c.course_id,
      learningPathId: c.learning_path_id,
      durationHours:
        (c as any)?.courses?.duration_hours ??
        (c.metadata as any)?.duration_hours ??
        (c.metadata as any)?.course_duration_hours ??
        null,
      instructorName:
        (c as any)?.courses?.instructor_name ??
        (c.metadata as any)?.instructor_name ??
        (c.metadata as any)?.course_instructor_name ??
        null,
    }));

    return new Response(JSON.stringify({ success: true, data: payload }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
