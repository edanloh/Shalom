import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json"
};

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "ap-southeast-1"
});

let cachedSecret = null;

async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;
  const command = new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_NAME });
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(t => (t ? String(t).toLowerCase() : null))
    .filter(Boolean);
}

function scoreCourse(course, interests, target, opts) {
  const {
    completedCourses = new Set(),
    skillsByCourse = new Map(),
    prereqsByCourse = new Map(),
    courseBehavior = new Map(),
  } = opts;
  const tags = normalizeTags(course.tags);
  const interestMatches = interests.filter((i) =>
    tags.some(tag => tag.includes(i.topic.toLowerCase()))
  );
  const interestScore = interestMatches.reduce((sum, i) => sum + Number(i.weight || 1), 0);
  const levelScore = target?.current_level && course.level
    ? (course.level.toLowerCase() === target.current_level.toLowerCase() ? 2.0 : 0.8)
    : 1.0;

  const courseSkills = skillsByCourse.get(course.id) || [];
  const desiredSkills = Array.isArray(target?.desired_skills) ? target.desired_skills.map((s) => s.toLowerCase()) : [];
  const skillMatches = desiredSkills.length
    ? courseSkills.filter((s) => desiredSkills.includes(s.toLowerCase()))
    : [];
  const skillScore = skillMatches.length > 0 ? 1.5 + skillMatches.length * 0.5 : 0;

  const prereqs = prereqsByCourse.get(course.id) || [];
  const unmetPrereqs = prereqs.filter((p) => !completedCourses.has(p));
  const prereqPenalty = unmetPrereqs.length > 0 ? 2.0 : 0.0;
  const prereqSatisfied = unmetPrereqs.length === 0;

  const popularity = Number(course.popularity_score ?? course.rating ?? 0);
  const freshness = Number(course.freshness_score ?? 0);
  const quality = Number(course.quality_score ?? course.rating ?? 0);

  const behavior = courseBehavior.get(course.id) || {};
  const ctrBoost = Number(behavior.ctrScore || 0);
  const recentBoost = Number(behavior.recentScore || 0);
  const ignoredPenalty = Number(behavior.ignoredPenalty || 0);
  const repeatPenalty = Number(behavior.repeatPenalty || 0);

  const score = (interestScore * 2.0)
    + levelScore
    + skillScore
    + (popularity * 0.25)
    + (freshness * 0.2)
    + (quality * 0.25)
    + (ctrBoost * 0.8)
    + (recentBoost * 0.3)
    - prereqPenalty
    - ignoredPenalty
    - repeatPenalty;

  let reason = "Trending pick for your goals";
  if (interestMatches.length > 0) {
    reason = `Matches your interest in ${interestMatches.map(i => i.topic).slice(0, 2).join(", ")}`;
  } else if (target?.current_level && course.level?.toLowerCase() === target.current_level.toLowerCase()) {
    reason = `Fits your ${target.current_level} level`;
  } else if (target?.target_certificate) {
    reason = `Relevant to ${target.target_certificate}`;
  }

  const band = prereqSatisfied
    ? (skillMatches.length > 0 ? "next_step" : "explore")
    : "locked_prereq";

  if (!prereqSatisfied && prereqs.length > 0) {
    reason = `Complete prerequisite${prereqs.length > 1 ? "s" : ""} first`;
  } else if (skillMatches.length > 0) {
    reason = `Builds ${skillMatches.slice(0, 2).join(", ")}`;
  }

  // Debug-only detail (not surfaced to end users)
  const debugReason = {
    interestMatches: interestMatches.map(i => i.topic),
    skillMatches,
    levelMatch: levelScore >= 1.5,
    ctrBoost,
    recentBoost,
    ignoredPenalty,
    repeatPenalty,
    popularity,
    freshness,
    quality,
  };

  return { score, reason, band, debugReason };
}

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const userId = event.queryStringParameters?.userId || event.queryStringParameters?.user_id;
  const limit = parseInt(event.queryStringParameters?.limit || "10", 10);
  const requestId = event.requestContext?.requestId || "unknown";

  let client;

  try {
    const secret = await getDbCredentials();
    const connectionConfig = {
      host: secret.host?.trim(),
      port: parseInt(secret.port) || 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4
    };

    client = new Client(connectionConfig);
    await client.connect();

    const [targetResult, interestsResult, completedResult] = await Promise.all([
      client.query(
        `SELECT * FROM user_targets WHERE user_id = $1 LIMIT 1`,
        [userId || null]
      ),
      client.query(
        `SELECT topic, weight FROM user_interests WHERE user_id = $1 ORDER BY weight DESC`,
        [userId || null]
      ),
      client.query(
        `SELECT course_id FROM course_enrollments WHERE user_id = $1 AND is_completed = true`,
        [userId || null]
      ),
      client.query(
        `SELECT course_id, event_type, placement, created_at FROM recommendation_events WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [userId || null]
      )
    ]);

    const userTarget = targetResult.rows?.[0] || null;
    const interests = interestsResult.rows || [];
    const completedCourseIds = new Set(completedResult.rows.map((r) => r.course_id));
    const events = eventsResult.rows || [];

    // Aggregate behavioral signals
    const behaviorByCourse = new Map();
    const now = Date.now();
    for (const ev of events) {
      const cid = ev.course_id;
      if (!cid) continue;
      const rec = behaviorByCourse.get(cid) || { impressions: 0, clicks: 0, starts: 0, completes: 0, ignores: 0, recencyScore: 0 };
      const ageMs = now - new Date(ev.created_at).getTime();
      const decay = Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 7)); // 7-day half-ish life
      if (ev.event_type === "impression") rec.impressions += 1;
      if (ev.event_type === "click") rec.clicks += 1;
      if (ev.event_type === "start") rec.starts += 1;
      if (ev.event_type === "complete") rec.completes += 1;
      // treat impressions without clicks as ignores for novelty cap later
      rec.recencyScore += decay;
      behaviorByCourse.set(cid, rec);
    }

    // Compute CTR with Laplace smoothing and ignored penalty
    const courseBehavior = new Map();
    for (const [cid, rec] of behaviorByCourse.entries()) {
      const ctr = (rec.clicks + 1) / (rec.impressions + 3); // Laplace prior
      const ctrScore = Number((ctr * 5).toFixed(3)); // scale to match other terms
      const recentScore = Number(rec.recencyScore.toFixed(3));
      const ignored = rec.impressions > 0 && rec.clicks === 0 ? Math.min(1.0, rec.impressions * 0.05) : 0;
      const repeatPenalty = rec.impressions >= 3 && rec.clicks === 0 ? Math.min(1.5, rec.impressions * 0.1) : 0;
      courseBehavior.set(cid, {
        ctrScore,
        recentScore,
        ignoredPenalty: ignored,
        repeatPenalty,
      });
    }

    const candidateQuery = `
      SELECT 
        c.*,
        cf.tags,
        cf.popularity_score,
        cf.freshness_score,
        cf.quality_score,
        cat.name AS category_name,
        ce.progress_percentage,
        ce.is_completed
      FROM courses c
      LEFT JOIN content_features cf ON cf.course_id = c.id
      LEFT JOIN categories cat ON cat.id = c.category_id
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
      WHERE c.is_published = true
        AND (ce.is_completed IS DISTINCT FROM true)
      LIMIT 100
    `;

    const candidateResult = await client.query(candidateQuery, [userId || null]);
    const candidates = candidateResult.rows || [];

    // Build knowledge graph lookups
    const candidateIds = candidates.map((c) => c.id);
    const skillsResult = await client.query(
      `SELECT course_id, skill FROM course_skills WHERE course_id = ANY($1::uuid[])`,
      [candidateIds]
    );
    const prereqResult = await client.query(
      `SELECT course_id, prereq_course_id FROM course_prereqs WHERE course_id = ANY($1::uuid[])`,
      [candidateIds]
    );

    const skillsByCourse = new Map();
    for (const row of skillsResult.rows) {
      const list = skillsByCourse.get(row.course_id) || [];
      list.push(row.skill);
      skillsByCourse.set(row.course_id, list);
    }

    const prereqsByCourse = new Map();
    for (const row of prereqResult.rows) {
      const list = prereqsByCourse.get(row.course_id) || [];
      list.push(row.prereq_course_id);
      prereqsByCourse.set(row.course_id, list);
    }

    const scored = candidates.map((course) => {
      const { score, reason, band, debugReason } = scoreCourse(course, interests, userTarget, {
        completedCourses: completedCourseIds,
        skillsByCourse,
        prereqsByCourse,
        courseBehavior,
      });
      return {
        course,
        score: Number(score.toFixed(3)),
        reason,
        band,
        debugReason,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Light diversity/novelty: penalize duplicate categories in order
    const seenCategoryCounts = new Map();
    const diversified = scored.map((item) => {
      const cat = (item.course.category_name || item.course.category || "").toLowerCase();
      const count = seenCategoryCounts.get(cat) || 0;
      seenCategoryCounts.set(cat, count + 1);
      const categoryPenalty = count * 0.15; // slightly lighter per repeat
      return { ...item, adjustedScore: Number((item.score - categoryPenalty).toFixed(3)), categoryPenalty };
    });

    diversified.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const top = diversified.slice(0, limit);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Recommendations generated",
        data: {
          userTarget,
          interests,
          recommendations: top.map((item, index) => ({
            rank: index + 1,
            score: item.adjustedScore ?? item.score,
            baseScore: item.score,
            ctrScore: courseBehavior.get(item.course.id)?.ctrScore ?? 0,
            ignoredPenalty: courseBehavior.get(item.course.id)?.ignoredPenalty ?? 0,
            recentScore: courseBehavior.get(item.course.id)?.recentScore ?? 0,
            repeatPenalty: courseBehavior.get(item.course.id)?.repeatPenalty ?? 0,
            categoryPenalty: item.categoryPenalty ?? 0,
            debugReason: item.debugReason,
            reason: item.reason,
            band: item.band,
            course: {
              ...item.course,
              recommendation_reason: item.reason,
              recommendation_score: item.adjustedScore ?? item.score
            }
          }))
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          candidateCount: candidates.length
        }
      })
    };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to generate recommendations",
        error: error.message,
        meta: { requestId }
      })
    };
  } finally {
    if (client) await client.end().catch((e) => console.error("Error closing PG client:", e));
  }
};
