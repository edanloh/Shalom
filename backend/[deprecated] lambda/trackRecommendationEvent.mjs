import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json"
};

const ALLOWED_EVENTS = new Set([
  "impression",
  "view",
  "click",
  "start",
  "complete",
  "dismiss",
  "save"
]);

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
  const requestId = event.requestContext?.requestId || "unknown";

  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, courseId, eventType, context = {}, requestId: incomingReqId } = body;

    if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Invalid eventType",
          meta: { requestId }
        })
      };
    }

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

    const insertQuery = `
      INSERT INTO recommendation_events (user_id, course_id, event_type, context, request_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      userId || null,
      courseId || null,
      eventType,
      context,
      incomingReqId || requestId
    ]);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Event recorded",
        data: result.rows?.[0],
        meta: { requestId }
      })
    };
  } catch (error) {
    console.error("Error recording recommendation event:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to record recommendation event",
        error: error.message,
        meta: { requestId }
      })
    };
  } finally {
    if (client) await client.end().catch((e) => console.error("Error closing PG client:", e));
  }
};
