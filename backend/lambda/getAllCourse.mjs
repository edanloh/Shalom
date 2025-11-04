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

let cachedSecret = null; // Clear cache on each deploy

async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;
  
  console.log("Fetching secret:", process.env.DB_SECRET_NAME);
  const command = new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_NAME });
  const response = await secretsClient.send(command);
  
  console.log("Raw SecretString:", response.SecretString);
  cachedSecret = JSON.parse(response.SecretString);
  
  // DEBUG: Log connection details (without password)
  console.log("DB Connection Config:", {
    host: cachedSecret.host,
    hostLength: cachedSecret.host?.length,
    hostTrimmed: cachedSecret.host?.trim(),
    port: cachedSecret.port,
    username: cachedSecret.username,
    database: cachedSecret.dbname,
    hasPassword: !!cachedSecret.password,
    allKeys: Object.keys(cachedSecret)
  });
  
  return cachedSecret;
}

async function testDbConnection(client) {
  try {
    const res = await client.query("SELECT 1 AS test");
    console.log("Supabase connection successful:", res.rows[0]);
    return true;
  } catch (err) {
    console.error("Supabase connection failed:", err);
    throw err;
  }
}

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const allowedSortFields = ["title", "level", "rating", "student_count", "created_at", "updated_at"];
  let client;

  try {
    const queryParams = event.queryStringParameters || {};
    const {
      limit = "20",
      offset = "0",
      filterField,
      filterValue,
      sortBy = "created_at",
      sortOrder = "asc"
    } = queryParams;

    console.log("Query Parameters:", queryParams);

    const secret = await getDbCredentials();

    // Connect to Supabase PostgreSQL via Connection Pooler
    // Use port 6543 for connection pooler (better for Lambda)
    const connectionConfig = {
      host: secret.host?.trim() || process.env.SUPABASE_HOST,
      port: 6543, // Connection pooler port instead of 5432
      user: secret.username?.trim(),
      password: secret.password,
      database: (secret.dbname || secret.database || process.env.SUPABASE_DB || "postgres").trim(),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      // Force IPv4 resolution
      family: 4
    };
    
    console.log("Connection config (sanitized):", {
      ...connectionConfig,
      password: connectionConfig.password ? "[REDACTED]" : "MISSING"
    });
    
    client = new Client(connectionConfig);

    console.log("Attempting to connect to Supabase...");
    await client.connect();
    console.log("Connected successfully!");

    await testDbConnection(client);

    let baseQuery = `
      SELECT
        courses.*,
        categories.name AS category_name,
        categories.description AS category_desc,
        categories.color AS category_color
      FROM courses
      LEFT JOIN categories ON courses.category_id = categories.id
      WHERE 1=1
    `;

    const values = [];
    const conditions = [];

    if (filterField && filterValue) {
      values.push(`%${filterValue}%`);
      if (filterField === "category_name") conditions.push(`categories.name ILIKE $${values.length}`);
      else if (filterField === "instructor_name") conditions.push(`courses.instructor_name ILIKE $${values.length}`);
      else conditions.push(`CAST(courses.${filterField} AS TEXT) ILIKE $${values.length}`);
    }

    if (conditions.length > 0) baseQuery += " AND " + conditions.join(" AND ");

    const sanitizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const sanitizedSortOrder = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
    baseQuery += ` ORDER BY courses.${sanitizedSortBy} ${sanitizedSortOrder}`;

    baseQuery += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit), parseInt(offset));

    console.log("SQL Query:", baseQuery, "Values:", values);

    const result = await client.query(baseQuery, values);
    const courses = result.rows;

    const countQuery = `
      SELECT COUNT(*)
      FROM courses
      LEFT JOIN categories ON courses.category_id = categories.id
      WHERE 1=1
      ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
    `;
    const countResult = await client.query(countQuery, values.slice(0, values.length - 2));
    const totalCount = parseInt(countResult.rows[0].count);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "Courses retrieved successfully",
        data: {
          courses,
          pagination: {
            currentPageSize: courses.length,
            totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + courses.length < totalCount
          },
          filters: {
            filterField: filterField || null,
            filterValue: filterValue || null,
            sortBy: sanitizedSortBy,
            sortOrder: sanitizedSortOrder
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: event.requestContext?.requestId || "unknown"
          }
        }
      })
    };

  } catch (error) {
    console.error("Error retrieving courses:", error);
    console.error("Error stack:", error.stack);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Failed to retrieve courses",
        error: error.message,
        errorCode: error.code,
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
