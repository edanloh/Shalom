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
  const userId = url.searchParams.get("userId") || null;

  const { data: defs, error } = await supabase
    .from("achievements")
    .select("id, name, description, icon, type, points")
    .eq("is_active", true)
    .order("points", { ascending: true });
  if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders });

  let earned: Record<string, boolean> = {};
  if (userId) {
    const { data: ua } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);
    earned = (ua || []).reduce((m, r) => ({ ...m, [r.achievement_id]: true }), {});
  }

  const payload = defs?.map((a) => ({
    id: a.id,
    label: a.name,
    description: a.description,
    icon: a.icon,
    type: a.type,
    points: a.points,
    earned: !!earned[a.id],
  })) ?? [];

  return new Response(JSON.stringify({ success: true, data: payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});