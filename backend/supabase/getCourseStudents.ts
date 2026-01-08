// supabase/functions/getCourseStudents/index.ts
/**
 * Supabase Edge Function: getCourseStudents
 * Purpose: Fetch enrolled students for a course with progress tracking and activity status
 * Endpoint: GET /getCourseStudents/{courseId}
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

/**
 * Helper function to format last activity timestamp
 */
function formatLastActive(hours: number): string {
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    
    // Extract courseId from path: /getCourseStudents/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const courseId = pathParts[pathParts.length - 1];

    if (!courseId || courseId === 'getCourseStudents') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Course ID is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Fetching students for course:', courseId);

    // Get enrolled students with their progress
    const { data: enrollments, error: enrollmentsError } = await supabaseClient
      .from('course_enrollments')
      .select(`
        progress_percentage,
        updated_at,
        enrollment_date,
        is_completed,
        completion_date,
        total_watch_time_minutes,
        users (
          id,
          name,
          email
        )
      `)
      .eq('course_id', courseId)
      .order('updated_at', { ascending: false });

    if (enrollmentsError) {
      throw enrollmentsError;
    }

    // Process and format student data
    const students = (enrollments || []).map((enrollment: any) => {
      // Calculate hours since last access
      const lastAccessDate = new Date(enrollment.updated_at);
      const hoursSinceAccess = (Date.now() - lastAccessDate.getTime()) / (1000 * 60 * 60);

      return {
        id: enrollment.users.id,
        name: enrollment.users.name,
        email: enrollment.users.email,
        progress: Math.round(parseFloat(enrollment.progress_percentage || 0)),
        lastActive: formatLastActive(hoursSinceAccess),
        enrollmentDate: new Date(enrollment.enrollment_date).toLocaleDateString(),
        isCompleted: enrollment.is_completed,
        completionDate: enrollment.completion_date 
          ? new Date(enrollment.completion_date).toLocaleDateString() 
          : null,
        totalWatchTimeMinutes: parseInt(enrollment.total_watch_time_minutes || 0)
      };
    });

    // Calculate statistics
    const statistics = {
      total_students: students.length,
      active_students: students.filter(s => !s.isCompleted).length,
      completed_students: students.filter(s => s.isCompleted).length,
      average_progress: students.length > 0
        ? (students.reduce((sum, s) => sum + s.progress, 0) / students.length).toFixed(2)
        : "0.00"
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Course students retrieved successfully",
        data: {
          students,
          statistics
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error retrieving course students:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to retrieve course students",
        error: error.message,
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