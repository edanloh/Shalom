
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
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
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: "Method Not Allowed" })
    };
  }

  let client;
  let inTransaction = false;

  try {
    const { userId } = event.pathParameters || {};
    if (!userId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: "User ID is required" })
      };
    }

    // Parse body
    let body;
    try {
      body = event.body && typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: "Invalid JSON body" })
      };
    }

    // Required input
    const { courseId } = body || {};
    if (!courseId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: "courseId is required" })
      };
    }

    // Optional input
    const {
      enrollmentDate,
      initialProgress = 0,
      isCompleted = false,
      totalWatchTimeMinutes = 0
    } = body;

    const progressNum = Number.isFinite(initialProgress) ? Math.max(0, Math.min(100, Number(initialProgress))) : 0;
    const watchMinsNum = Number.isFinite(totalWatchTimeMinutes) ? Math.max(0, Math.floor(Number(totalWatchTimeMinutes))) : 0;

    // Connect to Postgres
    const secret = await getDbCredentials();
    const connectionConfig = {
      host: secret.host?.trim(),
      port: parseInt(secret.port, 10) || 5432,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4
    };

    client = new Client(connectionConfig);
    await client.connect();

    // Begin transaction
    await client.query("BEGIN");
    inTransaction = true;

    // 0) Ensure user exists (strict mode: no auto-create)
    const userRow = await client.query(`SELECT 1 FROM users WHERE id = $1`, [userId]);
    if (userRow.rowCount === 0) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "User not found",
          error: { code: "USER_NOT_FOUND", userId }
        })
      };
    }

    // 1) Ensure course exists
    const courseCheck = await client.query(
      `SELECT id, title, description, instructor_name, level, duration_hours, thumbnail_url, rating, student_count, tags, category_id
       FROM courses WHERE id = $1`,
      [courseId]
    );
    if (courseCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: "Course not found" })
      };
    }

    // 2) Idempotent: already enrolled?
    const existing = await client.query(
      `SELECT ce.id AS enrollment_id,
              ce.user_id,
              ce.course_id,
              ce.enrollment_date,
              ce.completion_date,
              ce.progress_percentage,
              ce.is_completed,
              ce.total_watch_time_minutes
       FROM course_enrollments ce
       WHERE ce.user_id = $1 AND ce.course_id = $2
       LIMIT 1`,
      [userId, courseId]
    );

    if (existing.rowCount > 0) {
      const cat = await client.query(
        `SELECT id, name AS category_name, color AS category_color
         FROM categories WHERE id = $1`,
        [courseCheck.rows[0].category_id]
      );

      await client.query("COMMIT");
      inTransaction = false;

      const existingEnrollment = existing.rows[0];
      const course = courseCheck.rows[0];
      const category = cat.rowCount ? cat.rows[0] : { category_name: null, category_color: null };

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: "User already enrolled; returning existing record",
          data: {
            enrollment: {
              ...existingEnrollment,
              enrollment_date_formatted: new Date(existingEnrollment.enrollment_date).toISOString(),
              completion_date_formatted: existingEnrollment.completion_date
                ? new Date(existingEnrollment.completion_date).toISOString()
                : null
            },
            course: {
              id: course.id,
              title: course.title,
              description: course.description,
              instructor_name: course.instructor_name,
              level: course.level,
              duration_hours: course.duration_hours,
              thumbnail_url: course.thumbnail_url,
              rating: course.rating,
              student_count: course.student_count,
              tags: course.tags,
              category_name: category.category_name,
              category_color: category.category_color
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: event.requestContext?.requestId || "unknown"
            }
          }
        })
      };
    }

    // 3) Create enrollment
    const insert = await client.query(
      `INSERT INTO course_enrollments
         (user_id, course_id, enrollment_date, progress_percentage, is_completed, total_watch_time_minutes)
       VALUES
         ($1, $2, COALESCE($3::timestamptz, NOW()), $4, $5, $6)
       RETURNING id AS enrollment_id, user_id, course_id, enrollment_date, completion_date,
                 progress_percentage, is_completed, total_watch_time_minutes`,
      [userId, courseId, enrollmentDate || null, progressNum, !!isCompleted, watchMinsNum]
    );

    const cat = await client.query(
      `SELECT name AS category_name, color AS category_color
       FROM categories WHERE id = $1`,
      [courseCheck.rows[0].category_id]
    );

    await client.query("COMMIT");
    inTransaction = false;

    const created = insert.rows[0];
    const course = courseCheck.rows[0];
    const category = cat.rowCount ? cat.rows[0] : { category_name: null, category_color: null };

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "User enrolled successfully",
        data: {
          enrollment: {
            ...created,
            enrollment_date_formatted: new Date(created.enrollment_date).toISOString(),
            completion_date_formatted: created.completion_date
              ? new Date(created.completion_date).toISOString()
              : null
          },
          course: {
            id: course.id,
            title: course.title,
            description: course.description,
            instructor_name: course.instructor_name,
            level: course.level,
            duration_hours: course.duration_hours,
            thumbnail_url: course.thumbnail_url,
            rating: course.rating,
            student_count: course.student_count,
            tags: course.tags,
            category_name: category.category_name,
            category_color: category.category_color
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: event.requestContext?.requestId || "unknown"
          }
        }
      })
    };
  } catch (error) {
    console.error("Error creating user enrollment:", error);

    if (client && inTransaction) {
      try { await client.query("ROLLBACK"); } catch (e) { console.error("Rollback failed:", e); }
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while creating user enrollment",
        error: error.message || "Unknown error",
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown"
        }
      })
    };
  } finally {
    if (client) {
      await client.end().catch(e => console.error("Error closing PG client:", e));
    }
  }
};
