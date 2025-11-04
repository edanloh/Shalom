import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
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

function ok(payload) {
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(payload) };
}

function created(payload) {
  return { statusCode: 201, headers: CORS_HEADERS, body: JSON.stringify(payload) };
}

function badRequest(msg) {
  return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, message: msg }) };
}

function notFound(msg) {
  return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ success: false, message: msg }) };
}

function serverError(error, event) {
  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      message: "Internal Server Error",
      error: error?.message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: event?.requestContext?.requestId || "unknown"
      }
    })
  };
}

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  
  let client;
  try {
    const uid = event.pathParameters?.uid ?? event.pathParameters?.userId ?? null;
    const courseIdParam = event.pathParameters?.courseId || null;
    const courseIdQueryParam = event.queryStringParameters?.courseId || null;
    
    if (!uid) return badRequest("User ID is required");
    
    // Connect to Supabase DB
    const secret = await getDbCredentials();
    
    client = new Client({
      host: secret.host?.trim(),
      port: parseInt(secret.port) || 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4
    });
    
    await client.connect();
    
    // ===================================================
    // ROUTE: GET /users/{uid}/wishlist
    // ===================================================
    if (event.httpMethod === "GET" && !courseIdParam) {
      const sql = `
        SELECT
          c.id                       AS courseid,
          c.title,
          c.description,
          c.instructor_name,
          c.level,
          c.duration_hours,
          c.thumbnail_url,
          c.rating,
          c.total_ratings,
          c.student_count,
          c.tags,
          cat.name                   AS category_name,
          cat.color                  AS category_color,
          cw.created_at              AS added_at
        FROM course_wishlist cw
        JOIN courses c ON cw.course_id = c.id
        JOIN categories cat ON c.category_id = cat.id
        WHERE cw.user_id = $1
        ORDER BY cw.created_at DESC;
      `;
      const { rows } = await client.query(sql, [uid]);
      const payload = {
        success: true,
        message: "Wishlist retrieved successfully",
        data: {
          courses: rows,
          count: rows.length,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: event.requestContext?.requestId || "unknown"
          }
        }
      };
      return ok(payload);
    }
    
    // ===================================================
    // ROUTE: POST /users/{uid}/wishlist?courseId=xxx
    // ===================================================
    if (event.httpMethod === "POST" && courseIdQueryParam) {
      // Validate course
      const courseExists = await client.query("SELECT 1 FROM courses WHERE id = $1", [courseIdQueryParam]);
      if (courseExists.rowCount === 0) return notFound("Course not found");
      
      const upsertSql = `
        INSERT INTO course_wishlist (user_id, course_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, course_id) DO NOTHING
        RETURNING id, user_id, course_id, created_at;
      `;
      const { rows } = await client.query(upsertSql, [uid, courseIdQueryParam]);
      
      if (rows.length === 0) {
        return ok({
          success: true,
          message: "Course already in wishlist.",
        });
      }
      
      return created({
        success: true,
        message: "Course added to wishlist successfully.",
        data: rows[0],
        meta: {
          timestamp: new Date().toISOString(),
          requestId: event.requestContext?.requestId || "unknown"
        }
      });
    }
    
    // ===================================================
    // ROUTE: DELETE /users/{uid}/wishlist/{courseId} or ?courseId=xxx
    // ===================================================
    if (event.httpMethod === "DELETE" && (courseIdQueryParam || courseIdParam)) {
      const courseId = courseIdParam || courseIdQueryParam;
      console.log("Attempting to delete wishlist entry:", { uid, courseId });
      
      const checkSql = `
        SELECT id, user_id, course_id
        FROM course_wishlist
        WHERE user_id = $1 AND course_id = $2;
      `;
      const checkResult = await client.query(checkSql, [uid, courseId]);
      console.log("Pre-delete check result:", checkResult.rows);
      
      const deleteSql = `
        DELETE FROM course_wishlist
        WHERE user_id = $1 AND course_id = $2
        RETURNING id;
      `;
      const result = await client.query(deleteSql, [uid, courseId]);
      console.log("Delete result:", result.rows);
      
      if (result.rowCount > 0) {
        return ok({
          success: true,
          message: "Course removed from wishlist successfully.",
          affectedRowIds: result.rows.map(r => r.id)
        });
      } else {
        return ok({
          success: true,
          message: "Course not found in wishlist or already removed.",
          affectedRowIds: [],          
        });
      }
    }
    
    // ===================================================
    // If route not matched
    // ===================================================
    return notFound("Route not found");
    
  } catch (error) {
    console.error("Wishlist handler error:", error);
    return serverError(error, event);
  } finally {
    if (client) {
      await client.end().catch(e => console.error("Error closing PG client:", e));
    }
  }
};