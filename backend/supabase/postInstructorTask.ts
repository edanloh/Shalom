import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return fail("Invalid JSON body", 400);
    }

    const instructorId = body.instructorId || body.instructor_id;
    const title = body.title;
    const count = Number(body.count ?? 1);
    const dueAt = body.dueAt || body.due_at || null;

    if (!instructorId || !title) {
      return fail("instructorId and title are required", 400);
    }

    const { data, error } = await supabase
      .from("instructor_tasks")
      .insert({
        instructor_id: instructorId,
        title,
        count: Number.isFinite(count) ? count : 1,
        status: "pending",
        due_at: dueAt,
      })
      .select("id,instructor_id,title,count,status,due_at,created_at")
      .single();

    if (error) throw error;

    return ok({ success: true, data });
  } catch (err: any) {
    console.error("postInstructorTask error", err);
    return fail("Failed to create instructor task", 500, {
      error: err.message || "Unknown error",
    });
  }
});
