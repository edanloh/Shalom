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
    const limit = Number(url.searchParams.get("limit") ?? 24);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const filterField = url.searchParams.get("filterField");
    const filterValue = url.searchParams.get("filterValue");
    const sortBy = url.searchParams.get("sortBy") ?? "updated_at";
    const sortOrder = url.searchParams.get("sortOrder") ?? "desc";

    const allowedSortFields = [
      "title",
      "rating",
      "student_count",
      "created_at",
      "updated_at",
    ];

    // Validate sort parameters
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "updated_at";
    const ascending = sortOrder.toLowerCase() !== "desc";

    // Build query
    let query = supabaseClient
      .from('courses_with_stats')
      .select(`
        *,
        categories (
          name,
          color
        )
      `, { count: 'exact' })
      .eq('is_published', true)  // Only return published courses
      .order(safeSortBy, { ascending });

    if (Number.isFinite(limit) && limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    // Apply filters
    if (filterField && filterValue && filterField !== "level") {
      if (filterField === "category_name") {
        query = query.ilike('categories.name', `%${filterValue}%`);
      } else if (filterField === "instructor_name") {
        query = query.ilike('instructor_name', `%${filterValue}%`);
      } else if (filterField === "category_color") {
        query = query.ilike('categories.color', `%${filterValue}%`);
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
