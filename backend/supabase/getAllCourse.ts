// supabase/functions/getAllCourse/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);

    // Query parameters
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const filterField = url.searchParams.get("filterField");
    const filterValue = url.searchParams.get("filterValue");
    const instructorId = url.searchParams.get("instructorId");
    const sortBy = url.searchParams.get("sortBy") ?? "created_at";
    const sortOrder = url.searchParams.get("sortOrder") ?? "asc";

    const allowedSortFields = [
      "title",
      "rating",
      "student_count",
      "created_at",
      "updated_at",
    ];

    // Validate sort parameters
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const ascending = sortOrder.toLowerCase() !== "desc";

    // Build query
    let query = supabaseClient
      .from('courses_with_stats')
      .select(`*`, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order(safeSortBy, { ascending });

    // Instructor scoping:
    // courses_with_stats view does not reliably expose instructor_id across environments,
    // so resolve name from users table and scope by instructor_name.
    if (instructorId && instructorId.trim().length > 0) {
      const scopedInstructorId = instructorId.trim();
      const { data: scopedUser, error: scopedUserError } = await supabaseClient
        .from("users")
        .select("id,name,role")
        .eq("id", scopedInstructorId)
        .single();

      if (scopedUserError || !scopedUser || !["instructor", "admin"].includes(String(scopedUser.role || ""))) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
            pagination: {
              limit,
              offset,
              totalCount: 0,
              hasMore: false,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      query = query.eq("instructor_name", String(scopedUser.name || "").trim());
    }

    // Apply filters
    if (filterField && filterValue && filterField !== "level") {
      if (filterField === "category_name") {
        query = query.ilike('category_name', `%${filterValue}%`);
      } else if (filterField === "instructor_name") {
        query = query.ilike('instructor_name', `%${filterValue}%`);
      } else if (filterField === "category_color") {
        query = query.ilike('category_color', `%${filterValue}%`);
      } 
      else {
        query = query.ilike(filterField, `%${filterValue}%`);
      }
    }

    const { data: courses, error, count } = await query;

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: courses,
        pagination: {
          limit,
          offset,
          totalCount: count ?? 0,
          hasMore: offset + (courses?.length ?? 0) < (count ?? 0),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (err) {
    console.error("Error fetching courses:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to retrieve courses",
        error: err.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
