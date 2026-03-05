import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

const sanitizeSearchTerm = (value: string) =>
  value
    .trim()
    .replace(/[,*()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);

const toInList = (values: string[]) =>
  values.map((value) => `"${String(value).replace(/"/g, '\\"')}"`).join(",");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return fail("Method not allowed", 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const instructorId = pathParts[pathParts.length - 1];
    const courseId = url.searchParams.get("courseId");
    const sort = String(url.searchParams.get("sort") || "latest");
    const status = String(url.searchParams.get("status") || "all");
    const searchRaw = String(url.searchParams.get("q") || "");
    const search = sanitizeSearchTerm(searchRaw);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

    if (!instructorId || instructorId === "getInstructorReviews") {
      return fail("Instructor ID is required", 400);
    }

    const { data: instructor, error: instructorError } = await supabase
      .from("users")
      .select("id,role,name")
      .eq("id", instructorId)
      .in("role", ["admin", "instructor"])
      .single();

    if (instructorError || !instructor) return fail("Instructor not found", 404);

    let coursesQuery = supabase
      .from("courses")
      .select("id,title,instructor_id,instructor_name")
      .eq("is_published", true)
      .eq("instructor_id", instructorId);

    let { data: courses, error: coursesError } = await coursesQuery;
    if (coursesError) throw coursesError;

    if (!courses?.length) {
      const fallback = await supabase
        .from("courses")
        .select("id,title,instructor_id,instructor_name")
        .eq("is_published", true)
        .eq("instructor_name", instructor.name);
      courses = fallback.data || [];
    }

    const availableCourseIds = (courses || []).map((c: any) => String(c.id));
    const scopedCourseIds = courseId
      ? availableCourseIds.includes(courseId)
        ? [courseId]
        : []
      : availableCourseIds;

    if (!scopedCourseIds.length) {
      return ok({
        success: true,
        data: {
          reviews: [],
          summary: {
            total_reviews: 0,
            average_rating: 0,
            courses_covered: 0,
          },
          pagination: {
            limit,
            offset,
            total: 0,
            has_more: false,
          },
        },
      });
    }

    let reviewsQuery = supabase
      .from("course_ratings")
      .select(
        "id,course_id,user_id,context_section_id,rating,review,is_anonymous,created_at,updated_at,review_status,flag_reason,moderation_note,moderated_by,moderated_at,instructor_reply,instructor_replied_at,acknowledged_at,is_pinned,pinned_at,pinned_by",
        { count: "exact" }
      )
      .in("course_id", scopedCourseIds);

    if (["visible", "hidden", "flagged", "resolved"].includes(status)) {
      reviewsQuery = reviewsQuery.eq("review_status", status);
    }

    if (search.length > 0) {
      const [matchingUsers, matchingCourses] = await Promise.all([
        supabase
          .from("users")
          .select("id")
          .ilike("name", `%${search}%`)
          .limit(100),
        supabase
          .from("courses")
          .select("id")
          .in("id", scopedCourseIds)
          .ilike("title", `%${search}%`)
          .limit(100),
      ]);
      if (matchingUsers.error) throw matchingUsers.error;
      if (matchingCourses.error) throw matchingCourses.error;

      const matchedUserIds = (matchingUsers.data || []).map((row: any) => String(row.id));
      const matchedCourseIds = (matchingCourses.data || []).map((row: any) => String(row.id));
      const wildcardSearch = `*${search}*`;
      const orParts = [`review.ilike.${wildcardSearch}`];
      if (matchedUserIds.length > 0) {
        orParts.push(`user_id.in.(${toInList(matchedUserIds)})`);
      }
      if (matchedCourseIds.length > 0) {
        orParts.push(`course_id.in.(${toInList(matchedCourseIds)})`);
      }
      reviewsQuery = reviewsQuery.or(orParts.join(","));
    }

    if (sort === "lowest_rating") {
      reviewsQuery = reviewsQuery
        .order("is_pinned", { ascending: false })
        .order("rating", { ascending: true })
        .order("created_at", { ascending: false });
    } else if (sort === "highest_rating") {
      reviewsQuery = reviewsQuery
        .order("is_pinned", { ascending: false })
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false });
    } else {
      reviewsQuery = reviewsQuery
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
    }

    const { data: reviews, error: reviewsError, count } = await reviewsQuery.range(
      offset,
      offset + limit - 1
    );
    if (reviewsError) throw reviewsError;

    const rows = (reviews || []) as Array<any>;

    // Resolve related display data in separate queries to avoid FK relation-name issues.
    const reviewerIds = Array.from(
      new Set(rows.map((row) => row.user_id).filter(Boolean))
    ) as string[];
    const reviewedCourseIds = Array.from(
      new Set(rows.map((row) => row.course_id).filter(Boolean))
    ) as string[];
    const contextSectionIds = Array.from(
      new Set(rows.map((row) => row.context_section_id).filter(Boolean))
    ) as string[];

    const [usersResult, coursesResult, sectionsResult] = await Promise.all([
      reviewerIds.length
        ? supabase
            .from("users")
            .select("id,name,avatar_url")
            .in("id", reviewerIds)
        : Promise.resolve({ data: [], error: null }),
      reviewedCourseIds.length
        ? supabase
            .from("courses")
            .select("id,title")
            .in("id", reviewedCourseIds)
        : Promise.resolve({ data: [], error: null }),
      contextSectionIds.length
        ? supabase
            .from("course_sections")
            .select("id,title")
            .in("id", contextSectionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (coursesResult.error) throw coursesResult.error;
    if (sectionsResult.error) throw sectionsResult.error;

    const userById = new Map<string, { name?: string; avatar_url?: string }>();
    for (const user of (usersResult.data || []) as Array<any>) {
      userById.set(String(user.id), {
        name: user.name || undefined,
        avatar_url: user.avatar_url || undefined,
      });
    }

    const courseById = new Map<string, { title?: string }>();
    for (const course of (coursesResult.data || []) as Array<any>) {
      courseById.set(String(course.id), {
        title: course.title || undefined,
      });
    }

    const sectionById = new Map<string, { title?: string }>();
    for (const section of (sectionsResult.data || []) as Array<any>) {
      sectionById.set(String(section.id), {
        title: section.title || undefined,
      });
    }
    const ratingValues = rows.map((row) => Number(row.rating || 0)).filter(Number.isFinite);
    const avgRating =
      ratingValues.length > 0
        ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
        : 0;

    return ok({
      success: true,
      data: {
        reviews: rows.map((row) => ({
          id: row.id,
          course_id: row.course_id,
          course_title: courseById.get(String(row.course_id))?.title || "Untitled Course",
          context_section_id: row.context_section_id || null,
          context_section_title:
            row.context_section_id
              ? sectionById.get(String(row.context_section_id))?.title || null
              : null,
          reviewer_id: row.user_id,
          reviewer_name: row.is_anonymous
            ? "Anonymous"
            : userById.get(String(row.user_id))?.name || "Anonymous",
          reviewer_avatar: row.is_anonymous
            ? null
            : userById.get(String(row.user_id))?.avatar_url || null,
          rating: Number(row.rating || 0),
          review: row.review || "",
          is_anonymous: Boolean(row.is_anonymous),
          created_at: row.created_at,
          updated_at: row.updated_at,
          review_status: row.review_status || "visible",
          flag_reason: row.flag_reason || null,
          moderation_note: row.moderation_note || null,
          moderated_by: row.moderated_by || null,
          moderated_at: row.moderated_at || null,
          instructor_reply: row.instructor_reply || null,
          instructor_replied_at: row.instructor_replied_at || null,
          acknowledged_at: row.acknowledged_at || null,
          is_pinned: Boolean(row.is_pinned),
          pinned_at: row.pinned_at || null,
          pinned_by: row.pinned_by || null,
        })),
        summary: {
          total_reviews: Number(count || 0),
          average_rating: Number(avgRating.toFixed(2)),
          courses_covered: scopedCourseIds.length,
        },
        pagination: {
          limit,
          offset,
          total: Number(count || 0),
          has_more: offset + rows.length < Number(count || 0),
        },
      },
    });
  } catch (err: any) {
    console.error("getInstructorReviews error", err);
    return fail("Failed to fetch instructor reviews", 500, {
      error: err.message || "Unknown error",
    });
  }
});
