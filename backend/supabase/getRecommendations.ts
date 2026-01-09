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

const EVENT_LOOKBACK_DAYS = 30;
const MAX_CANDIDATES = 20;
const MAX_RESULTS = 6;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || null;

    // Fetch candidate courses
    const { data: courses, error: coursesErr } = await supabase
      .from("courses")
      .select("id, title, description, level, rating, duration_hours, thumbnail_url, tags")
      .eq("is_published", true)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(MAX_CANDIDATES);

    if (coursesErr) throw coursesErr;

    // Exclude completed by user (optional)
    let excluded = new Set<string>();
    if (userId) {
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("course_id, is_completed")
        .eq("user_id", userId);
      excluded = new Set(
        (enrollments || [])
          .filter((e) => e.is_completed)
          .map((e) => e.course_id as string)
      );
    }

    const candidates = (courses || []).filter((c) => !excluded.has(c.id));

    // Recent events for behavior signals
    const since = new Date(Date.now() - EVENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
    let eventsQuery = supabase
      .from("recommendation_events")
      .select("course_id, event_type, timestamp")
      .gte("timestamp", since);
    if (userId) {
      eventsQuery = eventsQuery.eq("user_id", userId);
    }
    const { data: events } = await eventsQuery;

    // Aggregate behavior
    const behavior = new Map<string, { impressions: number; clicks: number; recency: number }>();
    const now = Date.now();
    for (const ev of events || []) {
      const cid = ev.course_id;
      if (!cid) continue;
      const rec = behavior.get(cid) || { impressions: 0, clicks: 0, recency: 0 };
      if (ev.event_type === "impression") rec.impressions += 1;
      if (ev.event_type === "click") rec.clicks += 1;
      const ageMs = now - new Date(ev.timestamp).getTime();
      rec.recency += Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 7)); // 7-day decay
      behavior.set(cid, rec);
    }

    // Behavior scores
    const behScores = new Map<string, { ctrScore: number; ignoredPenalty: number; recentScore: number }>();
    for (const [cid, rec] of behavior.entries()) {
      const ctr = (rec.clicks + 1) / (rec.impressions + 3); // Laplace prior
      const ctrScore = ctr * 5;
      const ignoredPenalty =
        rec.impressions > 0 && rec.clicks === 0 ? Math.min(1.5, rec.impressions * 0.1) : 0;
      const recentScore = rec.recency;
      behScores.set(cid, { ctrScore, ignoredPenalty, recentScore });
    }

    // Blend score 0–10
    const blended = candidates.map((row, idx) => {
      const beh = behScores.get(row.id) ?? { ctrScore: 0, ignoredPenalty: 0, recentScore: 0 };
      const base = Number(row.rating) || 0; // use rating as base (0–5)

      let blendedScore =
        base * 2 * 0.7 +          // scale rating to ~0–10, weight 0.7
        beh.ctrScore * 0.15 +     // small CTR influence
        beh.recentScore * 0.1 -   // small recency boost
        beh.ignoredPenalty * 0.5; // penalty

      blendedScore = Math.max(0, Math.min(10, blendedScore));

      return {
        id: row.id ?? `rec_${idx}`,
        rank: idx + 1, // temporary; recomputed after sort
        score: blendedScore,
        reason: "Recommended for you",
        course: row,
      };
    });

    const sorted = blended
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return new Response(JSON.stringify({ success: true, data: sorted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("getRecommendations error", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch recommendations",
        error: err.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
