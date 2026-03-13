import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

type ActionType =
  | "hide"
  | "unhide"
  | "flag"
  | "resolve"
  | "acknowledge"
  | "reply"
  | "pin"
  | "unpin";

const statusByAction: Record<ActionType, string | null> = {
  hide: "hidden",
  unhide: "visible",
  flag: "flagged",
  resolve: "resolved",
  acknowledge: null,
  reply: null,
  pin: null,
  unpin: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const instructorId = String(body.instructorId || body.instructor_id || "").trim();
    const reviewId = String(body.reviewId || body.review_id || "").trim();
    const action = String(body.action || "").trim().toLowerCase() as ActionType;
    const moderationNote = String(body.moderationNote || body.moderation_note || "").trim();
    const flagReason = String(body.flagReason || body.flag_reason || "").trim();
    const instructorReply = String(body.instructorReply || body.instructor_reply || "").trim();

    if (!instructorId || !reviewId || !action) {
      return fail("instructorId, reviewId and action are required", 400);
    }
    if (
      !["hide", "unhide", "flag", "resolve", "acknowledge", "reply", "pin", "unpin"].includes(
        action
      )
    ) {
      return fail("Unsupported action", 400, { action });
    }

    const { data: instructor, error: instructorError } = await supabase
      .from("users")
      .select("id,role,name")
      .eq("id", instructorId)
      .in("role", ["admin", "instructor"])
      .single();
    if (instructorError || !instructor) return fail("Instructor not found", 404);

    const { data: review, error: reviewError } = await supabase
      .from("course_ratings")
      .select("id,course_id,review_status")
      .eq("id", reviewId)
      .single();
    if (reviewError || !review) return fail("Review not found", 404);

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id,instructor_id,instructor_name")
      .eq("id", review.course_id)
      .single();
    if (courseError || !course) return fail("Course not found", 404);

    const ownsById = String(course.instructor_id || "") === instructorId;
    const ownsByName =
      Boolean(course.instructor_name) &&
      String(course.instructor_name).trim().toLowerCase() ===
        String(instructor.name || "").trim().toLowerCase();

    if (!ownsById && !ownsByName) {
      return fail("Not allowed to manage reviews for this course", 403);
    }

    const patch: Record<string, unknown> = {
      moderation_note: moderationNote || null,
      moderated_by: instructorId,
      moderated_at: new Date().toISOString(),
    };

    if (statusByAction[action]) {
      patch.review_status = statusByAction[action];
    }

    if (action === "flag") {
      patch.flag_reason = flagReason || "Needs instructor follow-up";
    } else if (action === "unhide" || action === "resolve") {
      patch.flag_reason = null;
    }

    if (action === "acknowledge") {
      patch.acknowledged_at = new Date().toISOString();
    }

    if (action === "reply") {
      if (!instructorReply) {
        return fail("instructorReply is required for reply action", 400);
      }
      patch.instructor_reply = instructorReply;
      patch.instructor_replied_at = new Date().toISOString();
      patch.acknowledged_at = new Date().toISOString();
    } else if (instructorReply) {
      patch.instructor_reply = instructorReply;
      patch.instructor_replied_at = new Date().toISOString();
    }

    if (action === "pin") {
      patch.is_pinned = true;
      patch.pinned_at = new Date().toISOString();
      patch.pinned_by = instructorId;
    } else if (action === "unpin") {
      patch.is_pinned = false;
      patch.pinned_at = null;
      patch.pinned_by = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("course_ratings")
      .update(patch)
      .eq("id", reviewId)
      .select(
        "id,course_id,user_id,context_section_id,rating,review,is_anonymous,created_at,updated_at,review_status,flag_reason,moderation_note,moderated_by,moderated_at,instructor_reply,instructor_replied_at,acknowledged_at,is_pinned,pinned_at,pinned_by,reviewer:users!course_ratings_user_id_fkey(name,avatar_url),context_section:course_sections!course_ratings_context_section_id_fkey(id,title)"
      )
      .single();

    if (updateError) throw updateError;

    return ok({
      success: true,
      data: {
        id: updated.id,
        course_id: updated.course_id,
        context_section_id: updated.context_section_id || null,
        context_section_title: updated.context_section?.title || null,
        reviewer_name: updated.is_anonymous ? "Anonymous" : updated.reviewer?.name || "Anonymous",
        reviewer_avatar: updated.is_anonymous ? null : updated.reviewer?.avatar_url || null,
        rating: Number(updated.rating || 0),
        review: updated.review || "",
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        review_status: updated.review_status || "visible",
        flag_reason: updated.flag_reason || null,
        moderation_note: updated.moderation_note || null,
        moderated_by: updated.moderated_by || null,
        moderated_at: updated.moderated_at || null,
        instructor_reply: updated.instructor_reply || null,
        instructor_replied_at: updated.instructor_replied_at || null,
        acknowledged_at: updated.acknowledged_at || null,
        is_pinned: Boolean(updated.is_pinned),
        pinned_at: updated.pinned_at || null,
        pinned_by: updated.pinned_by || null,
      },
      message:
        action === "acknowledge"
          ? "Review acknowledged"
          : action === "reply"
            ? "Instructor reply saved"
            : action === "pin"
              ? "Review pinned"
              : action === "unpin"
                ? "Review unpinned"
            : `Review ${statusByAction[action]}`,
    });
  } catch (err: any) {
    console.error("postInstructorReviewAction error", err);
    return fail("Failed to update review", 500, { error: err.message || "Unknown error" });
  }
});
