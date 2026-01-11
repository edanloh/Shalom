import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_EXPO_TOKENS_PER_BATCH = 100;

const isExpoPushToken = (token: string) =>
  token.startsWith("ExpoPushToken[") || token.startsWith("ExponentPushToken[");

const chunk = <T,>(items: T[], size: number) => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const sendExpoPush = async (payloads: Record<string, unknown>[]) => {
  if (!payloads.length) return { sent: 0, results: [] as unknown[] };
  const results: unknown[] = [];
  const batches = chunk(payloads, MAX_EXPO_TOKENS_PER_BATCH);
  for (const batch of batches) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });
    const body = await res.json().catch(() => ({}));
    results.push(body);
  }
  return { sent: payloads.length, results };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const userId = body.userId || body.user_id;
    const title = body.title;
    const message = body.message;
    const type = body.type || "system";

    if (!userId || !title || !message) {
      return fail("userId, title, and message are required", 400);
    }

    const payload = {
      user_id: userId,
      title,
      message,
      type,
      action_url: body.actionUrl || body.action_url || null,
      related_entity_type: body.relatedEntityType || body.related_entity_type || null,
      related_entity_id: body.relatedEntityId || body.related_entity_id || null,
      priority: body.priority || "normal",
      expires_at: body.expiresAt || body.expires_at || null,
      created_at: body.createdAt || body.created_at || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(payload)
      .select("id,user_id,title,message,type,is_read,created_at,action_url")
      .single();

    if (error) throw error;

    // Fetch push tokens and send an Expo push for this notification.
    let push = { sent: 0, results: [] as unknown[] };
    try {
      const { data: tokenRow, error: tokenError } = await supabase
        .from("push_notification_tokens")
        .select("tokens")
        .eq("user_id", userId)
        .maybeSingle();

      if (tokenError && tokenError.code !== "PGRST116") {
        throw tokenError;
      }

      const tokens = (tokenRow?.tokens ?? []).filter(
        (token: string) => token && isExpoPushToken(token)
      );

      if (tokens.length) {
        const extraData =
          body.data && typeof body.data === "object" ? body.data : {};
        const payloads = tokens.map((token: string) => ({
          to: token,
          sound: "default",
          title,
          body: message,
          data: {
            notificationId: data.id,
            type,
            ...extraData,
          },
          priority: body.priority === "high" ? "high" : "default",
        }));
        push = await sendExpoPush(payloads);
      }
    } catch (pushError: any) {
      console.error("Failed to send push notification:", pushError);
    }

    return ok({ success: true, data, push });
  } catch (err: any) {
    console.error("postNotification error", err);
    return fail("Failed to create notification", 500, { error: err.message });
  }
});
