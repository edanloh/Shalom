// index.mjs — POST/PUT /courses/{courseId}/reviews
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,PUT,OPTIONS",       // <-- include PUT
  "Content-Type": "application/json",
};

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
});

let cachedSecret = null;
async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;
  const resp = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_NAME })
  );
  cachedSecret = JSON.parse(resp.SecretString);
  return cachedSecret;
}

function badRequest(msg) {
  return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, message: msg }) };
}
function notFound(msg) {
  return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ success: false, message: msg }) };
}
function conflict(msg) {
  return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ success: false, message: msg }) };
}

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const { courseId } = event.pathParameters || {};
  if (!courseId) return badRequest("courseId is required in path");

  let body;
  try {
    body = event.body && typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
  } catch {
    return badRequest("Invalid JSON body");
  }

  const userId = (body.userId ?? "").toString().trim();
  const rating = Number(body.rating);
  const review = (body.review ?? "").toString().trim();
  const isAnonymous = !!body.isAnonymous;

  if (!userId) return badRequest("userId is required");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return badRequest("rating must be an integer 1–5");
  if (review.length === 0) return badRequest("review text is required");

  let client;
  try {
    const secret = await getDbCredentials();
    client = new Client({
      host: secret.host?.trim(),
      port: parseInt(secret.port, 10) || 5432,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4,
    });
    await client.connect();

    // Ensure user & course exist (optional but nice)
    const userExists = await client.query(`SELECT 1 FROM public.users WHERE id = $1`, [userId]);
    if (userExists.rowCount === 0) return notFound("User not found");

    const courseExists = await client.query(`SELECT 1 FROM public.courses WHERE id = $1`, [courseId]);
    if (courseExists.rowCount === 0) return notFound("Course not found");

    if (event.httpMethod === "POST") {
      // Enforce one-review-per-user-per-course: 409 if already exists
      const already = await client.query(
        `SELECT 1 FROM public.course_ratings WHERE user_id=$1 AND course_id=$2 LIMIT 1`,
        [userId, courseId]
      );
      if (already.rowCount > 0) {
        return conflict("You have already reviewed this course.");
      }

      const ins = await client.query(
        `
          INSERT INTO public.course_ratings
            (user_id, course_id, rating, review, is_anonymous, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
          RETURNING id
        `,
        [userId, courseId, rating, review, isAnonymous]
      );
      const newId = ins.rows[0].id;

      const detail = await client.query(
        `
        SELECT 
          cr.id, cr.rating, cr.review, cr.created_at, cr.is_anonymous,
          u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
        FROM public.course_ratings cr
        LEFT JOIN public.users u ON u.id = cr.user_id
        WHERE cr.id = $1
        `,
        [newId]
      );

      const r = detail.rows[0];
      const payload = {
        id: r.id,
        rating: Number(r.rating),
        review: r.review,
        createdAt: r.created_at,
        reviewerName: r.is_anonymous ? "Anonymous" : (r.reviewer_name || "Anonymous"),
        reviewerAvatar: r.is_anonymous ? null : (r.reviewer_avatar ?? null),
      };

      return {
        statusCode: 201,
        headers: {
          ...CORS_HEADERS,
          "x-lambda-req": context.awsRequestId,
        },
        body: JSON.stringify({
          success: true,
          message: "Review added",
          data: payload,
          meta: { timestamp: new Date().toISOString() },
        }),
      };
    }

    if (event.httpMethod === "PUT") {
      // Update existing review; 404 if none exists
      const upd = await client.query(
        `
        UPDATE public.course_ratings
        SET rating=$3, review=$4, is_anonymous=$5, updated_at=NOW()
        WHERE user_id=$1 AND course_id=$2
        RETURNING id
        `,
        [userId, courseId, rating, review, isAnonymous]
      );

      if (upd.rowCount === 0) {
        return notFound("No existing review to update");
      }

      const id = upd.rows[0].id;
      const detail = await client.query(
        `
        SELECT 
          cr.id, cr.rating, cr.review, cr.created_at, cr.is_anonymous,
          u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
        FROM public.course_ratings cr
        LEFT JOIN public.users u ON u.id = cr.user_id
        WHERE cr.id = $1
        `,
        [id]
      );

      const r = detail.rows[0];
      const payload = {
        id: r.id,
        rating: Number(r.rating),
        review: r.review,
        createdAt: r.created_at,
        reviewerName: r.is_anonymous ? "Anonymous" : (r.reviewer_name || "Anonymous"),
        reviewerAvatar: r.is_anonymous ? null : (r.reviewer_avatar ?? null),
      };

      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          "x-lambda-req": context.awsRequestId,
        },
        body: JSON.stringify({
          success: true,
          message: "Review updated",
          data: payload,
          meta: { timestamp: new Date().toISOString() },
        }),
      };
    }

    // Any other verb → 405
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: "Method Not Allowed" }),
    };
  } catch (err) {
    console.error("review handler error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to process review",
        error: err?.message || String(err),
      }),
    };
  } finally {
    if (client) await client.end().catch(() => {});
  }
};
