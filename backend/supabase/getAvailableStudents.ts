// supabase/functions/getAvailableStudents/index.ts
/**
 * Supabase Edge Function: Get Available Students (Not Enrolled in Course)
 * Endpoint: GET /getAvailableStudents/{courseId}
 * Description: Retrieves all students who are not enrolled in the specified course
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
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

    const url = new URL(req.url);
    
    // Extract courseId from path: /getAvailableStudents/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const courseId = pathParts[pathParts.length - 1];

    if (!courseId || courseId === 'getAvailableStudents') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Course ID is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Fetching available students for course:', courseId);

    // Get all students enrolled in this course
    const { data: enrolledStudents, error: enrolledError } = await supabaseClient
      .from('course_enrollments')
      .select('user_id')
      .eq('course_id', courseId);

    if (enrolledError) {
      throw enrolledError;
    }

    const enrolledUserIds = (enrolledStudents || []).map((e: any) => e.user_id);

    // Get all students
    const { data: allStudents, error: studentsError } = await supabaseClient
      .from('users')
      .select('id, name, email, role')
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (studentsError) {
      throw studentsError;
    }

    // Filter out enrolled students
    const unenrolledStudents = (allStudents || []).filter(
      (student: any) => !enrolledUserIds.includes(student.id)
    );

    // Get enrollment statistics for unenrolled students
    const { data: allEnrollments, error: enrollmentsError } = await supabaseClient
      .from('course_enrollments')
      .select('user_id, progress_percentage');

    if (enrollmentsError) {
      throw enrollmentsError;
    }

    // Process and format available students with their statistics
    const availableStudents = unenrolledStudents.map((student: any) => {
      // Get all enrollments for this student
      const studentEnrollments = (allEnrollments || []).filter(
        (e: any) => e.user_id === student.id
      );

      const totalEnrollments = studentEnrollments.length;
      const averageProgress = totalEnrollments > 0
        ? studentEnrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / totalEnrollments
        : 0;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        totalEnrollments: totalEnrollments,
        averageProgress: Math.round(averageProgress)
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          courseId,
          availableStudents,
          totalAvailable: availableStudents.length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching available students:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'An error occurred while retrieving available students',
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