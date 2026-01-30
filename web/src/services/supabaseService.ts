/**
 * Supabase Service for Edge Functions
 * Replaces AWS Lambda invocations with Supabase function calls
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/env';

// Error types for better error handling
export class SupabaseError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export class SupabaseFunctionError extends SupabaseError {
  constructor(message: string, details?: any) {
    super(message, 500, 'FUNCTION_ERROR', details);
    this.name = 'SupabaseFunctionError';
  }
}

// Supabase client instance
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file'
      );
    }
    // supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

/**
 * Invoke a Supabase Edge Function
 * @param functionName - Name of the edge function (can include query params for GET requests)
 * @param body - Request body to send to the function
 * @param options - Additional options (headers, method, etc.)
 */
export async function invokeSupabaseFunction<T = any>(
  functionName: string,
  body?: any,
  options?: {
    headers?: Record<string, string>;
    method?: 'POST' | 'GET' | 'PUT' | 'DELETE';
  }
): Promise<T> {
  const supabase = getSupabaseClient();

  try {
    // For GET requests with query parameters, use fetch directly
    if (options?.method === 'GET' && functionName.includes('?')) {
      const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new SupabaseFunctionError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData
        );
      }

      const data = await response.json();
      return data as T;
    }

    // For other requests, use the Supabase client
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: body,
      headers: options?.headers,
      method: options?.method,
    });

    if (error) {
      throw new SupabaseFunctionError(
        error.message || 'Function invocation failed',
        error
      );
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof SupabaseFunctionError) {
      throw error;
    }
    
    throw new SupabaseFunctionError(
      error.message || 'Unknown error invoking function',
      error
    );
  }
}

/**
 * Helper class for Supabase Edge Function invocations
 */
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Invoke a function with GET method
   */
  async get<T = any>(functionName: string, params?: Record<string, any>): Promise<T> {
    return invokeSupabaseFunction<T>(functionName, params, { method: 'GET' });
  }

  /**
   * Invoke a function with POST method
   */
  async post<T = any>(functionName: string, body?: any): Promise<T> {
    return invokeSupabaseFunction<T>(functionName, body, { method: 'POST' });
  }

  /**
   * Invoke a function with PUT method
   */
  async put<T = any>(functionName: string, body?: any): Promise<T> {
    return invokeSupabaseFunction<T>(functionName, body, { method: 'PUT' });
  }

  /**
   * Invoke a function with DELETE method
   */
  async delete<T = any>(functionName: string, params?: any): Promise<T> {
    return invokeSupabaseFunction<T>(functionName, params, { method: 'DELETE' });
  }

  /**
   * Get the raw Supabase client for direct database access
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

/**
 * Migration helper: Convert API Gateway URL paths to Supabase function names
 * Example: /dev/admin/550e8400/course -> admin-get-course
 */
export function convertApiPathToFunctionName(path: string): string {
  // Remove /dev prefix if present
  const cleanPath = path.replace(/^\/dev\//, '');
  
  // Convert paths to function names
  // /students -> get-students
  // /admin/toggleUserEnabled -> admin-toggle-user-enabled
  // /courses -> get-courses
  
  const segments = cleanPath.split('/').filter(Boolean);
  
  // Handle common patterns
  if (segments[0] === 'students') return 'get-students';
  if (segments[0] === 'courses' && segments.length === 1) return 'get-courses';
  if (segments[0] === 'admin') {
    if (segments[1] === 'toggleUserEnabled') return 'admin-toggle-user-enabled';
    if (segments.length === 3) return 'admin-get-course'; // /admin/{adminId}/{courseId}
  }
  
  // Default: join segments with hyphens
  return segments.join('-').toLowerCase();
}
