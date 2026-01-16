// supabase/functions/updateAchievement/index.ts
/**
 * Supabase Edge Function: updateAchievement
 * Purpose: Update an existing achievement definition
 * Endpoint: POST /updateAchievement
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const allowedTypes = new Set(["streak", "certificate", "badge", "level"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
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

    const body = await req.json();
    const { id } = body ?? {};

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = {};

    if ("name" in body) update.name = body.name;
    if ("description" in body) update.description = body.description;
    if ("icon" in body) update.icon = body.icon;
    if ("criteria" in body) update.criteria = body.criteria;
    if ("points" in body) update.points = body.points;
    if ("color" in body) update.color = body.color;
    if ("isActive" in body) update.is_active = body.isActive;

    if ("type" in body) {
      if (!allowedTypes.has(body.type)) {
        return new Response(JSON.stringify({ success: false, message: "invalid type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      update.type = body.type;
    }

    if (Object.keys(update).length === 0) {
      return new Response(JSON.stringify({ success: false, message: "no fields to update" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("achievements")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ success: false, message: "achievement not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
