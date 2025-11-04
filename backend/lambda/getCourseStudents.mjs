/**
 * AWS Lambda Function: getCourseStudents
 * Purpose: Fetch enrolled students for a course with progress tracking and activity status
 * Endpoint: GET /courses/{courseId}/students
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
    const { courseId } = event.pathParameters || {};

    if (!courseId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Course ID is required"
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

    // Get enrolled students with their progress
    const studentsQuery = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        ce.progress_percentage as progress,
        ce.updated_at as last_accessed,
        ce.enrollment_date,
        ce.is_completed,
        ce.completion_date,
        ce.total_watch_time_minutes,
        -- Calculate time since last access (using updated_at as proxy)
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ce.updated_at)) / 3600 as hours_since_access
      FROM course_enrollments ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.course_id = $1
      ORDER BY ce.updated_at DESC
    `;

    const result = await client.query(studentsQuery, [courseId]);

    const students = result.rows.map(student => ({
      id: student.user_id,
      name: student.name,
      email: student.email,
      progress: Math.round(parseFloat(student.progress || 0)),
      lastActive: formatLastActive(student.hours_since_access),
      enrollmentDate: new Date(student.enrollment_date).toLocaleDateString(),
      isCompleted: student.is_completed,
      completionDate: student.completion_date ? new Date(student.completion_date).toLocaleDateString() : null,
      totalWatchTimeMinutes: parseInt(student.total_watch_time_minutes || 0)
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Course students retrieved successfully",
        data: {
          students,
          statistics: {
            total_students: students.length,
            active_students: students.filter(s => !s.isCompleted).length,
            completed_students: students.filter(s => s.isCompleted).length,
            average_progress: students.length > 0 ?
              (students.reduce((sum, s) => sum + s.progress, 0) / students.length).toFixed(2) : 0
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown"
        }
      })
    };

  } catch (error) {
    console.error("Error retrieving course students:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to retrieve course students",
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

function formatLastActive(hours) {
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
