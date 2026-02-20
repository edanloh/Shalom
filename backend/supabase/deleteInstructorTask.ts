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

    const taskId = body.taskId || body.task_id || body.id;

    if (!taskId) {
      return fail("taskId is required", 400);
    }

    const { error } = await supabase
      .from("instructor_tasks")
      .delete()
      .eq("id", taskId);

    if (error) throw error;

    return ok({ success: true, deleted: 1 });
  } catch (err: any) {
    console.error("deleteInstructorTask error", err);
    return fail("Failed to delete instructor task", 500, {
      error: err.message || "Unknown error",
    });
  }
});
