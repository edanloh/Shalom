/**
 * supabase/functions/getMLRecommendations/index.ts
 * -------------------------------------------------
 * ML re-ranking edge function.
 *
 * ARCHITECTURE (two-stage pipeline)
 * ──────────────────────────────────
 *  Stage 1 — Candidate generation  (reuses all logic from getRecommendations.ts)
 *    → fetches up to 60 candidates and computes score_breakdown for each
 *
 *  Stage 2 — ML re-ranking  (this file adds)
 *    → loads learned logistic-regression weights from env
 *    → applies: ml_score = dot(score_breakdown_vector, weights) + intercept
 *    → re-ranks candidates by ml_score instead of the hand-tuned composite score
 *
 * DEPLOYMENT
 * ──────────
 *  1. Run `python ml/train_reranker.py` to produce ml/model_weights.json
 *  2. Store the JSON as a Supabase secret:
 *       supabase secrets set RECO_ML_WEIGHTS='<contents of model_weights.json>'
 *  3. Deploy this function:
 *       supabase functions deploy getMLRecommendations
 *  4. In getRecommendations.ts, set RECO_SPLIT_ML env var > 0 to route traffic here.
 *
 * FALLBACK
 * ────────
 *  If RECO_ML_WEIGHTS is missing or malformed, falls back to the rule-based score.
 *  This means you can deploy this safely without breaking anything.
 */

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

// ── Feature column order must exactly match train_reranker.py ────────────────
const FEATURE_COLS = [
  "rating",
  "user_ctr",
  "user_recency",
  "category_affinity",
  "instructor_affinity",
  "tag_affinity",
  "difficulty_match",
  "freshness",
  "session_intent_boost",
  "popularity",
  "global_ctr",
  "ignored_penalty",
  "dismiss_penalty",
  "suppression_penalty",
  "overexposed_penalty",
  "instructor_fatigue_penalty",
  "quality_penalty",
  "content_similarity_boost",
  "thompson_bonus",          // UCB exploration signal
  "difficulty_progression",  // learning path next-step boost
] as const;

type FeatureCol = typeof FEATURE_COLS[number];
type ScoreBreakdown = Record<FeatureCol, number>;

type MLWeights = {
  model_version: string;
  trained_at: string;
  feature_cols: string[];
  weights: Record<string, number>;
  scaler_mean: number[];
  scaler_scale: number[];
  intercept: number;
};

// ── Load model weights from env (cached per isolate) ─────────────────────────
let _cachedWeights: MLWeights | null = null;
let _mlAvailable = false;

const loadWeights = (): { weights: MLWeights | null; available: boolean } => {
  if (_cachedWeights) return { weights: _cachedWeights, available: _mlAvailable };

  const raw = Deno.env.get("RECO_ML_WEIGHTS");
  if (!raw) {
    console.warn("RECO_ML_WEIGHTS not set — ML re-ranking unavailable, will use rule-based fallback.");
    _mlAvailable = false;
    return { weights: null, available: false };
  }

  try {
    const parsed = JSON.parse(raw) as MLWeights;
    if (!parsed.weights || !parsed.feature_cols) throw new Error("Malformed weights JSON");
    _cachedWeights = parsed;
    _mlAvailable = true;
    console.info(`Loaded ML model: ${parsed.model_version} trained at ${parsed.trained_at}`);
    return { weights: parsed, available: true };
  } catch (err) {
    console.error("Failed to parse RECO_ML_WEIGHTS:", err);
    _mlAvailable = false;
    return { weights: null, available: false };
  }
};

// ── Logistic-regression score (with StandardScaler normalisation) ─────────────
const mlScore = (breakdown: ScoreBreakdown, model: MLWeights): number => {
  let logit = model.intercept;
  for (let i = 0; i < model.feature_cols.length; i++) {
    const feat = model.feature_cols[i] as FeatureCol;
    const raw = breakdown[feat] ?? 0;
    // Apply same StandardScaler transform used during training
    const scaled = (raw - (model.scaler_mean[i] ?? 0)) / (model.scaler_scale[i] ?? 1);
    logit += scaled * (model.weights[feat] ?? 0);
  }
  // Sigmoid → probability of click
  return 1 / (1 + Math.exp(-logit));
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500) =>
  ok({ success: false, message }, status);

// ── Diversity-constrained selection ──────────────────────────────────────────
// Mirrors the constraint logic in getRecommendations.ts so ML results honour
// the same per-category and per-instructor caps that the rule-based path uses.
// Applied AFTER ML sorting so the model's ranking still drives selection order.
const applyMLDiversityConstraints = <
  T extends {
    id: string;
    score_breakdown: ScoreBreakdown;
    course: Record<string, unknown>;
  }
>(
  items: T[],
  targetCount: number,
  maxPerCategory: number,
  maxPerInstructor: number
): T[] => {
  const selected: T[] = [];
  const perCategory = new Map<string, number>();
  const perInstructor = new Map<string, number>();

  for (const item of items) {
    if (selected.length >= targetCount) break;
    const catKey = String(
      (item.course as any)?.category?.name ??
      (item.course as any)?.category_name ??
      (item.course as any)?.category_id ??
      "unknown"
    );
    const instKey = String((item.course as any)?.instructor_id ?? "unknown");
    if ((perCategory.get(catKey) ?? 0) >= maxPerCategory) continue;
    if ((perInstructor.get(instKey) ?? 0) >= maxPerInstructor) continue;
    selected.push(item);
    perCategory.set(catKey, (perCategory.get(catKey) ?? 0) + 1);
    perInstructor.set(instKey, (perInstructor.get(instKey) ?? 0) + 1);
  }

  // Fill any remaining slots ignoring constraints (avoids empty results on small catalogues)
  for (const item of items) {
    if (selected.length >= targetCount) break;
    if (selected.some((s) => s.id === item.id)) continue;
    selected.push(item);
  }

  return selected;
};

// ── Hard-coded diversity caps (match defaults in getRecommendations.ts) ───────
const ML_MAX_PER_CATEGORY = Number(Deno.env.get("RECO_MAX_PER_CATEGORY") ?? "2");
const ML_MAX_PER_INSTRUCTOR = Number(Deno.env.get("RECO_MAX_PER_INSTRUCTOR") ?? "2");

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const placement = url.searchParams.get("placement") ?? "home";

  // Step 1: call the existing rule-based function to get scored candidates
  // We re-use all the candidate generation + feature computation by calling
  // getRecommendations internally with a larger result window.
  let ruleBasedResults: Array<{
    id: string;
    score: number;
    score_breakdown: ScoreBreakdown;
    primary_reason_tag: string;
    rank: number;
    course: Record<string, unknown>;
  }>;
  let ruleMeta: Record<string, unknown>;

  try {
    const internalUrl = new URL(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/getRecommendations`
    );
    if (userId) internalUrl.searchParams.set("userId", userId);
    internalUrl.searchParams.set("placement", placement);
    // Pass localHour and dayOfWeek through if provided
    const localHour = url.searchParams.get("localHour");
    const dayOfWeek = url.searchParams.get("dayOfWeek");
    const learningGoal = url.searchParams.get("learningGoal");
    if (localHour) internalUrl.searchParams.set("localHour", localHour);
    if (dayOfWeek) internalUrl.searchParams.set("dayOfWeek", dayOfWeek);
    if (learningGoal) internalUrl.searchParams.set("learningGoal", learningGoal);
    // _mlInternal=1 tells getRecommendations to skip its own ML redirect,
    // preventing an infinite loop when RECO_SPLIT_ML is set.
    internalUrl.searchParams.set("_mlInternal", "1");
    // Request the full candidate pool so the ML model has more to re-rank.
    // getRecommendations now parses _maxResults and caps it at MAX_CANDIDATE_POOL (60).
    internalUrl.searchParams.set("_maxResults", "60");

    const ruleResp = await fetch(internalUrl.toString(), {
      headers: {
        authorization: req.headers.get("authorization") ?? "",
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
    });
    const ruleData = await ruleResp.json();
    if (!ruleData.success) throw new Error(ruleData.message ?? "Rule-based call failed");

    ruleBasedResults = ruleData.recommendations ?? ruleData.data?.recommendations ?? [];
    ruleMeta = ruleData.meta ?? ruleData.data?.meta ?? {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch rule-based candidates:", msg);
    return fail(`Upstream error: ${msg}`, 502);
  }

  // Step 2: Apply ML re-ranking
  const { weights: model, available: mlOk } = loadWeights();

  let reranked = ruleBasedResults;
  let rerankerUsed = "rule_based_fallback";

  if (mlOk && model) {
    // Sort entire pool by ML score first, then apply diversity constraints.
    // This preserves ML ranking intent while preventing same-category clusters.
    const mlSorted = [...ruleBasedResults].sort((a, b) => {
      const scoreA = mlScore(a.score_breakdown, model);
      const scoreB = mlScore(b.score_breakdown, model);
      return scoreB - scoreA;
    });
    reranked = applyMLDiversityConstraints(
      mlSorted,
      6,
      ML_MAX_PER_CATEGORY,
      ML_MAX_PER_INSTRUCTOR
    );
    rerankerUsed = model.model_version;
  }

  // Re-assign ranks after ML re-ranking
  const results = reranked.slice(0, 6).map((item, i) => ({
    ...item,
    rank: i + 1,
    ml_score: mlOk && model ? Number(mlScore(item.score_breakdown, model).toFixed(4)) : null,
  }));

  return ok({
    success: true,
    recommendations: results,
    data: { recommendations: results },
    meta: {
      ...ruleMeta,
      model_version: rerankerUsed,
      ml_available: mlOk,
      reranker: rerankerUsed,
    },
  });
});
