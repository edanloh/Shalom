// supabase/functions/postUserEnrollment/index.ts
/**
 * Supabase Edge Function: postUserEnrollment
 * Purpose: Enroll a user in a course (idempotent)
 * Endpoint: POST /postUserEnrollment/{userId}
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const resolveInstructorId = async (supabaseClient: any, course: any) => {
  if (!course) return null;
  if (course.instructor_id) return { id: course.instructor_id, name: course.instructor_name };
  if (!course.instructor_name) return null;
  const { data: instructor } = await supabaseClient
    .from('users')
    .select('id,name')
    .eq('name', course.instructor_name)
    .in('role', ['instructor', 'admin'])
    .limit(1)
    .maybeSingle();
  if (!instructor?.id) return null;
  return { id: instructor.id, name: instructor.name };
};

const sendNotification = async (supabaseClient: any, payload: Record<string, unknown>) => {
  const data = payload as any;
  const insertPayload = {
    user_id: data.userId || data.user_id,
    title: data.title,
    message: data.message,
    type: data.type || 'system',
    action_url: data.actionUrl || data.action_url || null,
    related_entity_type: data.relatedEntityType || data.related_entity_type || null,
    related_entity_id: data.relatedEntityId || data.related_entity_id || null,
    priority: data.priority || 'normal',
    expires_at: data.expiresAt || data.expires_at || null,
    created_at: data.createdAt || data.created_at || new Date().toISOString(),
  };

  const insertDirect = async () => {
    const { error } = await supabaseClient.from('notifications').insert(insertPayload);
    if (error) {
      console.error('Direct notification insert failed:', error);
    }
  };

  if (!supabaseUrl || !serviceKey) {
    await insertDirect();
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/postNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('postNotification failed:', res.status, text);
      await insertDirect();
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    await insertDirect();
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: "Method Not Allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    
    // Extract userId from path: /postUserEnrollment/{userId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const userId = pathParts[pathParts.length - 1];

    if (!userId || userId === 'postUserEnrollment') {
      return new Response(
        JSON.stringify({ success: false, message: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Required input
    const { courseId } = body || {};
    if (!courseId) {
      return new Response(
        JSON.stringify({ success: false, message: "courseId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Optional input
    const {
      enrollmentDate,
      initialProgress = 0,
      isCompleted = false,
      totalWatchTimeMinutes = 0
    } = body;

    const progressNum = Number.isFinite(initialProgress) 
      ? Math.max(0, Math.min(100, Number(initialProgress))) 
      : 0;
    const watchMinsNum = Number.isFinite(totalWatchTimeMinutes) 
      ? Math.max(0, Math.floor(Number(totalWatchTimeMinutes))) 
      : 0;

    console.log('Enrollment request:', { userId, courseId, progressNum, isCompleted });

    // 0) Ensure user exists (strict mode: no auto-create)
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id,name,email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found",
          error: { code: "USER_NOT_FOUND", userId }
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1) Ensure course exists
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select(`
        id,
        title,
        description,
        instructor_id,
        instructor_name,
        duration_hours,
        thumbnail_url,
        rating,
        student_count,
        tags,
        category_id,
        categories (
          name,
          color
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ success: false, message: "Course not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2) Idempotent: already enrolled?
    const { data: existing, error: existingError } = await supabaseClient
      .from('course_enrollments')
      .select(`
        id,
        user_id,
        course_id,
        enrollment_date,
        completion_date,
        progress_percentage,
        is_completed,
        total_watch_time_minutes
      `)
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existing && !existingError) {
      let enrollment = existing;
      let restored = false;
      if (!existing.enrollment_date) {
        const { data: revived, error: reviveError } = await supabaseClient
          .from('course_enrollments')
          .update({
            enrollment_date: enrollmentDate || new Date().toISOString(),
            progress_percentage: progressNum,
            is_completed: !!isCompleted,
            total_watch_time_minutes: watchMinsNum
          })
          .eq('id', existing.id)
          .select(`
            id,
            user_id,
            course_id,
            enrollment_date,
            completion_date,
            progress_percentage,
            is_completed,
            total_watch_time_minutes
          `)
          .single();
        if (reviveError) throw reviveError;
        enrollment = revived;
        restored = true;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: restored
            ? "Enrollment restored"
            : "User already enrolled; returning existing record",
          data: {
            enrollment: {
              enrollment_id: enrollment.id,
              user_id: enrollment.user_id,
              course_id: enrollment.course_id,
              enrollment_date: enrollment.enrollment_date,
              completion_date: enrollment.completion_date,
              progress_percentage: enrollment.progress_percentage,
              is_completed: enrollment.is_completed,
              total_watch_time_minutes: enrollment.total_watch_time_minutes,
              enrollment_date_formatted: enrollment.enrollment_date
                ? new Date(enrollment.enrollment_date).toISOString()
                : null,
              completion_date_formatted: enrollment.completion_date
                ? new Date(enrollment.completion_date).toISOString()
                : null
            },
            course: {
              id: course.id,
              title: course.title,
              description: course.description,
              instructor_name: course.instructor_name,
              duration_hours: course.duration_hours,
              thumbnail_url: course.thumbnail_url,
              rating: course.rating,
              student_count: course.student_count,
              tags: course.tags,
              category_name: course.categories?.name,
              category_color: course.categories?.color
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID()
            }
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3) Create enrollment
    const { data: created, error: insertError } = await supabaseClient
      .from('course_enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        enrollment_date: enrollmentDate || new Date().toISOString(),
        progress_percentage: progressNum,
        is_completed: !!isCompleted,
        total_watch_time_minutes: watchMinsNum,
        last_activity_at: new Date().toISOString()
      })
      .select(`
        id,
        user_id,
        course_id,
        enrollment_date,
        completion_date,
        progress_percentage,
        is_completed,
        total_watch_time_minutes
      `)
      .single();

    if (insertError) throw insertError;

    const { count: enrollmentCount, error: countError } = await supabaseClient
      .from('course_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId);
    if (countError) throw countError;

    const { error: studentCountError } = await supabaseClient
      .from('courses')
      .update({ student_count: enrollmentCount ?? 0 })
      .eq('id', courseId);
    if (studentCountError) throw studentCountError;

    const instructor = await resolveInstructorId(supabaseClient, course);
    if (instructor?.id) {
      const studentName = user?.name || user?.email || "A student";
      await sendNotification(supabaseClient, {
        userId: instructor.id,
        title: "New student enrolled",
        message: `${studentName} enrolled in ${course.title}`,
        type: "course",
        actionUrl: `/course/${course.id}/students`,
        relatedEntityType: "course",
        relatedEntityId: course.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User enrolled successfully",
        data: {
          enrollment: {
            enrollment_id: created.id,
            user_id: created.user_id,
            course_id: created.course_id,
            enrollment_date: created.enrollment_date,
            completion_date: created.completion_date,
            progress_percentage: created.progress_percentage,
            is_completed: created.is_completed,
            total_watch_time_minutes: created.total_watch_time_minutes,
            enrollment_date_formatted: new Date(created.enrollment_date).toISOString(),
            completion_date_formatted: created.completion_date
              ? new Date(created.completion_date).toISOString()
              : null
          },
          course: {
            id: course.id,
            title: course.title,
            description: course.description,
            instructor_name: course.instructor_name,
            duration_hours: course.duration_hours,
            thumbnail_url: course.thumbnail_url,
            rating: course.rating,
            student_count: course.student_count,
            tags: course.tags,
            category_name: course.categories?.name,
            category_color: course.categories?.color
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        }
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error creating user enrollment:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while creating user enrollment",
        error: error.message || "Unknown error",
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
