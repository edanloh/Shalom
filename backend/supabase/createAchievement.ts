// supabase/functions/createAchievement/index.ts
/**
 * Supabase Edge Function: createAchievement
 * Purpose: Create a new achievement/badge definition
 * Endpoint: POST /createAchievement
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
const allowedScopeTypes = new Set(["instructor", "course"]);

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
    const {
      createdBy = null,
      name,
      description = null,
      icon = null,
      type = "badge",
      criteria = null,
      points = 0,
      color = null,
      isActive = true,
      scopeType = "instructor",
      scopeId = null,
    } = body ?? {};

    if (!name) {
      return new Response(JSON.stringify({ success: false, message: "name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!createdBy) {
      return new Response(
        JSON.stringify({ success: false, message: "createdBy is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!allowedTypes.has(type)) {
      return new Response(JSON.stringify({ success: false, message: "invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedScopeTypes.has(scopeType)) {
      return new Response(JSON.stringify({ success: false, message: "invalid scopeType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!scopeId) {
      return new Response(JSON.stringify({ success: false, message: "scopeId is required for scoped achievements" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("achievements")
      .insert({
        created_by: createdBy,
        name,
        description,
        icon,
        type,
        criteria,
        points,
        color,
        is_active: isActive,
        scope_type: scopeType,
        scope_id: scopeId,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
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
