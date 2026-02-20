import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { resourceUrl, resourceType } = await req.json();

    if (!resourceUrl) {
      return new Response(
        JSON.stringify({ error: "Resource URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If it's a local file reference, return error (must be uploaded)
    if (resourceUrl.startsWith("[LOCAL_FILE:")) {
      return new Response(
        JSON.stringify({ 
          error: "Please upload the document to view it",
          status: "local_only"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If it's a URL, use it directly with Office Online viewer
    if (resourceUrl.startsWith("http")) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resourceUrl)}`;
      
      return new Response(
        JSON.stringify({
          status: "ready",
          type: "office-online",
          previewUrl: officeViewerUrl,
          resourceType: resourceType,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If it's a storage path, create signed URL and use Office Online viewer
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("course-documents")
      .createSignedUrl(resourceUrl, 3600); // 1 hour

    if (signError || !signedUrl) {
      return new Response(
        JSON.stringify({ error: "Could not generate preview URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate Office Online embed URL
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl.signedUrl)}`;

    return new Response(
      JSON.stringify({
        status: "ready",
        type: "office-online",
        previewUrl: officeViewerUrl,
        resourceType: resourceType,
        message: "Document preview powered by Microsoft Office Online",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating preview:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
