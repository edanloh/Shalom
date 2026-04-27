const TAG_LABELS: Record<string, string> = {
  matches_your_interests: "Matches your interests",
  based_on_your_recent_clicks: "Based on your recent activity",
  from_instructors_you_like: "From instructors you like",
  matches_your_topics: "Matches your topics",
  matches_your_level: "Matches your level",
  similar_to_courses_you_took: "Similar to courses you took",
  based_on_this_session: "Based on this session",
  popular_now: "Popular right now",
  highly_rated: "Highly rated by learners",
  trending_clicks: "Trending this week",
  recommended_for_new_learners: "Good for new learners",
};

const humanizeTag = (tag: string): string => {
  if (!tag) return "";
  if (TAG_LABELS[tag]) return TAG_LABELS[tag];
  return tag
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const formatPrimaryRecommendationReason = (primaryTag?: string): string => {
  if (!primaryTag || primaryTag === "recommended_for_you") return "";
  return humanizeTag(primaryTag);
};
