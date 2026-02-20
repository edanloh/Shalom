import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // keep this secret
);
const EVENT_DEBOUNCE_SECONDS = Number(
  Deno.env.get("RECO_EVENT_DEBOUNCE_SECONDS") ?? "45"
);
const DEBOUNCE_EVENT_TYPES = new Set(["impression", "view"]);

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const baseContext = body.context || {};
    const context = {
      ...baseContext,
      modelVersion:
        baseContext.modelVersion ||
        body.modelVersion ||
        body.model_version ||
        null,
      requestId:
        baseContext.requestId ||
        body.requestId ||
        body.request_id ||
        null,
    };

    const event = {
      user_id: body.userId || body.user_id || "anon",
      course_id: body.courseId || body.course_id || null,
      event_type: body.eventType || body.event_type || "unknown",
      placement: context?.placement || body.placement || "unknown",
      context,
      timestamp: body.timestamp || new Date().toISOString(),
    };

    const listCourseIds = Array.isArray(context?.courseIds)
      ? context.courseIds
          .map((id: unknown) => (typeof id === "string" ? id.trim() : ""))
          .filter((id: string) => id.length > 0)
      : [];

    let eventsToInsert: typeof event[] = [event];
    if (
      event.event_type === "impression" &&
      !event.course_id &&
      listCourseIds.length > 0
    ) {
      // Keep the list-level impression for request-level telemetry and add
      // per-course "view" events so course-level suppression can work.
      const perCourseViews = listCourseIds.map((courseId: string) => ({
        ...event,
        course_id: courseId,
        event_type: "view",
        context: {
          ...context,
          derivedFrom: "impression_list",
        },
      }));
      eventsToInsert = [event, ...perCourseViews];
    }

    // Debounce noisy "impression/view" spam for the same user+course+placement
    // within a short window, while still keeping click/save/start/complete events.
    if (EVENT_DEBOUNCE_SECONDS > 0) {
      const nowTs = Date.now();
      const cutoffIso = new Date(
        nowTs - EVENT_DEBOUNCE_SECONDS * 1000
      ).toISOString();
      const courseIdsToCheck = Array.from(
        new Set(
          eventsToInsert
            .filter(
              (ev) =>
                DEBOUNCE_EVENT_TYPES.has((ev.event_type ?? "").toLowerCase()) &&
                !!ev.course_id
            )
            .map((ev) => ev.course_id as string)
        )
      );

      if (courseIdsToCheck.length > 0) {
        const { data: recentRows, error: recentErr } = await supabase
          .from("recommendation_events")
          .select("course_id, event_type, placement")
          .eq("user_id", event.user_id)
          .in("course_id", courseIdsToCheck)
          .in("event_type", Array.from(DEBOUNCE_EVENT_TYPES))
          .gte("timestamp", cutoffIso);
        if (recentErr) throw recentErr;

        const recentKeys = new Set(
          (recentRows ?? []).map(
            (row) => `${row.course_id}|${row.event_type}|${row.placement ?? "unknown"}`
          )
        );
        const inRequestSeen = new Set<string>();
        eventsToInsert = eventsToInsert.filter((ev) => {
          const evType = (ev.event_type ?? "").toLowerCase();
          if (!DEBOUNCE_EVENT_TYPES.has(evType) || !ev.course_id) return true;
          const key = `${ev.course_id}|${evType}|${ev.placement ?? "unknown"}`;
          if (recentKeys.has(key)) return false;
          if (inRequestSeen.has(key)) return false;
          inRequestSeen.add(key);
          return true;
        });
      }
    }

    if (eventsToInsert.length === 0) {
      return ok({
        success: true,
        message: "Event debounced",
        inserted: 0,
        debounced: true,
      });
    }

    const { error } = await supabase.from("recommendation_events").insert(eventsToInsert);
    if (error) throw error;

    return ok({
      success: true,
      message: "Event recorded",
      inserted: eventsToInsert.length,
      debounced_window_seconds: EVENT_DEBOUNCE_SECONDS,
    });
  } catch (err: any) {
    console.error("postRecommendationEvent error", err);
    return fail("Failed to record event", 500, { error: err.message });
  }
});
