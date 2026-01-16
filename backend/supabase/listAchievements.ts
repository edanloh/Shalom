// supabase/functions/listAchievements/index.ts
/**
 * Supabase Edge Function: listAchievements
 * Purpose: List achievement definitions for instructor/admin views
 * Endpoint: GET /listAchievements?limit=50&offset=0&type=badge&isActive=true&includeEarned=true
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");
    const type = url.searchParams.get("type");
    const isActiveRaw = url.searchParams.get("isActive");
    const includeEarned = url.searchParams.get("includeEarned") !== "false";

    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const offset = Math.max(Number(offsetRaw) || 0, 0);
    const to = offset + limit - 1;

    let query = supabase
      .from("achievements")
      .select("id, name, description, icon, type, criteria, points, color, is_active, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, to);

    if (type) {
      query = query.eq("type", type);
    }

    if (isActiveRaw === "true" || isActiveRaw === "false") {
      query = query.eq("is_active", isActiveRaw === "true");
    }

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const achievements = data ?? [];
    let earnedBy: Record<string, number> = {};

    if (includeEarned && achievements.length > 0) {
      const ids = achievements.map((row) => row.id);
      const { data: ua, error: uaError } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .in("achievement_id", ids);

      if (uaError) {
        return new Response(JSON.stringify({ success: false, message: uaError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      earnedBy = (ua ?? []).reduce<Record<string, number>>((acc, row) => {
        const key = row.achievement_id as string;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }

    const payload = achievements.map((row) => ({
      ...row,
      earnedBy: includeEarned ? earnedBy[row.id] || 0 : undefined,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: payload,
        count: count ?? payload.length,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
