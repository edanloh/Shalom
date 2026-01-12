// supabase/functions/deleteAchievement/index.ts
/**
 * Supabase Edge Function: deleteAchievement
 * Purpose: Delete an achievement definition
 * Endpoint: POST /deleteAchievement
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

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

    const { data: existing, error: fetchError } = await supabase
      .from("achievements")
      .select("id, icon")
      .eq("id", id)
      .single();

    if (fetchError) {
      return new Response(JSON.stringify({ success: false, message: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existing) {
      return new Response(JSON.stringify({ success: false, message: "achievement not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("achievements")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .delete()
      .eq("related_entity_type", "achievement")
      .eq("related_entity_id", id);
    if (notificationError) {
      return new Response(JSON.stringify({ success: false, message: notificationError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing.icon && typeof existing.icon === "string") {
      const url = existing.icon;
      const marker = "/storage/v1/object/public/achievement-icons/";
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const path = url.slice(idx + marker.length);
        const { error: storageError } = await supabase.storage
          .from("achievement-icons")
          .remove([path]);
        if (storageError) {
          return new Response(JSON.stringify({ success: false, message: storageError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
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
