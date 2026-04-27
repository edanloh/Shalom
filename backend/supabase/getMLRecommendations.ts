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
 *  2. Upload to Supabase Storage (the JSON exceeds the 24 KB secret limit):
 *       curl -X POST "${SUPABASE_URL}/storage/v1/object/ml-models/model_weights.json" \
 *         -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
 *         -H "Content-Type: application/json" \
 *         --data-binary @backend/ml/model_weights.json
 *     Bucket "ml-models" must exist (Dashboard → Storage → New bucket, private).
 *     Or just run: backend/ml/retrain_and_deploy.sh
 *  3. Deploy this function (paste into Dashboard editor).
 *  4. Set RECO_SPLIT_ML env var > 0 on getRecommendations to route traffic here.
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
  "session_cf_boost",        // similarity to courses clicked in current session
] as const;

type FeatureCol = typeof FEATURE_COLS[number];
type ScoreBreakdown = Partial<Record<FeatureCol, number>> & Record<string, number>;

// ── LightGBM tree types ───────────────────────────────────────────────────────
// These mirror the trimmed JSON structure produced by trim_tree() in train_reranker.py.
// Each node is either a leaf (leaf_value) or an internal split (split_feature +
// threshold + children). The tree is evaluated recursively at inference time.
type LGBMLeaf = { leaf_value: number };
type LGBMSplit = {
  split_feature: number;   // index into the feature vector
  threshold: number;       // numerical split threshold
  default_left: boolean;   // direction for NaN/missing feature values
  left_child: LGBMNode;
  right_child: LGBMNode;
};
type LGBMNode = LGBMLeaf | LGBMSplit;

const isLeaf = (node: LGBMNode): node is LGBMLeaf => "leaf_value" in node;

// ── Model payload (supports both LightGBM and logistic regression) ────────────
type MLWeights = {
  model_type?: "lgbm" | "logreg";  // defaults to "logreg" for legacy models
  model_version: string;
  trained_at: string;
  feature_cols: string[];
  // LightGBM fields
  lgbm_trees?: Array<LGBMNode>;
  // Logistic regression fields (legacy)
  weights?: Record<string, number>;
  scaler_mean?: number[];
  scaler_scale?: number[];
  intercept?: number;
};

// ── Load model weights (cached per isolate) ───────────────────────────────────
// Priority:
//   1. RECO_ML_WEIGHTS env secret (small / legacy models that fit the 24 KB limit)
//   2. Supabase Storage bucket "ml-models" / "model_weights.json"
//      — upload with: supabase storage cp backend/ml/model_weights.json ss://ml-models/model_weights.json
//      — or via curl (see README for exact command)
//   3. Rule-based fallback (returns available=false)
let _cachedWeights: MLWeights | null = null;
let _mlAvailable = false;

const _validateWeights = (parsed: MLWeights): void => {
  const modelType = parsed.model_type ?? "logreg";
  if (modelType === "lgbm" && (!parsed.lgbm_trees || parsed.lgbm_trees.length === 0)) {
    throw new Error("lgbm model missing lgbm_trees");
  }
  if (modelType === "logreg" && (!parsed.weights || !parsed.feature_cols)) {
    throw new Error("logreg model missing weights or feature_cols");
  }
};

const _logLoaded = (parsed: MLWeights): void => {
  const modelType = parsed.model_type ?? "logreg";
  const detail = modelType === "lgbm"
    ? `${parsed.lgbm_trees!.length} trees`
    : `${Object.keys(parsed.weights ?? {}).length} features`;
  console.info(`Loaded ML model: ${parsed.model_version} (${modelType}, ${detail}) trained at ${parsed.trained_at}`);
};

const loadWeights = async (): Promise<{ weights: MLWeights | null; available: boolean }> => {
  if (_cachedWeights) return { weights: _cachedWeights, available: _mlAvailable };

  // ── Try env secret first (fits within Supabase's 24 KB secret limit) ─────
  const raw = Deno.env.get("RECO_ML_WEIGHTS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MLWeights;
      _validateWeights(parsed);
      _cachedWeights = parsed;
      _mlAvailable = true;
      _logLoaded(parsed);
      return { weights: parsed, available: true };
    } catch (err) {
      console.error("Failed to parse RECO_ML_WEIGHTS env secret:", err);
      // fall through to Storage
    }
  }

  // ── Try Supabase Storage (for large models that exceed the secret limit) ──
  const bucket = Deno.env.get("RECO_MODEL_BUCKET") ?? "ml-models";
  const path   = Deno.env.get("RECO_MODEL_PATH")   ?? "model_weights.json";
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) throw error ?? new Error("Storage returned no data");
    const text = await (data as Blob).text();
    const parsed = JSON.parse(text) as MLWeights;
    _validateWeights(parsed);
    _cachedWeights = parsed;
    _mlAvailable = true;
    _logLoaded(parsed);
    return { weights: parsed, available: true };
  } catch (err) {
    console.error(`Failed to load model from Storage (${bucket}/${path}):`, err);
  }

  console.warn("No ML model available — falling back to rule-based ranking.");
  _mlAvailable = false;
  return { weights: null, available: false };
};

// ── LightGBM tree traversal ───────────────────────────────────────────────────
const traverseTree = (node: LGBMNode, features: number[]): number => {
  if (isLeaf(node)) return node.leaf_value;
  const val = features[node.split_feature] ?? NaN;
  // NaN (missing feature) uses default_left direction
  const goLeft = isNaN(val) ? node.default_left : val <= node.threshold;
  return traverseTree(goLeft ? node.left_child : node.right_child, features);
};

const predictLGBM = (breakdown: ScoreBreakdown, model: MLWeights): number => {
  // Build feature vector in the exact order used during training
  const featureCols = model.feature_cols.length > 0 ? model.feature_cols : FEATURE_COLS;
  const features = featureCols.map((feat) => breakdown[feat] ?? 0);
  // Sum over all trees (LambdaRank output is a raw score, not a probability)
  return model.lgbm_trees!.reduce((sum, tree) => sum + traverseTree(tree, features), 0);
};

// ── Logistic-regression score (with StandardScaler normalisation) ─────────────
const predictLR = (breakdown: ScoreBreakdown, model: MLWeights): number => {
  let logit = model.intercept ?? 0;
  for (let i = 0; i < (model.feature_cols ?? []).length; i++) {
    const feat = model.feature_cols[i] as FeatureCol;
    const raw = breakdown[feat] ?? 0;
    const scaled = (raw - (model.scaler_mean?.[i] ?? 0)) / (model.scaler_scale?.[i] ?? 1);
    logit += scaled * (model.weights?.[feat] ?? 0);
  }
  return 1 / (1 + Math.exp(-logit));
};

// ── Unified score dispatcher ──────────────────────────────────────────────────
const mlScore = (breakdown: ScoreBreakdown, model: MLWeights): number => {
  const modelType = model.model_type ?? "logreg";
  return modelType === "lgbm" ? predictLGBM(breakdown, model) : predictLR(breakdown, model);
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
const MAX_RESULTS = 12;

const clampInt = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
};

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const placement = url.searchParams.get("placement") ?? "home";
  const resultLimit = clampInt(Number(url.searchParams.get("limit")) || MAX_RESULTS, 1, MAX_RESULTS);

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
    const preferredCategories = url.searchParams.get("preferredCategories");
    if (localHour) internalUrl.searchParams.set("localHour", localHour);
    if (dayOfWeek) internalUrl.searchParams.set("dayOfWeek", dayOfWeek);
    if (learningGoal) internalUrl.searchParams.set("learningGoal", learningGoal);
    if (preferredCategories) internalUrl.searchParams.set("preferredCategories", preferredCategories);
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
  const { weights: model, available: mlOk } = await loadWeights();

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
      resultLimit,
      ML_MAX_PER_CATEGORY,
      ML_MAX_PER_INSTRUCTOR
    );
    rerankerUsed = model.model_version;
  }

  // Re-assign ranks after ML re-ranking
  const results = reranked.slice(0, resultLimit).map((item, i) => ({
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
