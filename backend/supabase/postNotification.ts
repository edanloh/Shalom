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
    let body: any;
    try {
      body = await req.json();
    } catch {
      return fail("Invalid JSON body", 400);
    }

    console.log("📌 CRON BODY:", body);

    const userIds: string[] = body.userIds || body.user_ids;
    const title = body.title;
    const message = body.message;
    const type = body.type || "system";

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return fail("userIds must be a non-empty array", 400);
    }

    if (!title || !message) {
      return fail("title and message are required", 400);
    }

    const createdAt = body.createdAt || body.created_at || new Date().toISOString();

    // 1️⃣ Insert notifications (one per user)
    const notificationsPayload = userIds.map((userId) => ({
      user_id: userId,
      title,
      message,
      type,
      action_url: body.actionUrl || body.action_url || null,
      related_entity_type: body.relatedEntityType || body.related_entity_type || null,
      related_entity_id: body.relatedEntityId || body.related_entity_id || null,
      priority: body.priority || "normal",
      expires_at: body.expiresAt || body.expires_at || null,
      created_at: createdAt,
    }));

    const { data: notifications, error: insertError } = await supabase
      .from("notifications")
      .insert(notificationsPayload)
      .select("id,user_id,title,message,type,created_at");

    if (insertError) throw insertError;

    // 2️⃣ Fetch all push tokens for these users
    let push = { sent: 0, results: [] as unknown[] };

    try {
      const { data: tokenRows, error: tokenError } = await supabase
        .from("push_notification_tokens")
        .select("user_id,tokens")
        .in("user_id", userIds);

      if (tokenError) throw tokenError;

      const payloads: Record<string, unknown>[] = [];

      for (const row of tokenRows ?? []) {
        const userNotifications = notifications.filter(
          (n) => n.user_id === row.user_id
        );

        const validTokens = (row.tokens ?? []).filter(
          (t: string) => t && isExpoPushToken(t)
        );

        for (const token of validTokens) {
          for (const notif of userNotifications) {
            payloads.push({
              to: token,
              sound: "default",
              title,
              body: message,
              priority: body.priority === "high" ? "high" : "default",
              data: {
                notificationId: notif.id,
                type,
                ...(typeof body.data === "object" ? body.data : {}),
              },
            });
          }
        }
      }

      push = await sendExpoPush(payloads);
    } catch (pushError) {
      console.error("❌ Push notification failed:", pushError);
    }

    return ok({
      success: true,
      notifications,
      push,
    });
  } catch (err: any) {
    console.error("postNotification error", err);
    return fail("Failed to create notifications", 500, { error: err.message });
  }
});
