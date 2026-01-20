import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-file-name",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const contentType = 'image/png';

  const arrayBuffer = await req.arrayBuffer();
  console.log(arrayBuffer)
  const fileBytes = new Uint8Array(arrayBuffer);

  if (fileBytes.length === 0) {
    return new Response(JSON.stringify({ error: "Empty file" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fileName = req.headers.get("x-file-name") ?? `${crypto.randomUUID()}.png`;
  const fileExt = fileName.split("_avatar")[0];
  console.log(fileExt)

  const { data, error } = await supabase.storage
    .from("profilepics")
    .upload(fileName, fileBytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": 'image/png' },
  });
});
