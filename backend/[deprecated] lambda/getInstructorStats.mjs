/**
 * AWS Lambda Function: getInstructorStats
 * Purpose: Fetch instructor/admin dashboard statistics including courses, students, ratings, and recent activity
 * Endpoint: GET /admin/{adminId}/stats
 * Database: PostgreSQL (Supabase compatible)
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
  const command = new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_NAME });
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  let client;

  try {
    const { adminId } = event.pathParameters || {};
    
    if (!adminId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Admin ID is required"
        })
      };
    }

    const secret = await getDbCredentials();

    const connectionConfig = {
      host: secret.host?.trim(),
      port: 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4
    };

    client = new Client(connectionConfig);
    await client.connect();

    // Verify the admin exists and has admin/instructor role
    const adminCheck = await client.query(
      'SELECT id, name, role FROM users WHERE id = $1 AND role IN ($2, $3)',
      [adminId, 'admin', 'instructor']
    );

    if (adminCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Admin/Instructor not found or invalid role"
        })
      };
    }

    // Get all courses and aggregate statistics (single instructor system)
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT ce.user_id) as total_students,
        COALESCE(AVG(c.rating), 0) as average_rating,
        COUNT(DISTINCT CASE WHEN ce.enrollment_date >= CURRENT_DATE - INTERVAL '30 days' THEN ce.id END) as new_enrollments_30d,
        COUNT(DISTINCT CASE WHEN ce.enrollment_date >= CURRENT_DATE - INTERVAL '7 days' THEN ce.id END) as new_enrollments_7d,
        COALESCE(AVG(ce.progress_percentage), 0) as average_completion,
        COUNT(DISTINCT CASE WHEN ce.is_completed = true THEN ce.id END) as completed_enrollments,
        COUNT(DISTINCT CASE WHEN ce.is_completed = false THEN ce.id END) as active_enrollments
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    `;

    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];

    // Get recent activity (all enrollments for single instructor system)
    const activityQuery = `
      SELECT 
        'enrollment' as activity_type,
        u.name as username,
        u.email,
        c.title as course_title,
        ce.enrollment_date as activity_date
      FROM course_enrollments ce
      JOIN users u ON ce.user_id = u.id
      JOIN courses c ON ce.course_id = c.id
      ORDER BY ce.enrollment_date DESC
      LIMIT 10
    `;

    const activityResult = await client.query(activityQuery);

    // Get course performance breakdown (all courses for single instructor system)
    const coursesQuery = `
      SELECT 
        c.id,
        c.title,
        COUNT(DISTINCT ce.user_id) as enrolled_count,
        COALESCE(AVG(ce.progress_percentage), 0) as avg_progress,
        COUNT(CASE WHEN ce.is_completed = true THEN 1 END) as completed_count,
        c.rating,
        COUNT(DISTINCT cr.id) as total_ratings
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN course_ratings cr ON c.id = cr.course_id
      GROUP BY c.id, c.title, c.rating
      ORDER BY enrolled_count DESC
    `;

    const coursesResult = await client.query(coursesQuery);

    const responseData = {
      admin_id: adminId,
      statistics: {
        total_courses: parseInt(stats.total_courses || 0),
        total_students: parseInt(stats.total_students || 0),
        average_rating: parseFloat(stats.average_rating || 0).toFixed(2),
        new_enrollments_this_month: parseInt(stats.new_enrollments_30d || 0),
        new_enrollments_this_week: parseInt(stats.new_enrollments_7d || 0),
        average_completion_rate: parseFloat(stats.average_completion || 0).toFixed(2),
        active_students: parseInt(stats.active_enrollments || 0),
        completed_courses: parseInt(stats.completed_enrollments || 0)
      },
      recent_activity: activityResult.rows.map(activity => ({
        type: activity.activity_type,
        student_name: activity.username,
        student_email: activity.email,
        course_title: activity.course_title,
        date: activity.activity_date,
        formatted_date: new Date(activity.activity_date).toLocaleDateString()
      })),
      courses_performance: coursesResult.rows.map(course => ({
        course_id: course.id,
        title: course.title,
        enrolled_students: parseInt(course.enrolled_count || 0),
        average_progress: parseFloat(course.avg_progress || 0).toFixed(2),
        completed_students: parseInt(course.completed_count || 0),
        completion_rate: course.enrolled_count > 0 ?
          ((course.completed_count / course.enrolled_count) * 100).toFixed(2) : "0.00",
        rating: parseFloat(course.rating || 0).toFixed(2),
        total_ratings: parseInt(course.total_ratings || 0)
      })),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId || "unknown"
      }
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Instructor statistics retrieved successfully",
        data: responseData
      })
    };

  } catch (error) {
    console.error("Error retrieving instructor stats:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to retrieve instructor statistics",
        error: error.message,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown"
        }
      })
    };
  } finally {
    if (client) await client.end().catch(e => console.error("Error closing PG client:", e));
  }
};
