// supabase/functions/uploadAchievementIcon/index.ts
/**
 * Supabase Edge Function: uploadAchievementIcon
 * Purpose: Upload an achievement/badge icon to Supabase Storage
 * Endpoint: POST /uploadAchievementIcon (multipart/form-data)
 * Form fields: file (File), achievementId (optional)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const BUCKET = "achievement-icons";

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
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ success: false, message: "multipart/form-data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const achievementId = form.get("achievementId")?.toString();

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ success: false, message: "file is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "";
    const extSuffix = fileExt ? `.${fileExt}` : "";
    const prefix = achievementId ? `achievements/${achievementId}/` : "achievements/";
    const fileName = `${prefix}${Date.now()}-${crypto.randomUUID()}${extSuffix}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bucket: BUCKET,
          path: data.path,
          url: urlData.publicUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
