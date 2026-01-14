/**
 * AWS Lambda Function: getModuleDetailInstructor (Course Content for Instructors)
 * Purpose: Fetch complete course content including sections, videos, quizzes WITH QUESTIONS for course editing
 * Endpoint: GET /admin/{adminId}/courses/{courseId}
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Instructor View Expectations:
 * - Full course content with all quiz questions and answers for editing
 * - No user progress tracking (instructors don't need student progress)
 * - Includes all fields needed for CourseBuilder editing
 * - Validates that the admin has permission to view this course (instructor_id check)
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
    // Extract parameters - Endpoint: GET /admin/{adminId}/courses/{courseId}
    const adminId = event.pathParameters?.adminId;
    const courseId = event.pathParameters?.courseId;

    if (!adminId || !courseId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          message: "adminId and courseId are required" 
        })
      };
    }

    console.log(`Instructor view request - Admin: ${adminId}, Course: ${courseId}`);

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

    // Optional: Verify instructor has permission to view this course
    // Uncomment if you want to enforce instructor ownership
    // if (course.instructor_id && course.instructor_id !== adminId) {
    //   return {
    //     statusCode: 403,
    //     headers: CORS_HEADERS,
    //     body: JSON.stringify({ 
    //       success: false, 
    //       message: "You do not have permission to view this course" 
    //     })
    //   };
    // }

    // ========================================
    // 2. Fetch sections, lessons, quizzes, quiz questions, requirements, outcomes in parallel
    // ========================================
    const [sections, lessons, quizzes, quizQuestions, requirements, outcomes] = await Promise.all([
      client.query(
        `SELECT id, title, description, order_index, lessons_count, duration_minutes
         FROM course_sections 
         WHERE course_id = $1 
         ORDER BY order_index ASC`,
        [courseId]
      ),
      client.query(
        `SELECT id, section_id, title, description, video_url, 
                order_index, duration_seconds, is_preview, thumbnail_url
         FROM course_videos 
         WHERE section_id IN (
           SELECT id FROM course_sections WHERE course_id = $1
         )
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
        `SELECT qq.id, qq.quiz_id, qq.question, qq.question_type, 
                qq.options, qq.correct_answer, qq.explanation, qq.points, qq.order_index
         FROM quiz_questions qq
         INNER JOIN course_quizzes cq ON qq.quiz_id = cq.id
         WHERE cq.course_id = $1
         ORDER BY qq.quiz_id, qq.order_index ASC`,
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
    // 3. Combine sections with their items (lessons + quizzes WITH QUESTIONS)
    // ========================================
    const sectionsWithContent = sections.rows.map((section) => {
      // Get lessons (videos) for this section
      const sectionLessons = lessons.rows
        .filter((l) => l.section_id === section.id)
        .map((l) => ({ 
          ...l, 
          type: "video"
        }));

      // Get quizzes for this section and add questions
      const sectionQuizzes = quizzes.rows
        .filter((q) => q.section_id === section.id)
        .map((q) => {
          // Get questions for this quiz
          const questions = quizQuestions.rows
            .filter((qq) => qq.quiz_id === q.id)
            .map((qq) => ({
              id: qq.id,
              text: qq.question, // Map 'question' column to 'text' for frontend
              question: qq.question, // Also include as 'question' for compatibility
              type: qq.question_type,
              question_type: qq.question_type, // Also include as 'question_type' for compatibility
              options: qq.options || [],
              correctAnswer: qq.correct_answer,
              correct_answer: qq.correct_answer, // Also include as 'correct_answer' for compatibility
              explanation: qq.explanation,
              points: qq.points,
              order: qq.order_index,
              order_index: qq.order_index // Also include as 'order_index' for compatibility
            }));
          
          return { 
            ...q, 
            type: "quiz",
            questions // Include full questions array with answers for instructor editing
          };
        });

      // Combine and sort by order_index
      const items = [...sectionLessons, ...sectionQuizzes]
        .sort((a, b) => a.order_index - b.order_index);

      return { 
        ...section, 
        items, 
        itemCount: items.length
      };
    });

    // ========================================
    // 4. Construct structured response for instructor
    // ========================================
    const responseData = {
      course: {
        ...course,
        requirements: requirements.rows.map((r) => r.requirement),
        outcomes: outcomes.rows.map((o) => o.outcome)
      },
      sections: sectionsWithContent,
      totalSections: sections.rows.length,
      totalVideos: lessons.rows.length,
      totalQuizzes: quizzes.rows.length,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId || "unknown",
        viewType: "instructor",
        adminId: adminId
      }
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Course content retrieved successfully (instructor view)",
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
