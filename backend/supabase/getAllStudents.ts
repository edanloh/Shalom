// supabase/functions/getAllStudents/index.ts
/**
 * Supabase Edge Function: Get All Students
 * Endpoint: GET /getAllStudents
 * Description: Retrieves all users with role='student' with their enrollment statistics
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
const formatLastActive = (hours: number): string => {
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)} ${Math.floor(hours) === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};

/**
 * Calculate engagement score based on last activity
 */
const calculateEngagementScore = (lastActivity: string | null): number => {
  if (!lastActivity) return 30;
  
  const now = new Date();
  const activityDate = new Date(lastActivity);
  const daysDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 7) return 100;
  if (daysDiff <= 14) return 70;
  if (daysDiff <= 30) return 50;
  return 30;
};

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

    // Get all users with role='student'
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, name, email, is_active, created_at, role')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Get enrollment data for all students
    const { data: enrollments, error: enrollmentsError } = await supabaseClient
      .from('course_enrollments')
      .select('user_id, course_id, is_completed, progress_percentage, total_watch_time_minutes, updated_at');

    if (enrollmentsError) {
      throw enrollmentsError;
    }

    // Process each student with their enrollment statistics
    const students = (users || []).map((user: any) => {
      // Filter enrollments for this user
      const userEnrollments = (enrollments || []).filter(
        (e: any) => e.user_id === user.id
      );

      // Calculate statistics
      const coursesEnrolled = userEnrollments.length;
      const completedCourses = userEnrollments.filter((e: any) => e.is_completed).length;
      
      const overallProgress = coursesEnrolled > 0
        ? userEnrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / coursesEnrolled
        : 0;

      const lastActivity = userEnrollments.length > 0
        ? userEnrollments.reduce((latest: string | null, e: any) => {
            if (!latest) return e.updated_at;
            return new Date(e.updated_at) > new Date(latest) ? e.updated_at : latest;
          }, null)
        : null;

      const totalStudyMinutes = userEnrollments.reduce(
        (sum: number, e: any) => sum + (e.total_watch_time_minutes || 0),
        0
      );

      // Calculate engagement score
      const engagementScore = userEnrollments.length > 0
        ? userEnrollments.reduce((sum: number, e: any) => {
            return sum + calculateEngagementScore(e.updated_at);
          }, 0) / userEnrollments.length
        : 0;

      // Format last activity
      const formattedLastActivity = lastActivity
        ? formatLastActive((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60))
        : 'Never';

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        enabled: user.is_active !== false, // Map is_active to enabled, default to true if null
        enrolledDate: user.created_at 
          ? new Date(user.created_at).toISOString().split('T')[0] 
          : 'N/A',
        progress: Math.round(overallProgress),
        lastActivity: formattedLastActivity,
        engagement: Math.round(engagementScore),
        coursesEnrolled: coursesEnrolled,
        completedCourses: completedCourses,
        totalHours: Math.round(totalStudyMinutes / 60), // Convert minutes to hours
      };
    });

    // Sort by last activity (most recent first)
    students.sort((a, b) => {
      if (a.lastActivity === 'Never' && b.lastActivity === 'Never') return 0;
      if (a.lastActivity === 'Never') return 1;
      if (b.lastActivity === 'Never') return -1;
      
      // For engagement-based sorting as a fallback
      return b.engagement - a.engagement;
    });

    // Calculate summary statistics
    const statistics = {
      total_students: students.length,
      active_students: students.filter(s => s.engagement >= 70).length,
      engaged_students: students.filter(s => s.engagement >= 50 && s.engagement < 70).length,
      at_risk_students: students.filter(s => s.engagement < 50).length,
      average_progress: students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length)
        : 0,
      average_engagement: students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.engagement, 0) / students.length)
        : 0,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          students,
          statistics
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching students:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'An error occurred while retrieving students',
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