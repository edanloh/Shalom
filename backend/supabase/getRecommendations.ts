import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const EVENT_LOOKBACK_DAYS = 30;
const MAX_CANDIDATES = 20;
const MAX_CANDIDATE_POOL = Number(
  Deno.env.get("RECO_MAX_CANDIDATE_POOL") ?? "60"
);
const CANDIDATE_CATEGORY_POOL_LIMIT = Number(
  Deno.env.get("RECO_CANDIDATE_CATEGORY_POOL_LIMIT") ?? "20"
);
const CANDIDATE_LONG_TAIL_POOL_LIMIT = Number(
  Deno.env.get("RECO_CANDIDATE_LONG_TAIL_POOL_LIMIT") ?? "20"
);
const MAX_RESULTS = 6;
const MIN_SCORE_FLOOR = Number(Deno.env.get("RECO_MIN_SCORE_FLOOR") ?? "1");
const COLD_MIN_SCORE_FLOOR = (() => {
  const parsed = Number(Deno.env.get("RECO_COLD_MIN_SCORE_FLOOR") ?? String(MIN_SCORE_FLOOR));
  if (!Number.isFinite(parsed)) return MIN_SCORE_FLOOR;
  return Math.max(parsed, MIN_SCORE_FLOOR);
})();
const PROFILE_DECAY_DAYS = Number(Deno.env.get("RECO_PROFILE_DECAY_DAYS") ?? "21");
const NOVELTY_MIN_SLOTS = Number(Deno.env.get("RECO_NOVELTY_MIN_SLOTS") ?? "1");
const RERANK_CATEGORY_PENALTY = Number(
  Deno.env.get("RECO_RERANK_CATEGORY_PENALTY") ?? "0.5"
);
const RERANK_INSTRUCTOR_PENALTY = Number(
  Deno.env.get("RECO_RERANK_INSTRUCTOR_PENALTY") ?? "0.6"
);
const RERANK_TAG_OVERLAP_PENALTY = Number(
  Deno.env.get("RECO_RERANK_TAG_OVERLAP_PENALTY") ?? "0.2"
);
const RERANK_NOVELTY_BONUS = Number(
  Deno.env.get("RECO_RERANK_NOVELTY_BONUS") ?? "0.35"
);
const SESSION_GAP_HOURS = Number(Deno.env.get("RECO_SESSION_GAP_HOURS") ?? "2");
const FRESHNESS_HALF_LIFE_DAYS = Number(
  Deno.env.get("RECO_FRESHNESS_HALF_LIFE_DAYS") ?? "45"
);
const QUALITY_MIN_RATING = Number(Deno.env.get("RECO_QUALITY_MIN_RATING") ?? "3.5");
const QUALITY_LOW_RATING_PENALTY = Number(
  Deno.env.get("RECO_QUALITY_LOW_RATING_PENALTY") ?? "0.9"
);
const SEEN_FILTER_WINDOW_HOURS = Number(
  Deno.env.get("RECO_SEEN_FILTER_WINDOW_HOURS") ?? "24"
);
const SEEN_FILTER_MIN_IMPRESSIONS = Number(
  Deno.env.get("RECO_SEEN_FILTER_MIN_IMPRESSIONS") ?? "2"
);
const SESSION_WINDOW_HOURS = Number(
  Deno.env.get("RECO_SESSION_WINDOW_HOURS") ?? "6"
);
const SESSION_INTENT_BOOST = Number(
  Deno.env.get("RECO_SESSION_INTENT_BOOST") ?? "0.8"
);
const INSTRUCTOR_FATIGUE_WINDOW_HOURS = Number(
  Deno.env.get("RECO_INSTRUCTOR_FATIGUE_WINDOW_HOURS") ?? "168"
);
const MAX_EXPOSURES_PER_INSTRUCTOR_WINDOW = Number(
  Deno.env.get("RECO_MAX_EXPOSURES_PER_INSTRUCTOR_WINDOW") ?? "8"
);
const INSTRUCTOR_FATIGUE_PENALTY = Number(
  Deno.env.get("RECO_INSTRUCTOR_FATIGUE_PENALTY") ?? "1.2"
);
const MIN_USER_EVENTS_FOR_PERSONALIZATION = Number(
  Deno.env.get("RECO_MIN_USER_EVENTS") ?? "1"
);
const MAX_PER_CATEGORY = Number(Deno.env.get("RECO_MAX_PER_CATEGORY") ?? "2");
const MAX_PER_INSTRUCTOR = Number(Deno.env.get("RECO_MAX_PER_INSTRUCTOR") ?? "2");
const EXPLORATION_SLOTS = Number(Deno.env.get("RECO_EXPLORATION_SLOTS") ?? "1");
const MAX_EXPOSURES_PER_COURSE_7D = Number(
  Deno.env.get("RECO_MAX_EXPOSURES_PER_COURSE_7D") ?? "4"
);
const SUPPRESSION_COOLDOWN_DAYS = Number(
  Deno.env.get("RECO_SUPPRESSION_COOLDOWN_DAYS") ?? "3"
);
const HARD_SUPPRESS_DISMISSALS = Number(
  Deno.env.get("RECO_HARD_SUPPRESS_DISMISSALS") ?? "3"
);
const HARD_SUPPRESS_IGNORED_IMPRESSIONS = Number(
  Deno.env.get("RECO_HARD_SUPPRESS_IGNORED_IMPRESSIONS") ?? "6"
);
const DEFAULT_ALGO = (Deno.env.get("RECO_ALGO_DEFAULT") ?? "rules_v2").toLowerCase();
const SPLIT_V2 = Number(Deno.env.get("RECO_SPLIT_V2") ?? "100");
const SPLIT_V2A = Number(Deno.env.get("RECO_SPLIT_V2A") ?? "0");
const SPLIT_V2B = Number(Deno.env.get("RECO_SPLIT_V2B") ?? "0");

// ── Server-side ML traffic split ─────────────────────────────────────────────
// Set RECO_SPLIT_ML=20 to redirect 20 % of users from this function to
// getMLRecommendations. Uses the same deterministic hash bucket as the
// mobile client so a given user always lands on the same path regardless
// of which caller (mobile, web, API) hits this endpoint.
// This is the complement to EXPO_PUBLIC_ML_SPLIT in courseService.ts:
//   - Mobile callers are split client-side (avoids an extra hop).
//   - All other callers (web, server-to-server, future clients) are split here.
const SPLIT_ML = Number(Deno.env.get("RECO_SPLIT_ML") ?? "0");

// ── Stale-profile decay ───────────────────────────────────────────────────────
// If a user's last positive interaction was more than STALE_PROFILE_DAYS ago,
// gradually reduce personalization weight and increase exploration so returning
// users aren't stuck with a stale taste profile.
const STALE_PROFILE_DAYS = Number(Deno.env.get("RECO_STALE_PROFILE_DAYS") ?? "30");

// ── Semantic embeddings (pgvector) ────────────────────────────────────────────
// Set RECO_EMBEDDINGS_ENABLED=true after running embed_courses.py and applying
// add_embeddings.sql. When enabled, content_similarity_boost uses cosine
// similarity via pgvector instead of Jaccard tag overlap.
const EMBEDDINGS_ENABLED = (Deno.env.get("RECO_EMBEDDINGS_ENABLED") ?? "false") === "true";

type RecommendationEvent = {
  course_id: string | null;
  event_type: string | null;
  timestamp: string | null;
};

type CourseCategory = {
  name?: string | null;
  color?: string | null;
};

type CourseCandidate = {
  id: string;
  title?: string | null;
  description?: string | null;
  rating?: number | string | null;
  total_ratings?: number | string | null;
  duration_hours?: number | null;
  thumbnail_url?: string | null;
  tags?: string[] | null;
  instructor_id?: string | null;
  category_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  category?: CourseCategory | null;
};

type ContextFactors = {
  rating: number;
  category: number;
  popularity: number;
  session: number;
  noveltyBonus: number;
  explorationBias: number;
};

type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "mixed" | "unknown";

type BehaviorAggregate = {
  impressions: number;
  recentImpressions7d: number;
  positive: number;
  recency: number;
  dismissals: number;
  lastEventTs: number;
  lastImpressionTs: number;
  lastPositiveTs: number;
};

const readWeight = (key: string, fallback: number): number => {
  const raw = Deno.env.get(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const clampInt = (value: number, min: number, max: number): number => {
  return Math.floor(clamp(value, min, max));
};

const normalizeTag = (value: string): string => value.trim().toLowerCase();

const getCourseTags = (course: CourseCandidate): string[] => {
  const tags = Array.isArray(course.tags) ? course.tags : [];
  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map(normalizeTag)
    .filter((tag) => tag.length > 0);
};

const inferDifficultyLevel = (course: CourseCandidate): DifficultyLevel => {
  const haystack = [
    ...(getCourseTags(course) ?? []),
    course.title?.toLowerCase() ?? "",
    course.description?.toLowerCase() ?? "",
  ].join(" ");

  const hasBeginner =
    haystack.includes("beginner") ||
    haystack.includes("intro") ||
    haystack.includes("foundation") ||
    haystack.includes("basic");
  const hasIntermediate =
    haystack.includes("intermediate") ||
    haystack.includes("mid-level") ||
    haystack.includes("practical");
  const hasAdvanced =
    haystack.includes("advanced") ||
    haystack.includes("expert") ||
    haystack.includes("masterclass") ||
    haystack.includes("professional");
  const hasMixed =
    haystack.includes("all levels") ||
    haystack.includes("all-level") ||
    haystack.includes("mixed level");

  if (hasMixed) return "mixed";
  if (hasBeginner && !hasIntermediate && !hasAdvanced) return "beginner";
  if (!hasBeginner && hasIntermediate && !hasAdvanced) return "intermediate";
  if (!hasBeginner && !hasIntermediate && hasAdvanced) return "advanced";
  if (hasBeginner || hasIntermediate || hasAdvanced) return "mixed";
  return "unknown";
};

const getFreshnessScore = (
  course: CourseCandidate,
  nowTs: number,
  halfLifeDays: number
): number => {
  const ref = course.updated_at ?? course.created_at;
  if (!ref) return 0.5;
  const ts = new Date(ref).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return 0.5;
  const ageMs = Math.max(0, nowTs - ts);
  const halfLifeMs = Math.max(1, halfLifeDays) * 24 * 60 * 60 * 1000;
  return clamp(Math.exp((-Math.LN2 * ageMs) / halfLifeMs), 0, 1);
};

const getQualityPenalty = (
  ratingNorm: number,
  qualityMinRating: number,
  lowRatingPenalty: number
): number => {
  const rating = ratingNorm * 5;
  if (rating >= qualityMinRating) return 0;
  const gap = qualityMinRating - rating;
  return clamp(gap * Math.max(0, lowRatingPenalty), 0, 3);
};

const getContextFactors = (
  learningGoalRaw: string | null,
  localHour: number,
  dayOfWeek: number
): ContextFactors => {
  const goal = (learningGoalRaw ?? "").toLowerCase();
  const factors: ContextFactors = {
    rating: 1,
    category: 1,
    popularity: 1,
    session: 1,
    noveltyBonus: 0,
    explorationBias: 0,
  };

  if (goal === "career" || goal === "certification") {
    factors.rating += 0.12;
    factors.popularity += 0.08;
  } else if (goal === "exam" || goal === "assessment") {
    factors.category += 0.15;
    factors.session += 0.08;
  } else if (goal === "hobby" || goal === "explore") {
    factors.noveltyBonus += 0.25;
    factors.explorationBias += 0.2;
  }

  if (localHour >= 18 && localHour <= 23) {
    factors.session += 0.12;
  } else if (localHour >= 0 && localHour <= 5) {
    factors.popularity -= 0.05;
  }

  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    factors.explorationBias += 0.15;
    factors.noveltyBonus += 0.1;
  }

  return factors;
};

const SCORING = {
  // Personalized path
  rating: readWeight("RECO_WEIGHT_RATING", 0.55),
  userCtr: readWeight("RECO_WEIGHT_USER_CTR", 0.15),
  userRecency: readWeight("RECO_WEIGHT_USER_RECENCY", 0.1),
  categoryAffinity: readWeight("RECO_WEIGHT_CATEGORY_AFFINITY", 0.15),
  instructorAffinity: readWeight("RECO_WEIGHT_INSTRUCTOR_AFFINITY", 0.08),
  tagAffinity: readWeight("RECO_WEIGHT_TAG_AFFINITY", 0.07),
  difficultyMatch: readWeight("RECO_WEIGHT_DIFFICULTY_MATCH", 0.08),
  freshness: readWeight("RECO_WEIGHT_FRESHNESS", 0.06),
  globalPopularity: readWeight("RECO_WEIGHT_GLOBAL_POPULARITY", 0.08),
  ignorePenalty: readWeight("RECO_WEIGHT_IGNORE_PENALTY", 0.5),
  dismissPenalty: readWeight("RECO_WEIGHT_DISMISS_PENALTY", 0.7),
  contentSimilarityBoost: readWeight("RECO_WEIGHT_CONTENT_SIMILARITY_BOOST", 0.12), // CF-inspired nearest-neighbour
  thompsonBonus: readWeight("RECO_WEIGHT_THOMPSON_BONUS", 0.10),          // exploration via UCB/Thompson
  difficultyProgression: readWeight("RECO_WEIGHT_DIFFICULTY_PROGRESSION", 0.08), // learning path next-step boost
  // Cold-start path
  coldRating: readWeight("RECO_COLD_WEIGHT_RATING", 0.55),
  coldPopularity: readWeight("RECO_COLD_WEIGHT_POPULARITY", 0.3),
  coldCtr: readWeight("RECO_COLD_WEIGHT_GLOBAL_CTR", 0.15),
};

type ScoringConfig = typeof SCORING;

type RankingPolicyConfig = {
  maxPerCategory: number;
  maxPerInstructor: number;
  explorationSlots: number;
  maxExposuresPerCourse7d: number;
  suppressionCooldownDays: number;
  hardSuppressDismissals: number;
  hardSuppressIgnoredImpressions: number;
};

type ExperimentConfig = {
  modelVersion: string;
  scoring: ScoringConfig;
  policy: RankingPolicyConfig;
};

type SplitConfig = {
  rules_v2: number;
  rules_v2a: number;
  rules_v2b: number;
};

const BASE_POLICY: RankingPolicyConfig = {
  maxPerCategory: MAX_PER_CATEGORY,
  maxPerInstructor: MAX_PER_INSTRUCTOR,
  explorationSlots: EXPLORATION_SLOTS,
  maxExposuresPerCourse7d: MAX_EXPOSURES_PER_COURSE_7D,
  suppressionCooldownDays: SUPPRESSION_COOLDOWN_DAYS,
  hardSuppressDismissals: HARD_SUPPRESS_DISMISSALS,
  hardSuppressIgnoredImpressions: HARD_SUPPRESS_IGNORED_IMPRESSIONS,
};

const normalizeSplitConfig = (split: SplitConfig): SplitConfig => {
  const raw = {
    rules_v2: Math.max(0, split.rules_v2),
    rules_v2a: Math.max(0, split.rules_v2a),
    rules_v2b: Math.max(0, split.rules_v2b),
  };
  const total = raw.rules_v2 + raw.rules_v2a + raw.rules_v2b;
  if (total <= 0) {
    return { rules_v2: 100, rules_v2a: 0, rules_v2b: 0 };
  }
  return {
    rules_v2: (raw.rules_v2 / total) * 100,
    rules_v2a: (raw.rules_v2a / total) * 100,
    rules_v2b: (raw.rules_v2b / total) * 100,
  };
};

const TRAFFIC_SPLIT = normalizeSplitConfig({
  rules_v2: SPLIT_V2,
  rules_v2a: SPLIT_V2A,
  rules_v2b: SPLIT_V2B,
});

const hashToBucket100 = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 100;
};

const assignAlgoByTrafficSplit = (userId: string | null): { algo: string; bucket: number | null } => {
  if (!userId) {
    return { algo: DEFAULT_ALGO, bucket: null };
  }

  const bucket = hashToBucket100(userId);
  const thresholdV2 = TRAFFIC_SPLIT.rules_v2;
  const thresholdV2A = thresholdV2 + TRAFFIC_SPLIT.rules_v2a;

  if (bucket < thresholdV2) return { algo: "rules_v2", bucket };
  if (bucket < thresholdV2A) return { algo: "rules_v2a", bucket };
  return { algo: "rules_v2b", bucket };
};

const getExperimentConfig = (algoParam: string | null): ExperimentConfig => {
  const requested = (algoParam ?? DEFAULT_ALGO).toLowerCase();
  const scoring: ScoringConfig = { ...SCORING };
  const policy: RankingPolicyConfig = { ...BASE_POLICY };
  let modelVersion = "rules_v2";

  switch (requested) {
    case "rules_v2a":
      modelVersion = "rules_v2a";
      policy.explorationSlots = Math.max(BASE_POLICY.explorationSlots, 2);
      policy.maxPerCategory = Math.max(1, BASE_POLICY.maxPerCategory - 1);
      scoring.globalPopularity = scoring.globalPopularity + 0.03;
      scoring.categoryAffinity = Math.max(0, scoring.categoryAffinity - 0.03);
      break;
    case "rules_v2b":
      modelVersion = "rules_v2b";
      policy.suppressionCooldownDays = BASE_POLICY.suppressionCooldownDays + 2;
      policy.hardSuppressDismissals = Math.max(2, BASE_POLICY.hardSuppressDismissals - 1);
      scoring.dismissPenalty = scoring.dismissPenalty + 0.2;
      scoring.ignorePenalty = scoring.ignorePenalty + 0.15;
      break;
    default:
      modelVersion = "rules_v2";
      break;
  }

  return { modelVersion, scoring, policy };
};

const aggregateBehavior = (
  events: RecommendationEvent[] | null | undefined
): Map<string, BehaviorAggregate> => {
  const map = new Map<string, BehaviorAggregate>();
  const now = Date.now();

  for (const ev of events ?? []) {
    if (!ev.course_id) continue;

    const rec = map.get(ev.course_id) ?? {
      impressions: 0,
      recentImpressions7d: 0,
      positive: 0,
      recency: 0,
      dismissals: 0,
      lastEventTs: 0,
      lastImpressionTs: 0,
      lastPositiveTs: 0,
    };

    const type = (ev.event_type ?? "").toLowerCase();
    if (type === "impression" || type === "view") {
      rec.impressions += 1;
    }
    // Weight positive events by signal strength instead of flat +1.
    // complete=5, enroll=4, start=3, save/wishlist=2, click=1.
    // These weights feed user_ctr and user_recency in the score_breakdown
    // which the ML re-ranker then learns from — so richer signals here
    // directly improve ML model quality over time.
    const POSITIVE_WEIGHTS: Record<string, number> = {
      complete: 5,
      enroll: 4,
      start: 3,
      save: 2,
      wishlist: 2,
      click: 1,
    };
    const positiveWeight = POSITIVE_WEIGHTS[type] ?? 0;
    if (positiveWeight > 0) {
      rec.positive += positiveWeight;
    }
    if (type === "dismiss") rec.dismissals += 1;

    if (ev.timestamp) {
      const ts = new Date(ev.timestamp).getTime();
      const ageMs = now - ts;
      rec.recency += Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 7));
      if (
        ageMs <= 7 * 24 * 60 * 60 * 1000 &&
        (type === "impression" || type === "view")
      ) {
        rec.recentImpressions7d += 1;
      }
      rec.lastEventTs = Math.max(rec.lastEventTs, ts);
      if (type === "impression" || type === "view") {
        rec.lastImpressionTs = Math.max(rec.lastImpressionTs, ts);
      }
      if (
        type === "click" ||
        type === "start" ||
        type === "save" ||
        type === "complete" ||
        type === "enroll" ||
        type === "wishlist"
      ) {
        rec.lastPositiveTs = Math.max(rec.lastPositiveTs, ts);
      }
    }

    map.set(ev.course_id, rec);
  }

  return map;
};

const normalizeMapByMax = (source: Map<string, number>): Map<string, number> => {
  const out = new Map<string, number>();
  let max = 0;
  for (const value of source.values()) {
    if (value > max) max = value;
  }
  if (max <= 0) return out;
  for (const [key, value] of source.entries()) {
    out.set(key, value / max);
  }
  return out;
};

// ── Item-based CF helpers ─────────────────────────────────────────────────────
// Builds a lightweight feature vector for a course used to compute similarity
// between a candidate and courses the user has already enrolled in / interacted with.
type CourseVector = { category: string; instructor: string; tags: Set<string> };

const buildCourseVector = (course: {
  category_id?: string | null;
  instructor_id?: string | null;
  tags?: string[] | null;
  category?: CourseCategory | null;
}): CourseVector => ({
  category: course.category?.name ?? course.category_id ?? "uncategorized",
  instructor: course.instructor_id ?? "unknown",
  tags: new Set(
    (Array.isArray(course.tags) ? course.tags : [])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
  ),
});

// Returns a 0–1 similarity score between a candidate and the user's enrolled
// course vectors using Jaccard tag similarity + category/instructor match.
// Takes the max similarity across all enrolled courses (nearest-neighbour CF).
const computeItemSimilarity = (
  candidate: CourseVector,
  enrolledVectors: CourseVector[]
): number => {
  if (enrolledVectors.length === 0) return 0;
  let maxSim = 0;
  for (const enrolled of enrolledVectors) {
    const allTags = new Set([...candidate.tags, ...enrolled.tags]);
    const intersection = [...candidate.tags].filter((t) => enrolled.tags.has(t)).length;
    const tagJaccard = allTags.size > 0 ? intersection / allTags.size : 0;
    const categoryMatch = candidate.category === enrolled.category ? 1 : 0;
    const instructorMatch =
      candidate.instructor === enrolled.instructor &&
      candidate.instructor !== "unknown" ? 0.5 : 0;
    // Weighted: tags 50%, category 35%, instructor 15%
    const sim = tagJaccard * 0.5 + categoryMatch * 0.35 + instructorMatch * 0.15;
    if (sim > maxSim) maxSim = sim;
  }
  return clamp(maxSim, 0, 1);
};

const pickPrimaryReasonTag = (
  contributions: Array<{ key: string; value: number }>
): string => {
  const ranked = contributions
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  return ranked[0]?.key ?? "recommended_for_you";
};

const applyCategoryDiversity = <
  T extends { id: string; category_key: string; instructor_key: string; score: number }
>(
  sortedItems: T[],
  targetCount: number,
  maxPerCategory: number,
  maxPerInstructor: number
): T[] => {
  const selected: T[] = [];
  const perCategoryCount = new Map<string, number>();
  const perInstructorCount = new Map<string, number>();

  for (const item of sortedItems) {
    if (selected.length >= targetCount) break;
    const key = item.category_key || "uncategorized";
    const instructorKey = item.instructor_key || "unknown_instructor";
    const count = perCategoryCount.get(key) ?? 0;
    const instructorCount = perInstructorCount.get(instructorKey) ?? 0;
    if (count >= maxPerCategory) continue;
    if (instructorCount >= maxPerInstructor) continue;
    selected.push(item);
    perCategoryCount.set(key, count + 1);
    perInstructorCount.set(instructorKey, instructorCount + 1);
  }

  if (selected.length < targetCount) {
    for (const item of sortedItems) {
      if (selected.length >= targetCount) break;
      if (selected.some((s) => s.id === item.id)) continue;
      selected.push(item);
    }
  }

  return selected;
};

const rerankWithConstraints = <
  T extends {
    id: string;
    score: number;
    category_key: string;
    instructor_key: string;
    is_novel?: boolean;
    tags?: string[];
  }
>(
  items: T[],
  targetCount: number,
  maxPerCategory: number,
  maxPerInstructor: number,
  noveltyMinSlots: number
): T[] => {
  const selected: T[] = [];
  const pool = [...items];
  const perCategory = new Map<string, number>();
  const perInstructor = new Map<string, number>();
  let noveltyCount = 0;

  while (selected.length < targetCount && pool.length > 0) {
    let bestIndex = -1;
    let bestAdjusted = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      const categoryKey = item.category_key || "uncategorized";
      const instructorKey = item.instructor_key || "unknown_instructor";
      const cCount = perCategory.get(categoryKey) ?? 0;
      const iCount = perInstructor.get(instructorKey) ?? 0;
      if (cCount >= maxPerCategory || iCount >= maxPerInstructor) continue;

      const selectedTagSet = new Set(
        selected.flatMap((entry) => (entry.tags ?? []).map(normalizeTag))
      );
      const tagOverlap = (item.tags ?? [])
        .map(normalizeTag)
        .filter((tag) => selectedTagSet.has(tag)).length;

      const noveltyNeed = Math.max(0, noveltyMinSlots - noveltyCount);
      const noveltyBonus =
        noveltyNeed > 0 && item.is_novel ? Math.max(0, RERANK_NOVELTY_BONUS) : 0;

      const adjusted =
        item.score -
        cCount * Math.max(0, RERANK_CATEGORY_PENALTY) -
        iCount * Math.max(0, RERANK_INSTRUCTOR_PENALTY) -
        tagOverlap * Math.max(0, RERANK_TAG_OVERLAP_PENALTY) +
        noveltyBonus;

      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) break;
    const picked = pool.splice(bestIndex, 1)[0];
    selected.push(picked);
    perCategory.set(
      picked.category_key || "uncategorized",
      (perCategory.get(picked.category_key || "uncategorized") ?? 0) + 1
    );
    perInstructor.set(
      picked.instructor_key || "unknown_instructor",
      (perInstructor.get(picked.instructor_key || "unknown_instructor") ?? 0) + 1
    );
    if (picked.is_novel) noveltyCount += 1;
  }

  if (selected.length < targetCount) {
    for (const item of items) {
      if (selected.length >= targetCount) break;
      if (selected.some((s) => s.id === item.id)) continue;
      selected.push(item);
    }
  }

  return selected;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Server-side ML redirect ────────────────────────────────────────────────
  // If RECO_SPLIT_ML > 0 and this userId hashes into the ML bucket, forward
  // the entire request to getMLRecommendations. The ML function calls back into
  // this function internally to get scored candidates, so there's no recursion.
  // We skip redirect when the caller is getMLRecommendations itself (detected
  // via the _mlInternal flag) to prevent infinite loops.
  if (SPLIT_ML > 0) {
    const earlyUrl = new URL(req.url);
    const isInternalCall = earlyUrl.searchParams.get("_mlInternal") === "1";
    if (!isInternalCall) {
      const earlyUserId = earlyUrl.searchParams.get("userId");
      if (earlyUserId) {
        let hash = 2166136261;
        for (let i = 0; i < earlyUserId.length; i++) {
          hash ^= earlyUserId.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
        const bucket = Math.abs(hash >>> 0) % 100;
        if (bucket < SPLIT_ML) {
          const mlUrl = new URL(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/getMLRecommendations`
          );
          // Forward all original query params
          earlyUrl.searchParams.forEach((v, k) => mlUrl.searchParams.set(k, v));
          const mlResp = await fetch(mlUrl.toString(), {
            headers: {
              authorization: req.headers.get("authorization") ?? "",
              apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            },
          });
          // Return ML response directly, preserving CORS headers
          const mlBody = await mlResp.text();
          return new Response(mlBody, {
            status: mlResp.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const algo = url.searchParams.get("algo");
    const learningGoal = url.searchParams.get("learningGoal");
    const placement = url.searchParams.get("placement") ?? "home"; // new: track which UI surface requested recommendations
    const localHourParam = Number(url.searchParams.get("localHour"));
    const dayOfWeekParam = Number(url.searchParams.get("dayOfWeek"));
    const now = new Date();
    const localHour = Number.isFinite(localHourParam)
      ? clampInt(localHourParam, 0, 23)
      : now.getUTCHours();
    const dayOfWeek = Number.isFinite(dayOfWeekParam)
      ? clampInt(dayOfWeekParam, 0, 6)
      : now.getUTCDay();
    // _maxResults: lets getMLRecommendations request a larger candidate pool
    // for re-ranking. Capped at MAX_CANDIDATE_POOL so this can't be abused.
    const maxResultsParam = Number(url.searchParams.get("_maxResults"));
    const effectiveMaxResults =
      Number.isFinite(maxResultsParam) && maxResultsParam > MAX_RESULTS
        ? clampInt(maxResultsParam, MAX_RESULTS, MAX_CANDIDATE_POOL)
        : MAX_RESULTS;
    const contextFactors = getContextFactors(learningGoal, localHour, dayOfWeek);
    const assigned = assignAlgoByTrafficSplit(userId);
    const selectedAlgo = (algo ?? assigned.algo).toLowerCase();
    const assignmentSource = algo ? "query_param" : "traffic_split";
    const experiment = getExperimentConfig(selectedAlgo);
    const scoring = experiment.scoring;
    const policy = experiment.policy;
    const requestId = crypto.randomUUID();

const courseSelect = `
      id,
      title,
      description,
      rating,
      total_ratings,
      duration_hours,
      thumbnail_url,
      created_at,
      updated_at,
      tags,
      instructor_id,
      category_id,
      category:categories (
        name,
        color
      )
    `;

    /* ------------------------------------------------------------------ */
    /* 1️⃣ Fetch base candidate pool (top-rated) */
    /* ------------------------------------------------------------------ */
    const { data: courses, error: coursesErr } = await supabase
      .from("courses")
      .select(courseSelect)
      .eq("is_published", true)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(MAX_CANDIDATE_POOL); // was MAX_CANDIDATES (20) — too small when pool target is MAX_CANDIDATE_POOL (60)

    if (coursesErr) throw coursesErr;

    /* ------------------------------------------------------------------ */
    /* 2️⃣ Exclude completed courses (if user provided) */
    /* ------------------------------------------------------------------ */
    let excluded = new Set<string>();
    const userEnrolledCourseIds: string[] = [];

    if (userId) {
      const { data: enrollments, error: enrollErr } = await supabase
        .from("course_enrollments")
        .select("course_id, is_completed")
        .eq("user_id", userId);

      if (enrollErr) throw enrollErr;

      for (const enrollment of enrollments ?? []) {
        if (enrollment.course_id) {
          userEnrolledCourseIds.push(enrollment.course_id);
        }
      }

      excluded = new Set(
        (enrollments ?? [])
          .filter((e) => e.is_completed)
          .map((e) => e.course_id)
      );
    }

    const topRatedCandidates = ((courses ?? []) as CourseCandidate[]).filter(
      (c) => !excluded.has(c.id)
    );
    let personalizedCategoryCandidates: CourseCandidate[] = [];
    let longTailCandidates: CourseCandidate[] = [];

    if (userId && userEnrolledCourseIds.length > 0) {
      const uniqueUserCourseIds = Array.from(new Set(userEnrolledCourseIds));
      const { data: enrolledCategoryRows, error: enrolledCategoryErr } = await supabase
        .from("courses")
        .select("category_id")
        .in("id", uniqueUserCourseIds);
      if (enrolledCategoryErr) throw enrolledCategoryErr;

      const enrolledCategoryIds = Array.from(
        new Set(
          (enrolledCategoryRows ?? [])
            .map((row) => row.category_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
        )
      );

      if (enrolledCategoryIds.length > 0) {
        const { data: categoryPool, error: categoryPoolErr } = await supabase
          .from("courses")
          .select(courseSelect)
          .eq("is_published", true)
          .in("category_id", enrolledCategoryIds)
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(CANDIDATE_CATEGORY_POOL_LIMIT);
        if (categoryPoolErr) throw categoryPoolErr;
        personalizedCategoryCandidates = ((categoryPool ?? []) as CourseCandidate[]).filter(
          (c) => !excluded.has(c.id)
        );
      }
    }

    const { data: longTailPool, error: longTailErr } = await supabase
      .from("courses")
      .select(courseSelect)
      .eq("is_published", true)
      .order("rating", { ascending: true, nullsFirst: true })
      .limit(CANDIDATE_LONG_TAIL_POOL_LIMIT);
    if (longTailErr) throw longTailErr;
    longTailCandidates = ((longTailPool ?? []) as CourseCandidate[]).filter(
      (c) => !excluded.has(c.id)
    );

    const mergedCandidates = new Map<string, CourseCandidate>();
    for (const course of topRatedCandidates) mergedCandidates.set(course.id, course);
    for (const course of personalizedCategoryCandidates) mergedCandidates.set(course.id, course);
    for (const course of longTailCandidates) mergedCandidates.set(course.id, course);
    const candidates = Array.from(mergedCandidates.values()).slice(
      0,
      Math.max(MAX_CANDIDATES, MAX_CANDIDATE_POOL)
    );
    const courseIds = candidates.map((c) => c.id);

    if (courseIds.length === 0) {
      const explorationSlots = clampInt(
        policy.explorationSlots,
        0,
        Math.max(0, MAX_RESULTS - 1)
      );
      const meta = {
        model_version: experiment.modelVersion,
        request_id: requestId,
        assignment_source: assignmentSource,
        assigned_algo: selectedAlgo,
        traffic_bucket: assigned.bucket,
        cold_start: true,
        lookback_days: EVENT_LOOKBACK_DAYS,
        weights: scoring,
        ranking_policy: {
          max_candidate_pool: MAX_CANDIDATE_POOL,
          candidate_category_pool_limit: CANDIDATE_CATEGORY_POOL_LIMIT,
          candidate_long_tail_pool_limit: CANDIDATE_LONG_TAIL_POOL_LIMIT,
          min_score_floor: MIN_SCORE_FLOOR,
          profile_decay_days: PROFILE_DECAY_DAYS,
          novelty_min_slots: NOVELTY_MIN_SLOTS,
          session_gap_hours: SESSION_GAP_HOURS,
          freshness_half_life_days: FRESHNESS_HALF_LIFE_DAYS,
          quality_min_rating: QUALITY_MIN_RATING,
          quality_low_rating_penalty: QUALITY_LOW_RATING_PENALTY,
          rerank_category_penalty: RERANK_CATEGORY_PENALTY,
          rerank_instructor_penalty: RERANK_INSTRUCTOR_PENALTY,
          rerank_tag_overlap_penalty: RERANK_TAG_OVERLAP_PENALTY,
          rerank_novelty_bonus: RERANK_NOVELTY_BONUS,
          seen_filter_window_hours: SEEN_FILTER_WINDOW_HOURS,
          seen_filter_min_impressions: SEEN_FILTER_MIN_IMPRESSIONS,
          session_window_hours: SESSION_WINDOW_HOURS,
          session_intent_boost: SESSION_INTENT_BOOST,
          instructor_fatigue_window_hours: INSTRUCTOR_FATIGUE_WINDOW_HOURS,
          max_exposures_per_instructor_window: MAX_EXPOSURES_PER_INSTRUCTOR_WINDOW,
          instructor_fatigue_penalty: INSTRUCTOR_FATIGUE_PENALTY,
          max_per_category: policy.maxPerCategory,
          max_per_instructor: policy.maxPerInstructor,
          exploration_slots: explorationSlots,
          max_exposures_per_course_7d: policy.maxExposuresPerCourse7d,
          suppression_cooldown_days: policy.suppressionCooldownDays,
        },
        context: {
          learning_goal: learningGoal,
          local_hour: localHour,
          day_of_week: dayOfWeek,
          factors: contextFactors,
        },
      };
      return new Response(
        JSON.stringify({
          success: true,
          data: { recommendations: [], meta },
          recommendations: [],
          meta,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /* ------------------------------------------------------------------ */
    /* 2️⃣b Fetch course content counts for candidates */
    /* ------------------------------------------------------------------ */
    const sectionCountsMap = new Map<string, number>();
    const videoCountsMap = new Map<string, number>();
    const quizCountsMap = new Map<string, number>();

    if (courseIds.length > 0) {
      const [
        { data: sectionCountsData },
        { data: videoCountsData },
        { data: quizCountsData },
      ] = await Promise.all([
        supabase.rpc("get_section_counts_by_course", { course_ids: courseIds }),
        supabase.rpc("get_video_counts_by_course", { course_ids: courseIds }),
        supabase.rpc("get_quiz_counts_by_course", { course_ids: courseIds }),
      ]);

      for (const row of sectionCountsData ?? []) {
        sectionCountsMap.set(row.course_id, row.count ?? 0);
      }
      for (const row of videoCountsData ?? []) {
        videoCountsMap.set(row.course_id, row.count ?? 0);
      }
      for (const row of quizCountsData ?? []) {
        quizCountsMap.set(row.course_id, row.count ?? 0);
      }
    }

    /* ------------------------------------------------------------------ */
    /* 3️⃣ Fetch recent recommendation events */
    /* ------------------------------------------------------------------ */
    const since = new Date(
      Date.now() - EVENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: globalEvents, error: globalEventsErr } = await supabase
      .from("recommendation_events")
      .select("course_id, event_type, timestamp")
      .gte("timestamp", since)
      .in("course_id", courseIds);
    if (globalEventsErr) throw globalEventsErr;

    let userEventsQuery = supabase
      .from("recommendation_events")
      .select("course_id, event_type, timestamp")
      .gte("timestamp", since)
      .in("course_id", courseIds);

    let userEvents: RecommendationEvent[] = [];
    if (userId) {
      const { data, error } = await userEventsQuery.eq("user_id", userId);
      if (error) throw error;
      userEvents = data ?? [];
    }

    const nowTs = Date.now();
    const seenFilterWindowMs = SEEN_FILTER_WINDOW_HOURS * 60 * 60 * 1000;
    const sessionWindowMs = SESSION_WINDOW_HOURS * 60 * 60 * 1000;
    const sessionGapMs = Math.max(0.25, SESSION_GAP_HOURS) * 60 * 60 * 1000;
    const instructorFatigueWindowMs = INSTRUCTOR_FATIGUE_WINDOW_HOURS * 60 * 60 * 1000;
    const candidateById = new Map<string, CourseCandidate>(
      candidates.map((course) => [course.id, course])
    );
    const recentSeenImpressionCounts = new Map<string, number>();
    const recentSessionCategoryRaw = new Map<string, number>();
    const recentInstructorImpressions = new Map<string, number>();
    const recentInstructorPositives = new Map<string, number>();
    const sortedUserEvents = [...userEvents].sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
    const sessionEvents: RecommendationEvent[] = [];
    let prevTs: number | null = null;
    for (const ev of sortedUserEvents) {
      if (!ev.timestamp) continue;
      const ts = new Date(ev.timestamp).getTime();
      if (!Number.isFinite(ts) || ts <= 0) continue;
      if (nowTs - ts > sessionWindowMs) break;
      if (prevTs !== null && prevTs - ts > sessionGapMs) break;
      sessionEvents.push(ev);
      prevTs = ts;
    }
    const sessionEventKeys = new Set(
      sessionEvents.map((ev) => `${ev.course_id ?? ""}|${ev.event_type ?? ""}|${ev.timestamp ?? ""}`)
    );

    for (const ev of userEvents) {
      if (!ev.course_id || !ev.timestamp) continue;
      const ts = new Date(ev.timestamp).getTime();
      if (!Number.isFinite(ts)) continue;
      const ageMs = nowTs - ts;
      if (ageMs < 0) continue;
      const type = (ev.event_type ?? "").toLowerCase();

      if (
        ageMs <= seenFilterWindowMs &&
        (type === "impression" || type === "view")
      ) {
        recentSeenImpressionCounts.set(
          ev.course_id,
          (recentSeenImpressionCounts.get(ev.course_id) ?? 0) + 1
        );
      }

      const inCurrentSession = sessionEventKeys.has(
        `${ev.course_id ?? ""}|${ev.event_type ?? ""}|${ev.timestamp ?? ""}`
      );
      if (
        inCurrentSession &&
        (type === "click" || type === "save" || type === "start" || type === "complete" || type === "enroll" || type === "wishlist")
      ) {
        const course = candidateById.get(ev.course_id);
        if (!course) continue;
        const categoryKey =
          course.category?.name ?? course.category_id ?? "uncategorized";
        const weight =
          type === "complete" ? 1.5 : type === "start" ? 1.25 : 1;
        recentSessionCategoryRaw.set(
          categoryKey,
          (recentSessionCategoryRaw.get(categoryKey) ?? 0) + weight
        );
      }

      if (ageMs <= instructorFatigueWindowMs) {
        const course = candidateById.get(ev.course_id);
        if (!course) continue;
        const instructorKey = course.instructor_id ?? "unknown_instructor";
        if (type === "impression" || type === "view") {
          recentInstructorImpressions.set(
            instructorKey,
            (recentInstructorImpressions.get(instructorKey) ?? 0) + 1
          );
        }
        if (type === "click" || type === "save" || type === "start" || type === "complete" || type === "enroll" || type === "wishlist") {
          recentInstructorPositives.set(
            instructorKey,
            (recentInstructorPositives.get(instructorKey) ?? 0) + 1
          );
        }
      }
    }

    /* ------------------------------------------------------------------ */
    /* 4️⃣ Aggregate user + global behavior signals */
    /* ------------------------------------------------------------------ */
    const globalBehavior = aggregateBehavior(globalEvents as RecommendationEvent[]);
    const userBehavior = aggregateBehavior(userEvents as RecommendationEvent[]);

    const popularityRaw = new Map<string, number>();
    for (const [courseId, rec] of globalBehavior.entries()) {
      const score = rec.positive * 1.2 + rec.impressions * 0.25 + rec.recency;
      popularityRaw.set(courseId, score);
    }
    const popularityNorm = normalizeMapByMax(popularityRaw);

    const categoryAffinityRaw = new Map<string, number>();
    const instructorAffinityRaw = new Map<string, number>();
    const tagAffinityRaw = new Map<string, number>();
    const difficultyAffinityRaw = new Map<DifficultyLevel, number>();
    const uniqueUserCourseIds = Array.from(new Set(userEnrolledCourseIds));
    const enrolledVectors: CourseVector[] = []; // for item-based CF similarity
    const enrolledVectorIds = new Set<string>(); // dedupe by course id

    if (userId && uniqueUserCourseIds.length > 0) {
      const { data: enrolledCourses, error: enrolledCoursesErr } = await supabase
        .from("courses")
        .select("id, category_id, instructor_id, tags, category:categories(name)")
        .in("id", uniqueUserCourseIds);
      if (enrolledCoursesErr) throw enrolledCoursesErr;

      for (const course of enrolledCourses ?? []) {
        const categoryKey =
          course.category?.name ?? course.category_id ?? "uncategorized";
        categoryAffinityRaw.set(
          categoryKey,
          (categoryAffinityRaw.get(categoryKey) ?? 0) + 1
        );
        const instructorKey = course.instructor_id ?? "unknown_instructor";
        instructorAffinityRaw.set(
          instructorKey,
          (instructorAffinityRaw.get(instructorKey) ?? 0) + 1
        );
        const tags = getCourseTags(course as CourseCandidate);
        for (const tag of tags) {
          tagAffinityRaw.set(tag, (tagAffinityRaw.get(tag) ?? 0) + 1);
        }
        const difficulty = inferDifficultyLevel(course as CourseCandidate);
        difficultyAffinityRaw.set(
          difficulty,
          (difficultyAffinityRaw.get(difficulty) ?? 0) + 1
        );
        // Build vector for item-based CF
        if (!enrolledVectorIds.has(course.id)) {
          enrolledVectorIds.add(course.id);
          enrolledVectors.push(buildCourseVector(course));
        }
      }
    }

    for (const ev of userEvents ?? []) {
      if (!ev.course_id) continue;
      const course = candidates.find((item) => item.id === ev.course_id);
      if (!course) continue;

      const categoryKey =
        course.category?.name ?? course.category_id ?? "uncategorized";
      const type = (ev.event_type ?? "").toLowerCase();
      const ts = ev.timestamp ? new Date(ev.timestamp).getTime() : 0;
      const ageMs = ts > 0 ? Math.max(0, nowTs - ts) : 0;
      const decay = Math.exp(-ageMs / (1000 * 60 * 60 * 24 * PROFILE_DECAY_DAYS));
      const boost =
        type === "click" || type === "start" || type === "save" || type === "complete" || type === "enroll" || type === "wishlist"
          ? 2 * decay
          : type === "impression" || type === "view"
            ? 0.5 * decay
            : 0;
      if (boost > 0) {
        categoryAffinityRaw.set(
          categoryKey,
          (categoryAffinityRaw.get(categoryKey) ?? 0) + boost
        );
        const instructorKey = course.instructor_id ?? "unknown_instructor";
        instructorAffinityRaw.set(
          instructorKey,
          (instructorAffinityRaw.get(instructorKey) ?? 0) + boost
        );
        const tags = getCourseTags(course);
        for (const tag of tags) {
          tagAffinityRaw.set(tag, (tagAffinityRaw.get(tag) ?? 0) + boost);
        }
        const difficulty = inferDifficultyLevel(course);
        difficultyAffinityRaw.set(
          difficulty,
          (difficultyAffinityRaw.get(difficulty) ?? 0) + boost
        );
        // Extend CF vectors with strongly interacted courses (wishlist, click, enroll etc.)
        // so content_similarity_boost reflects full preference history, not just enrollments.
        // Dedupe by course id — correct, unlike tag-set-size comparison.
        if (
          type === "click" || type === "start" || type === "save" ||
          type === "complete" || type === "enroll" || type === "wishlist"
        ) {
          if (!enrolledVectorIds.has(course.id)) {
            enrolledVectorIds.add(course.id);
            enrolledVectors.push(buildCourseVector(course));
          }
        }
      }
    }
    const categoryAffinityNorm = normalizeMapByMax(categoryAffinityRaw);
    const instructorAffinityNorm = normalizeMapByMax(instructorAffinityRaw);
    const tagAffinityNorm = normalizeMapByMax(tagAffinityRaw);
    const difficultyPreference =
      Array.from(difficultyAffinityRaw.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "unknown";
    const sessionCategoryNorm = normalizeMapByMax(recentSessionCategoryRaw);

    // ── Learning path: target the next difficulty step up ─────────────────────
    // If the user's dominant completed-course level is beginner, we want to
    // boost intermediate candidates; intermediate → advanced. This is applied
    // as a separate difficultyProgression score alongside difficultyMatch so
    // the model can learn the appropriate weight for both signals.
    const DIFFICULTY_LADDER: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];
    const userLadderIdx = DIFFICULTY_LADDER.indexOf(difficultyPreference as DifficultyLevel);
    // targetLevel is one rung above the user's current dominant level (capped at advanced)
    const targetProgressionLevel: DifficultyLevel | null =
      userLadderIdx >= 0
        ? DIFFICULTY_LADDER[Math.min(userLadderIdx + 1, DIFFICULTY_LADDER.length - 1)]
        : null;

    // ── Stale profile: detect returning users ─────────────────────────────────
    // Find the most recent positive interaction across all courses.
    let lastActiveTs = 0;
    for (const [, beh] of userBehavior.entries()) {
      if (beh.lastPositiveTs > lastActiveTs) lastActiveTs = beh.lastPositiveTs;
    }
    const daysSinceActive =
      lastActiveTs > 0 ? (nowTs - lastActiveTs) / (1000 * 60 * 60 * 24) : Infinity;
    const isReturningUser = daysSinceActive > STALE_PROFILE_DAYS;
    // Linearly decay personalization influence from 1.0 at threshold to 0.2 at 120 days
    const affinityDecayMultiplier = isReturningUser
      ? clamp(1.0 - (daysSinceActive - STALE_PROFILE_DAYS) / 90, 0.2, 1.0)
      : 1.0;
    // Mirror bonus: returning users get a proportional exploration boost
    const returningExplorationBonus = isReturningUser
      ? clamp((daysSinceActive - STALE_PROFILE_DAYS) / 90 * 0.5, 0, 0.5)
      : 0;

    /* ------------------------------------------------------------------ */
    /* 5️⃣ Compute behavior scores and cold-start state */
    /* ------------------------------------------------------------------ */
    const userBehScores = new Map<
      string,
      {
        ctrScore: number;
        ignoredPenalty: number;
        recentScore: number;
        dismissPenalty: number;
        suppressionPenalty: number;
        overexposedPenalty: number;
        instructorFatiguePenalty: number;
        hardSuppressed: boolean;
      }
    >();

    const suppressionWindowMs = policy.suppressionCooldownDays * 24 * 60 * 60 * 1000;

    for (const [cid, rec] of userBehavior.entries()) {
      const ctr = (rec.positive + 1) / (rec.impressions + 3);
      const ctrScore = ctr * 5;

      const ignoredPenalty =
        rec.impressions > 0 && rec.positive === 0
          ? Math.min(1.5, rec.impressions * 0.1)
          : 0;

      const dismissPenalty = Math.min(2, rec.dismissals * 0.4);
      const recentlyShownWithoutPositive =
        rec.impressions >= 2 &&
        rec.lastImpressionTs > 0 &&
        rec.lastImpressionTs > rec.lastPositiveTs &&
        nowTs - rec.lastImpressionTs < suppressionWindowMs;

      const repeatedIgnored =
        rec.impressions >= policy.hardSuppressIgnoredImpressions && rec.positive === 0;
      const repeatedDismissed = rec.dismissals >= policy.hardSuppressDismissals;
      const overexposed = rec.recentImpressions7d >= policy.maxExposuresPerCourse7d;
      const hardSuppressed =
        recentlyShownWithoutPositive || repeatedIgnored || repeatedDismissed || overexposed;

      const suppressionPenalty =
        (recentlyShownWithoutPositive ? 2.5 : 0) +
        (repeatedIgnored ? 2.5 : 0) +
        (repeatedDismissed ? 3 : 0);
      const overexposedPenalty = overexposed ? 2.5 : 0;

      userBehScores.set(cid, {
        ctrScore,
        ignoredPenalty,
        recentScore: Math.min(5, rec.recency),
        dismissPenalty,
        suppressionPenalty: suppressionPenalty + overexposedPenalty,
        overexposedPenalty,
        instructorFatiguePenalty: 0,
        hardSuppressed,
      });
    }

    const globalCtrNorm = new Map<string, number>();
    for (const [cid, rec] of globalBehavior.entries()) {
      const ctr = (rec.positive + 1) / (rec.impressions + 3);
      globalCtrNorm.set(cid, ctr);
    }

    // ── Thompson Sampling bonus (UCB approximation) ───────────────────────────
    // For each course, sample from its estimated Beta(alpha, beta) distribution.
    // High-uncertainty courses (few impressions) get an exploration bonus so the
    // system doesn't permanently under-serve items that haven't been tried yet.
    // Uses the closed-form UCB approximation: mean + sqrt(variance) instead of
    // drawing a random sample, giving deterministic scores per request.
    const thompsonBonusMap = new Map<string, number>();
    for (const [courseId, rec] of globalBehavior.entries()) {
      const n = rec.impressions + 3;              // smoothed denominator
      // rec.positive is now a weighted sum (complete=5, enroll=4, …) so it can
      // exceed n. Clamp ctr to [0,1] before computing variance to guarantee
      // variance >= 0 and prevent sqrt(NaN) propagating into scores.
      const ctr = clamp((rec.positive + 1) / n, 0, 1);
      const variance = clamp((ctr * (1 - ctr)) / n, 0, 0.25); // 0.25 = max of Beta variance
      thompsonBonusMap.set(courseId, clamp(ctr + Math.sqrt(variance), 0, 1));
    }
    // Default for courses with no impression history: moderate CTR + high variance
    // → full exploration bonus (new courses surface naturally without special-casing)
    const THOMPSON_DEFAULT = (() => {
      const ctr = 1 / 3;
      const variance = (ctr * (1 - ctr)) / 3;
      return clamp(ctr + Math.sqrt(variance), 0, 1);
    })();

    // ── Semantic embedding similarity (pgvector) ─────────────────────────────
    // Replaces Jaccard tag overlap in content_similarity_boost when embeddings
    // are available. Set RECO_EMBEDDINGS_ENABLED=true after running embed_courses.py.
    const embeddingSimilarityMap = new Map<string, number>();
    if (EMBEDDINGS_ENABLED && uniqueUserCourseIds.length > 0 && courseIds.length > 0) {
      try {
        const { data: simRows, error: simErr } = await (supabase as any).rpc(
          "get_embedding_similarity",
          { enrolled_ids: uniqueUserCourseIds, candidate_ids: courseIds }
        );
        if (!simErr && Array.isArray(simRows)) {
          for (const row of simRows) {
            embeddingSimilarityMap.set(row.course_id, clamp(row.similarity ?? 0, 0, 1));
          }
        }
      } catch {
        // Silently fall back to Jaccard if RPC errors (e.g. no embeddings yet)
      }
    }

    const positiveEventTypes = new Set([
      "impression",
      "view",
      "click",
      "save",
      "start",
      "complete",
      "enroll",
      "wishlist", // fix: was missing
    ]);
    const meaningfulUserEventCount = userEvents.reduce((count, ev) => {
      const type = (ev.event_type ?? "").toLowerCase();
      return count + (positiveEventTypes.has(type) ? 1 : 0);
    }, 0);
    const hasBehavioralSignal =
      meaningfulUserEventCount >= Math.max(1, MIN_USER_EVENTS_FOR_PERSONALIZATION);

    const isColdStart =
      !userId ||
      (userEnrolledCourseIds.length === 0 && !hasBehavioralSignal);
    const hasNoBehavioralProfile =
      userEnrolledCourseIds.length === 0 &&
      !hasBehavioralSignal;
    const shouldApplyMinFloor = isColdStart || hasNoBehavioralProfile;

    const seenFilterMinImpressions = Math.max(1, SEEN_FILTER_MIN_IMPRESSIONS);
    const seenFilteredCandidates =
      userId && seenFilterWindowMs > 0
        ? candidates.filter((course) => {
            const recentSeen = recentSeenImpressionCounts.get(course.id) ?? 0;
            if (recentSeen < seenFilterMinImpressions) return true;
            const behavior = userBehavior.get(course.id);
            const hasPositiveEngagement = (behavior?.positive ?? 0) > 0;
            return hasPositiveEngagement;
          })
        : candidates;
    const candidatePool =
      seenFilteredCandidates.length > 0 ? seenFilteredCandidates : candidates;
    const enrolledIdSet = new Set(userEnrolledCourseIds);

    /* ------------------------------------------------------------------ */
    /* 6️⃣ Blend final recommendation score (0–10) + explanation tags */
    /* ------------------------------------------------------------------ */
    const blended = candidatePool.map((course) => {
      const userBeh =
        userBehScores.get(course.id) ?? {
          ctrScore: 0,
          ignoredPenalty: 0,
          recentScore: 0,
          dismissPenalty: 0,
          suppressionPenalty: 0,
          overexposedPenalty: 0,
          instructorFatiguePenalty: 0,
          hardSuppressed: false,
        };

      const baseRating = Number(course.rating) || 0;
      const ratingNorm = clamp(baseRating / 5, 0, 1);
      const totalRatings = Number(course.total_ratings ?? 0);
      const popularity = clamp(popularityNorm.get(course.id) ?? 0, 0, 1);
      const globalCtr = clamp(globalCtrNorm.get(course.id) ?? 0, 0, 1);
      const categoryKey =
        course.category?.name ?? course.category_id ?? "uncategorized";

      // Apply stale-profile affinity decay so returning users get more exploration
      // and less "more of the same" from a taste profile that may be months out of date.
      const categoryAffinity = clamp(
        (categoryAffinityNorm.get(categoryKey) ?? 0) * affinityDecayMultiplier, 0, 1
      );
      const instructorAffinity = clamp(
        (instructorAffinityNorm.get(course.instructor_id ?? "unknown_instructor") ?? 0) * affinityDecayMultiplier,
        0, 1
      );
      const courseTags = getCourseTags(course);
      const tagAffinity =
        courseTags.length > 0
          ? clamp(
              courseTags.reduce((acc, tag) => Math.max(acc, tagAffinityNorm.get(tag) ?? 0), 0) *
                affinityDecayMultiplier,
              0, 1
            )
          : 0;

      // Content similarity: use pgvector cosine similarity when embeddings are
      // available, fall back to Jaccard tag overlap otherwise.
      const candidateVector = buildCourseVector(course);
      const contentSimilarityBoost = embeddingSimilarityMap.size > 0
        ? clamp(embeddingSimilarityMap.get(course.id) ??
            computeItemSimilarity(candidateVector, enrolledVectors), 0, 1)
        : computeItemSimilarity(candidateVector, enrolledVectors);

      const difficultyLevel = inferDifficultyLevel(course);
      const difficultyMatch =
        difficultyPreference === "unknown" || difficultyLevel === "unknown"
          ? 0.5
          : difficultyPreference === "mixed" || difficultyLevel === "mixed"
            ? 0.75
            : difficultyPreference === difficultyLevel
              ? 1
              : 0.2;

      // Learning path progression: reward candidates that are the appropriate next
      // difficulty step up from the user's completed courses.
      const difficultyProgression = (() => {
        if (!targetProgressionLevel || difficultyLevel === "unknown") return 0.5;
        if (difficultyLevel === targetProgressionLevel) return 1.0;
        if (difficultyLevel === "mixed") return 0.6;
        if (difficultyLevel === (difficultyPreference as DifficultyLevel)) return 0.4;
        return 0.1; // wrong direction (e.g. beginner when user is already intermediate)
      })();

      // Thompson bonus: UCB-style exploration score. High for unseen courses,
      // moderate for courses with a good but uncertain global CTR.
      const thompsonBonus = thompsonBonusMap.get(course.id) ?? THOMPSON_DEFAULT;
      const freshness = getFreshnessScore(course, nowTs, FRESHNESS_HALF_LIFE_DAYS);
      const qualityPenalty =
        totalRatings > 0
          ? getQualityPenalty(
              ratingNorm,
              QUALITY_MIN_RATING,
              QUALITY_LOW_RATING_PENALTY
            )
          : 0;
      const sessionCategoryBoost =
        clamp(sessionCategoryNorm.get(categoryKey) ?? 0, 0, 1) *
        Math.max(0, SESSION_INTENT_BOOST) *
        Math.max(0.1, contextFactors.session);
      const instructorKey = course.instructor_id ?? "unknown_instructor";
      const instructorImpressions =
        recentInstructorImpressions.get(instructorKey) ?? 0;
      const instructorPositives =
        recentInstructorPositives.get(instructorKey) ?? 0;
      const fatigueThreshold = Math.max(1, MAX_EXPOSURES_PER_INSTRUCTOR_WINDOW);
      const instructorFatiguePenalty =
        instructorImpressions >= fatigueThreshold && instructorPositives === 0
          ? Math.min(
              3,
              (instructorImpressions - fatigueThreshold + 1) *
                Math.max(0, INSTRUCTOR_FATIGUE_PENALTY)
            )
          : 0;

      let score = 0;
      const isNovel =
        (userBehavior.get(course.id)?.impressions ?? 0) === 0 &&
        !enrolledIdSet.has(course.id);
      const explorationScore =
        popularity * 0.6 * Math.max(0.1, contextFactors.popularity) +
        globalCtr * 0.3 +
        ratingNorm * 0.1 * Math.max(0.1, contextFactors.rating) +
        (isNovel ? contextFactors.noveltyBonus : 0) +
        contextFactors.explorationBias +
        returningExplorationBonus; // stale-profile: returning users see more variety

      if (isColdStart) {
        score =
          ratingNorm * 10 * scoring.coldRating * Math.max(0.1, contextFactors.rating) +
          popularity * 10 * scoring.coldPopularity * Math.max(0.1, contextFactors.popularity) +
          globalCtr * 10 * scoring.coldCtr +
          freshness * 10 * scoring.freshness +
          thompsonBonus * 10 * scoring.thompsonBonus; // exploration for cold-start users too

      } else {
        score =
          ratingNorm * 10 * scoring.rating * Math.max(0.1, contextFactors.rating) +
          userBeh.ctrScore * scoring.userCtr +
          userBeh.recentScore * scoring.userRecency +
          categoryAffinity * 10 * scoring.categoryAffinity * Math.max(0.1, contextFactors.category) +
          instructorAffinity * 10 * scoring.instructorAffinity +
          tagAffinity * 10 * scoring.tagAffinity +
          difficultyMatch * 10 * scoring.difficultyMatch +
          difficultyProgression * 10 * scoring.difficultyProgression + // learning path
          freshness * 10 * scoring.freshness +
          popularity * 10 * scoring.globalPopularity * Math.max(0.1, contextFactors.popularity) +
          contentSimilarityBoost * 10 * scoring.contentSimilarityBoost +
          thompsonBonus * 10 * scoring.thompsonBonus -  // exploration bonus
          userBeh.ignoredPenalty * scoring.ignorePenalty -
          userBeh.dismissPenalty * scoring.dismissPenalty;
        score += sessionCategoryBoost;
      }

      score -= userBeh.suppressionPenalty;
      score -= instructorFatiguePenalty;
      score -= qualityPenalty;

      score = clamp(score, 0, 10);
      if (shouldApplyMinFloor) {
        score = Math.max(score, clamp(COLD_MIN_SCORE_FLOOR, 0, 10));
      } else if (!userBeh.hardSuppressed) {
        score = Math.max(score, clamp(MIN_SCORE_FLOOR, 0, 10));
      }
      const primaryReasonTag = isColdStart
        ? pickPrimaryReasonTag([
            { key: "highly_rated", value: ratingNorm * 10 * scoring.coldRating },
            { key: "popular_now", value: popularity * 10 * scoring.coldPopularity },
            { key: "trending_clicks", value: globalCtr * 10 * scoring.coldCtr },
          ])
        : pickPrimaryReasonTag([
            {
              key: "matches_your_interests",
              value: categoryAffinity * 10 * scoring.categoryAffinity,
            },
            {
              key: "based_on_your_recent_clicks",
              value: userBeh.ctrScore * scoring.userCtr,
            },
            {
              key: "from_instructors_you_like",
              value: instructorAffinity * 10 * scoring.instructorAffinity,
            },
            {
              key: "matches_your_topics",
              value: tagAffinity * 10 * scoring.tagAffinity,
            },
            {
              key: "matches_your_level",
              value: difficultyMatch * 10 * scoring.difficultyMatch,
            },
            {
              key: "similar_to_courses_you_took",
              value: contentSimilarityBoost * 10 * scoring.contentSimilarityBoost,
            },
            {
              key: "based_on_this_session",
              value: sessionCategoryBoost,
            },
            { key: "popular_now", value: popularity * 10 * scoring.globalPopularity },
            { key: "highly_rated", value: ratingNorm * 10 * scoring.rating },
          ]);

      return {
        id: course.id,
        score,
        exploration_score: Number(explorationScore.toFixed(3)),
        category_key: categoryKey,
        instructor_key: course.instructor_id ?? "unknown_instructor",
        tags: courseTags,
        is_novel: isNovel,
        suppressed: userBeh.hardSuppressed,
        primary_reason_tag: primaryReasonTag,
        score_breakdown: {
          rating: Number((ratingNorm * 10).toFixed(3)),
          user_ctr: Number(userBeh.ctrScore.toFixed(3)),
          user_recency: Number(userBeh.recentScore.toFixed(3)),
          category_affinity: Number((categoryAffinity * 10).toFixed(3)),
          instructor_affinity: Number((instructorAffinity * 10).toFixed(3)),
          tag_affinity: Number((tagAffinity * 10).toFixed(3)),
          difficulty_match: Number((difficultyMatch * 10).toFixed(3)),
          freshness: Number((freshness * 10).toFixed(3)),
          session_intent_boost: Number(sessionCategoryBoost.toFixed(3)),
          popularity: Number((popularity * 10).toFixed(3)),
          global_ctr: Number((globalCtr * 10).toFixed(3)),
          ignored_penalty: Number(userBeh.ignoredPenalty.toFixed(3)),
          dismiss_penalty: Number(userBeh.dismissPenalty.toFixed(3)),
          suppression_penalty: Number(userBeh.suppressionPenalty.toFixed(3)),
          overexposed_penalty: Number(userBeh.overexposedPenalty.toFixed(3)),
          instructor_fatigue_penalty: Number(instructorFatiguePenalty.toFixed(3)),
          quality_penalty: Number(qualityPenalty.toFixed(3)),
          content_similarity_boost: Number((contentSimilarityBoost * 10).toFixed(3)),
          thompson_bonus: Number((thompsonBonus * 10).toFixed(3)),        // UCB exploration signal
          difficulty_progression: Number((difficultyProgression * 10).toFixed(3)), // learning path
        },
        course: {
          ...course,
          category_name: course.category?.name ?? null,
          category_color: course.category?.color ?? null,
          total_sections: sectionCountsMap.get(course.id) ?? 0,
          total_videos: videoCountsMap.get(course.id) ?? 0,
          total_quizzes: quizCountsMap.get(course.id) ?? 0,
        },
      };
    });

    const unsuppressed = blended.filter((item) => !item.suppressed);
    const fallbackPool = unsuppressed.length > 0 ? unsuppressed : blended;
    const sortedByScore = [...fallbackPool].sort((a, b) => b.score - a.score);

    const explorationSlots = clampInt(
      policy.explorationSlots,
      0,
      Math.max(0, effectiveMaxResults - 1)
    );
    const seedSelected = rerankWithConstraints(
      sortedByScore,
      effectiveMaxResults,
      Math.max(1, policy.maxPerCategory),
      Math.max(1, policy.maxPerInstructor),
      clampInt(NOVELTY_MIN_SLOTS, 0, effectiveMaxResults)
    );
    const diversityFallback =
      seedSelected.length > 0
        ? seedSelected
        : applyCategoryDiversity(
            sortedByScore,
            effectiveMaxResults,
            Math.max(1, policy.maxPerCategory),
            Math.max(1, policy.maxPerInstructor)
          );

    const remainingForExplore = sortedByScore.filter(
      (item) => !diversityFallback.some((picked) => picked.id === item.id)
    );
    const explorationSelected = [...remainingForExplore]
      .sort((a, b) => b.exploration_score - a.exploration_score)
      .slice(0, explorationSlots);

    const combined = [...diversityFallback, ...explorationSelected];
    const deduped = combined.filter(
      (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index
    );

    let rankedForOutput = deduped.sort((a, b) => b.score - a.score).slice(0, effectiveMaxResults);
    const noveltyTarget = clampInt(NOVELTY_MIN_SLOTS, 0, effectiveMaxResults);
    if (noveltyTarget > 0) {
      let noveltyCount = rankedForOutput.filter((item) => item.is_novel).length;
      if (noveltyCount < noveltyTarget) {
        const noveltyCandidates = sortedByScore.filter(
          (item) =>
            item.is_novel &&
            !rankedForOutput.some((picked) => picked.id === item.id)
        );
        for (const noveltyItem of noveltyCandidates) {
          if (noveltyCount >= noveltyTarget) break;
          const replaceIndex = (() => {
            for (let i = rankedForOutput.length - 1; i >= 0; i--) {
              if (!rankedForOutput[i].is_novel) return i;
            }
            return -1;
          })();
          if (replaceIndex >= 0) {
            rankedForOutput[replaceIndex] = noveltyItem;
            noveltyCount += 1;
          }
        }
        rankedForOutput = rankedForOutput.sort((a, b) => b.score - a.score);
      }
    }

    const results = rankedForOutput
      .map((r, i) => {
        const { exploration_score, category_key, suppressed, is_novel, ...rest } = r;
        return { ...rest, rank: i + 1 };
      });

    const meta = {
      model_version: experiment.modelVersion,
      request_id: requestId,
      assignment_source: assignmentSource,
      assigned_algo: selectedAlgo,
      traffic_bucket: assigned.bucket,
      cold_start: isColdStart,
      lookback_days: EVENT_LOOKBACK_DAYS,
      weights: scoring,
      ranking_policy: {
        max_candidate_pool: MAX_CANDIDATE_POOL,
        candidate_category_pool_limit: CANDIDATE_CATEGORY_POOL_LIMIT,
        candidate_long_tail_pool_limit: CANDIDATE_LONG_TAIL_POOL_LIMIT,
        min_score_floor: MIN_SCORE_FLOOR,
        profile_decay_days: PROFILE_DECAY_DAYS,
        novelty_min_slots: noveltyTarget,
        session_gap_hours: SESSION_GAP_HOURS,
        freshness_half_life_days: FRESHNESS_HALF_LIFE_DAYS,
        quality_min_rating: QUALITY_MIN_RATING,
        quality_low_rating_penalty: QUALITY_LOW_RATING_PENALTY,
        rerank_category_penalty: RERANK_CATEGORY_PENALTY,
        rerank_instructor_penalty: RERANK_INSTRUCTOR_PENALTY,
        rerank_tag_overlap_penalty: RERANK_TAG_OVERLAP_PENALTY,
        rerank_novelty_bonus: RERANK_NOVELTY_BONUS,
        seen_filter_window_hours: SEEN_FILTER_WINDOW_HOURS,
        seen_filter_min_impressions: seenFilterMinImpressions,
        session_window_hours: SESSION_WINDOW_HOURS,
        session_intent_boost: SESSION_INTENT_BOOST,
        instructor_fatigue_window_hours: INSTRUCTOR_FATIGUE_WINDOW_HOURS,
        max_exposures_per_instructor_window:
          MAX_EXPOSURES_PER_INSTRUCTOR_WINDOW,
        instructor_fatigue_penalty: INSTRUCTOR_FATIGUE_PENALTY,
        max_per_category: policy.maxPerCategory,
        max_per_instructor: policy.maxPerInstructor,
        exploration_slots: explorationSlots,
        max_exposures_per_course_7d: policy.maxExposuresPerCourse7d,
        suppression_cooldown_days: policy.suppressionCooldownDays,
        cold_min_score_floor: COLD_MIN_SCORE_FLOOR,
      },
      filtering: {
        candidate_count_top_rated: topRatedCandidates.length,
        candidate_count_category_pool: personalizedCategoryCandidates.length,
        candidate_count_long_tail_pool: longTailCandidates.length,
        candidate_count_before_seen_filter: candidates.length,
        candidate_count_after_seen_filter: candidatePool.length,
        novelty_count_in_results: rankedForOutput.filter((item) => item.is_novel).length,
        session_event_count: sessionEvents.length,
      },
      context: {
        learning_goal: learningGoal,
        placement,
        local_hour: localHour,
        day_of_week: dayOfWeek,
        factors: contextFactors,
      },
      traffic_split: TRAFFIC_SPLIT,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: { recommendations: results, meta },
        recommendations: results,
        meta,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
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
