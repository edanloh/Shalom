// supabase/functions/categoryHandler/index.ts
/**
 * Supabase Edge Function: categoryHandler
 * Purpose: Manage course categories (CRUD operations)
 * Endpoints:
 *   GET /categoryHandler - Retrieve all categories
 *   GET /categoryHandler/{id}/courses - Get courses using this category
 *   POST /categoryHandler - Create new category
 *   PUT /categoryHandler/{id} - Update category
 *   DELETE /categoryHandler/{id} - Delete category
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Parse path: /categoryHandler or /categoryHandler/{id} or /categoryHandler/{id}/courses
    const categoryId = pathParts.length >= 2 ? pathParts[1] : null;
    const isCoursesEndpoint = pathParts.length >= 3 && pathParts[2] === 'courses';

    // GET /categoryHandler - Retrieve all categories
    if (req.method === 'GET' && !categoryId) {
      const { data: categories, error } = await supabaseClient
        .from('categories')
        .select('id, name, color, course_count, created_at')
        .order('name', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          data: categories || [],
          meta: {
            timestamp: new Date().toISOString(),
            count: categories?.length || 0
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET /categoryHandler/{id}/courses - Get courses using this category
    if (req.method === 'GET' && categoryId && isCoursesEndpoint) {
      const { data: courses, error, count } = await supabaseClient
        .from('courses')
        .select('id, title', { count: 'exact' })
        .eq('category_id', categoryId);

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          data: courses || [],
          meta: {
            timestamp: new Date().toISOString(),
            count: count || 0,
            categoryId
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /categoryHandler - Create new category
    if (req.method === 'POST') {
      const body = await req.json();
      const { name, color = '#6366F1' } = body;

      if (!name || name.trim() === '') {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Category name is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if category already exists
      const { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('name', name.trim())
        .single();

      if (existingCategory) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Category already exists'
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: newCategory, error } = await supabaseClient
        .from('categories')
        .insert({
          name: name.trim(),
          color: color || '#6366F1',
          course_count: 0
        })
        .select('id, name, color, course_count, created_at')
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Category created successfully',
          data: newCategory,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // PUT /categoryHandler/{id} - Update category
    if (req.method === 'PUT' && categoryId && !isCoursesEndpoint) {
      const body = await req.json();
      const { name, color } = body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (color !== undefined) updateData.color = color;

      const { data: updatedCategory, error } = await supabaseClient
        .from('categories')
        .update(updateData)
        .eq('id', categoryId)
        .select('id, name, color, course_count, created_at')
        .single();

      if (error) throw error;

      if (!updatedCategory) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Category not found'
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Category updated successfully',
          data: updatedCategory,
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
    }

    // DELETE /categoryHandler/{id} - Delete category
    if (req.method === 'DELETE' && categoryId && !isCoursesEndpoint) {
      // Check how many courses use this category
      const { data: coursesWithCategory, count } = await supabaseClient
        .from('courses')
        .select('id, title', { count: 'exact' })
        .eq('category_id', categoryId);

      const courseCount = count || 0;

      if (courseCount > 0) {
        // Get or create "General" category
        let generalCategoryId;
        const { data: generalCategory } = await supabaseClient
          .from('categories')
          .select('id')
          .eq('name', 'General')
          .single();

        if (generalCategory) {
          generalCategoryId = generalCategory.id;
        } else {
          const { data: newGeneral, error: generalError } = await supabaseClient
            .from('categories')
            .insert({
              name: 'General',
              color: '#6B7280',
              course_count: 0
            })
            .select('id')
            .single();

          if (generalError) throw generalError;
          generalCategoryId = newGeneral.id;
        }

        // Move courses to General category
        const { error: updateError } = await supabaseClient
          .from('courses')
          .update({ category_id: generalCategoryId })
          .eq('category_id', categoryId);

        if (updateError) throw updateError;
      }

      // Delete the category
      const { error } = await supabaseClient
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          message: `Category deleted successfully${courseCount > 0 ? `. ${courseCount} course(s) moved to General category` : ''}`,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            coursesAffected: courseCount,
            coursesMoved: courseCount > 0,
            affectedCourses: coursesWithCategory?.map(c => ({ id: c.id, title: c.title })) || []
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
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