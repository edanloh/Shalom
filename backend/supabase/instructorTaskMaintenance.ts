import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const DEFAULT_REMINDER_HOURS = 24;

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

async function sendNotification(payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const directInsert = async () => {
    await supabase.from("notifications").insert({
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      related_entity_type: payload.relatedEntityType ?? null,
      related_entity_id: payload.relatedEntityId ?? null,
      created_at: new Date().toISOString(),
    });
  };

  if (!supabaseUrl || !serviceKey) {
    await directInsert();
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/postNotification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        userIds: [payload.userId],
        title: payload.title,
        message: payload.message,
        type: payload.type,
        relatedEntityType: payload.relatedEntityType,
        relatedEntityId: payload.relatedEntityId,
      }),
    });

    if (!response.ok) {
      await directInsert();
    }
  } catch {
    await directInsert();
  }
}

async function notifyInstructorTaskDueSoon(now: Date, reminderHours: number) {
  const windowEnd = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const windowEndIso = windowEnd.toISOString();

  const { data: tasks, error } = await supabase
    .from("instructor_tasks")
    .select("id, instructor_id, title, due_at, status")
    .in("status", ["pending", "overdue"])
    .not("due_at", "is", null)
    .gte("due_at", nowIso)
    .lte("due_at", windowEndIso)
    .order("due_at", { ascending: true });

  if (error) throw error;
  if (!tasks?.length) return 0;

  let sent = 0;
  for (const task of tasks as Array<{
    id: string;
    instructor_id: string;
    title: string;
    due_at: string;
  }>) {
    const { data: existing, error: existingErr } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", String(task.instructor_id))
      .eq("type", "reminder")
      .eq("related_entity_type", "instructor_task")
      .eq("related_entity_id", String(task.id))
      .limit(1)
      .maybeSingle();

    if (existingErr && existingErr.code !== "PGRST116") throw existingErr;
    if (existing?.id) continue;

    const dueDate = new Date(task.due_at);
    const dueLabel = Number.isNaN(dueDate.getTime())
      ? "soon"
      : dueDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

    await sendNotification({
      userId: String(task.instructor_id),
      type: "reminder",
      title: "Manual task due soon",
      message: `${task.title} is due ${dueLabel}.`,
      relatedEntityType: "instructor_task",
      relatedEntityId: String(task.id),
    });
    sent += 1;
  }

  return sent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json().catch(() => ({}));
    const now = body?.now ? new Date(body.now) : new Date();
    if (Number.isNaN(now.getTime())) return fail("now must be a valid ISO date", 400);

    const rawReminderHours = Number(body?.reminderHours ?? DEFAULT_REMINDER_HOURS);
    const reminderHours = Number.isFinite(rawReminderHours)
      ? Math.max(1, Math.min(168, rawReminderHours))
      : DEFAULT_REMINDER_HOURS;

    const taskRemindersSent = await notifyInstructorTaskDueSoon(now, reminderHours);

    return ok({
      success: true,
      data: {
        now: now.toISOString(),
        reminderHours,
        taskRemindersSent,
      },
    });
  } catch (err: any) {
    console.error("instructorTaskMaintenance error", err);
    return fail("Failed to process instructor task reminders", 500, {
      error: err.message || "Unknown error",
    });
  }
});
