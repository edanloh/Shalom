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

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return fail("Method not allowed", 405);

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
  const offset = Math.max(Number(offsetRaw) || 0, 0);

  if (!courseId) return fail("courseId is required", 400);

  try {
    const to = offset + limit - 1;
    const { data, error } = await supabase
      .from("notifications")
      .select("id,user_id,title,message,type,is_read,created_at,action_url,related_entity_type,related_entity_id")
      .ilike("type", `%course_announcement-${courseId}%`)
      .order("created_at", { ascending: false })
      .range(offset, to);

    if (error) throw error;

    const notifications = data ?? [];
    const achievementIds = notifications
      .filter((n: any) => n.related_entity_type === "achievement" && n.related_entity_id)
      .map((n: any) => n.related_entity_id);

    let iconMap: Record<string, string> = {};
    if (achievementIds.length) {
      const { data: achievements, error: achError } = await supabase
        .from("achievements")
        .select("id, icon")
        .in("id", achievementIds);
      if (achError) throw achError;
      iconMap = (achievements ?? []).reduce((acc: Record<string, string>, row: any) => {
        if (row?.id && row?.icon) acc[row.id] = row.icon;
        return acc;
      }, {} as Record<string, string>);
    }

    const enriched = notifications.map((n: any) => ({
      ...n,
      icon_url: n.related_entity_type === "achievement" ? iconMap[n.related_entity_id] || null : null,
    }));

    return ok({ success: true, data: enriched });
  } catch (err: any) {
    console.error("getNotifications error", err);
    return fail("Failed to fetch notifications", 500, { error: err.message });
  }
});
