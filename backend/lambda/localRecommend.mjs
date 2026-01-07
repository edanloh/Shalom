// Local runner to exercise the recommendation scoring without a database.
// Uses the same scoring logic as getRecommendations.mjs against mock data.
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (t ? String(t).toLowerCase() : null))
    .filter(Boolean);
}

function scoreCourse(course, interests, target, opts) {
  const { completedCourses = new Set(), skillsByCourse = new Map(), prereqsByCourse = new Map(), courseBehavior = new Map() } = opts;
  const tags = normalizeTags(course.tags);
  const interestMatches = interests.filter((i) =>
    tags.some((tag) => tag.includes(i.topic.toLowerCase()))
  );
  const interestScore = interestMatches.reduce((sum, i) => sum + Number(i.weight || 1), 0);
  const levelScore =
    target?.current_level && course.level
      ? course.level.toLowerCase() === target.current_level.toLowerCase()
        ? 2.0
        : 0.8
      : 1.0;

  const courseSkills = skillsByCourse.get(course.id) || [];
  const desiredSkills = Array.isArray(target?.desired_skills)
    ? target.desired_skills.map((s) => s.toLowerCase())
    : [];
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

  const score =
    interestScore * 2.0 +
    levelScore +
    skillScore +
    popularity * 0.25 +
    freshness * 0.2 +
    quality * 0.25 +
    ctrBoost * 0.8 +
    recentBoost * 0.3 -
    prereqPenalty -
    ignoredPenalty -
    repeatPenalty;

  let reason = "Trending pick for your goals";
  if (interestMatches.length > 0) {
    reason = `Matches your interest in ${interestMatches.map((i) => i.topic).slice(0, 2).join(", ")}`;
  } else if (target?.current_level && course.level?.toLowerCase() === target.current_level.toLowerCase()) {
    reason = `Fits your ${target.current_level} level`;
  } else if (target?.target_certificate) {
    reason = `Relevant to ${target.target_certificate}`;
  }

  const band = prereqSatisfied ? (skillMatches.length > 0 ? "next_step" : "explore") : "locked_prereq";

  if (!prereqSatisfied && prereqs.length > 0) {
    reason = `Complete prerequisite${prereqs.length > 1 ? "s" : ""} first`;
  } else if (skillMatches.length > 0) {
    reason = `Builds ${skillMatches.slice(0, 2).join(", ")}`;
  }

  const debugReason = {
    interestMatches: interestMatches.map((i) => i.topic),
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

function loadEvents(logPath) {
  if (!fs.existsSync(logPath)) return [];
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
  return lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function buildBehavior(events) {
  const behaviorByCourse = new Map();
  const now = Date.now();
  for (const ev of events) {
    const cid = ev.courseId || ev.course_id;
    if (!cid) continue;
    const rec = behaviorByCourse.get(cid) || { impressions: 0, clicks: 0, starts: 0, completes: 0, recencyScore: 0 };
    const ageMs = now - new Date(ev.timestamp || ev.created_at || Date.now()).getTime();
    const decay = Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 7)); // 7-day decay
    if (ev.eventType === "impression" || ev.event_type === "impression") rec.impressions += 1;
    if (ev.eventType === "click" || ev.event_type === "click") rec.clicks += 1;
    if (ev.eventType === "start" || ev.event_type === "start") rec.starts += 1;
    if (ev.eventType === "complete" || ev.event_type === "complete") rec.completes += 1;
    rec.recencyScore += decay;
    behaviorByCourse.set(cid, rec);
  }

  const courseBehavior = new Map();
  for (const [cid, rec] of behaviorByCourse.entries()) {
    const ctr = (rec.clicks + 1) / (rec.impressions + 3);
    const ctrScore = Number((ctr * 5).toFixed(3));
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
  return courseBehavior;
}

function run() {
  const mockPath = path.join(__dirname, "../../mobile/src/mock/db.json");
  const db = JSON.parse(fs.readFileSync(mockPath, "utf8"));
  const eventsLogPath = path.join(__dirname, "../../mobile/src/mock/events.log");
  const events = loadEvents(eventsLogPath);
  const courseBehavior = buildBehavior(events);

  const userTarget = db.recommendations?.data?.userTarget ?? null;
  const interests = db.recommendations?.data?.interests ?? [];
  const completedCourseIds = new Set(); // adjust for local testing if desired

  const candidates = (db.recommendations?.data?.recommendations ?? []).map((r) => r.course || r);

  const scored = candidates.map((course) => {
    const { score, reason, band, debugReason } = scoreCourse(course, interests, userTarget, {
      completedCourses: completedCourseIds,
      skillsByCourse: new Map(),
      prereqsByCourse: new Map(),
      courseBehavior,
    });
    return { course, score: Number(score.toFixed(3)), reason, band, debugReason };
  });

  scored.sort((a, b) => b.score - a.score);

  console.log(
    JSON.stringify(
      scored.map((s, idx) => ({
        rank: idx + 1,
        score: s.score,
        debugReason: s.debugReason,
        band: s.band,
        reason: s.reason,
        title: s.course.title,
      })),
      null,
      2
    )
  );
}

run();
