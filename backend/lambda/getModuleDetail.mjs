/**
 * AWS Lambda Function: getModuleDetail (Course Content)
 * Purpose: Fetch complete course content including sections, videos, quizzes, and user progress
 * Endpoint: GET /courses/{courseId}/module?userId={userId}
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Frontend Expectations:
 * - ModuleDetailScreen expects: course, sections[], totalSections, totalVideos, totalQuizzes, userProgress
 * - Each section has: id, title, description, order_index, lessons_count, duration_minutes, items[], itemCount
 * - Each item has: id, type ('video'|'quiz'), title, description, order_index, and type-specific fields
 * - UserProgress has: progress_percentage, is_completed, videoProgress[], quizAttempts[]
 */

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json"
};

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "ap-southeast-1"
});

let cachedSecret = null;

async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;
  
  const command = new GetSecretValueCommand({
    SecretId: process.env.DB_SECRET_NAME
  });
  
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  let client;
  
  try {
    // Extract parameters
    const courseId = event.pathParameters?.courseId || event.queryStringParameters?.courseId;
    const userId = event.queryStringParameters?.userId || null;

    if (!courseId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "courseId is required" 
        })
      };
    }

    // Connect to database
    const secret = await getDbCredentials();
    
    const connectionConfig = {
      host: secret.host?.trim(),
      port: parseInt(secret.port) || 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4
    };

    client = new Client(connectionConfig);
    await client.connect();

    // ========================================
    // 1. Fetch core course details
    // ========================================
    const courseQuery = `
      SELECT 
        c.id, c.title, c.description, c.instructor_name, c.level,
        c.duration_hours, c.thumbnail_url, c.video_preview_url,
        c.rating, c.total_ratings, c.student_count, c.is_published,
        c.is_featured, c.language, c.subtitles, c.tags,
        c.created_at, c.updated_at,
        cat.name as category_name, cat.id as category_id
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = $1
    `;
    
    const courseResult = await client.query(courseQuery, [courseId]);

    if (courseResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "Course not found" 
        })
      };
    }

    const course = courseResult.rows[0];

    // ========================================
    // 2. Fetch sections, videos, quizzes, requirements, outcomes in parallel
    // ========================================
    const [sections, videos, quizzes, requirements, outcomes] = await Promise.all([
      client.query(
        `SELECT id, title, description, order_index, lessons_count, duration_minutes
         FROM course_sections 
         WHERE course_id = $1 
         ORDER BY order_index ASC`,
        [courseId]
      ),
      client.query(
        `SELECT id, section_id, title, description, video_url, duration_seconds, 
                order_index, is_preview, thumbnail_url
         FROM course_videos 
         WHERE course_id = $1 
         ORDER BY section_id, order_index ASC`,
        [courseId]
      ),
      client.query(
        `SELECT id, section_id, title, description, order_index, 
                passing_score, time_limit_minutes, max_attempts
         FROM course_quizzes 
         WHERE course_id = $1 
         ORDER BY section_id, order_index ASC`,
        [courseId]
      ),
      client.query(
        `SELECT requirement, order_index 
         FROM course_requirements 
         WHERE course_id = $1 
         ORDER BY order_index ASC`,
        [courseId]
      ),
      client.query(
        `SELECT outcome, order_index 
         FROM course_outcomes 
         WHERE course_id = $1 
         ORDER BY order_index ASC`,
        [courseId]
      )
    ]);

    // ========================================
    // 3. Fetch user progress if userId provided
    // ========================================
    let userProgress = null;
    
    if (userId) {
      try {
        // Check if user is enrolled
        const enrollmentQuery = `
          SELECT 
            progress_percentage, 
            is_completed, 
            current_video_id,
            total_watch_time_minutes, 
            enrollment_date, 
            completion_date
          FROM course_enrollments
          WHERE user_id = $1 AND course_id = $2
        `;
        
        const enrollmentResult = await client.query(enrollmentQuery, [userId, courseId]);

        if (enrollmentResult.rows.length > 0) {
          const enrollment = enrollmentResult.rows[0];

          // Fetch video progress and quiz attempts in parallel
          const [videoProgressResult, quizAttemptsResult, moduleProgressResult] = await Promise.all([
            client.query(
              `SELECT 
                video_id, 
                watch_time_seconds, 
                is_completed, 
                last_position_seconds,
                completed_at
               FROM video_progress
               WHERE user_id = $1 
               AND video_id IN (
                 SELECT id FROM course_videos WHERE course_id = $2
               )`,
              [userId, courseId]
            ),
            client.query(
              `SELECT 
                quiz_id, 
                score, 
                is_passed, 
                attempt_number, 
                completed_at
               FROM quiz_attempts
               WHERE user_id = $1 
               AND quiz_id IN (
                 SELECT id FROM course_quizzes WHERE course_id = $2
               )
               ORDER BY quiz_id, attempt_number DESC`,
              [userId, courseId]
            ),
            client.query(
              `SELECT 
                section_id,
                is_completed,
                completed_at
               FROM user_module_progress
               WHERE user_id = $1 AND course_id = $2`,
              [userId, courseId]
            )
          ]);

          // Group quiz attempts by quiz_id (keep only latest attempt)
          const latestQuizAttempts = [];
          const seenQuizIds = new Set();
          
          for (const attempt of quizAttemptsResult.rows) {
            if (!seenQuizIds.has(attempt.quiz_id)) {
              latestQuizAttempts.push(attempt);
              seenQuizIds.add(attempt.quiz_id);
            }
          }

          // Create module progress map for quick lookup
          const moduleProgressMap = new Map();
          for (const progress of moduleProgressResult.rows) {
            moduleProgressMap.set(progress.section_id, {
              is_completed: progress.is_completed,
              completed_at: progress.completed_at
            });
          }

          userProgress = {
            progress_percentage: parseFloat(enrollment.progress_percentage) || 0,
            is_completed: enrollment.is_completed || false,
            current_video_id: enrollment.current_video_id,
            total_watch_time_minutes: enrollment.total_watch_time_minutes || 0,
            enrollment_date: enrollment.enrollment_date,
            completion_date: enrollment.completion_date,
            videoProgress: videoProgressResult.rows,
            quizAttempts: latestQuizAttempts,
            moduleProgress: moduleProgressMap
          };
        }
      } catch (progressError) {
        console.error('Error fetching user progress:', progressError);
        // Continue without progress data rather than failing the whole request
        userProgress = null;
      }
    }

    // ========================================
    // 4. Combine sections with their items (videos + quizzes)
    // ========================================
    const sectionsWithContent = sections.rows.map((section) => {
      // Get videos for this section and add type field
      const sectionVideos = videos.rows
        .filter((v) => v.section_id === section.id)
        .map((v) => ({ 
          ...v, 
          type: "video",
          // Add completion status if user progress exists
          is_completed: userProgress?.videoProgress?.some(
            vp => vp.video_id === v.id && vp.is_completed
          ) || false
        }));

      // Get quizzes for this section and add type field
      const sectionQuizzes = quizzes.rows
        .filter((q) => q.section_id === section.id)
        .map((q) => ({ 
          ...q, 
          type: "quiz",
          // Add completion status if user progress exists
          is_completed: userProgress?.quizAttempts?.some(
            qa => qa.quiz_id === q.id && qa.is_passed
          ) || false
        }));

      // Combine and sort by order_index
      const items = [...sectionVideos, ...sectionQuizzes]
        .sort((a, b) => a.order_index - b.order_index);

      // Get module completion status
      const moduleCompletion = userProgress?.moduleProgress?.get(section.id);

      return { 
        ...section, 
        items, 
        itemCount: items.length,
        // Add module completion status
        module_is_completed: moduleCompletion?.is_completed || false,
        module_completed_at: moduleCompletion?.completed_at || null
      };
    });

    // ========================================
    // 5. Construct structured response
    // ========================================
    const responseData = {
      course: {
        ...course,
        requirements: requirements.rows.map((r) => r.requirement),
        outcomes: outcomes.rows.map((o) => o.outcome)
      },
      sections: sectionsWithContent,
      totalSections: sections.rows.length,
      totalVideos: videos.rows.length,
      totalQuizzes: quizzes.rows.length,
      userProgress,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId || "unknown",
        userId: userId || null
      }
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Course content retrieved successfully",
        data: responseData
      })
    };

  } catch (error) {
    console.error("Error retrieving course content:", error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while retrieving course content",
        error: error.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown"
        }
      })
    };
    
  } finally {
    // Clean up database connection
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error("Error closing database connection:", e);
      }
    }
  }
};
